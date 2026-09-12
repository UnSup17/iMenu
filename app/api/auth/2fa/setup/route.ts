import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import * as OTPAuth from 'otpauth'
import QRCode from 'qrcode'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id || !session?.user?.email) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  try {
    const secret = new OTPAuth.Secret({ size: 20 })

    const totp = new OTPAuth.TOTP({
      issuer: 'iMenu',
      label: session.user.email,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret,
    })

    const uri = totp.toString()
    const qrCodeDataUrl = await QRCode.toDataURL(uri, {
      margin: 2,
      width: 260,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    })

    return NextResponse.json({
      secret: secret.base32,
      qrCodeDataUrl,
      uri,
    })
  } catch (error) {
    console.error('[2FA setup error]:', error)
    return NextResponse.json({ error: 'Error al generar setup 2FA' }, { status: 500 })
  }
}
