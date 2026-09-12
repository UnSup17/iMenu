import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const restaurantId = req.nextUrl.searchParams.get('restaurantId')

    if (!restaurantId) {
      return NextResponse.json({ error: 'restaurantId es requerido' }, { status: 400 })
    }

    const activeOrdersCount = await prisma.order.count({
      where: {
        restaurantId,
        status: { in: ['RECEIVED', 'PREPARING'] },
      },
    })

    // Cálculo dinámico de tiempo estimado
    const baseMinutes = 15
    const additionalPerOrder = 3
    const calculatedMinutes = baseMinutes + activeOrdersCount * additionalPerOrder
    const estimatedMinutes = Math.min(Math.max(calculatedMinutes, 12), 55)

    let pace: 'calm' | 'normal' | 'busy' = 'normal'
    if (activeOrdersCount <= 2) {
      pace = 'calm'
    } else if (activeOrdersCount > 6) {
      pace = 'busy'
    }

    return NextResponse.json({
      activeOrdersCount,
      estimatedMinutes,
      pace,
    })
  } catch (error) {
    console.error('[Kitchen Load API error]:', error)
    return NextResponse.json({ error: 'Error al calcular carga de cocina' }, { status: 500 })
  }
}
