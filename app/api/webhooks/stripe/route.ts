import { NextResponse } from 'next/server'
import { handleSubscriptionUpgrade } from '@/lib/stripe'
import { enforceBranchLimitOnDowngrade } from '@/lib/subscription'
import { recordAuditLog } from '@/lib/audit'
import { prisma } from '@/lib/prisma'
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
        if (invoice.subscription) {
          await prisma.subscription.updateMany({
            where: { stripeSubId: invoice.subscription as string },
            data: { status: 'active' },
          })
        }
        console.log(`Pago recibido para suscripción ${invoice.subscription}`)
        break
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object
        const stripeSubId = sub.id as string
        const customerId = sub.customer as string

        const existingSub = await prisma.subscription.findFirst({
          where: {
            OR: [
              { stripeSubId },
              { stripeCustomerId: customerId },
            ],
          },
        })

        if (existingSub) {
          const newStatus = sub.status // 'active', 'past_due', 'canceled', etc.
          const tierFromMetadata = (sub.metadata?.tier as PlanTier) || existingSub.tier

          if (newStatus === 'canceled' || newStatus === 'unpaid') {
            await prisma.$transaction([
              prisma.subscription.update({
                where: { id: existingSub.id },
                data: {
                  status: 'cancelled',
                  tier: PlanTier.BASIC,
                },
              }),
              prisma.organization.update({
                where: { id: existingSub.organizationId },
                data: { plan: PlanTier.BASIC },
              }),
            ])

            await enforceBranchLimitOnDowngrade(existingSub.organizationId, PlanTier.BASIC)

            await recordAuditLog({
              organizationId: existingSub.organizationId,
              event: 'PLAN_DOWNGRADE',
              details: {
                previousTier: existingSub.tier,
                newTier: PlanTier.BASIC,
                reason: `Stripe status: ${newStatus}`,
                stripeSubId,
              },
            })
          } else {
            // Actualización de plan/periodo
            await prisma.$transaction([
              prisma.subscription.update({
                where: { id: existingSub.id },
                data: {
                  status: newStatus,
                  tier: tierFromMetadata,
                  currentPeriodEnd: sub.current_period_end
                    ? new Date(sub.current_period_end * 1000)
                    : existingSub.currentPeriodEnd,
                },
              }),
              prisma.organization.update({
                where: { id: existingSub.organizationId },
                data: { plan: tierFromMetadata },
              }),
            ])

            if (tierFromMetadata !== existingSub.tier) {
              await enforceBranchLimitOnDowngrade(existingSub.organizationId, tierFromMetadata)
              await recordAuditLog({
                organizationId: existingSub.organizationId,
                event: tierFromMetadata === PlanTier.BASIC ? 'PLAN_DOWNGRADE' : 'PLAN_UPGRADE',
                details: {
                  previousTier: existingSub.tier,
                  newTier: tierFromMetadata,
                  stripeSubId,
                },
              })
            }
          }
        }
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object
        const stripeSubId = sub.id as string
        const customerId = sub.customer as string

        const existingSub = await prisma.subscription.findFirst({
          where: {
            OR: [
              { stripeSubId },
              { stripeCustomerId: customerId },
            ],
          },
        })

        if (existingSub) {
          await prisma.$transaction([
            prisma.subscription.update({
              where: { id: existingSub.id },
              data: {
                status: 'cancelled',
                tier: PlanTier.BASIC,
              },
            }),
            prisma.organization.update({
              where: { id: existingSub.organizationId },
              data: { plan: PlanTier.BASIC },
            }),
          ])

          const { deactivatedCount } = await enforceBranchLimitOnDowngrade(existingSub.organizationId, PlanTier.BASIC)

          await recordAuditLog({
            organizationId: existingSub.organizationId,
            event: 'PLAN_DOWNGRADE',
            details: {
              previousTier: existingSub.tier,
              newTier: PlanTier.BASIC,
              reason: 'Subscription deleted in Stripe',
              deactivatedBranches: deactivatedCount,
              stripeSubId,
            },
          })
        }
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
