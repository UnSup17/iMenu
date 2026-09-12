import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const ProductSchema = z.object({
  categoryId: z.string().uuid(),
  name: z.string().min(1).max(200),
  description: z.string().max(1000).nullable().optional(),
  basePrice: z.number().min(0),
  isAvailable: z.boolean().optional().default(true),
  imageUrl: z.string().nullable().optional(),
  orderIndex: z.number().int().min(0).optional(),
  allergens: z.union([z.string(), z.array(z.string())]).nullable().optional(),
  scheduledPrice: z.number().min(0).nullable().optional(),
  scheduledPriceDays: z.union([z.string(), z.array(z.number())]).nullable().optional(),
  scheduledPriceStart: z.string().nullable().optional(),
  scheduledPriceEnd: z.string().nullable().optional(),
  scheduledPriceLabel: z.string().nullable().optional(),
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

    const allergensStr =
      Array.isArray(data.allergens)
        ? JSON.stringify(data.allergens)
        : data.allergens ?? null

    const daysStr =
      Array.isArray(data.scheduledPriceDays)
        ? JSON.stringify(data.scheduledPriceDays)
        : data.scheduledPriceDays ?? null

    // Calcular orderIndex si no viene dado
    let orderIndex = data.orderIndex
    if (orderIndex === undefined) {
      const count = await prisma.product.count({ where: { categoryId: data.categoryId } })
      orderIndex = count
    }

    const product = await prisma.product.create({
      data: {
        restaurantId,
        categoryId: data.categoryId,
        name: data.name,
        description: data.description ?? null,
        basePrice: data.basePrice,
        isAvailable: data.isAvailable ?? true,
        imageUrl: data.imageUrl ?? null,
        orderIndex,
        allergens: allergensStr,
        scheduledPrice: data.scheduledPrice ?? null,
        scheduledPriceDays: daysStr,
        scheduledPriceStart: data.scheduledPriceStart ?? null,
        scheduledPriceEnd: data.scheduledPriceEnd ?? null,
        scheduledPriceLabel: data.scheduledPriceLabel ?? null,
      },
    })

    return NextResponse.json({
      product: {
        ...product,
        basePrice: product.basePrice.toNumber(),
        scheduledPrice: product.scheduledPrice ? product.scheduledPrice.toNumber() : null,
      },
    }, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError)
      return NextResponse.json({ error: 'Datos inválidos', details: err.flatten() }, { status: 400 })
    console.error('[POST /api/menu/products]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
