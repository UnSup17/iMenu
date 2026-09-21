import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getReferralStats, validateReferralCode, getOrCreateReferralCode } from '@/lib/referrals'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const codeToValidate = searchParams.get('validate')

    // Si es para validar un código públicamente (ej. en registro)
    if (codeToValidate) {
      const validation = await validateReferralCode(codeToValidate)
      if (!validation.valid) {
        return NextResponse.json({ valid: false, error: validation.error }, { status: 400 })
      }
      return NextResponse.json({
        valid: true,
        code: validation.referralCode.code,
        discountPercent: validation.referralCode.discountPercent,
      })
    }

    // Si es para consultar estadísticas de la organización autenticada
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    let orgId = (session.user as any).organizationId

    // Si no está en el token, buscar en la BD
    if (!orgId) {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: { restaurant: true },
      })
      orgId = user?.restaurant?.organizationId
    }

    if (!orgId) {
      return NextResponse.json(
        { error: 'No se encontró organización asociada a este usuario' },
        { status: 404 }
      )
    }

    const stats = await getReferralStats(orgId)
    return NextResponse.json(stats)
  } catch (error: any) {
    console.error('Error en /api/referrals:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    let orgId = (session.user as any).organizationId

    if (!orgId) {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: { restaurant: true },
      })
      orgId = user?.restaurant?.organizationId
    }

    if (!orgId) {
      return NextResponse.json(
        { error: 'No se encontró organización asociada a este usuario' },
        { status: 404 }
      )
    }

    const body = await req.json().catch(() => ({}))
    const requestedCode = body.customCode?.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '')

    if (requestedCode && requestedCode.length >= 4) {
      // Verificar si ya existe en otra organización
      const existing = await prisma.referralCode.findUnique({
        where: { code: requestedCode },
      })

      if (existing && existing.organizationId !== orgId) {
        return NextResponse.json(
          { error: 'Este código ya está en uso por otro negocio' },
          { status: 409 }
        )
      }

      // Actualizar o crear
      const current = await getOrCreateReferralCode(orgId)
      const updated = await prisma.referralCode.update({
        where: { id: current.id },
        data: { code: requestedCode },
      })

      return NextResponse.json({ success: true, code: updated.code })
    }

    // Si no se envió customCode, simplemente asegurar que exista
    const referral = await getOrCreateReferralCode(orgId)
    return NextResponse.json({ success: true, code: referral.code })
  } catch (error: any) {
    console.error('Error en POST /api/referrals:', error)
    return NextResponse.json({ error: 'Error interno al actualizar código' }, { status: 500 })
  }
}
