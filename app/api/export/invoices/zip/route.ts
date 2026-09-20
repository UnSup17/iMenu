import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { InvoiceStatus } from '@prisma/client'
import JSZip from 'jszip'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
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
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const whereCondition: any = { restaurantId }

    if (statusFilter && ['DRAFT', 'ISSUED', 'PAID', 'VOID', 'REFUNDED'].includes(statusFilter)) {
      whereCondition.status = statusFilter as InvoiceStatus
    }

    if (startDate || endDate) {
      whereCondition.issuedAt = {}
      if (startDate) whereCondition.issuedAt.gte = new Date(startDate)
      if (endDate) whereCondition.issuedAt.lte = new Date(endDate)
    }

    const invoices = await prisma.invoice.findMany({
      where: whereCondition,
      include: {
        table: { select: { tableNumber: true } },
        waiter: { select: { name: true } },
        items: true,
        payments: true,
        restaurant: {
          select: {
            name: true,
            taxConfig: {
              select: {
                taxId: true,
                address: true,
                phone: true,
              },
            },
          },
        },
      },
      orderBy: { issuedAt: 'desc' },
      take: 200,
    })

    if (invoices.length === 0) {
      return NextResponse.json({ error: 'No se encontraron facturas para los filtros seleccionados' }, { status: 404 })
    }

    const zip = new JSZip()
    const folderTxt = zip.folder('comprobantes_texto')
    const folderHtml = zip.folder('comprobantes_imprimibles')

    let csvContent = 'Folio,Fecha,Mesa,Cliente,NIT,Subtotal,IVA,Propina,Total,Estado,MetodosPago\n'
    let totalFacturado = 0
    let totalIva = 0

    invoices.forEach((inv) => {
      const invNum = inv.invoiceNumber || inv.id.slice(0, 8)
      const subtotal = inv.subtotal.toNumber()
      const iva = inv.taxAmount.toNumber()
      const total = inv.total.toNumber()
      const propina = inv.serviceCharge?.toNumber() || 0
      const methods = inv.payments.map((p) => p.method).join(' + ') || inv.paymentMethod || 'PENDIENTE'

      totalFacturado += total
      totalIva += iva

      // 1. Línea CSV
      csvContent += `"${invNum}","${inv.issuedAt.toISOString()}","${inv.table?.tableNumber ?? 'N/A'}","${inv.customerName || 'Consumidor Final'}","${inv.customerTaxId || ''}",${subtotal},${iva},${propina},${total},"${inv.status}","${methods}"\n`

      // 2. Comprobante de Texto Térmico 80mm
      let txtReceipt = `========================================\n`
      txtReceipt += `       ${(inv.restaurant?.name || 'iMenu').toUpperCase()}\n`
      if (inv.restaurant?.taxConfig?.taxId) txtReceipt += `         NIT: ${inv.restaurant.taxConfig.taxId}\n`
      if (inv.restaurant?.taxConfig?.address) txtReceipt += `     ${inv.restaurant.taxConfig.address}\n`
      txtReceipt += `========================================\n`
      txtReceipt += `FACTURA / COMPROBANTE: ${invNum}\n`
      txtReceipt += `FECHA: ${inv.issuedAt.toLocaleString('es-CO')}\n`
      txtReceipt += `MESA: ${inv.table?.tableNumber ?? 'Barra'} | MESERO: ${inv.waiter?.name || 'N/A'}\n`
      txtReceipt += `CLIENTE: ${inv.customerName || 'Consumidor Final'}\n`
      if (inv.customerTaxId) txtReceipt += `NIT/CC: ${inv.customerTaxId}\n`
      txtReceipt += `----------------------------------------\n`
      txtReceipt += `CANT  DESCRIPCIÓN              TOTAL\n`
      txtReceipt += `----------------------------------------\n`

      inv.items.forEach((item) => {
        const lineName = item.description.padEnd(24).slice(0, 24)
        const lineTotal = `$${item.subtotal.toNumber().toLocaleString('es-CO')}`.padStart(10)
        txtReceipt += `${String(item.quantity).padEnd(5)}${lineName} ${lineTotal}\n`
      })

      txtReceipt += `----------------------------------------\n`
      txtReceipt += `SUBTOTAL:          $${subtotal.toLocaleString('es-CO').padStart(14)}\n`
      txtReceipt += `IVA:               $${iva.toLocaleString('es-CO').padStart(14)}\n`
      if (propina > 0) {
        txtReceipt += `PROPINA:           $${propina.toLocaleString('es-CO').padStart(14)}\n`
      }
      txtReceipt += `TOTAL A PAGAR:     $${total.toLocaleString('es-CO').padStart(14)}\n`
      txtReceipt += `========================================\n`
      txtReceipt += `ESTADO: ${inv.status} | MÉTODO: ${methods}\n`
      txtReceipt += `        ¡Gracias por su visita!\n`
      txtReceipt += `========================================\n`

      folderTxt?.file(`COMPROBANTE_${invNum}.txt`, txtReceipt)

      // 3. Comprobante HTML Imprimible
      const htmlReceipt = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Comprobante ${invNum}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, monospace; max-width: 380px; margin: 20px auto; padding: 15px; border: 1px solid #ccc; font-size: 12px; }
    h2 { text-align: center; margin: 0 0 5px; font-size: 16px; }
    p { margin: 3px 0; }
    hr { border: none; border-top: 1px dashed #666; margin: 10px 0; }
    table { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 11px; }
    th { text-align: left; border-bottom: 1px solid #000; padding-bottom: 3px; }
    td { padding: 3px 0; }
    .right { text-align: right; }
    .bold { font-weight: bold; }
    .center { text-align: center; }
  </style>
</head>
<body>
  <h2>${inv.restaurant?.name || 'iMenu'}</h2>
  <p class="center">${inv.restaurant?.taxConfig?.address || ''}</p>
  <p class="center">NIT: ${inv.restaurant?.taxConfig?.taxId || 'N/A'}</p>
  <hr>
  <p><strong>Comprobante:</strong> ${invNum}</p>
  <p><strong>Fecha:</strong> ${inv.issuedAt.toLocaleString('es-CO')}</p>
  <p><strong>Mesa:</strong> ${inv.table?.tableNumber ?? 'Barra'}</p>
  <p><strong>Cliente:</strong> ${inv.customerName || 'Consumidor Final'}</p>
  <hr>
  <table>
    <thead>
      <tr>
        <th>Cant</th>
        <th>Ítem</th>
        <th class="right">Total</th>
      </tr>
    </thead>
    <tbody>
      ${inv.items
        .map(
          (i) => `<tr>
        <td>${i.quantity}</td>
        <td>${i.description}</td>
        <td class="right">$${i.subtotal.toNumber().toLocaleString('es-CO')}</td>
      </tr>`
        )
        .join('')}
    </tbody>
  </table>
  <hr>
  <p class="right">Subtotal: $${subtotal.toLocaleString('es-CO')}</p>
  <p class="right">IVA: $${iva.toLocaleString('es-CO')}</p>
  ${propina > 0 ? `<p class="right">Propina: $${propina.toLocaleString('es-CO')}</p>` : ''}
  <p class="right bold" style="font-size: 14px;">TOTAL: $${total.toLocaleString('es-CO')}</p>
  <hr>
  <p class="center">Método: ${methods} — Estado: ${inv.status}</p>
  <p class="center" style="font-size: 10px; color: #888;">Generado por iMenu POS</p>
</body>
</html>`

      folderHtml?.file(`COMPROBANTE_${invNum}.html`, htmlReceipt)
    })

    // Índice CSV y Manifiesto JSON
    zip.file('indice_facturas.csv', csvContent)
    zip.file(
      'resumen_lote.json',
      JSON.stringify(
        {
          totalFacturas: invoices.length,
          totalFacturado,
          totalIva,
          generadoEl: new Date().toISOString(),
          restauranteId: restaurantId,
          filtros: { statusFilter, startDate, endDate },
        },
        null,
        2
      )
    )

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })

    const filename = `comprobantes_${restaurantId.slice(0, 6)}_${new Date().toISOString().slice(0, 10)}.zip`

    return new NextResponse(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error: any) {
    console.error('[ZIP Export Error]:', error)
    return NextResponse.json({ error: 'Error al empaquetar comprobantes en ZIP' }, { status: 500 })
  }
}
