import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const RecipeItemSchema = z.object({
  inventoryItemId: z.string().min(1),
  quantity: z.number().positive(),
})

const UpsertRecipeSchema = z.object({
  items: z.array(RecipeItemSchema).min(0),
})

/**
 * GET /api/inventory/recipes/[productId]
 * Obtiene la receta (ingredientes) de un producto.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ productId: string }> },
) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const user = session.user as { restaurantId?: string; role: string }
    if (!user.restaurantId) return NextResponse.json({ error: 'Sin restaurante' }, { status: 403 })

    const { productId } = await params

    // Verificar que el producto pertenece al restaurante
    const product = await prisma.product.findFirst({
      where: { id: productId, restaurantId: user.restaurantId },
      select: { id: true, name: true },
    })
    if (!product) return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 })

    const recipe = await prisma.productRecipeItem.findMany({
      where: { productId },
      include: {
        inventoryItem: {
          select: { id: true, name: true, unit: true, currentStock: true, minStock: true },
        },
      },
      orderBy: { inventoryItem: { name: 'asc' } },
    })

    return NextResponse.json({
      product,
      recipe: recipe.map((r) => ({
        id: r.id,
        inventoryItemId: r.inventoryItemId,
        inventoryItemName: r.inventoryItem.name,
        unit: r.inventoryItem.unit,
        quantity: r.quantity.toNumber(),
        currentStock: r.inventoryItem.currentStock.toNumber(),
        minStock: r.inventoryItem.minStock.toNumber(),
      })),
    })
  } catch (error) {
    console.error('[GET /api/inventory/recipes/[productId]]', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

/**
 * PUT /api/inventory/recipes/[productId]
 * Reemplaza toda la receta de un producto (upsert completo).
 * Enviar items: [] para borrar la receta.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> },
) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const user = session.user as { restaurantId?: string; role: string }
    if (!user.restaurantId) return NextResponse.json({ error: 'Sin restaurante' }, { status: 403 })

    const adminRoles = ['SUPERADMIN', 'RESTAURANT_ADMIN', 'MANAGER']
    if (!adminRoles.includes(user.role)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

    const { productId } = await params
    const body = await request.json()
    const { items } = UpsertRecipeSchema.parse(body)

    // Verificar que el producto pertenece al restaurante
    const product = await prisma.product.findFirst({
      where: { id: productId, restaurantId: user.restaurantId },
    })
    if (!product) return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 })

    // Verificar que todos los inventoryItemIds pertenecen al restaurante
    if (items.length > 0) {
      const inventoryIds = items.map((i) => i.inventoryItemId)
      const validItems = await prisma.inventoryItem.findMany({
        where: { id: { in: inventoryIds }, restaurantId: user.restaurantId },
        select: { id: true },
      })
      if (validItems.length !== inventoryIds.length) {
        return NextResponse.json({ error: 'Uno o más ingredientes no pertenecen al restaurante' }, { status: 400 })
      }
    }

    // Reemplazar receta atómicamente
    await prisma.$transaction([
      prisma.productRecipeItem.deleteMany({ where: { productId } }),
      ...(items.length > 0
        ? [
            prisma.productRecipeItem.createMany({
              data: items.map((item) => ({
                productId,
                inventoryItemId: item.inventoryItemId,
                quantity: item.quantity,
              })),
            }),
          ]
        : []),
    ])

    return NextResponse.json({ success: true, itemsCount: items.length })
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Datos inválidos', details: error.flatten() }, { status: 400 })
    console.error('[PUT /api/inventory/recipes/[productId]]', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
