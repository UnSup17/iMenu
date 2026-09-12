import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const CategorySchema = z.object({
  name: z.string().min(1).max(120),
  orderIndex: z.number().int().min(0).optional().default(0),
  isActive: z.boolean().optional().default(true),
  // Oferta especial
  isSpecialOffer: z.boolean().optional().default(false),
  offerLabel: z.string().max(120).nullable().optional(),
  offerStartDate: z.string().datetime({ offset: true }).nullable().optional(),
  offerEndDate: z.string().datetime({ offset: true }).nullable().optional(),
  offerActiveDays: z.string().nullable().optional(), // JSON "[0,1,2,3,4,5,6]"
  offerStartTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
    .nullable()
    .optional(),
  offerEndTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
    .nullable()
    .optional(),
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
 * GET /api/menu/categories
 * Lista todas las categorías del restaurante con sus productos.
 */
export async function GET(_req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const user = session.user as { id: string; role: string }
    if (!ADMIN_ROLES.includes(user.role))
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

    const restaurantId = await getRestaurantId(user.id, user.role)
    if (!restaurantId)
      return NextResponse.json({ error: 'Sin restaurante asignado' }, { status: 403 })

    const categories = await prisma.category.findMany({
      where: { restaurantId },
      orderBy: { orderIndex: 'asc' },
      include: {
        products: {
          orderBy: { orderIndex: 'asc' },
          select: {
            id: true,
            name: true,
            description: true,
            basePrice: true,
            isAvailable: true,
            imageUrl: true,
            orderIndex: true,
            allergens: true,
            scheduledPrice: true,
            scheduledPriceDays: true,
            scheduledPriceStart: true,
            scheduledPriceEnd: true,
            scheduledPriceLabel: true,
          },
        },
      },
    })

    return NextResponse.json({
      categories: categories.map((c) => ({
        ...c,
        products: c.products.map((p) => ({
          ...p,
          basePrice: p.basePrice.toNumber(),
          scheduledPrice: p.scheduledPrice ? p.scheduledPrice.toNumber() : null,
        })),
      })),
    })
  } catch (err) {
    console.error('[GET /api/menu/categories]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

/**
 * POST /api/menu/categories
 * Crea una nueva categoría (regular o especial).
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
    const data = CategorySchema.parse(body)

    const category = await prisma.category.create({
      data: {
        restaurantId,
        name: data.name,
        orderIndex: data.orderIndex ?? 0,
        isActive: data.isActive ?? true,
        isSpecialOffer: data.isSpecialOffer ?? false,
        offerLabel: data.offerLabel ?? null,
        offerStartDate: data.offerStartDate ? new Date(data.offerStartDate) : null,
        offerEndDate: data.offerEndDate ? new Date(data.offerEndDate) : null,
        offerActiveDays: data.offerActiveDays ?? null,
        offerStartTime: data.offerStartTime ?? null,
        offerEndTime: data.offerEndTime ?? null,
      },
    })

    return NextResponse.json({ category }, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError)
      return NextResponse.json({ error: 'Datos inválidos', details: err.flatten() }, { status: 400 })
    console.error('[POST /api/menu/categories]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
