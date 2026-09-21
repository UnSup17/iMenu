import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendTrialExpiringEmail } from '@/lib/email'
import { recordAuditLog } from '@/lib/audit'

export async function GET(req: NextRequest) {
  return handleTrialAlerts(req)
}

export async function POST(req: NextRequest) {
  return handleTrialAlerts(req)
}

async function handleTrialAlerts(req: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret) {
      const authHeader = req.headers.get('authorization')
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
      }
    }

    const now = new Date()
    const trialingSubscriptions = await prisma.subscription.findMany({
      where: {
        status: 'trialing',
        trialEndsAt: { not: null },
      },
      include: {
        organization: {
          include: {
            users: {
              where: { role: { in: ['RESTAURANT_ADMIN', 'ORG_ADMIN'] } },
              take: 1,
            },
            restaurants: {
              take: 1,
            },
          },
        },
      },
    })

    const results: Array<{
      organizationId: string
      restaurantName: string
      email: string
      daysRemaining: number
      alertSent: boolean
    }> = []

    for (const sub of trialingSubscriptions) {
      if (!sub.trialEndsAt) continue

      const diffMs = new Date(sub.trialEndsAt).getTime() - now.getTime()
      const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

      const adminUser = sub.organization.users[0]
      const restaurant = sub.organization.restaurants[0]
      const restaurantName = restaurant?.name || sub.organization.name

      // Alertas a 3 días y a 1 día
      if ((daysRemaining === 3 || daysRemaining === 1) && adminUser?.email) {
        try {
          await sendTrialExpiringEmail(
            adminUser.email,
            restaurantName,
            daysRemaining
          )

          await recordAuditLog({
            organizationId: sub.organizationId,
            userId: adminUser.id,
            userEmail: adminUser.email,
            event: 'TRIAL_ALERT_SENT',
            details: { daysRemaining, trialEndsAt: sub.trialEndsAt },
          })

          results.push({
            organizationId: sub.organizationId,
            restaurantName,
            email: adminUser.email,
            daysRemaining,
            alertSent: true,
          })
        } catch (err) {
          console.error(`Error enviando alerta de trial para org ${sub.organizationId}:`, err)
        }
      } else {
        results.push({
          organizationId: sub.organizationId,
          restaurantName,
          email: adminUser?.email || 'N/A',
          daysRemaining,
          alertSent: false,
        })
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      totalEvaluated: trialingSubscriptions.length,
      alertsDispatched: results.filter((r) => r.alertSent).length,
      details: results,
    })
  } catch (error: any) {
    console.error('[CRON trial-alerts error]', error)
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 })
  }
}
