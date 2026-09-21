import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { purgeMenuCdnCache } from '@/lib/storage'

const ADMIN_ROLES = ['SUPERADMIN', 'ORG_ADMIN', 'RESTAURANT_ADMIN', 'MANAGER']

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const user = session.user as { id: string; role: string; restaurantId?: string }
    if (!ADMIN_ROLES.includes(user.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    let body: { slug?: string; restaurantId?: string; paths?: string[] } = {}
    try {
      body = await req.json()
    } catch {
      // Body vacío o no-json permitido
    }

    let targetSlug = body.slug
    const targetRestaurantId = body.restaurantId || user.restaurantId

    if (!targetSlug && targetRestaurantId) {
      const rest = await prisma.restaurant.findUnique({
        where: { id: targetRestaurantId },
        select: { slug: true },
      })
      targetSlug = rest?.slug
    }

    if (!targetSlug && user.role === 'SUPERADMIN') {
      const first = await prisma.restaurant.findFirst({ select: { slug: true } })
      targetSlug = first?.slug
    }

    if (!targetSlug) {
      return NextResponse.json(
        { error: 'No se pudo determinar el restaurante a purgar' },
        { status: 400 }
      )
    }

    const result = await purgeMenuCdnCache(targetSlug, {
      revalidatePaths: body.paths,
    })

    return NextResponse.json({
      ...result,
      message: `Caché CDN purgada exitosamente para "${targetSlug}"`,
    })
  } catch (error) {
    console.error('[POST /api/menu/purge-cache] Error:', error)
    return NextResponse.json(
      { error: 'Error al purgar la caché CDN' },
      { status: 500 }
    )
  }
}
