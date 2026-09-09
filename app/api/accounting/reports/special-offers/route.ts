import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { calculateSpecialOffersReport } from '@/lib/accounting/calculator'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const user = session.user as {
      role?: string
      restaurantId?: string | null
      organizationId?: string | null
    }

    const allowedRoles = ['SUPERADMIN', 'ORG_ADMIN', 'RESTAURANT_ADMIN', 'ACCOUNTANT', 'MANAGER']
    if (!allowedRoles.includes(user.role || '')) {
      return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const restaurantId = searchParams.get('restaurantId') || user.restaurantId

    if (!restaurantId) {
      return NextResponse.json({ error: 'restaurantId es requerido' }, { status: 400 })
    }

    const now = new Date()
    const startDateParam = searchParams.get('startDate')
    const endDateParam = searchParams.get('endDate')
    const labelParam = searchParams.get('label')

    const startDate = startDateParam
      ? new Date(startDateParam)
      : new Date(now.getFullYear(), now.getMonth(), 1)
    const endDate = endDateParam
      ? new Date(endDateParam)
      : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

    const report = await calculateSpecialOffersReport(
      restaurantId,
      startDate,
      endDate,
      labelParam || undefined
    )

    return NextResponse.json(report)
  } catch (error: any) {
    console.error('[GET /api/accounting/reports/special-offers] Error:', error)
    return NextResponse.json({ error: error.message || 'Error al calcular reporte de ofertas especiales' }, { status: 500 })
  }
}
