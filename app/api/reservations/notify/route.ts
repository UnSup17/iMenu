import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  sendReservationConfirmation,
  sendReservationReminder,
} from '@/lib/notifications/messaging'
import { extractPreOrder } from '@/lib/reservations/preorder'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await req.json()
    const { reservationId, type = 'CONFIRMATION' } = body

    if (!reservationId) {
      return NextResponse.json(
        { error: 'Falta el parámetro reservationId' },
        { status: 400 }
      )
    }

    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: {
        restaurant: {
          select: { name: true },
        },
        table: {
          select: { tableNumber: true },
        },
      },
    })

    if (!reservation) {
      return NextResponse.json(
        { error: 'Reservación no encontrada' },
        { status: 404 }
      )
    }

    const { preOrder } = extractPreOrder(reservation.notes)
    const preOrderSummary = preOrder
      ? {
          itemCount: preOrder.items.reduce((acc, it) => acc + it.quantity, 0),
          totalAmount: preOrder.totalAmount,
          isPrepaid: preOrder.paymentStatus === 'PREPAID',
        }
      : null

    const notificationPayload = {
      customerName: reservation.customerName,
      customerPhone: reservation.customerPhone,
      restaurantName: reservation.restaurant.name,
      restaurantAddress: null,
      reservationDate: reservation.reservationDate,
      partySize: reservation.partySize,
      tableNumber: reservation.table?.tableNumber ?? null,
      preOrderSummary,
      notes: reservation.notes,
    }

    let result
    if (type === 'REMINDER') {
      result = await sendReservationReminder(notificationPayload)
    } else {
      result = await sendReservationConfirmation(notificationPayload)
    }

    return NextResponse.json({
      success: true,
      type,
      result,
    })
  } catch (error: any) {
    console.error('[POST /api/reservations/notify] Error:', error)
    return NextResponse.json(
      { error: error?.message || 'Error al emitir notificación' },
      { status: 500 }
    )
  }
}
