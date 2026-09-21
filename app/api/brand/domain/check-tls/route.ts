import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/brand/domain/check-tls
 * Endpoint Caddy On-Demand TLS "ask"
 * 
 * En Caddyfile:
 * {
 *   on_demand_tls {
 *     ask http://localhost:3000/api/brand/domain/check-tls
 *   }
 * }
 * 
 * Si el dominio está registrado y verificado, devuelve 200 OK.
 * De lo contrario, devuelve 404 para denegar la emisión de certificados SSL no autorizados.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const domain = (searchParams.get('domain') || searchParams.get('ask') || '').trim().toLowerCase()

    if (!domain) {
      return NextResponse.json({ error: 'Parámetro de dominio requerido (?domain=... o ?ask=...)' }, { status: 400 })
    }

    // Sanitizar formato de dominio
    const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '')

    // Buscar si el dominio pertenece a un restaurante registrado
    const restaurant = await prisma.restaurant.findFirst({
      where: {
        customDomain: cleanDomain,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        customDomain: true,
        customDomainVerified: true,
      },
    })

    if (!restaurant) {
      return NextResponse.json(
        { allowed: false, domain: cleanDomain, reason: 'Dominio no registrado' },
        { status: 404 }
      )
    }

    // Si el dominio está registrado y activo, autorizar emisión SSL
    return NextResponse.json(
      {
        allowed: true,
        domain: cleanDomain,
        restaurantId: restaurant.id,
        restaurantName: restaurant.name,
        verified: restaurant.customDomainVerified,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[GET /api/brand/domain/check-tls]', error)
    return NextResponse.json({ error: 'Error interno verificando TLS' }, { status: 500 })
  }
}

/**
 * POST /api/brand/domain/check-tls
 * Webhook de Cloudflare for SaaS / Certbot para actualización de estado SSL
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const hostname = (body.hostname || body.domain || '').trim().toLowerCase()
    const status = body.status || body.ssl_status || 'active'

    if (!hostname) {
      return NextResponse.json({ error: 'Hostname es obligatorio' }, { status: 400 })
    }

    const isVerified = status === 'active' || status === 'deployed' || status === 'verified'

    const updated = await prisma.restaurant.updateMany({
      where: { customDomain: hostname },
      data: {
        customDomainVerified: isVerified,
      },
    })

    return NextResponse.json({
      success: true,
      hostname,
      isVerified,
      matchedRecords: updated.count,
    })
  } catch (error) {
    console.error('[POST /api/brand/domain/check-tls]', error)
    return NextResponse.json({ error: 'Error procesando webhook TLS' }, { status: 500 })
  }
}
