import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

interface RouteParams {
  params: Promise<{ id: string }>
}

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
    const updatePayload: any = { ...data }

    if (data.reservationDate) {
      updatePayload.reservationDate = new Date(data.reservationDate)
    }

    if (data.status === 'SEATED') {
      updatePayload.seatedAt = new Date()
    }

    // Si se asigna mesa, verificar capacidad
    if (data.tableId) {
      const table = await prisma.table.findUnique({
        where: { id: data.tableId },
      })
      if (!table) {
        return NextResponse.json({ error: 'Mesa no encontrada' }, { status: 404 })
      }
      if (data.partySize && data.partySize > table.capacity) {
        return NextResponse.json(
          {
            error: `La capacidad de la Mesa ${table.tableNumber} es de ${table.capacity} personas.`,
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

    return NextResponse.json(updated)
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
