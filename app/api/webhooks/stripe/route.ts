import { NextResponse } from 'next/server'
import { handleSubscriptionUpgrade } from '@/lib/stripe'
import { PlanTier } from '@prisma/client'

export async function POST(req: Request) {
  try {
    const rawBody = await req.text()
    let event: any

    try {
      event = JSON.parse(rawBody)
    } catch {
      return NextResponse.json({ error: 'Payload JSON inválido' }, { status: 400 })
    }

    const eventType = event.type

    switch (eventType) {
      case 'checkout.session.completed': {
        const session = event.data.object
        const organizationId = session.metadata?.organizationId || session.client_reference_id
        const tier = (session.metadata?.tier as PlanTier) || PlanTier.PRO

        if (organizationId) {
          await handleSubscriptionUpgrade(
            organizationId,
            tier,
            session.customer as string,
            session.subscription as string
          )
        }
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object
        console.log(`Pago recibido para suscripción ${invoice.subscription}`)
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object
        console.log(`Suscripción cancelada: ${sub.id}`)
        break
      }

      default:
        console.log(`Evento de Stripe no manejado: ${eventType}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Error procesando webhook de Stripe:', error)
    return NextResponse.json({ error: 'Error procesando webhook' }, { status: 500 })
  }
}
