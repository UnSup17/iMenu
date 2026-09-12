import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  // Verificar que el usuario real sea SUPERADMIN
  const realUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  })

  if (realUser?.role !== 'SUPERADMIN') {
    return NextResponse.json(
      { error: 'Acceso denegado: se requiere rol SUPERADMIN' },
      { status: 403 }
    )
  }

  try {
    const { targetUserId, targetRestaurantId } = await req.json()

    let targetUser = null

    if (targetUserId) {
      targetUser = await prisma.user.findUnique({
        where: { id: targetUserId },
      })
    } else if (targetRestaurantId) {
      targetUser = await prisma.user.findFirst({
        where: {
          restaurantId: targetRestaurantId,
          role: 'RESTAURANT_ADMIN',
        },
      })

      // Fallback a cualquier usuario del restaurante
      if (!targetUser) {
        targetUser = await prisma.user.findFirst({
          where: { restaurantId: targetRestaurantId },
        })
      }
    }

    if (!targetUser) {
      return NextResponse.json(
        { error: 'No se encontró un usuario para impersonar' },
        { status: 404 }
      )
    }

    const cookieStore = await cookies()
    cookieStore.set('imenu_impersonate_user_id', targetUser.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 2, // 2 horas
    })

    return NextResponse.json({
      success: true,
      targetUser: {
        id: targetUser.id,
        email: targetUser.email,
        name: targetUser.name,
      },
    })
  } catch (error) {
    console.error('[Impersonate error]:', error)
    return NextResponse.json(
      { error: 'Error al iniciar impersonación' },
      { status: 500 }
    )
  }
}
