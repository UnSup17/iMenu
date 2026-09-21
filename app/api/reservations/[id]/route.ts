import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import crypto from 'crypto'
import {
  serializePreOrder,
  extractPreOrder,
  type PreOrderData,
} from '@/lib/reservations/preorder'

interface RouteParams {
  params: Promise<{ id: string }>
}

const PreOrderItemSchema = z.object({
  productId: z.string().min(1),
  name: z.string().min(1),
  quantity: z.number().int().min(1),
  unitPrice: z.number().min(0),
  subtotal: z.number().min(0),
  notes: z.string().optional(),
})

const PreOrderSchema = z.object({
  items: z.array(PreOrderItemSchema),
  totalAmount: z.number().min(0),
  paymentStatus: z.enum(['UNPAID', 'PREPAID']).default('UNPAID'),
  paymentMethod: z.string().optional(),
  paymentReference: z.string().optional(),
  prepaidAt: z.string().optional(),
  customerNote: z.string().optional(),
})

const UpdateReservationSchema = z.object({
  tableId: z.string().nullable().optional(),
  status: z
    .enum(['PENDING', 'CONFIRMED', 'SEATED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'])
    .optional(),
  customerName: z.string().min(2).optional(),
  customerPhone: z.string().min(5).optional(),
  customerEmail: z.string().email().nullable().optional(),
  partySize: z.number().int().min(1).max(50).optional(),
  reservationDate: z.string().optional(),
  notes: z.string().nullable().optional(),
  preOrder: PreOrderSchema.nullable().optional(),
})

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const parsed = UpdateReservationSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Datos inválidos' },
        { status: 400 }
      )
    }

    const data = parsed.data
    const existing = await prisma.reservation.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Reservación no encontrada' }, { status: 404 })
    }

    const updatePayload: any = {}

    if (data.customerName !== undefined) updatePayload.customerName = data.customerName
    if (data.customerPhone !== undefined) updatePayload.customerPhone = data.customerPhone
    if (data.customerEmail !== undefined) updatePayload.customerEmail = data.customerEmail
    if (data.partySize !== undefined) updatePayload.partySize = data.partySize
    if (data.tableId !== undefined) updatePayload.tableId = data.tableId
    if (data.status !== undefined) updatePayload.status = data.status

    if (data.reservationDate) {
      updatePayload.reservationDate = new Date(data.reservationDate)
    }

    if (data.status === 'SEATED') {
      updatePayload.seatedAt = new Date()
    }

    // Gestionar serialización de PreOrder si viene en el payload
    if (data.preOrder !== undefined || data.notes !== undefined) {
      const currentNotes = data.notes !== undefined ? data.notes : existing.notes
      const targetPreOrder =
        data.preOrder !== undefined
          ? data.preOrder
          : extractPreOrder(existing.notes).preOrder

      updatePayload.notes = serializePreOrder(
        targetPreOrder as PreOrderData | null,
        currentNotes
      )
    }

    // Si se asigna mesa, verificar capacidad
    const targetTableId = data.tableId !== undefined ? data.tableId : existing.tableId
    if (targetTableId) {
      const table = await prisma.table.findUnique({
        where: { id: targetTableId },
      })
      if (!table) {
        return NextResponse.json({ error: 'Mesa no encontrada' }, { status: 404 })
      }
      const checkPartySize = data.partySize || existing.partySize
      if (checkPartySize > table.capacity) {
        return NextResponse.json(
          {
            error: `La capacidad de la Mesa ${table.tableNumber} es de ${table.capacity} personas (${checkPartySize} solicitadas).`,
          },
          { status: 400 }
        )
      }
    }

    const updated = await prisma.reservation.update({
      where: { id },
      data: updatePayload,
      include: {
        table: {
          select: {
            id: true,
            tableNumber: true,
            zone: true,
            capacity: true,
            status: true,
          },
        },
      },
    })

    // ── AUTOMATIZACIÓN KDS: Si pasa a SEATED y tiene pre-orden, inyectar en cocina ──
    let autoCreatedOrder = null
    if (data.status === 'SEATED' && targetTableId) {
      const { preOrder } = extractPreOrder(updated.notes)

      if (preOrder && preOrder.items && preOrder.items.length > 0) {
        const orderTag = `Pre-orden Reserva #${id.slice(0, 8)}`

        // Evitar duplicados si ya se había creado
        const existingOrder = await prisma.order.findFirst({
          where: {
            tableId: targetTableId,
            notes: { contains: orderTag },
          },
        })

        if (!existingOrder) {
          // Obtener o crear sesión activa de mesa
          let activeSession = await prisma.tableSession.findFirst({
            where: { tableId: targetTableId, status: 'ACTIVE' },
          })

          if (!activeSession) {
            activeSession = await prisma.tableSession.create({
              data: {
                tableId: targetTableId,
                sessionToken: crypto.randomUUID(),
                status: 'ACTIVE',
                expiresAt: new Date(Date.now() + 4 * 3600000), // 4 horas
              },
            })
          }

          // Crear orden urgente en cocina
          autoCreatedOrder = await prisma.order.create({
            data: {
              restaurantId: updated.restaurantId,
              tableId: targetTableId,
              sessionId: activeSession.id,
              status: 'RECEIVED',
              priority: 'URGENT',
              totalAmount: preOrder.totalAmount,
              notes: `${orderTag} (${updated.customerName}) — ${
                preOrder.paymentStatus === 'PREPAID'
                  ? 'PAGADO POR ANTICIPADO'
                  : 'PAGO PENDIENTE EN MESA'
              }`,
              items: {
                create: preOrder.items.map((item) => ({
                  productId: item.productId,
                  quantity: item.quantity,
                  unitPrice: item.unitPrice,
                  subtotal: item.subtotal,
                  itemNotes: item.notes || null,
                })),
              },
            },
          })

          // Actualizar estado de la mesa a activa
          await prisma.table.update({
            where: { id: targetTableId },
            data: { status: 'ACTIVE_QR_SESSION' },
          })

          console.log(
            `[Reservations] 🍳 Pedido automático #${autoCreatedOrder.id} creado en cocina para Mesa con pre-orden de ${updated.customerName}`
          )
        }
      }
    }

    const { preOrder, cleanNotes } = extractPreOrder(updated.notes)

    return NextResponse.json({
      ...updated,
      notes: cleanNotes,
      preOrder,
      autoCreatedOrder,
    })
  } catch (error: any) {
    console.error('[PATCH /api/reservations/[id]] Error:', error)
    return NextResponse.json(
      { error: error?.message || 'Error al actualizar reservación' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params

    await prisma.reservation.delete({
      where: { id },
    })

    return NextResponse.json({ success: true, message: 'Reservación eliminada' })
  } catch (error: any) {
    console.error('[DELETE /api/reservations/[id]] Error:', error)
    return NextResponse.json(
      { error: error?.message || 'Error al eliminar reservación' },
      { status: 500 }
    )
  }
}
