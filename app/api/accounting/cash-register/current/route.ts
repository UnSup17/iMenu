import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { calculateDailyCashRegister } from '@/lib/accounting/calculator'

export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const dateParam = searchParams.get('date')
    const openingBalance = parseFloat(searchParams.get('openingBalance') || '0')

    const targetDate = dateParam ? new Date(dateParam) : new Date()

    const user = session.user as { restaurantId?: string }
    if (!user.restaurantId) {
      return NextResponse.json({ error: 'Restaurante no configurado' }, { status: 400 })
    }

    const summary = await calculateDailyCashRegister(user.restaurantId, targetDate, openingBalance)
    return NextResponse.json(summary)
  } catch (error) {
    console.error('Error al calcular arqueo de caja actual:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
