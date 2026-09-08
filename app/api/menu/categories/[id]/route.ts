import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const UpdateCategorySchema = z.object({
  name: z.string().min(1).max(120).optional(),
  orderIndex: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
  isSpecialOffer: z.boolean().optional(),
  offerLabel: z.string().max(120).nullable().optional(),
  offerStartDate: z.string().datetime({ offset: true }).nullable().optional(),
  offerEndDate: z.string().datetime({ offset: true }).nullable().optional(),
  offerActiveDays: z.string().nullable().optional(),
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
 * PUT /api/menu/categories/[id]
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
    const data = UpdateCategorySchema.parse(body)

    // Verify ownership
    const existing = await prisma.category.findFirst({ where: { id, restaurantId } })
    if (!existing) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

    const category = await prisma.category.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.orderIndex !== undefined && { orderIndex: data.orderIndex }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.isSpecialOffer !== undefined && { isSpecialOffer: data.isSpecialOffer }),
        ...(data.offerLabel !== undefined && { offerLabel: data.offerLabel }),
        ...(data.offerStartDate !== undefined && {
          offerStartDate: data.offerStartDate ? new Date(data.offerStartDate) : null,
        }),
        ...(data.offerEndDate !== undefined && {
          offerEndDate: data.offerEndDate ? new Date(data.offerEndDate) : null,
        }),
        ...(data.offerActiveDays !== undefined && { offerActiveDays: data.offerActiveDays }),
        ...(data.offerStartTime !== undefined && { offerStartTime: data.offerStartTime }),
        ...(data.offerEndTime !== undefined && { offerEndTime: data.offerEndTime }),
      },
    })

    return NextResponse.json({ category })
  } catch (err) {
    if (err instanceof z.ZodError)
      return NextResponse.json({ error: 'Datos inválidos', details: err.flatten() }, { status: 400 })
    console.error('[PUT /api/menu/categories/[id]]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

/**
 * DELETE /api/menu/categories/[id]
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
    const existing = await prisma.category.findFirst({ where: { id, restaurantId } })
    if (!existing) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

    await prisma.category.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[DELETE /api/menu/categories/[id]]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
