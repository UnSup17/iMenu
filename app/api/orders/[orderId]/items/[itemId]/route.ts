import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getSocketServer } from '@/lib/socket-server'
import { z } from 'zod'

interface RouteParams {
  params: Promise<{ orderId: string; itemId: string }>
}

const ToggleItemSchema = z.object({
  isPrepared: z.boolean(),
})

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { orderId, itemId } = await params
    const body = await request.json()
    const { isPrepared } = ToggleItemSchema.parse(body)

    const updatedItem = await prisma.orderItem.update({
      where: {
        id: itemId,
        orderId,
      },
      data: { isPrepared },
      include: {
        order: { select: { restaurantId: true, tableId: true } },
      },
    })

    // Emitir socket para que todas las pantallas KDS sincronicen el ítem
    try {
      const io = getSocketServer()
      if (io) {
        ;(io as any).emit('kds:item_toggled', {
          orderId,
          itemId,
          isPrepared,
          restaurantId: updatedItem.order.restaurantId,
        })
      }
    } catch {}

    return NextResponse.json({ success: true, item: updatedItem })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    }
    const message = error instanceof Error ? error.message : 'Error al actualizar ítem'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
