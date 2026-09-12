import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const PaymentSchema = z.object({
  amount: z.number().positive(),
  method: z.enum(['CASH', 'DEBIT_CARD', 'CREDIT_CARD', 'TRANSFER', 'QR_CODE', 'SPLIT', 'ROOM_CHARGE', 'OTHER']),
  reference: z.string().optional(),
})

function getUser(session: unknown) {
  return (session as { user: { id: string; restaurantId?: string; role: string } }).user
}

/**
 * GET /api/invoices/[id]
 * Detalle completo de una factura.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const user = getUser(session)
    if (!user.restaurantId) return NextResponse.json({ error: 'Sin restaurante' }, { status: 403 })

    const { id } = await params

    const invoice = await prisma.invoice.findFirst({
      where: { id, restaurantId: user.restaurantId },
      include: {
        items: true,
        payments: true,
        table: { select: { tableNumber: true } },
        waiter: { select: { name: true, email: true } },
        session: { select: { id: true, createdAt: true } },
        restaurant: {
          select: {
            name: true,
            brandTheme: {
              select: {
                whiteLabelEnabled: true,
              },
            },
          },
        },
      },
    })

    if (!invoice) return NextResponse.json({ error: 'Factura no encontrada' }, { status: 404 })

    const totalPaid = invoice.payments.reduce((s, p) => s + p.amount.toNumber(), 0)
    const remaining = invoice.total.toNumber() - totalPaid

    return NextResponse.json({
      invoice: {
        ...invoice,
        subtotal: invoice.subtotal.toNumber(),
        taxAmount: invoice.taxAmount.toNumber(),
        serviceCharge: invoice.serviceCharge.toNumber(),
        discountAmount: invoice.discountAmount.toNumber(),
        total: invoice.total.toNumber(),
        totalPaid,
        remaining,
        items: invoice.items.map((i) => ({
          ...i,
          unitPrice: i.unitPrice.toNumber(),
          taxRate: i.taxRate.toNumber(),
          taxAmount: i.taxAmount.toNumber(),
          subtotal: i.subtotal.toNumber(),
        })),
        payments: invoice.payments.map((p) => ({
          ...p,
          amount: p.amount.toNumber(),
        })),
      },
    })
  } catch (error) {
    console.error('[GET /api/invoices/[id]]', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

/**
 * PATCH /api/invoices/[id]
 * Acciones sobre una factura: void (anular).
 * body: { action: 'void', reason: string }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const user = getUser(session)
    if (!user.restaurantId) return NextResponse.json({ error: 'Sin restaurante' }, { status: 403 })

    const adminRoles = ['SUPERADMIN', 'RESTAURANT_ADMIN', 'ACCOUNTANT']
    if (!adminRoles.includes(user.role)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

    const { id } = await params
    const body = await request.json()

    const invoice = await prisma.invoice.findFirst({
      where: { id, restaurantId: user.restaurantId },
    })
    if (!invoice) return NextResponse.json({ error: 'Factura no encontrada' }, { status: 404 })

    if (body.action === 'void') {
      if (invoice.status === 'VOID') {
        return NextResponse.json({ error: 'La factura ya está anulada' }, { status: 409 })
      }
      const updated = await prisma.invoice.update({
        where: { id },
        data: { status: 'VOID', voidedAt: new Date(), voidReason: body.reason ?? 'Sin motivo' },
      })
      return NextResponse.json({ invoice: updated })
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 })
  } catch (error) {
    console.error('[PATCH /api/invoices/[id]]', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

/**
 * POST /api/invoices/[id]/pay
 * Registra un pago sobre la factura. Soporta pagos parciales (cuenta dividida).
 * Si el monto total acumulado >= total de la factura, la marca como PAID.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const user = getUser(session)
    if (!user.restaurantId) return NextResponse.json({ error: 'Sin restaurante' }, { status: 403 })

    const allowedRoles = ['SUPERADMIN', 'RESTAURANT_ADMIN', 'MANAGER', 'WAITER']
    if (!allowedRoles.includes(user.role)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

    const { id } = await params
    const body = await request.json()

    // Verificar si es la acción 'pay' (endpoint compartido GET/PATCH/POST en [id])
    const { amount, method, reference } = PaymentSchema.parse(body)

    const invoice = await prisma.invoice.findFirst({
      where: { id, restaurantId: user.restaurantId },
      include: { payments: true },
    })
    if (!invoice) return NextResponse.json({ error: 'Factura no encontrada' }, { status: 404 })
    if (invoice.status === 'VOID') return NextResponse.json({ error: 'No se puede pagar una factura anulada' }, { status: 409 })
    if (invoice.status === 'PAID') return NextResponse.json({ error: 'La factura ya está pagada' }, { status: 409 })

    const totalPaid = invoice.payments.reduce((s, p) => s + p.amount.toNumber(), 0)
    const total = invoice.total.toNumber()
    const remaining = total - totalPaid

    if (amount > remaining + 0.01) {
      return NextResponse.json({ error: `El monto excede el saldo pendiente ($${remaining.toFixed(2)})` }, { status: 422 })
    }

    const newTotalPaid = totalPaid + amount
    const isFullyPaid = newTotalPaid >= total - 0.01

    const [payment] = await prisma.$transaction([
      prisma.payment.create({
        data: {
          invoiceId: id,
          amount,
          method,
          reference,
          receivedById: user.id,
        },
      }),
      ...(isFullyPaid
        ? [
            prisma.invoice.update({
              where: { id },
              data: { status: 'PAID', paidAt: new Date(), paymentMethod: method },
            }),
          ]
        : []),
    ])

    return NextResponse.json(
      {
        payment: { ...payment, amount: payment.amount.toNumber() },
        isPaid: isFullyPaid,
        remaining: isFullyPaid ? 0 : remaining - amount,
      },
      { status: 201 },
    )
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Datos inválidos', details: error.flatten() }, { status: 400 })
    console.error('[POST /api/invoices/[id]]', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
