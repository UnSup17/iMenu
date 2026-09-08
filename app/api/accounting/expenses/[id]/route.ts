import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ExpenseCategory } from '@prisma/client'
import { z } from 'zod'

const updateExpenseSchema = z.object({
  category: z.nativeEnum(ExpenseCategory).optional(),
  description: z.string().min(2).optional(),
  amount: z.number().positive().optional(),
  taxAmount: z.number().min(0).optional(),
  supplier: z.string().optional().nullable(),
  supplierTaxId: z.string().optional().nullable(),
  receiptUrl: z.string().optional().nullable(),
  date: z.string().optional(),
})

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params
    const user = session.user as { restaurantId?: string }

    const expense = await prisma.expense.findUnique({
      where: { id },
      include: {
        createdBy: { select: { name: true, email: true } },
      },
    })

    if (!expense || expense.restaurantId !== user.restaurantId) {
      return NextResponse.json({ error: 'Gasto no encontrado' }, { status: 404 })
    }

    return NextResponse.json(expense)
  } catch (error) {
    console.error('Error al obtener gasto:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params
    const user = session.user as { restaurantId?: string }

    const existing = await prisma.expense.findUnique({
      where: { id },
    })

    if (!existing || existing.restaurantId !== user.restaurantId) {
      return NextResponse.json({ error: 'Gasto no encontrado' }, { status: 404 })
    }

    const body = await req.json()
    const parsed = updateExpenseSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 })
    }

    const data: any = { ...parsed.data }
    if (data.date) {
      data.date = new Date(data.date)
    }

    const updated = await prisma.expense.update({
      where: { id },
      data,
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error al actualizar gasto:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params
    const user = session.user as { restaurantId?: string }

    const existing = await prisma.expense.findUnique({
      where: { id },
    })

    if (!existing || existing.restaurantId !== user.restaurantId) {
      return NextResponse.json({ error: 'Gasto no encontrado' }, { status: 404 })
    }

    await prisma.expense.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error al eliminar gasto:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
