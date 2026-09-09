import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const CreateTableSchema = z
  .object({
    tableNumber: z.number().int().positive(),
    zone: z.string().optional(),
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
      orderBy: { tableNumber: 'asc' },
    })

    return NextResponse.json(tables)
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
        zone: parsed.zone,
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
