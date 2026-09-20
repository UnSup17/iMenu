import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getAnalyticsDashboard } from '@/lib/analytics/engine'
import { generateWeeklyExecutiveReportHtml, sendWeeklyExecutiveReport } from '@/lib/analytics/email-report'
import { z } from 'zod'

const sendEmailReportSchema = z.object({
  email: z.string().email().optional(),
})

/**
 * GET: Previsualización en HTML del reporte semanal de ventas.
 */
export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const user = session.user as { restaurantId?: string }
    if (!user.restaurantId) {
      return NextResponse.json({ error: 'Restaurante no configurado' }, { status: 400 })
    }

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: user.restaurantId },
      select: { name: true },
    })

    const now = new Date()
    const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const end = now

    const data = await getAnalyticsDashboard(user.restaurantId, start, end)
    const html = generateWeeklyExecutiveReportHtml(data, restaurant?.name || 'Mi Restaurante')

    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  } catch (error) {
    console.error('Error al previsualizar reporte por email:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

/**
 * POST: Envía el reporte ejecutivo de ventas por correo electrónico.
 */
export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const user = session.user as { restaurantId?: string; email?: string }
    if (!user.restaurantId) {
      return NextResponse.json({ error: 'Restaurante no configurado' }, { status: 400 })
    }

    const body = await req.json().catch(() => ({}))
    const parsed = sendEmailReportSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 })
    }

    const targetEmail = parsed.data.email || user.email

    const result = await sendWeeklyExecutiveReport(user.restaurantId, targetEmail)

    return NextResponse.json({
      success: true,
      message: `Reporte semanal enviado exitosamente a ${result.recipient}`,
      details: result,
    })
  } catch (error: any) {
    console.error('Error al despachar reporte por correo:', error)
    return NextResponse.json({ error: error.message || 'Error al enviar reporte' }, { status: 500 })
  }
}
