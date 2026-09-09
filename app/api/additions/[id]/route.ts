import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

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

const UpdateAdditionSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio').max(200).optional(),
  description: z.string().max(500).nullable().optional(),
  price: z.number().min(0, 'El precio no puede ser negativo').optional(),
  isAvailable: z.boolean().optional(),
  inventoryItemId: z.string().nullable().optional(),
  inventoryQuantity: z.number().positive().nullable().optional(),
  recipeProductId: z.string().nullable().optional(),
  categoryIds: z.array(z.string()).optional(),
  productIds: z.array(z.string()).optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const user = session.user as { id: string; role: string }
    if (!ADMIN_ROLES.includes(user.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const restaurantId = await getRestaurantId(user.id, user.role)
    if (!restaurantId) {
      return NextResponse.json({ error: 'Sin restaurante asignado' }, { status: 403 })
    }

    const { id } = await params

    const existing = await prisma.addition.findFirst({
      where: { id, restaurantId },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Adición no encontrada' }, { status: 404 })
    }

    const body = await req.json()
    const data = UpdateAdditionSchema.parse(body)

    const updated = await prisma.$transaction(async (tx) => {
      await tx.addition.update({
        where: { id },
        data: {
          ...(data.name !== undefined && { name: data.name.trim() }),
          ...(data.description !== undefined && { description: data.description?.trim() || null }),
          ...(data.price !== undefined && { price: data.price }),
          ...(data.isAvailable !== undefined && { isAvailable: data.isAvailable }),
          ...(data.inventoryItemId !== undefined && { inventoryItemId: data.inventoryItemId || null }),
          ...(data.inventoryQuantity !== undefined && { inventoryQuantity: data.inventoryQuantity ?? null }),
          ...(data.recipeProductId !== undefined && { recipeProductId: data.recipeProductId || null }),
        },
      })

      if (data.categoryIds !== undefined) {
        await tx.additionCategory.deleteMany({ where: { additionId: id } })
        if (data.categoryIds.length > 0) {
          await tx.additionCategory.createMany({
            data: data.categoryIds.map((categoryId) => ({
              additionId: id,
              categoryId,
            })),
            skipDuplicates: true,
          })
        }
      }

      if (data.productIds !== undefined) {
        await tx.additionProduct.deleteMany({ where: { additionId: id } })
        if (data.productIds.length > 0) {
          await tx.additionProduct.createMany({
            data: data.productIds.map((productId) => ({
              additionId: id,
              productId,
            })),
            skipDuplicates: true,
          })
        }
      }

      return await tx.addition.findUnique({
        where: { id },
        include: {
          categories: { include: { category: true } },
          products: { include: { product: true } },
          inventoryItem: true,
          recipeProduct: true,
        },
      })
    })

    return NextResponse.json({ addition: updated })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 })
    }
    console.error('[PATCH /api/additions/[id]] Error:', error)
    return NextResponse.json({ error: 'Error al actualizar adición' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const user = session.user as { id: string; role: string }
    if (!ADMIN_ROLES.includes(user.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const restaurantId = await getRestaurantId(user.id, user.role)
    if (!restaurantId) {
      return NextResponse.json({ error: 'Sin restaurante asignado' }, { status: 403 })
    }

    const { id } = await params

    const existing = await prisma.addition.findFirst({
      where: { id, restaurantId },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Adición no encontrada' }, { status: 404 })
    }

    await prisma.$transaction(async (tx) => {
      await tx.additionCategory.deleteMany({ where: { additionId: id } })
      await tx.additionProduct.deleteMany({ where: { additionId: id } })
      await tx.addition.delete({ where: { id } })
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[DELETE /api/additions/[id]] Error:', error)
    return NextResponse.json({ error: 'Error al eliminar adición' }, { status: 500 })
  }
}
