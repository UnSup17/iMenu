import { PlanTier } from '@prisma/client'
import { PLAN_CONFIGS, getPlanPrice, SupportedBillingCurrency, enforceBranchLimitOnDowngrade } from './subscription'
import { prisma } from './prisma'
import { recordAuditLog } from './audit'

export interface StripeCheckoutOptions {
  organizationId: string
  tier: PlanTier
  interval: 'monthly' | 'yearly'
  currency?: SupportedBillingCurrency
  successUrl: string
  cancelUrl: string
  customerEmail?: string
}

/**
 * Crea una sesión de Stripe Checkout o URL simulada en ambiente de desarrollo con soporte multidivisa (COP, MXN, USD).
 */
export async function createStripeCheckoutSession(options: StripeCheckoutOptions): Promise<{ url: string; sessionId: string }> {
  const plan = PLAN_CONFIGS[options.tier]
  
  // Si no se especifica moneda, buscar la configuración del restaurante / país
  let billingCurrency: SupportedBillingCurrency = options.currency || 'COP'
  if (!options.currency) {
    const restaurant = await prisma.restaurant.findFirst({
      where: { organizationId: options.organizationId },
      include: { taxConfig: true },
    })
    if (restaurant?.taxConfig?.country === 'MX' || restaurant?.currency === 'MXN') {
      billingCurrency = 'MXN'
    } else if (restaurant?.currency === 'USD') {
      billingCurrency = 'USD'
    } else {
      billingCurrency = 'COP'
    }
  }

  const priceInfo = getPlanPrice(options.tier, options.interval, billingCurrency)
  const stripeKey = process.env.STRIPE_SECRET_KEY

  if (!stripeKey || stripeKey.startsWith('mock_')) {
    // Modo de simulación local / desarrollo
    const mockSessionId = `cs_test_${Date.now()}_${options.organizationId}`
    return {
      url: `${options.successUrl}?session_id=${mockSessionId}&tier=${options.tier}&interval=${options.interval}&currency=${priceInfo.currency}`,
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
      'line_items[0][price_data][currency]': priceInfo.currency,
      'line_items[0][price_data][product_data][name]': `iMenu ${plan.name} (${options.interval === 'yearly' ? 'Anual' : 'Mensual'})`,
      'line_items[0][price_data][unit_amount]': String(priceInfo.amount * 100), // En centavos
      'line_items[0][price_data][recurring][interval]': options.interval === 'yearly' ? 'year' : 'month',
      'line_items[0][quantity]': '1',
      'metadata[organizationId]': options.organizationId,
      'metadata[tier]': options.tier,
      'metadata[currency]': priceInfo.currency,
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

  await recordAuditLog({
    organizationId,
    event: 'PLAN_UPGRADE',
    details: {
      newTier: tier,
      stripeCustomerId,
      stripeSubId,
    },
  })

  // Asegurar consistencia de sucursales según el límite del nuevo plan
  await enforceBranchLimitOnDowngrade(organizationId, tier)
}
