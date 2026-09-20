import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const user = session.user as { role: string; foodCourtId?: string }
    const allowedRoles = ['SUPERADMIN', 'ORG_ADMIN', 'FOOD_COURT_ADMIN', 'RESTAURANT_ADMIN', 'ACCOUNTANT', 'MANAGER']
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 })
    }

    const { id: foodCourtId } = await params
    const searchParams = request.nextUrl.searchParams
    const timeframe = searchParams.get('timeframe') || '30d'
    const targetRestaurantId = searchParams.get('restaurantId')

    let dateFilter: Date | undefined
    const now = new Date()
    if (timeframe === 'today') {
      dateFilter = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    } else if (timeframe === '7d') {
      dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    } else if (timeframe === '30d') {
      dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    }

    const foodCourt = await prisma.foodCourt.findUnique({
      where: { id: foodCourtId },
      include: {
        memberships: {
          include: {
            restaurant: {
              select: {
                id: true,
                name: true,
                cuisineType: true,
                taxConfig: {
                  select: { taxId: true, legalName: true },
                },
              },
            },
          },
        },
        tables: { select: { id: true } },
      },
    })

    if (!foodCourt) {
      return NextResponse.json({ error: 'Plaza no encontrada' }, { status: 404 })
    }

    const tableIds = foodCourt.tables.map((t) => t.id)

    const orders = await prisma.order.findMany({
      where: {
        tableId: { in: tableIds },
        status: { not: 'CANCELLED' },
        ...(dateFilter ? { createdAt: { gte: dateFilter } } : {}),
      },
      select: {
        restaurantId: true,
        totalAmount: true,
      },
    })

    // Agrupar ventas por restaurante
    const salesByRestaurant = new Map<string, { grossSales: number; ordersCount: number }>()
    for (const order of orders) {
      const current = salesByRestaurant.get(order.restaurantId) || { grossSales: 0, ordersCount: 0 }
      current.grossSales += Number(order.totalAmount)
      current.ordersCount += 1
      salesByRestaurant.set(order.restaurantId, current)
    }

    let memberships = foodCourt.memberships
    if (targetRestaurantId) {
      memberships = memberships.filter((m) => m.restaurantId === targetRestaurantId)
    }

    // Construir líneas CSV con UTF-8 BOM
    const BOM = '\uFEFF'
    const csvRows: string[] = []

    csvRows.push(`"LIQUIDACIÓN OFICIAL DE COMISIONES — ${foodCourt.name.toUpperCase()}"`)
    csvRows.push(`"Período:","${timeframe.toUpperCase()}","Fecha de Emisión:","${new Date().toLocaleDateString('es-CO')}"`)
    csvRows.push(`"Moneda:","${foodCourt.currency}"`)
    csvRows.push('')
    csvRows.push(
      [
        '"Restaurante"',
        '"Razón Social / NIT"',
        '"Cocina / Categoría"',
        '"Órdenes"',
        '"Ventas Brutas"',
        '"% Comisión"',
        '"Comisión % ($)"',
        '"Cuota Fija ($)"',
        '"Retención Plaza ($)"',
        '"Neto a Liquidar ($)"',
      ].join(',')
    )

    let grandGross = 0
    let grandOrders = 0
    let grandCommission = 0
    let grandNet = 0

    for (const m of memberships) {
      const stats = salesByRestaurant.get(m.restaurantId) || { grossSales: 0, ordersCount: 0 }
      const gross = stats.grossSales
      const ordersCount = stats.ordersCount
      const pct = Number(m.commissionPercentage ?? 0)
      const fee = Number(m.commissionFixedFee ?? 0)

      const pctCommission = gross * (pct / 100)
      const feeCommission = ordersCount * fee
      const totalCommission = pctCommission + feeCommission
      const netPayout = Math.max(0, gross - totalCommission)

      grandGross += gross
      grandOrders += ordersCount
      grandCommission += totalCommission
      grandNet += netPayout

      const taxInfo = m.restaurant.taxConfig?.taxId || 'No registrado'

      csvRows.push(
        [
          `"${m.restaurant.name}"`,
          `"${taxInfo}"`,
          `"${m.restaurant.cuisineType || 'General'}"`,
          ordersCount,
          gross.toFixed(2),
          `${pct}%`,
          pctCommission.toFixed(2),
          feeCommission.toFixed(2),
          totalCommission.toFixed(2),
          netPayout.toFixed(2),
        ].join(',')
      )
    }

    csvRows.push('')
    csvRows.push(
      [
        '"TOTALES CONSOLIDADOS"',
        '""',
        '""',
        grandOrders,
        grandGross.toFixed(2),
        '""',
        '""',
        '""',
        grandCommission.toFixed(2),
        grandNet.toFixed(2),
      ].join(',')
    )

    const csvContent = BOM + csvRows.join('\r\n')
    const fileName = `Liquidacion_${foodCourt.slug}_${timeframe}_${new Date().toISOString().slice(0, 10)}.csv`

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    })
  } catch (error) {
    console.error('[Settlement CSV Export Error]:', error)
    return NextResponse.json(
      { error: 'Error al exportar liquidaciones en CSV' },
      { status: 500 }
    )
  }
}
