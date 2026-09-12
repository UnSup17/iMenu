import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const CreateReservationSchema = z.object({
  restaurantId: z.string().min(1, 'restaurantId requerido'),
  tableId: z.string().nullable().optional(),
  customerName: z.string().min(2, 'Nombre de cliente requerido'),
  customerEmail: z.string().email('Email inválido').nullable().optional(),
  customerPhone: z.string().min(5, 'Teléfono requerido'),
  partySize: z.number().int().min(1, 'Mínimo 1 persona').max(50, 'Máximo 50 personas'),
  reservationDate: z.string().datetime({ offset: true }).or(z.string().min(10)),
  notes: z.string().max(1000).nullable().optional(),
  status: z
    .enum(['PENDING', 'CONFIRMED', 'SEATED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'])
    .optional()
    .default('PENDING'),
})

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const restaurantId =
      searchParams.get('restaurantId') || (session.user as any).restaurantId
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

    return NextResponse.json(reservations)
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
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

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

    // Validar mesa si fue asignada
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
    }

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
        notes: data.notes?.trim() || null,
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

    return NextResponse.json(reservation, { status: 201 })
  } catch (error: any) {
    console.error('[POST /api/reservations] Error:', error)
    return NextResponse.json(
      { error: error?.message || 'Error al crear reservación' },
      { status: 500 }
    )
  }
}
