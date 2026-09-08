import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const ProductSchema = z.object({
  categoryId: z.string().uuid(),
  name: z.string().min(1).max(200),
  description: z.string().max(500).nullable().optional(),
  basePrice: z.number().min(0),
  isAvailable: z.boolean().optional().default(true),
  imageUrl: z.string().url().nullable().optional(),
})

const ADMIN_ROLES = ['SUPERADMIN', 'ORG_ADMIN', 'RESTAURANT_ADMIN', 'MANAGER']

async function getRestaurantId(userId: string, role: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { restaurantId: true, organizationId: true },
  })
  if (user?.restaurantId) return user.restaurantId
  if (user?.organizationId) {
    const first = await prisma.restaurant.findFirst({
      where: { organizationId: user.organizationId },
      select: { id: true },
    })
    if (first) return first.id
  }
  if (role === 'SUPERADMIN') {
    const first = await prisma.restaurant.findFirst({ select: { id: true } })
    return first?.id ?? null
  }
  return null
}

/**
 * POST /api/menu/products
 * Crea un nuevo producto en una categoría existente.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const user = session.user as { id: string; role: string }
    if (!ADMIN_ROLES.includes(user.role))
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

    const restaurantId = await getRestaurantId(user.id, user.role)
    if (!restaurantId)
      return NextResponse.json({ error: 'Sin restaurante asignado' }, { status: 403 })

    const body = await req.json()
    const data = ProductSchema.parse(body)

    // Verify the category belongs to this restaurant
    const category = await prisma.category.findFirst({
      where: { id: data.categoryId, restaurantId },
    })
    if (!category)
      return NextResponse.json({ error: 'Categoría no encontrada' }, { status: 404 })

    const product = await prisma.product.create({
      data: {
        restaurantId,
        categoryId: data.categoryId,
        name: data.name,
        description: data.description ?? null,
        basePrice: data.basePrice,
        isAvailable: data.isAvailable ?? true,
        imageUrl: data.imageUrl ?? null,
      },
    })

    return NextResponse.json({ product: { ...product, basePrice: product.basePrice.toNumber() } }, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError)
      return NextResponse.json({ error: 'Datos inválidos', details: err.flatten() }, { status: 400 })
    console.error('[POST /api/menu/products]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
