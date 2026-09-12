import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const ADMIN_ROLES = ['SUPERADMIN', 'ORG_ADMIN', 'RESTAURANT_ADMIN', 'MANAGER']

const ReorderSchema = z.object({
  categories: z
    .array(
      z.object({
        id: z.string().uuid(),
        orderIndex: z.number().int().min(0),
      })
    )
    .optional(),
  products: z
    .array(
      z.object({
        id: z.string().uuid(),
        orderIndex: z.number().int().min(0),
        categoryId: z.string().uuid().optional(),
      })
    )
    .optional(),
})

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

export async function PUT(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const user = session.user as { id: string; role: string }
    if (!ADMIN_ROLES.includes(user.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const restaurantId = await getRestaurantId(user.id, user.role)
    if (!restaurantId) {
      return NextResponse.json({ error: 'Sin restaurante asignado' }, { status: 403 })
    }

    const body = await req.json()
    const data = ReorderSchema.parse(body)

    const operations: any[] = []

    if (data.categories && data.categories.length > 0) {
      for (const cat of data.categories) {
        operations.push(
          prisma.category.updateMany({
            where: { id: cat.id, restaurantId },
            data: { orderIndex: cat.orderIndex },
          })
        )
      }
    }

    if (data.products && data.products.length > 0) {
      for (const prod of data.products) {
        operations.push(
          prisma.product.updateMany({
            where: { id: prod.id, restaurantId },
            data: {
              orderIndex: prod.orderIndex,
              ...(prod.categoryId && { categoryId: prod.categoryId }),
            },
          })
        )
      }
    }

    if (operations.length > 0) {
      await prisma.$transaction(operations)
    }

    return NextResponse.json({
      success: true,
      updatedCategories: data.categories?.length ?? 0,
      updatedProducts: data.products?.length ?? 0,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: error.flatten() }, { status: 400 })
    }
    console.error('[PUT /api/menu/reorder]', error)
    return NextResponse.json({ error: 'Error al reordenar catálogo' }, { status: 500 })
  }
}
