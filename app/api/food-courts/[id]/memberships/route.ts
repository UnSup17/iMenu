import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

interface RouteParams {
  params: Promise<{ id: string }>
}

const AddMembershipSchema = z.object({
  restaurantId: z.string().min(1, 'restaurantId es requerido'),
  orderIndex: z.number().int().optional(),
})

const ReorderMembershipsSchema = z.object({
  memberships: z.array(
    z.object({
      restaurantId: z.string().min(1),
      orderIndex: z.number().int(),
    }),
  ),
})

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const user = session.user as { role: string; foodCourtId?: string }
    const allowedRoles = ['SUPERADMIN', 'ORG_ADMIN', 'FOOD_COURT_ADMIN']
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 })
    }

    const { id: foodCourtId } = await params
    if (user.role === 'FOOD_COURT_ADMIN' && user.foodCourtId && user.foodCourtId !== foodCourtId) {
      return NextResponse.json({ error: 'No autorizado para esta plaza' }, { status: 403 })
    }
    const body = await request.json()
    const parsed = AddMembershipSchema.parse(body)

    // Si orderIndex no se especifica, calcular el siguiente
    let orderIndex = parsed.orderIndex
    if (orderIndex === undefined) {
      const maxOrder = await prisma.foodCourtMembership.aggregate({
        where: { foodCourtId },
        _max: { orderIndex: true },
      })
      orderIndex = (maxOrder._max.orderIndex ?? -1) + 1
    }

    const membership = await prisma.foodCourtMembership.upsert({
      where: {
        foodCourtId_restaurantId: {
          foodCourtId,
          restaurantId: parsed.restaurantId,
        },
      },
      create: {
        foodCourtId,
        restaurantId: parsed.restaurantId,
        orderIndex,
        isActive: true,
      },
      update: {
        isActive: true,
        orderIndex,
      },
      include: {
        restaurant: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
            cuisineType: true,
          },
        },
      },
    })

    return NextResponse.json(membership, { status: 201 })
  } catch (error: any) {
    console.error('[POST /api/food-courts/[id]/memberships] Error:', error)
    return NextResponse.json({ error: error.message || 'Error al agregar restaurante' }, { status: 400 })
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const user = session.user as { role: string; foodCourtId?: string }
    const allowedRoles = ['SUPERADMIN', 'ORG_ADMIN', 'FOOD_COURT_ADMIN']
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 })
    }

    const { id: foodCourtId } = await params
    if (user.role === 'FOOD_COURT_ADMIN' && user.foodCourtId && user.foodCourtId !== foodCourtId) {
      return NextResponse.json({ error: 'No autorizado para esta plaza' }, { status: 403 })
    }
    const body = await request.json()

    // Caso 1: Reordenar membresías
    if (body.memberships && Array.isArray(body.memberships)) {
      const parsed = ReorderMembershipsSchema.parse(body)
      await prisma.$transaction(
        parsed.memberships.map((m) =>
          prisma.foodCourtMembership.update({
            where: {
              foodCourtId_restaurantId: {
                foodCourtId,
                restaurantId: m.restaurantId,
              },
            },
            data: { orderIndex: m.orderIndex },
          }),
        ),
      )
      return NextResponse.json({ success: true })
    }

    // Caso 2: Actualizar comisión o estado de un restaurante individual
    if (body.restaurantId) {
      const updateData: Record<string, any> = {}
      if (typeof body.commissionPercentage === 'number') {
        updateData.commissionPercentage = body.commissionPercentage
      }
      if (typeof body.commissionFixedFee === 'number') {
        updateData.commissionFixedFee = body.commissionFixedFee
      }
      if (typeof body.isActive === 'boolean') {
        updateData.isActive = body.isActive
      }

      const updated = await prisma.foodCourtMembership.update({
        where: {
          foodCourtId_restaurantId: {
            foodCourtId,
            restaurantId: body.restaurantId,
          },
        },
        data: updateData,
        include: {
          restaurant: {
            select: {
              id: true,
              name: true,
              slug: true,
              logoUrl: true,
              cuisineType: true,
            },
          },
        },
      })

      return NextResponse.json(updated)
    }

    return NextResponse.json({ error: 'Datos no reconocidos' }, { status: 400 })
  } catch (error: any) {
    console.error('[PATCH /api/food-courts/[id]/memberships] Error:', error)
    return NextResponse.json({ error: error.message || 'Error al actualizar membresía' }, { status: 400 })
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const user = session.user as { role: string; foodCourtId?: string }
    const allowedRoles = ['SUPERADMIN', 'ORG_ADMIN', 'FOOD_COURT_ADMIN']
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 })
    }

    const { id: foodCourtId } = await params
    if (user.role === 'FOOD_COURT_ADMIN' && user.foodCourtId && user.foodCourtId !== foodCourtId) {
      return NextResponse.json({ error: 'No autorizado para esta plaza' }, { status: 403 })
    }
    const restaurantId = request.nextUrl.searchParams.get('restaurantId')

    if (!restaurantId) {
      return NextResponse.json({ error: 'restaurantId es requerido' }, { status: 400 })
    }

    await prisma.foodCourtMembership.delete({
      where: {
        foodCourtId_restaurantId: {
          foodCourtId,
          restaurantId,
        },
      },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[DELETE /api/food-courts/[id]/memberships] Error:', error)
    return NextResponse.json({ error: error.message || 'Error al remover restaurante' }, { status: 400 })
  }
}
