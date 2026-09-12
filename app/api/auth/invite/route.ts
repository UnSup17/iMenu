import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendInviteEmail } from '@/lib/email'
import { randomUUID } from 'crypto'
import { Role } from '@prisma/client'
import { z } from 'zod'

const inviteSchema = z.object({
  email: z.string().email('Email inválido'),
  role: z.nativeEnum(Role),
  restaurantId: z.string().optional(),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const allowedRoles = ['SUPERADMIN', 'ORG_ADMIN', 'RESTAURANT_ADMIN']
  if (!allowedRoles.includes(session.user.role as string)) {
    return NextResponse.json(
      { error: 'No tienes permisos para invitar usuarios' },
      { status: 403 }
    )
  }

  try {
    const body = await req.json()
    const parsed = inviteSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Datos inválidos' },
        { status: 400 }
      )
    }

    const email = parsed.data.email.trim().toLowerCase()
    const role = parsed.data.role
    const targetRestaurantId =
      parsed.data.restaurantId || session.user.restaurantId

    if (!targetRestaurantId) {
      return NextResponse.json(
        { error: 'ID de restaurante no especificado' },
        { status: 400 }
      )
    }

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: targetRestaurantId },
      select: { id: true, name: true, organizationId: true },
    })

    if (!restaurant) {
      return NextResponse.json(
        { error: 'Restaurante no encontrado' },
        { status: 404 }
      )
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser && existingUser.passwordHash && existingUser.inviteAccepted) {
      return NextResponse.json(
        { error: 'Este usuario ya tiene una cuenta activa en el sistema' },
        { status: 409 }
      )
    }

    const inviteToken = randomUUID()
    const inviteExpiry = new Date(Date.now() + 72 * 60 * 60 * 1000) // 72h

    if (existingUser) {
      await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          role,
          restaurantId: restaurant.id,
          organizationId: restaurant.organizationId,
          inviteToken,
          inviteExpiry,
          inviteAccepted: false,
        },
      })
    } else {
      await prisma.user.create({
        data: {
          email,
          role,
          restaurantId: restaurant.id,
          organizationId: restaurant.organizationId,
          inviteToken,
          inviteExpiry,
          inviteAccepted: false,
        },
      })
    }

    await sendInviteEmail(email, inviteToken, restaurant.name, role)

    return NextResponse.json({
      success: true,
      message: 'Invitación enviada con éxito',
    })
  } catch (error) {
    console.error('[API Invite POST error]:', error)
    return NextResponse.json(
      { error: 'Error interno al procesar la invitación' },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const allowedRoles = ['SUPERADMIN', 'ORG_ADMIN', 'RESTAURANT_ADMIN']
  if (!allowedRoles.includes(session.user.role as string)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'Parámetro userId requerido' },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    // Solo se puede eliminar si aún no ha aceptado la invitación
    if (!user.inviteAccepted) {
      await prisma.user.delete({ where: { id: userId } })
    } else {
      return NextResponse.json(
        { error: 'No se puede revocar una invitación que ya fue aceptada' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Invitación revocada exitosamente',
    })
  } catch (error) {
    console.error('[API Invite DELETE error]:', error)
    return NextResponse.json(
      { error: 'Error al revocar la invitación' },
      { status: 500 }
    )
  }
}
