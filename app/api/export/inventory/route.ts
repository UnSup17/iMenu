import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function escapeCsv(val: any): string {
  if (val === null || val === undefined) return '""'
  const str = String(val).replace(/"/g, '""')
  return `"${str}"`
}

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const sessionUser = session.user as { id?: string; restaurantId?: string; role?: string }
  const allowed = ['SUPERADMIN', 'ORG_ADMIN', 'RESTAURANT_ADMIN', 'MANAGER']
  if (!allowed.includes(sessionUser.role || '')) {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
  }

  let restaurantId = sessionUser.restaurantId

  if (!restaurantId && sessionUser.id) {
    const user = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: { restaurantId: true, organizationId: true },
    })
    restaurantId = user?.restaurantId ?? undefined
    if (!restaurantId && user?.organizationId) {
      const firstBranch = await prisma.restaurant.findFirst({
        where: { organizationId: user.organizationId },
        select: { id: true },
      })
      restaurantId = firstBranch?.id ?? undefined
    }
  }

  if (!restaurantId && sessionUser.role === 'SUPERADMIN') {
    const firstRest = await prisma.restaurant.findFirst({ select: { id: true } })
    restaurantId = firstRest?.id ?? undefined
  }

  if (!restaurantId) {
    return NextResponse.json({ error: 'Restaurante no configurado' }, { status: 400 })
  }

  const items = await prisma.inventoryItem.findMany({
    where: { restaurantId, isActive: true },
    orderBy: { name: 'asc' },
  })

  // Headers
  const headers = [
    'ID Ítem',
    'Nombre',
    'Unidad',
    'Stock Actual',
    'Stock Mínimo',
    'Costo Unitario ($)',
    'Valor Total Valorizado ($)',
    'Estado de Existencias',
    'Última Actualización',
  ]

  const rows = items.map((item) => {
    const current = item.currentStock.toNumber()
    const min = item.minStock.toNumber()
    const cost = item.costPerUnit.toNumber()
    const totalValue = current * cost

    let status = 'Óptimo'
    if (current <= 0) {
      status = 'Agotado (Sin Stock)'
    } else if (current <= min) {
      status = 'Bajo Stock (Reordenar)'
    }

    return [
      escapeCsv(item.id),
      escapeCsv(item.name),
      escapeCsv(item.unit),
      escapeCsv(current),
      escapeCsv(min),
      escapeCsv(cost),
      escapeCsv(totalValue),
      escapeCsv(status),
      escapeCsv(item.updatedAt ? new Date(item.updatedAt).toLocaleString('es-CO') : ''),
    ].join(',')
  })

  // BOM para compatibilidad directa con Microsoft Excel y Google Sheets
  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n')

  const dateStr = new Date().toISOString().split('T')[0]
  const filename = `inventario-${dateStr}.csv`

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
