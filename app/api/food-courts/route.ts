import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const CreateFoodCourtSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  slug: z.string().min(2, 'El slug debe tener al menos 2 caracteres')
    .regex(/^[a-z0-9-]+$/, 'El slug solo puede contener letras minúsculas, números y guiones'),
  description: z.string().optional(),
  logoUrl: z.string().url().optional().or(z.literal('')),
  currency: z.string().default('COP'),
  organizationId: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const user = session.user as { organizationId?: string; role: string }
    const searchParams = request.nextUrl.searchParams
    const orgId = searchParams.get('organizationId') || user.organizationId

    const foodCourts = await prisma.foodCourt.findMany({
      where: {
        ...(user.role === 'SUPERADMIN'
          ? orgId ? { organizationId: orgId } : {}
          : user.organizationId ? { organizationId: user.organizationId } : {}),
      },
      include: {
        memberships: {
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
          orderBy: { orderIndex: 'asc' },
        },
        _count: {
          select: { tables: true, users: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(foodCourts)
  } catch (error) {
    console.error('[GET /api/food-courts] Error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const user = session.user as { organizationId?: string; role: string }
    const allowedRoles = ['SUPERADMIN', 'ORG_ADMIN']
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: 'Permisos insuficientes para crear plazas.' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = CreateFoodCourtSchema.parse(body)

    const orgId = parsed.organizationId || user.organizationId || null

    const foodCourt = await prisma.foodCourt.create({
      data: {
        name: parsed.name,
        slug: parsed.slug,
        description: parsed.description,
        logoUrl: parsed.logoUrl || null,
        currency: parsed.currency,
        organizationId: orgId,
      },
    })

    return NextResponse.json(foodCourt, { status: 201 })
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'Ya existe una plaza con ese slug.' }, { status: 409 })
    }
    console.error('[POST /api/food-courts] Error:', error)
    return NextResponse.json({ error: error.message || 'Error al crear plaza' }, { status: 400 })
  }
}
