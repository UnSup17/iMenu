import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

interface RouteParams {
  params: Promise<{ id: string }>
}

const UpdateFoodCourtSchema = z.object({
  name: z.string().min(2).optional(),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/).optional(),
  description: z.string().nullable().optional(),
  logoUrl: z.string().nullable().optional(),
  currency: z.string().optional(),
  isActive: z.boolean().optional(),
})

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { id } = await params

    const foodCourt = await prisma.foodCourt.findUnique({
      where: { id },
      include: {
        memberships: {
          include: {
            restaurant: {
              select: {
                id: true,
                name: true,
                slug: true,
                logoUrl: true,
                description: true,
                cuisineType: true,
                isActive: true,
              },
            },
          },
          orderBy: { orderIndex: 'asc' },
        },
        tables: {
          orderBy: { tableNumber: 'asc' },
        },
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    })

    if (!foodCourt) {
      return NextResponse.json({ error: 'Plaza no encontrada' }, { status: 404 })
    }

    return NextResponse.json(foodCourt)
  } catch (error) {
    console.error('[GET /api/food-courts/[id]] Error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const user = session.user as { role: string }
    const allowedRoles = ['SUPERADMIN', 'ORG_ADMIN']
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const parsed = UpdateFoodCourtSchema.parse(body)

    const updated = await prisma.foodCourt.update({
      where: { id },
      data: parsed,
    })

    return NextResponse.json(updated)
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'Ya existe una plaza con ese slug.' }, { status: 409 })
    }
    console.error('[PUT /api/food-courts/[id]] Error:', error)
    return NextResponse.json({ error: error.message || 'Error al actualizar plaza' }, { status: 400 })
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const user = session.user as { role: string }
    if (user.role !== 'SUPERADMIN' && user.role !== 'ORG_ADMIN') {
      return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 })
    }

    const { id } = await params

    await prisma.foodCourt.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[DELETE /api/food-courts/[id]] Error:', error)
    return NextResponse.json({ error: error.message || 'Error al eliminar plaza' }, { status: 400 })
  }
}
