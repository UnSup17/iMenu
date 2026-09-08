import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { PlanTier } from '@prisma/client'
import { z } from 'zod'

const updateOrgSchema = z.object({
  id: z.string(),
  plan: z.nativeEnum(PlanTier).optional(),
  name: z.string().min(2).optional(),
})

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const user = session.user as { role?: string }
    if (user.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Acceso restringido a Superadmin' }, { status: 403 })
    }

    const organizations = await prisma.organization.findMany({
      include: {
        subscription: true,
        restaurants: {
          select: { id: true, name: true, slug: true, isActive: true },
        },
        _count: {
          select: { users: true, restaurants: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(organizations)
  } catch (error) {
    console.error('Error al obtener organizaciones:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const user = session.user as { role?: string }
    if (user.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Acceso restringido a Superadmin' }, { status: 403 })
    }

    const body = await req.json()
    const parsed = updateOrgSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 })
    }

    const { id, plan, name } = parsed.data

    const updated = await prisma.organization.update({
      where: { id },
      data: {
        ...(plan && { plan }),
        ...(name && { name }),
      },
      include: { subscription: true, restaurants: true },
    })

    // Si cambió el plan, actualizar también la suscripción
    if (plan) {
      await prisma.subscription.updateMany({
        where: { organizationId: id },
        data: { tier: plan },
      })
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error al actualizar organización:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
