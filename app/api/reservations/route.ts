import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import {
  serializePreOrder,
  extractPreOrder,
  type PreOrderData,
} from '@/lib/reservations/preorder'
import { sendReservationConfirmation } from '@/lib/notifications/messaging'

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

const CreateReservationSchema = z.object({
  restaurantId: z.string().min(1, 'restaurantId requerido'),
  tableId: z.string().nullable().optional(),
  customerName: z.string().min(2, 'Nombre de cliente requerido'),
  customerEmail: z.string().email('Email inválido').nullable().optional(),
  customerPhone: z.string().min(5, 'Teléfono requerido'),
  partySize: z.number().int().min(1, 'Mínimo 1 persona').max(50, 'Máximo 50 personas'),
  reservationDate: z.string().datetime({ offset: true }).or(z.string().min(10)),
  notes: z.string().max(2000).nullable().optional(),
  preOrder: PreOrderSchema.nullable().optional(),
  status: z
    .enum(['PENDING', 'CONFIRMED', 'SEATED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'])
    .optional()
    .default('PENDING'),
})

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    const searchParams = request.nextUrl.searchParams
    const restaurantId =
      searchParams.get('restaurantId') || (session?.user as any)?.restaurantId
    const dateParam = searchParams.get('date') // YYYY-MM-DD
    const statusParam = searchParams.get('status')

    if (!restaurantId) {
      return NextResponse.json({ error: 'restaurantId requerido' }, { status: 400 })
    }

    const whereClause: any = { restaurantId }

    if (statusParam) {
      whereClause.status = statusParam
    }

    if (dateParam) {
      const startOfDay = new Date(`${dateParam}T00:00:00.000Z`)
      const endOfDay = new Date(`${dateParam}T23:59:59.999Z`)
      whereClause.reservationDate = {
        gte: startOfDay,
        lte: endOfDay,
      }
    }

    const reservations = await prisma.reservation.findMany({
      where: whereClause,
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
      orderBy: { reservationDate: 'asc' },
    })

    // Parsear pre-orden en cada reservación
    const enriched = reservations.map((r) => {
      const { preOrder, cleanNotes } = extractPreOrder(r.notes)
      return {
        ...r,
        notes: cleanNotes,
        preOrder,
      }
    })

    return NextResponse.json(enriched)
  } catch (error: any) {
    console.error('[GET /api/reservations] Error:', error)
    return NextResponse.json(
      { error: error?.message || 'Error al consultar reservaciones' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = CreateReservationSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Datos de reservación inválidos' },
        { status: 400 }
      )
    }

    const data = parsed.data
    const resDate = new Date(data.reservationDate)

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: data.restaurantId },
      select: { id: true, name: true },
    })

    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurante no encontrado' }, { status: 404 })
    }

    // Validar mesa si fue asignada
    let assignedTableNumber: number | null = null
    if (data.tableId) {
      const table = await prisma.table.findUnique({
        where: { id: data.tableId },
      })

      if (!table) {
        return NextResponse.json({ error: 'Mesa no encontrada' }, { status: 404 })
      }

      if (table.restaurantId !== data.restaurantId) {
        return NextResponse.json(
          { error: 'La mesa no pertenece al restaurante especificado' },
          { status: 400 }
        )
      }

      if (data.partySize > table.capacity) {
        return NextResponse.json(
          {
            error: `La capacidad de la Mesa ${table.tableNumber} es de ${table.capacity} personas (${data.partySize} solicitadas).`,
          },
          { status: 400 }
        )
      }

      assignedTableNumber = table.tableNumber
    }

    // Serializar la pre-orden en el campo notes
    const finalNotes = serializePreOrder(data.preOrder as PreOrderData | null, data.notes)

    const reservation = await prisma.reservation.create({
      data: {
        restaurantId: data.restaurantId,
        tableId: data.tableId || null,
        customerName: data.customerName.trim(),
        customerEmail: data.customerEmail?.trim() || null,
        customerPhone: data.customerPhone.trim(),
        partySize: data.partySize,
        reservationDate: resDate,
        status: data.status,
        notes: finalNotes,
      },
      include: {
        table: {
          select: {
            id: true,
            tableNumber: true,
            zone: true,
            capacity: true,
          },
        },
      },
    })

    // Emitir notificación por WhatsApp / SMS en segundo plano
    const preOrderSummary = data.preOrder
      ? {
          itemCount: data.preOrder.items.reduce((acc, it) => acc + it.quantity, 0),
          totalAmount: data.preOrder.totalAmount,
          isPrepaid: data.preOrder.paymentStatus === 'PREPAID',
        }
      : null

    sendReservationConfirmation({
      customerName: reservation.customerName,
      customerPhone: reservation.customerPhone,
      restaurantName: restaurant.name,
      restaurantAddress: null,
      reservationDate: reservation.reservationDate,
      partySize: reservation.partySize,
      tableNumber: assignedTableNumber,
      preOrderSummary,
      notes: data.notes,
    }).catch((err) => console.warn('[POST /api/reservations] Error enviando notificación:', err))

    return NextResponse.json(
      {
        ...reservation,
        notes: data.notes || '',
        preOrder: data.preOrder || null,
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('[POST /api/reservations] Error:', error)
    return NextResponse.json(
      { error: error?.message || 'Error al crear reservación' },
      { status: 500 }
    )
  }
}
