import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const closeCashRegisterSchema = z.object({
  date: z.string(),
  openingBalance: z.number().min(0),
  cashSales: z.number().min(0),
  cardSales: z.number().min(0),
  transferSales: z.number().min(0),
  qrSales: z.number().min(0),
  otherSales: z.number().min(0).default(0),
  totalIncome: z.number().min(0),
  totalExpenses: z.number().min(0).default(0),
  expectedCash: z.number(),
  actualCash: z.number().min(0),
  difference: z.number(),
  notes: z.string().optional().nullable(),
})

export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const user = session.user as { restaurantId?: string }
    if (!user.restaurantId) {
      return NextResponse.json({ error: 'Restaurante no configurado' }, { status: 400 })
    }

    const closes = await prisma.cashRegisterClose.findMany({
      where: { restaurantId: user.restaurantId },
      include: {
        closedBy: { select: { name: true, email: true } },
      },
      orderBy: { date: 'desc' },
      take: 50,
    })

    return NextResponse.json(closes)
  } catch (error) {
    console.error('Error al obtener cierres de caja:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const user = session.user as { id?: string; restaurantId?: string }
    if (!user.restaurantId || !user.id) {
      return NextResponse.json({ error: 'Restaurante no configurado' }, { status: 400 })
    }

    const body = await req.json()
    const parsed = closeCashRegisterSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 })
    }

    const data = parsed.data

    const record = await prisma.cashRegisterClose.create({
      data: {
        restaurantId: user.restaurantId,
        date: new Date(data.date),
        openingBalance: data.openingBalance,
        cashSales: data.cashSales,
        cardSales: data.cardSales,
        transferSales: data.transferSales,
        qrSales: data.qrSales,
        otherSales: data.otherSales,
        totalIncome: data.totalIncome,
        totalExpenses: data.totalExpenses,
        expectedCash: data.expectedCash,
        actualCash: data.actualCash,
        difference: data.difference,
        closedById: user.id,
        notes: data.notes,
      },
      include: {
        closedBy: { select: { name: true, email: true } },
      },
    })

    return NextResponse.json(record, { status: 201 })
  } catch (error) {
    console.error('Error al registrar cierre de caja:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
