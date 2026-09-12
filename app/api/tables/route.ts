import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const CreateTableSchema = z
  .object({
    tableNumber: z.number().int().positive(),
    zone: z.string().optional(),
    capacity: z.number().int().positive().default(4),
    posX: z.number().optional().default(0),
    posY: z.number().optional().default(0),
    width: z.number().optional().default(80),
    height: z.number().optional().default(80),
    shape: z.enum(['square', 'round', 'rectangle']).optional().default('square'),
    restaurantId: z.string().optional(),
    foodCourtId: z.string().optional(),
  })
  .refine((data) => (data.restaurantId ? !data.foodCourtId : Boolean(data.foodCourtId)), {
    message: 'La mesa debe pertenecer a un restaurante O a una plaza (no ambos ni ninguno).',
  })

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const searchParams = request.nextUrl.searchParams
    const restaurantId = searchParams.get('restaurantId')
    const foodCourtId = searchParams.get('foodCourtId')

    if (!restaurantId && !foodCourtId) {
      return NextResponse.json({ error: 'Se requiere restaurantId o foodCourtId' }, { status: 400 })
    }

    const tables = await prisma.table.findMany({
      where: {
        ...(restaurantId ? { restaurantId } : {}),
        ...(foodCourtId ? { foodCourtId } : {}),
      },
      include: {
        sessions: {
          where: { status: 'ACTIVE' },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            sessionToken: true,
            createdAt: true,
            status: true,
          },
        },
        reservations: {
          where: {
            status: { in: ['PENDING', 'CONFIRMED'] },
            reservationDate: { gte: new Date(Date.now() - 3600000) },
          },
          orderBy: { reservationDate: 'asc' },
          take: 1,
          select: {
            id: true,
            customerName: true,
            customerPhone: true,
            partySize: true,
            reservationDate: true,
            status: true,
          },
        },
      },
      orderBy: { tableNumber: 'asc' },
    })

    const enrichedTables = tables.map((t) => {
      const activeSession = t.sessions[0] || null
      const elapsedMinutes = activeSession
        ? Math.floor((Date.now() - new Date(activeSession.createdAt).getTime()) / 60000)
        : null
      const nextReservation = t.reservations[0] || null

      return {
        id: t.id,
        restaurantId: t.restaurantId,
        foodCourtId: t.foodCourtId,
        tableNumber: t.tableNumber,
        zone: t.zone,
        status: t.status,
        capacity: t.capacity,
        posX: t.posX,
        posY: t.posY,
        width: t.width,
        height: t.height,
        shape: t.shape,
        activeSession,
        elapsedMinutes,
        nextReservation,
      }
    })

    return NextResponse.json(enrichedTables)
  } catch (error) {
    console.error('[GET /api/tables] Error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const body = await request.json()
    const parsed = CreateTableSchema.parse(body)

    const table = await prisma.table.create({
      data: {
        tableNumber: parsed.tableNumber,
        zone: parsed.zone || null,
        capacity: parsed.capacity,
        posX: parsed.posX,
        posY: parsed.posY,
        width: parsed.width,
        height: parsed.height,
        shape: parsed.shape,
        restaurantId: parsed.restaurantId || null,
        foodCourtId: parsed.foodCourtId || null,
      },
    })

    return NextResponse.json(table, { status: 201 })
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'Ya existe una mesa con ese número en esta sede.' }, { status: 409 })
    }
    console.error('[POST /api/tables] Error:', error)
    return NextResponse.json({ error: error.message || 'Error al crear mesa' }, { status: 400 })
  }
}

