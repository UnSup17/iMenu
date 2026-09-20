import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const user = session.user as { restaurantId?: string; role: string }
    const restaurantId = user.restaurantId
    if (!restaurantId) {
      return NextResponse.json({ error: 'Restaurante no configurado' }, { status: 400 })
    }

    const { searchParams } = new URL(req.url)
    const tableId = searchParams.get('tableId')
    const format = searchParams.get('format') // 'html' | 'json'

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      include: { taxConfig: true },
    })

    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurante no encontrado' }, { status: 404 })
    }

    let items: { name: string; quantity: number; unitPrice: number; subtotal: number }[] = []
    let tableName = 'General / Evento'
    let customerName = searchParams.get('customerName') || 'Cotización / Cliente Evento'

    if (tableId) {
      const table = await prisma.table.findUnique({
        where: { id: tableId },
        include: {
          orders: {
            where: { status: { notIn: ['CANCELLED'] } },
            include: {
              items: {
                include: { product: true },
              },
            },
          },
        },
      })

      if (table) {
        tableName = `Mesa #${table.tableNumber}`
        table.orders.forEach((o) => {
          o.items.forEach((it) => {
            items.push({
              name: it.product.name,
              quantity: it.quantity,
              unitPrice: it.unitPrice.toNumber(),
              subtotal: it.subtotal.toNumber(),
            })
          })
        })
      }
    }

    // Si no hay mesa o está vacía, retornar ejemplo o los ítems provistos
    if (items.length === 0) {
      items = [
        { name: 'Menú Degustación Ejecutivo', quantity: 10, unitPrice: 45000, subtotal: 450000 },
        { name: 'Bebidas & Maridaje', quantity: 10, unitPrice: 15000, subtotal: 150000 },
      ]
    }

    const subtotal = items.reduce((s, i) => s + i.subtotal, 0)
    const vatRateNum = restaurant.taxConfig?.vatRate ? Number(restaurant.taxConfig.vatRate) * 100 : 19
    const taxRate = vatRateNum / 100
    const taxAmount = Math.round(subtotal * taxRate)
    const total = subtotal + taxAmount
    const proformaCode = `PRO-${Date.now().toString().slice(-6)}`
    const validUntil = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toLocaleDateString('es-CO')

    if (format === 'html') {
      const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Factura Proforma — ${proformaCode}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 650px; margin: 30px auto; padding: 30px; border: 1px solid #e4e4e7; border-radius: 12px; color: #18181b; }
    .watermark { background: #fef3c7; color: #92400e; padding: 8px 12px; border-radius: 6px; font-weight: bold; font-size: 11px; text-align: center; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 20px; }
    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #18181b; padding-bottom: 15px; margin-bottom: 20px; }
    h1 { margin: 0 0 5px; font-size: 20px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th { text-align: left; background: #f4f4f5; padding: 8px 10px; font-size: 12px; }
    td { padding: 8px 10px; border-bottom: 1px solid #e4e4e7; font-size: 12px; }
    .right { text-align: right; }
    .bold { font-weight: bold; }
    .totals { width: 250px; margin-left: auto; margin-top: 15px; }
    .totals div { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; }
    .grand-total { border-top: 2px solid #18181b; font-size: 15px !important; font-weight: bold; color: #047857; margin-top: 5px; padding-top: 6px !important; }
    .footer { margin-top: 30px; font-size: 11px; color: #71717a; text-align: center; border-top: 1px solid #e4e4e7; padding-top: 15px; }
  </style>
</head>
<body>
  <div class="watermark">⚠️ Documento Previo / Factura Proforma — No Válido Como Factura Fiscal</div>
  <div class="header">
    <div>
      <h1>${restaurant.name}</h1>
      <p style="margin:2px 0;font-size:12px;">NIT: ${restaurant.taxConfig?.taxId || 'Pendiente'}</p>
      <p style="margin:2px 0;font-size:12px;">${restaurant.taxConfig?.address || 'Bogotá, Colombia'}</p>
    </div>
    <div style="text-align:right;">
      <h2 style="margin:0;font-size:16px;color:#d97706;">PROFORMA</h2>
      <p style="margin:3px 0;font-size:12px;font-family:monospace;font-weight:bold;">${proformaCode}</p>
      <p style="margin:3px 0;font-size:11px;color:#71717a;">Fecha: ${new Date().toLocaleDateString('es-CO')}</p>
      <p style="margin:3px 0;font-size:11px;color:#71717a;">Válido hasta: ${validUntil}</p>
    </div>
  </div>

  <div style="margin-bottom:15px;font-size:12px;">
    <strong>Cliente / Solicitante:</strong> ${customerName}<br>
    <strong>Ubicación:</strong> ${tableName}
  </div>

  <table>
    <thead>
      <tr>
        <th>Cant</th>
        <th>Descripción</th>
        <th class="right">Precio Unitario</th>
        <th class="right">Subtotal</th>
      </tr>
    </thead>
    <tbody>
      ${items
        .map(
          (it) => `<tr>
        <td>${it.quantity}</td>
        <td>${it.name}</td>
        <td class="right">$${it.unitPrice.toLocaleString('es-CO')}</td>
        <td class="right">$${it.subtotal.toLocaleString('es-CO')}</td>
      </tr>`
        )
        .join('')}
    </tbody>
  </table>

  <div class="totals">
    <div><span>Subtotal:</span><span>$${subtotal.toLocaleString('es-CO')}</span></div>
    <div><span>IVA Estimado (${vatRateNum}%):</span><span>$${taxAmount.toLocaleString('es-CO')}</span></div>
    <div class="grand-total"><span>Total Estimado:</span><span>$${total.toLocaleString('es-CO')}</span></div>
  </div>

  <div class="footer">
    Cotización válida por 15 días calendario. Sujeta a disponibilidad de inventario e insumos en el momento de la confirmación formal. Generado automáticamente por iMenu.
  </div>
</body>
</html>`

      return new NextResponse(html, {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      })
    }

    return NextResponse.json({
      success: true,
      proforma: {
        code: proformaCode,
        restaurantName: restaurant.name,
        restaurantTaxId: restaurant.taxConfig?.taxId || null,
        customerName,
        tableName,
        items,
        subtotal,
        taxAmount,
        total,
        validUntil,
        issuedAt: new Date().toISOString(),
      },
    })
  } catch (error: any) {
    console.error('[Proforma API Error]:', error)
    return NextResponse.json({ error: 'Error al generar factura proforma' }, { status: 500 })
  }
}
