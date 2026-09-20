import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { ExpenseCategory } from '@prisma/client'

const PayrollDisbursementSchema = z.object({
  employeeName: z.string().min(2, 'El nombre del empleado es requerido'),
  employeeId: z.string().optional().nullable(),
  role: z.string().min(2, 'El cargo o rol es requerido'),
  period: z.string().min(4, 'El período es requerido (ej. 2026-09)'),
  baseSalary: z.number().nonnegative(),
  overtimeAmount: z.number().nonnegative().default(0),
  transportAllowance: z.number().nonnegative().default(0),
  tipsDistributed: z.number().nonnegative().default(0),
  deductions: z.number().nonnegative().default(0),
  paymentDate: z.string().min(1, 'La fecha de pago es requerida'),
  paymentMethod: z.enum(['CASH', 'TRANSFER']).default('TRANSFER'),
  notes: z.string().optional().nullable(),
})

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const user = session.user as { restaurantId?: string; role?: string }
    if (!user.restaurantId) {
      return NextResponse.json({ error: 'Restaurante no configurado' }, { status: 400 })
    }

    const allowed = ['SUPERADMIN', 'ORG_ADMIN', 'RESTAURANT_ADMIN', 'ACCOUNTANT', 'MANAGER']
    if (!allowed.includes(user.role || '')) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const monthParam = searchParams.get('month') // YYYY-MM

    let dateFilter = {}
    if (monthParam) {
      const [year, month] = monthParam.split('-').map(Number)
      const startDate = new Date(year, month - 1, 1)
      const endDate = new Date(year, month, 0, 23, 59, 59, 999)
      dateFilter = { gte: startDate, lte: endDate }
    }

    // Retrieve LABOR expenses
    const laborExpenses = await prisma.expense.findMany({
      where: {
        restaurantId: user.restaurantId,
        category: ExpenseCategory.LABOR,
        ...(monthParam ? { date: dateFilter } : {}),
      },
      include: {
        createdBy: { select: { name: true } },
      },
      orderBy: { date: 'desc' },
      take: 100,
    })

    const totalLaborCost = laborExpenses.reduce((acc, e) => acc + Number(e.amount), 0)

    return NextResponse.json({
      records: laborExpenses.map((e) => ({
        id: e.id,
        description: e.description,
        employeeName: e.supplier || 'Colaborador',
        employeeId: e.supplierTaxId || null,
        amount: Number(e.amount),
        date: e.date.toISOString(),
        registeredBy: e.createdBy?.name || 'Sistema',
      })),
      summary: {
        totalRecords: laborExpenses.length,
        totalLaborCost: parseFloat(totalLaborCost.toFixed(2)),
        averagePerRecord: laborExpenses.length > 0 ? parseFloat((totalLaborCost / laborExpenses.length).toFixed(2)) : 0,
      },
    })
  } catch (error) {
    console.error('[Payroll GET Error]:', error)
    return NextResponse.json({ error: 'Error al obtener registros de nómina' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const user = session.user as { id?: string; restaurantId?: string; role?: string }
    if (!user.restaurantId || !user.id) {
      return NextResponse.json({ error: 'Restaurante no configurado' }, { status: 400 })
    }

    const allowed = ['SUPERADMIN', 'ORG_ADMIN', 'RESTAURANT_ADMIN', 'ACCOUNTANT']
    if (!allowed.includes(user.role || '')) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const body = await req.json()
    const data = PayrollDisbursementSchema.parse(body)

    const totalEarnings =
      data.baseSalary + data.overtimeAmount + data.transportAllowance + data.tipsDistributed
    const totalNet = Math.max(0, totalEarnings - data.deductions)

    const descParts = [
      `Nómina [${data.period}]`,
      data.employeeName,
      `(${data.role})`,
      `- Base: $${data.baseSalary.toLocaleString('es-CO')}`,
    ]
    if (data.overtimeAmount > 0) descParts.push(`Extras: $${data.overtimeAmount.toLocaleString('es-CO')}`)
    if (data.transportAllowance > 0) descParts.push(`Aux.Transp: $${data.transportAllowance.toLocaleString('es-CO')}`)
    if (data.tipsDistributed > 0) descParts.push(`Propinas: $${data.tipsDistributed.toLocaleString('es-CO')}`)
    if (data.deductions > 0) descParts.push(`Deduc: -$${data.deductions.toLocaleString('es-CO')}`)
    if (data.notes) descParts.push(`[${data.notes}]`)

    const description = descParts.join(' | ')

    // Automatically record as an Expense in LABOR category
    const expense = await prisma.expense.create({
      data: {
        restaurantId: user.restaurantId,
        category: ExpenseCategory.LABOR,
        description,
        amount: parseFloat(totalNet.toFixed(2)),
        taxAmount: 0,
        supplier: data.employeeName,
        supplierTaxId: data.employeeId || null,
        date: new Date(data.paymentDate),
        createdById: user.id,
      },
    })

    return NextResponse.json(
      {
        success: true,
        expenseId: expense.id,
        employeeName: data.employeeName,
        totalGross: parseFloat(totalEarnings.toFixed(2)),
        totalNet: parseFloat(totalNet.toFixed(2)),
      },
      { status: 201 }
    )
  } catch (error: any) {
    if (error?.name === 'ZodError') {
      return NextResponse.json({ error: error.errors[0]?.message }, { status: 422 })
    }
    console.error('[Payroll POST Error]:', error)
    return NextResponse.json({ error: 'Error al registrar pago de nómina' }, { status: 500 })
  }
}
