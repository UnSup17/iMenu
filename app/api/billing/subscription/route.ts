import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { PlanTier } from '@prisma/client'
import { getOrCreateOrganizationSubscription, isSubscriptionActive, PLAN_CONFIGS, checkBranchLimit } from '@/lib/subscription'
import { createStripeCheckoutSession, handleSubscriptionUpgrade } from '@/lib/stripe'
import { z } from 'zod'

const checkoutSchema = z.object({
  tier: z.nativeEnum(PlanTier),
  interval: z.enum(['monthly', 'yearly']).default('monthly'),
  directUpgrade: z.boolean().optional(), // Para pruebas / bypass
})

export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const user = session.user as { id?: string; organizationId?: string; restaurantId?: string }
    let orgId = user.organizationId

    // Si el usuario no tiene orgId pero sí restaurantId, buscar la organización o crear una
    if (!orgId && user.restaurantId) {
      const rest = await prisma.restaurant.findUnique({
        where: { id: user.restaurantId },
        include: { organization: true },
      })
      if (rest?.organizationId) {
        orgId = rest.organizationId
      } else if (rest) {
        // Crear organización automática para el restaurante
        const newOrg = await prisma.organization.create({
          data: {
            name: `${rest.name} (Org)`,
            slug: `${rest.slug}-org`,
            plan: PlanTier.BASIC,
          },
        })
        await prisma.restaurant.update({
          where: { id: rest.id },
          data: { organizationId: newOrg.id },
        })
        orgId = newOrg.id
      }
    }

    if (!orgId) {
      return NextResponse.json({ error: 'No se encontró organización asociada' }, { status: 400 })
    }

    const sub = await getOrCreateOrganizationSubscription(orgId)
    const statusInfo = isSubscriptionActive(sub)
    const branchInfo = await checkBranchLimit(orgId)
    const currentPlan = PLAN_CONFIGS[sub.tier]

    return NextResponse.json({
      subscription: sub,
      statusInfo,
      branchInfo,
      currentPlan,
      availablePlans: PLAN_CONFIGS,
    })
  } catch (error) {
    console.error('Error al obtener suscripción:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const user = session.user as { id?: string; organizationId?: string; restaurantId?: string; email?: string }
    let orgId = user.organizationId

    if (!orgId && user.restaurantId) {
      const rest = await prisma.restaurant.findUnique({ where: { id: user.restaurantId } })
      orgId = rest?.organizationId || undefined
    }

    if (!orgId) {
      return NextResponse.json({ error: 'Organización requerida' }, { status: 400 })
    }

    const body = await req.json()
    const parsed = checkoutSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 })
    }

    const { tier, interval, directUpgrade } = parsed.data

    // Si se solicita simulación directa o upgrade en ambiente local
    if (directUpgrade || process.env.NODE_ENV === 'development') {
      await handleSubscriptionUpgrade(orgId, tier)
      return NextResponse.json({ success: true, message: `Plan actualizado a ${tier} exitosamente` })
    }

    const origin = req.headers.get('origin') || 'http://localhost:3000'
    const sessionRes = await createStripeCheckoutSession({
      organizationId: orgId,
      tier,
      interval,
      successUrl: `${origin}/dashboard/settings/billing?success=true`,
      cancelUrl: `${origin}/dashboard/settings/billing?canceled=true`,
      customerEmail: user.email || undefined,
    })

    return NextResponse.json(sessionRes)
  } catch (error) {
    console.error('Error en checkout de suscripción:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
