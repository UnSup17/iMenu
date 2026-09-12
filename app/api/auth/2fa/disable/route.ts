import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import * as OTPAuth from 'otpauth'
import { z } from 'zod'

const disableSchema = z.object({
  code: z.string().length(6, 'El código debe tener 6 dígitos'),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id || !session?.user?.email) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const parsed = disableSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Datos inválidos' },
        { status: 400 }
      )
    }

    const { code } = parsed.data

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { twoFactorSecret: true, twoFactorEnabled: true },
    })

    if (!user?.twoFactorEnabled || !user?.twoFactorSecret) {
      return NextResponse.json(
        { error: 'El usuario no tiene 2FA habilitado' },
        { status: 400 }
      )
    }

    const totp = new OTPAuth.TOTP({
      issuer: 'iMenu',
      label: session.user.email,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(user.twoFactorSecret),
    })

    const delta = totp.validate({ token: code, window: 1 })
    if (delta === null) {
      return NextResponse.json(
        { error: 'Código 2FA incorrecto o expirado' },
        { status: 400 }
      )
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        twoFactorSecret: null,
        twoFactorEnabled: false,
      },
    })

    return NextResponse.json({
      success: true,
      message: '2FA desactivado correctamente',
    })
  } catch (error) {
    console.error('[2FA disable error]:', error)
    return NextResponse.json(
      { error: 'Error al desactivar autenticación de dos factores' },
      { status: 500 }
    )
  }
}
