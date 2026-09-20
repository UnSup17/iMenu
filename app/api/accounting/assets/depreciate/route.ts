import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ExpenseCategory } from '@prisma/client'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const user = session.user as { id?: string; restaurantId?: string; role?: string }
    if (!user.restaurantId || !user.id) {
      return NextResponse.json({ error: 'Restaurante o usuario no configurado' }, { status: 400 })
    }

    const allowed = ['SUPERADMIN', 'ORG_ADMIN', 'RESTAURANT_ADMIN', 'ACCOUNTANT']
    if (!allowed.includes(user.role || '')) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const body = await req.json().catch(() => ({}))
    const now = new Date()
    const targetMonth = body.month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const [year, month] = targetMonth.split('-').map(Number)
    const expenseDate = new Date(year, month - 1, 28) // fecha de fin de mes

    // Check if depreciation expense for this month has already been generated
    const existingExpense = await prisma.expense.findFirst({
      where: {
        restaurantId: user.restaurantId,
        category: ExpenseCategory.EQUIPMENT,
        description: { contains: `Depreciación mensual acumulada - ${targetMonth}` },
      },
    })

    if (existingExpense) {
      return NextResponse.json(
        { error: `La depreciación para el período ${targetMonth} ya fue contabilizada previamente.` },
        { status: 409 }
      )
    }

    // Calculate total active monthly depreciation
    const assets = await (prisma as any).fixedAsset.findMany({
      where: {
        restaurantId: user.restaurantId,
        isActive: true,
      },
    })

    let totalMonthlyDepr = 0
    let eligibleAssetsCount = 0

    for (const asset of assets) {
      const cost = Number(asset.acquisitionCost)
      const salvage = Number(asset.salvageValue)
      const lifeMonths = asset.usefulLifeMonths || 60
      const acqDate = new Date(asset.acquisitionDate)

      const diffMs = Math.max(0, expenseDate.getTime() - acqDate.getTime())
      const monthsElapsed = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30.4375))

      if (monthsElapsed < lifeMonths && lifeMonths > 0) {
        const monthly = (cost - salvage) / lifeMonths
        totalMonthlyDepr += monthly
        eligibleAssetsCount += 1
      }
    }

    if (totalMonthlyDepr <= 0) {
      return NextResponse.json({
        message: 'No hay activos pendientes de depreciar en este período.',
        totalDepreciation: 0,
      })
    }

    // Create Expense in EQUIPMENT category
    const expense = await prisma.expense.create({
      data: {
        restaurantId: user.restaurantId,
        category: ExpenseCategory.EQUIPMENT,
        description: `Depreciación mensual acumulada - ${targetMonth} (${eligibleAssetsCount} activos)`,
        amount: parseFloat(totalMonthlyDepr.toFixed(2)),
        taxAmount: 0,
        supplier: 'Depreciación Interna',
        date: expenseDate,
        createdById: user.id,
      },
    })

    return NextResponse.json({
      success: true,
      expenseId: expense.id,
      month: targetMonth,
      totalDepreciation: parseFloat(totalMonthlyDepr.toFixed(2)),
      eligibleAssetsCount,
    })
  } catch (error) {
    console.error('[Asset Depreciate POST Error]:', error)
    return NextResponse.json({ error: 'Error al contabilizar depreciación' }, { status: 500 })
  }
}
