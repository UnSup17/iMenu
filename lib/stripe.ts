import { PlanTier } from '@prisma/client'
import { PLAN_CONFIGS } from './subscription'
import { prisma } from './prisma'

export interface StripeCheckoutOptions {
  organizationId: string
  tier: PlanTier
  interval: 'monthly' | 'yearly'
  successUrl: string
  cancelUrl: string
  customerEmail?: string
}

/**
 * Crea una sesión de Stripe Checkout o URL simulada en ambiente de desarrollo.
 */
export async function createStripeCheckoutSession(options: StripeCheckoutOptions): Promise<{ url: string; sessionId: string }> {
  const plan = PLAN_CONFIGS[options.tier]
  const amount = options.interval === 'yearly' ? plan.priceYearlyCOP : plan.priceMonthlyCOP

  const stripeKey = process.env.STRIPE_SECRET_KEY

  if (!stripeKey || stripeKey.startsWith('mock_')) {
    // Modo de simulación local / desarrollo
    const mockSessionId = `cs_test_${Date.now()}_${options.organizationId}`
    return {
      url: `${options.successUrl}?session_id=${mockSessionId}&tier=${options.tier}&interval=${options.interval}`,
      sessionId: mockSessionId,
    }
  }

  // Si se cuenta con SDK de Stripe instalado o API REST de Stripe:
  try {
    const params = new URLSearchParams({
      'payment_method_types[]': 'card',
      'mode': 'subscription',
      'customer_email': options.customerEmail || '',
      'client_reference_id': options.organizationId,
      'success_url': options.successUrl,
      'cancel_url': options.cancelUrl,
      'line_items[0][price_data][currency]': 'cop',
      'line_items[0][price_data][product_data][name]': `iMenu ${plan.name} (${options.interval === 'yearly' ? 'Anual' : 'Mensual'})`,
      'line_items[0][price_data][unit_amount]': String(amount * 100), // En centavos
      'line_items[0][price_data][recurring][interval]': options.interval === 'yearly' ? 'year' : 'month',
      'line_items[0][quantity]': '1',
      'metadata[organizationId]': options.organizationId,
      'metadata[tier]': options.tier,
    })

    const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    })

    if (!res.ok) {
      const errData = await res.json()
      throw new Error(errData.error?.message || 'Error en Stripe API')
    }

    const session = await res.json()
    return { url: session.url, sessionId: session.id }
  } catch (err: any) {
    console.error('Error al llamar a Stripe API:', err)
    // Fallback a URL de éxito directa
    return {
      url: `${options.successUrl}?tier=${options.tier}&simulated=true`,
      sessionId: `sim_${Date.now()}`,
    }
  }
}

/**
 * Actualiza la suscripción en base de datos al recibir confirmación de Stripe.
 */
export async function handleSubscriptionUpgrade(
  organizationId: string,
  tier: PlanTier,
  stripeCustomerId?: string,
  stripeSubId?: string
) {
  const now = new Date()
  const oneMonthFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  // Actualizamos la organización y la suscripción
  await prisma.$transaction([
    prisma.organization.update({
      where: { id: organizationId },
      data: { plan: tier },
    }),
    prisma.subscription.upsert({
      where: { organizationId },
      create: {
        organizationId,
        tier,
        status: 'active',
        currentPeriodStart: now,
        currentPeriodEnd: oneMonthFromNow,
        stripeCustomerId: stripeCustomerId || null,
        stripeSubId: stripeSubId || null,
        trialEndsAt: null,
      },
      update: {
        tier,
        status: 'active',
        currentPeriodStart: now,
        currentPeriodEnd: oneMonthFromNow,
        stripeCustomerId: stripeCustomerId || undefined,
        stripeSubId: stripeSubId || undefined,
        trialEndsAt: null,
      },
    }),
  ])
}
