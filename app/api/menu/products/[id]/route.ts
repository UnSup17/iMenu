import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const UpdateProductSchema = z.object({
  categoryId: z.string().uuid().optional(),
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).nullable().optional(),
  basePrice: z.number().min(0).optional(),
  isAvailable: z.boolean().optional(),
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
 * PUT /api/menu/products/[id]
 */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const user = session.user as { id: string; role: string }
    if (!ADMIN_ROLES.includes(user.role))
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

    const restaurantId = await getRestaurantId(user.id, user.role)
    if (!restaurantId)
      return NextResponse.json({ error: 'Sin restaurante asignado' }, { status: 403 })

    const { id } = await params
    const body = await req.json()
    const data = UpdateProductSchema.parse(body)

    const existing = await prisma.product.findFirst({ where: { id, restaurantId } })
    if (!existing) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

    // If changing category, verify the new one belongs to the same restaurant
    if (data.categoryId) {
      const cat = await prisma.category.findFirst({ where: { id: data.categoryId, restaurantId } })
      if (!cat) return NextResponse.json({ error: 'Categoría no encontrada' }, { status: 404 })
    }

    const allergensStr =
      data.allergens !== undefined
        ? Array.isArray(data.allergens)
          ? JSON.stringify(data.allergens)
          : data.allergens
        : undefined

    const daysStr =
      data.scheduledPriceDays !== undefined
        ? Array.isArray(data.scheduledPriceDays)
          ? JSON.stringify(data.scheduledPriceDays)
          : data.scheduledPriceDays
        : undefined

    const product = await prisma.product.update({
      where: { id },
      data: {
        ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.basePrice !== undefined && { basePrice: data.basePrice }),
        ...(data.isAvailable !== undefined && { isAvailable: data.isAvailable }),
        ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl }),
        ...(data.orderIndex !== undefined && { orderIndex: data.orderIndex }),
        ...(allergensStr !== undefined && { allergens: allergensStr }),
        ...(data.scheduledPrice !== undefined && { scheduledPrice: data.scheduledPrice }),
        ...(daysStr !== undefined && { scheduledPriceDays: daysStr }),
        ...(data.scheduledPriceStart !== undefined && { scheduledPriceStart: data.scheduledPriceStart }),
        ...(data.scheduledPriceEnd !== undefined && { scheduledPriceEnd: data.scheduledPriceEnd }),
        ...(data.scheduledPriceLabel !== undefined && { scheduledPriceLabel: data.scheduledPriceLabel }),
      },
    })

    return NextResponse.json({
      product: {
        ...product,
        basePrice: product.basePrice.toNumber(),
        scheduledPrice: product.scheduledPrice ? product.scheduledPrice.toNumber() : null,
      },
    })
  } catch (err) {
    if (err instanceof z.ZodError)
      return NextResponse.json({ error: 'Datos inválidos', details: err.flatten() }, { status: 400 })
    console.error('[PUT /api/menu/products/[id]]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

/**
 * DELETE /api/menu/products/[id]
 */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const user = session.user as { id: string; role: string }
    if (!ADMIN_ROLES.includes(user.role))
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

    const restaurantId = await getRestaurantId(user.id, user.role)
    if (!restaurantId)
      return NextResponse.json({ error: 'Sin restaurante asignado' }, { status: 403 })

    const { id } = await params
    const existing = await prisma.product.findFirst({ where: { id, restaurantId } })
    if (!existing) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

    await prisma.product.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[DELETE /api/menu/products/[id]]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
