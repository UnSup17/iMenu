import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import dns from 'dns'

const ALLOWED_ROLES = ['SUPERADMIN', 'ORG_ADMIN', 'RESTAURANT_ADMIN']
const EXPECTED_CNAME = process.env.NEXT_PUBLIC_APP_CNAME || 'cname.imenu.app'

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

/**
 * Intenta resolver CNAME mediante DNS
 */
async function checkDnsCname(domain: string): Promise<boolean> {
  try {
    const records = await dns.promises.resolveCname(domain)
    return records.some((r) => r.toLowerCase().includes('imenu') || r.toLowerCase().includes('happyfox') || r.toLowerCase() === EXPECTED_CNAME.toLowerCase())
  } catch {
    // Si falla o no resuelve (típico en pruebas locales con dominios ficticios)
    return false
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const user = session.user as { id: string; role: string }
    if (!ALLOWED_ROLES.includes(user.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const restaurantId = await getRestaurantId(user.id, user.role)
    if (!restaurantId) {
      return NextResponse.json({ error: 'Sin restaurante asignado' }, { status: 403 })
    }

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: {
        id: true,
        slug: true,
        customDomain: true,
        customDomainVerified: true,
        customDomainCname: true,
      },
    })

    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurante no encontrado' }, { status: 404 })
    }

    return NextResponse.json({
      customDomain: restaurant.customDomain,
      customDomainVerified: restaurant.customDomainVerified,
      customDomainCname: restaurant.customDomainCname || EXPECTED_CNAME,
      expectedCname: EXPECTED_CNAME,
      restaurantSlug: restaurant.slug,
    })
  } catch (error) {
    console.error('[GET /api/brand/domain]', error)
    return NextResponse.json({ error: 'Error al consultar dominio personalizado' }, { status: 500 })
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
    if (!restaurantId) {
      return NextResponse.json({ error: 'Sin restaurante asignado' }, { status: 403 })
    }

    const body = await req.json()
    const rawDomain = (body.customDomain || '').trim().toLowerCase()

    if (!rawDomain) {
      return NextResponse.json({ error: 'El nombre de dominio es obligatorio' }, { status: 400 })
    }

    // Sanitizar formato de dominio (ej. menu.mirestaurante.com)
    const cleanDomain = rawDomain.replace(/^https?:\/\//, '').replace(/\/.*$/, '')
    const domainRegex = /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/
    if (!domainRegex.test(cleanDomain)) {
      return NextResponse.json({ error: 'Formato de dominio no válido (ej. menu.mirestaurante.com)' }, { status: 400 })
    }

    // Verificar si ya está en uso por otro restaurante
    const existing = await prisma.restaurant.findFirst({
      where: {
        customDomain: cleanDomain,
        id: { not: restaurantId },
      },
    })
    if (existing) {
      return NextResponse.json({ error: 'Este dominio ya está registrado por otro restaurante' }, { status: 409 })
    }

    // Comprobar DNS CNAME
    const isCnamePointing = await checkDnsCname(cleanDomain)
    // En entornos de desarrollo o si el usuario fuerza verificación
    const isVerified = isCnamePointing || Boolean(body.forceVerify)

    const updated = await prisma.restaurant.update({
      where: { id: restaurantId },
      data: {
        customDomain: cleanDomain,
        customDomainVerified: isVerified,
        customDomainCname: EXPECTED_CNAME,
      },
      select: {
        customDomain: true,
        customDomainVerified: true,
        customDomainCname: true,
      },
    })

    return NextResponse.json({
      success: true,
      customDomain: updated.customDomain,
      customDomainVerified: updated.customDomainVerified,
      customDomainCname: updated.customDomainCname,
      expectedCname: EXPECTED_CNAME,
      message: isVerified
        ? '¡Dominio verificado y asociado con éxito!'
        : 'Dominio guardado. Recuerda configurar el registro CNAME en tu proveedor DNS.',
    })
  } catch (error) {
    console.error('[POST /api/brand/domain]', error)
    return NextResponse.json({ error: 'Error al configurar dominio personalizado' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const user = session.user as { id: string; role: string }
    if (!ALLOWED_ROLES.includes(user.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const restaurantId = await getRestaurantId(user.id, user.role)
    if (!restaurantId) {
      return NextResponse.json({ error: 'Sin restaurante asignado' }, { status: 403 })
    }

    await prisma.restaurant.update({
      where: { id: restaurantId },
      data: {
        customDomain: null,
        customDomainVerified: false,
        customDomainCname: null,
      },
    })

    return NextResponse.json({ success: true, message: 'Dominio personalizado eliminado' })
  } catch (error) {
    console.error('[DELETE /api/brand/domain]', error)
    return NextResponse.json({ error: 'Error al eliminar dominio personalizado' }, { status: 500 })
  }
}
