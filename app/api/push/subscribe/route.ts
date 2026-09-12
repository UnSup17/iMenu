import { NextResponse } from 'next/server'
import { saveTablePushSubscription } from '@/lib/push/send'
import { publicKey } from '@/lib/push/vapid'

export async function GET() {
  return NextResponse.json({
    publicKey,
  })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { tableId, subscription } = body

    if (!tableId || !subscription || !subscription.endpoint) {
      return NextResponse.json(
        { error: 'tableId y subscription válidos son requeridos' },
        { status: 400 }
      )
    }

    await saveTablePushSubscription(tableId, subscription)

    return NextResponse.json({
      success: true,
      message: 'Suscripción Web Push registrada con éxito',
    })
  } catch (error: any) {
    console.error('[API /api/push/subscribe]', error)
    return NextResponse.json(
      { error: error.message || 'Error registrando suscripción' },
      { status: 500 }
    )
  }
}
