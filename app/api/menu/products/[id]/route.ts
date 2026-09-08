import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const UpdateProductSchema = z.object({
  categoryId: z.string().uuid().optional(),
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(500).nullable().optional(),
  basePrice: z.number().min(0).optional(),
  isAvailable: z.boolean().optional(),
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

    const product = await prisma.product.update({
      where: { id },
      data: {
        ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.basePrice !== undefined && { basePrice: data.basePrice }),
        ...(data.isAvailable !== undefined && { isAvailable: data.isAvailable }),
        ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl }),
      },
    })

    return NextResponse.json({ product: { ...product, basePrice: product.basePrice.toNumber() } })
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
