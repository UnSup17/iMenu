import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { calculateCashflow } from '@/lib/accounting/calculator'

export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const startDateParam = searchParams.get('startDate')
    const endDateParam = searchParams.get('endDate')
    const periodLabel = searchParams.get('label') || undefined

    const user = session.user as { restaurantId?: string; role?: string }
    if (!user.restaurantId) {
      return NextResponse.json({ error: 'Restaurante no configurado' }, { status: 400 })
    }

    const allowedRoles = ['SUPERADMIN', 'ORG_ADMIN', 'RESTAURANT_ADMIN', 'ACCOUNTANT', 'MANAGER']
    if (!allowedRoles.includes(user.role || '')) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const now = new Date()
    // Por defecto, mes actual
    const startDate = startDateParam
      ? new Date(startDateParam)
      : new Date(now.getFullYear(), now.getMonth(), 1)
    const endDate = endDateParam
      ? new Date(endDateParam)
      : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

    const cashflowData = await calculateCashflow(user.restaurantId, startDate, endDate, periodLabel)
    return NextResponse.json(cashflowData)
  } catch (error) {
    console.error('[Cashflow GET Error]:', error)
    return NextResponse.json({ error: 'Error al generar reporte de flujo de caja' }, { status: 500 })
  }
}
