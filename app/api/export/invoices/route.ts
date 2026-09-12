import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { InvoiceStatus } from '@prisma/client'

function escapeCsv(val: any): string {
  if (val === null || val === undefined) return '""'
  const str = String(val).replace(/"/g, '""')
  return `"${str}"`
}

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const user = session.user as { restaurantId?: string; role: string }
  const allowed = ['SUPERADMIN', 'ORG_ADMIN', 'RESTAURANT_ADMIN', 'MANAGER', 'ACCOUNTANT']
  if (!allowed.includes(user.role)) {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
  }

  const restaurantId = user.restaurantId
  if (!restaurantId) {
    return NextResponse.json({ error: 'Restaurante no configurado' }, { status: 400 })
  }

  const { searchParams } = new URL(request.url)
  const statusFilter = searchParams.get('status')

  const whereCondition: {
    restaurantId: string
    status?: InvoiceStatus
  } = { restaurantId }

  if (statusFilter && ['DRAFT', 'ISSUED', 'PAID', 'VOID', 'REFUNDED'].includes(statusFilter)) {
    whereCondition.status = statusFilter as InvoiceStatus
  }

  const invoices = await prisma.invoice.findMany({
    where: whereCondition,
    include: {
      table: { select: { tableNumber: true } },
      payments: { select: { method: true, amount: true } },
    },
    orderBy: { issuedAt: 'desc' },
  })

  // Encabezados CSV
  const headers = [
    'Folio / N°',
    'Fecha Emisión',
    'Fecha Pago',
    'Estado',
    'Mesa',
    'Cliente',
    'Doc. Cliente',
    'Subtotal',
    'IVA / Impuesto',
    'Propina',
    'Total',
    'Métodos de Pago',
    'Notas',
  ]

  const rows = invoices.map((inv) => {
    const paymentMethods = inv.payments.map((p) => `${p.method}: $${p.amount}`).join('; ')
    return [
      escapeCsv(inv.invoiceNumber),
      escapeCsv(inv.issuedAt ? new Date(inv.issuedAt).toLocaleString('es-CO') : ''),
      escapeCsv(inv.paidAt ? new Date(inv.paidAt).toLocaleString('es-CO') : ''),
      escapeCsv(inv.status),
      escapeCsv(inv.table ? `Mesa ${inv.table.tableNumber}` : 'Sin mesa'),
      escapeCsv(inv.customerName || 'Consumidor Final'),
      escapeCsv(inv.customerTaxId || ''),
      escapeCsv(inv.subtotal.toNumber()),
      escapeCsv(inv.taxAmount.toNumber()),
      escapeCsv(inv.serviceCharge.toNumber()),
      escapeCsv(inv.total.toNumber()),
      escapeCsv(paymentMethods),
      escapeCsv(inv.notes || ''),
    ].join(',')
  })

  // \uFEFF es el BOM para que Excel detecte UTF-8 automáticamente
  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n')

  const dateStr = new Date().toISOString().split('T')[0]
  const filename = `facturas-${dateStr}.csv`

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
