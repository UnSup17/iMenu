import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const CreateItemSchema = z.object({
  name: z.string().min(1).max(100),
  sku: z.string().max(50).optional(),
  unit: z.enum(['KG', 'GRAM', 'LITER', 'ML', 'UNIT', 'PORTION']),
  currentStock: z.number().min(0).default(0).optional(),
  initialStock: z.number().min(0).optional(),
  minStock: z.number().min(0).default(0),
  costPerUnit: z.number().min(0).default(0).optional(),
  supplier: z.string().max(100).optional(),
})

/**
 * GET /api/inventory/items?lowStock=true
 * Lista todos los ítems de inventario del restaurante del usuario autenticado.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const user = session.user as { id: string; restaurantId?: string; role: string }
    const restaurantId = user.restaurantId
    if (!restaurantId) return NextResponse.json({ error: 'Sin restaurante asignado' }, { status: 403 })

    const allowedRoles = ['SUPERADMIN', 'RESTAURANT_ADMIN', 'MANAGER', 'ACCOUNTANT']
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const lowStockOnly = request.nextUrl.searchParams.get('lowStock') === 'true'

    const items = await prisma.inventoryItem.findMany({
      where: {
        restaurantId,
        isActive: true,
      },
      include: {
        _count: { select: { productRecipes: true } },
      },
      orderBy: { name: 'asc' },
    })

    const result = items.map((item) => ({
      ...item,
      currentStock: item.currentStock.toNumber(),
      minStock: item.minStock.toNumber(),
      costPerUnit: item.costPerUnit.toNumber(),
      isLowStock: item.currentStock.toNumber() <= item.minStock.toNumber(),
      isEmpty: item.currentStock.toNumber() <= 0,
      recipesCount: item._count.productRecipes,
    }))

    const filtered = lowStockOnly ? result.filter((i) => i.isLowStock) : result

    return NextResponse.json({ items: filtered })
  } catch (error) {
    console.error('[GET /api/inventory/items]', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

/**
 * POST /api/inventory/items
 * Crea un nuevo ítem de inventario.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const user = session.user as { id: string; restaurantId?: string; role: string }
    const restaurantId = user.restaurantId
    if (!restaurantId) return NextResponse.json({ error: 'Sin restaurante asignado' }, { status: 403 })

    const adminRoles = ['SUPERADMIN', 'RESTAURANT_ADMIN', 'MANAGER']
    if (!adminRoles.includes(user.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const body = await request.json()
    const { initialStock, currentStock, ...data } = CreateItemSchema.parse(body)

    const stock = initialStock !== undefined ? initialStock : (currentStock ?? 0)

    const item = await prisma.inventoryItem.create({
      data: {
        ...data,
        currentStock: stock,
        restaurantId,
      },
    })

    return NextResponse.json(
      { item: { ...item, currentStock: item.currentStock.toNumber(), minStock: item.minStock.toNumber(), costPerUnit: item.costPerUnit.toNumber() } },
      { status: 201 },
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: error.flatten() }, { status: 400 })
    }
    console.error('[POST /api/inventory/items]', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
