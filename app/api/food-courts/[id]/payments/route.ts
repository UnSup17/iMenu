import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { emitFoodCourtPaymentUpdated } from '@/lib/socket-server'
import { z } from 'zod'

interface RouteParams {
  params: Promise<{ id: string }>
}

const UpdatePaymentSchema = z.object({
  sessionId: z.string().min(1),
  restaurantId: z.string().min(1),
  status: z.enum(['PENDING', 'PAID', 'VOIDED']),
  paymentMethod: z.enum([
    'CASH',
    'DEBIT_CARD',
    'CREDIT_CARD',
    'TRANSFER',
    'QR_CODE',
    'SPLIT',
    'ROOM_CHARGE',
    'OTHER',
  ]).optional(),
  customerName: z.string().optional(),
})

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: foodCourtId } = await params
    const searchParams = request.nextUrl.searchParams
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId es requerido' }, { status: 400 })
    }

    const session = await prisma.tableSession.findUnique({
      where: { id: sessionId },
      include: { table: true },
    })

    if (!session || session.table.foodCourtId !== foodCourtId) {
      return NextResponse.json({ error: 'Sesión no encontrada en esta plaza' }, { status: 404 })
    }

    const payments = await prisma.foodCourtTablePayment.findMany({
      where: { sessionId },
      include: {
        restaurant: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
            cuisineType: true,
          },
        },
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            status: true,
            total: true,
            paymentMethod: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    const totalAmount = payments.reduce((sum, p) => sum + Number(p.totalAmount), 0)
    const paidAmount = payments
      .filter((p) => p.status === 'PAID')
      .reduce((sum, p) => sum + Number(p.totalAmount), 0)
    const pendingAmount = payments
      .filter((p) => p.status === 'PENDING')
      .reduce((sum, p) => sum + Number(p.totalAmount), 0)
    const isFullyPaid = payments.length > 0 && payments.every((p) => p.status === 'PAID')

    return NextResponse.json({
      sessionId,
      tableId: session.tableId,
      tableNumber: session.table.tableNumber,
      payments: payments.map((p) => ({
        id: p.id,
        restaurantId: p.restaurantId,
        restaurantName: p.restaurant.name,
        restaurantSlug: p.restaurant.slug,
        restaurantLogo: p.restaurant.logoUrl,
        status: p.status,
        totalAmount: Number(p.totalAmount),
        paidAt: p.paidAt?.toISOString() || null,
        invoiceId: p.invoiceId,
        invoiceNumber: p.invoice?.invoiceNumber || null,
      })),
      summary: {
        totalAmount,
        paidAmount,
        pendingAmount,
        isFullyPaid,
      },
    })
  } catch (error) {
    console.error('[GET /api/food-courts/[id]/payments] Error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const authSession = await auth()
    if (!authSession?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { id: foodCourtId } = await params
    const body = await request.json()
    const parsed = UpdatePaymentSchema.parse(body)

    const session = await prisma.tableSession.findUnique({
      where: { id: parsed.sessionId },
      include: { table: true },
    })

    if (!session || session.table.foodCourtId !== foodCourtId) {
      return NextResponse.json({ error: 'Sesión no encontrada en esta plaza' }, { status: 404 })
    }

    const payment = await prisma.foodCourtTablePayment.findUnique({
      where: {
        sessionId_restaurantId: {
          sessionId: parsed.sessionId,
          restaurantId: parsed.restaurantId,
        },
      },
    })

    if (!payment) {
      return NextResponse.json({ error: 'Registro de pago no encontrado para este restaurante' }, { status: 404 })
    }

    const updatedPayment = await prisma.foodCourtTablePayment.update({
      where: { id: payment.id },
      data: {
        status: parsed.status,
        paidAt: parsed.status === 'PAID' ? new Date() : null,
      },
      include: {
        restaurant: true,
      },
    })

    // Emitir evento WebSocket en tiempo real para sincronizar a todos los clientes
    emitFoodCourtPaymentUpdated(foodCourtId, session.tableId, {
      foodCourtId,
      tableId: session.tableId,
      sessionId: parsed.sessionId,
      restaurantId: parsed.restaurantId,
      status: parsed.status,
      totalAmount: Number(updatedPayment.totalAmount),
      paidAt: updatedPayment.paidAt?.toISOString() || null,
    })

    return NextResponse.json(updatedPayment)
  } catch (error: any) {
    console.error('[PATCH /api/food-courts/[id]/payments] Error:', error)
    return NextResponse.json({ error: error.message || 'Error al actualizar pago' }, { status: 400 })
  }
}
