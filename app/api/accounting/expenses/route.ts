import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ExpenseCategory } from '@prisma/client'
import { z } from 'zod'

const createExpenseSchema = z.object({
  category: z.nativeEnum(ExpenseCategory),
  description: z.string().min(2, 'La descripción es obligatoria'),
  amount: z.number().positive('El monto debe ser mayor a 0'),
  taxAmount: z.number().min(0).default(0),
  supplier: z.string().optional().nullable(),
  supplierTaxId: z.string().optional().nullable(),
  receiptUrl: z.string().optional().nullable(),
  date: z.string().optional(),
})

export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const category = searchParams.get('category') as ExpenseCategory | null
    const startDateParam = searchParams.get('startDate')
    const endDateParam = searchParams.get('endDate')

    const user = session.user as { restaurantId?: string; role?: string }
    const restaurantId = user.restaurantId

    if (!restaurantId) {
      return NextResponse.json({ error: 'Restaurante no configurado' }, { status: 400 })
    }

    const whereClause: any = { restaurantId }

    if (category && Object.values(ExpenseCategory).includes(category)) {
      whereClause.category = category
    }

    if (startDateParam || endDateParam) {
      whereClause.date = {}
      if (startDateParam) whereClause.date.gte = new Date(startDateParam)
      if (endDateParam) {
        const end = new Date(endDateParam)
        end.setHours(23, 59, 59, 999)
        whereClause.date.lte = end
      }
    }

    const expenses = await prisma.expense.findMany({
      where: whereClause,
      include: {
        createdBy: {
          select: { name: true, email: true },
        },
      },
      orderBy: { date: 'desc' },
      take: 100,
    })

    return NextResponse.json(expenses)
  } catch (error) {
    console.error('Error al obtener gastos:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const user = session.user as { id?: string; restaurantId?: string; role?: string }
    if (!user.restaurantId || !user.id) {
      return NextResponse.json({ error: 'Restaurante no configurado' }, { status: 400 })
    }

    const body = await req.json()
    const parsed = createExpenseSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 })
    }

    const { category, description, amount, taxAmount, supplier, supplierTaxId, receiptUrl, date } = parsed.data

    const expenseDate = date ? new Date(date) : new Date()

    const expense = await prisma.expense.create({
      data: {
        restaurantId: user.restaurantId,
        category,
        description,
        amount,
        taxAmount,
        supplier,
        supplierTaxId,
        receiptUrl,
        date: expenseDate,
        createdById: user.id,
      },
    })

    return NextResponse.json(expense, { status: 201 })
  } catch (error) {
    console.error('Error al registrar gasto:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
