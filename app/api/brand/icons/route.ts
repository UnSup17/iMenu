import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const ALLOWED_ROLES = ['SUPERADMIN', 'ORG_ADMIN', 'RESTAURANT_ADMIN']

const IconsPayloadSchema = z.object({
  favicon: z.string().optional(),
  appleTouchIcon: z.string().optional(),
  icon192: z.string().optional(),
  icon512: z.string().optional(),
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

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const user = session.user as { id: string; role: string }
    const restaurantId = await getRestaurantId(user.id, user.role)
    if (!restaurantId) return NextResponse.json({ error: 'Sin restaurante' }, { status: 403 })

    const theme = await prisma.brandTheme.findFirst({
      where: { restaurantId },
      select: { pwaIcons: true, logoUrl: true },
    })

    return NextResponse.json({
      icons: theme?.pwaIcons || null,
      logoUrl: theme?.logoUrl || null,
    })
  } catch (error) {
    console.error('[GET /api/brand/icons]', error)
    return NextResponse.json({ error: 'Error al consultar iconos PWA' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const user = session.user as { id: string; role: string }
    if (!ALLOWED_ROLES.includes(user.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const restaurantId = await getRestaurantId(user.id, user.role)
    if (!restaurantId) return NextResponse.json({ error: 'Sin restaurante' }, { status: 403 })

    const body = await req.json().catch(() => ({}))
    const parsed = IconsPayloadSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Estructura de iconos inválida' }, { status: 400 })
    }

    const theme = await prisma.brandTheme.upsert({
      where: { restaurantId },
      update: {
        pwaIcons: parsed.data,
      },
      create: {
        restaurantId,
        pwaIcons: parsed.data,
      },
    })

    return NextResponse.json({
      success: true,
      pwaIcons: theme.pwaIcons,
      message: '¡Iconos PWA guardados correctamente!',
    })
  } catch (error) {
    console.error('[POST /api/brand/icons]', error)
    return NextResponse.json({ error: 'Error al guardar iconos PWA' }, { status: 500 })
  }
}
