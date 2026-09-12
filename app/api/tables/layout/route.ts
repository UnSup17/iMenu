import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const LayoutUpdateSchema = z.object({
  restaurantId: z.string().min(1),
  tables: z.array(
    z.object({
      id: z.string().min(1),
      posX: z.number(),
      posY: z.number(),
      width: z.number().positive(),
      height: z.number().positive(),
      shape: z.enum(['square', 'round', 'rectangle']).optional(),
      zone: z.string().nullable().optional(),
      capacity: z.number().int().positive().optional(),
    })
  ),
})

export async function PUT(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = LayoutUpdateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Datos de layout inválidos' },
        { status: 400 }
      )
    }

    const { restaurantId, tables } = parsed.data

    // Batch update using transaction
    await prisma.$transaction(
      tables.map((t) =>
        prisma.table.update({
          where: { id: t.id },
          data: {
            posX: t.posX,
            posY: t.posY,
            width: t.width,
            height: t.height,
            ...(t.shape ? { shape: t.shape } : {}),
            ...(t.zone !== undefined ? { zone: t.zone } : {}),
            ...(t.capacity ? { capacity: t.capacity } : {}),
          },
        })
      )
    )

    return NextResponse.json({
      success: true,
      message: `Plano guardado exitosamente (${tables.length} mesas actualizadas)`,
      updatedCount: tables.length,
    })
  } catch (error: any) {
    console.error('[PUT /api/tables/layout] Error:', error)
    return NextResponse.json(
      { error: error?.message || 'Error al guardar distribución del plano' },
      { status: 500 }
    )
  }
}
