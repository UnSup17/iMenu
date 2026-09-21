import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendReservationReminder } from '@/lib/notifications/messaging'
import { extractPreOrder } from '@/lib/reservations/preorder'

export const runtime = 'nodejs'

/**
 * GET/POST /api/reservations/reminders
 * Worker programado / cron para enviar recordatorios automáticos
 * a comensales con reservas confirmadas para las próximas 2 horas.
 */
export async function GET(_req: NextRequest) {
  return handleReminders()
}

export async function POST(_req: NextRequest) {
  return handleReminders()
}

async function handleReminders() {
  try {
    const now = new Date()
    // Ventana de recordatorio: entre 30 minutos y 2 horas y 15 minutos en el futuro
    const windowStart = new Date(now.getTime() + 30 * 60 * 1000)
    const windowEnd = new Date(now.getTime() + 135 * 60 * 1000)

    const upcomingReservations = await prisma.reservation.findMany({
      where: {
        status: 'CONFIRMED',
        reservationDate: {
          gte: windowStart,
          lte: windowEnd,
        },
      },
      include: {
        restaurant: {
          select: { name: true },
        },
        table: {
          select: { tableNumber: true },
        },
      },
    })

    const results = []

    for (const res of upcomingReservations) {
      // Evitar envíos duplicados si ya se registró el recordatorio
      if (res.notes && res.notes.includes('[REMINDER_SENT]')) {
        continue
      }

      const { preOrder, cleanNotes } = extractPreOrder(res.notes)
      const preOrderSummary = preOrder
        ? {
            itemCount: preOrder.items.reduce((acc, it) => acc + it.quantity, 0),
            totalAmount: preOrder.totalAmount,
            isPrepaid: preOrder.paymentStatus === 'PREPAID',
          }
        : null

      const reminderResult = await sendReservationReminder({
        customerName: res.customerName,
        customerPhone: res.customerPhone,
        restaurantName: res.restaurant.name,
        restaurantAddress: null,
        reservationDate: res.reservationDate,
        partySize: res.partySize,
        tableNumber: res.table?.tableNumber ?? null,
        preOrderSummary,
        notes: cleanNotes,
      })

      // Marcar recordatorio como enviado en la base de datos
      const updatedNotes = res.notes ? `${res.notes}\n[REMINDER_SENT]` : '[REMINDER_SENT]'
      await prisma.reservation.update({
        where: { id: res.id },
        data: { notes: updatedNotes },
      })

      results.push({
        reservationId: res.id,
        customerName: res.customerName,
        customerPhone: res.customerPhone,
        reservationDate: res.reservationDate,
        status: 'SENT',
        whatsappUrl: reminderResult.whatsappUrl,
      })
    }

    return NextResponse.json({
      success: true,
      scannedCount: upcomingReservations.length,
      sentCount: results.length,
      timestamp: new Date().toISOString(),
      results,
    })
  } catch (error: any) {
    console.error('[GET /api/reservations/reminders] Error:', error)
    return NextResponse.json(
      { error: error?.message || 'Error al procesar recordatorios' },
      { status: 500 }
    )
  }
}
