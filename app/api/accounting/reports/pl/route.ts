import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { calculatePL } from '@/lib/accounting/calculator'

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

    const user = session.user as { restaurantId?: string }
    if (!user.restaurantId) {
      return NextResponse.json({ error: 'Restaurante no configurado' }, { status: 400 })
    }

    const now = new Date()
    // Por defecto, mes actual
    const startDate = startDateParam
      ? new Date(startDateParam)
      : new Date(now.getFullYear(), now.getMonth(), 1)
    const endDate = endDateParam
      ? new Date(endDateParam)
      : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

    const plData = await calculatePL(user.restaurantId, startDate, endDate, periodLabel)
    return NextResponse.json(plData)
  } catch (error) {
    console.error('Error al generar estado P&L:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
