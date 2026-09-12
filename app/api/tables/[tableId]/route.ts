import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

interface RouteParams {
  params: Promise<{ tableId: string }>
}

const UpdateTableSchema = z.object({
  tableNumber: z.number().int().positive().optional(),
  capacity: z.number().int().positive().optional(),
  zone: z.string().nullable().optional(),
  shape: z.enum(['square', 'round', 'rectangle']).optional(),
  status: z
    .enum(['AVAILABLE', 'ACTIVE_QR_SESSION', 'TRADITIONAL_SERVICE', 'MAINTENANCE'])
    .optional(),
  posX: z.number().optional(),
  posY: z.number().optional(),
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
})

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { tableId } = await params
    const body = await request.json()
    const parsed = UpdateTableSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Datos inválidos' },
        { status: 400 }
      )
    }

    const updated = await prisma.table.update({
      where: { id: tableId },
      data: parsed.data,
    })

    return NextResponse.json(updated)
  } catch (error: any) {
    console.error('[PATCH /api/tables/[tableId]] Error:', error)
    return NextResponse.json(
      { error: error?.message || 'Error al actualizar mesa' },
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

    const { tableId } = await params

    await prisma.table.delete({
      where: { id: tableId },
    })

    return NextResponse.json({ success: true, message: 'Mesa eliminada' })
  } catch (error: any) {
    console.error('[DELETE /api/tables/[tableId]] Error:', error)
    return NextResponse.json(
      { error: error?.message || 'Error al eliminar mesa' },
      { status: 500 }
    )
  }
}
