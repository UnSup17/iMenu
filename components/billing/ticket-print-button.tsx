'use client'

import { useState } from 'react'

export function TicketPrintButton({ invoiceId }: { invoiceId: string }) {
  const [printing, setPrinting] = useState(false)

  async function handlePrintTicket() {
    setPrinting(true)
    try {
      // Fetch invoice data for ticket layout
      const res = await fetch(`/api/invoices/${invoiceId}`)
      if (!res.ok) throw new Error('No se pudo cargar la factura')
      const data = await res.json()
      const inv = data.invoice

      // Create print window with POS thermal styling (80mm width)
      const printWin = window.open('', '_blank', 'width=400,height=600')
      if (!printWin) return

      const ticketHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Ticket Factura ${inv.invoiceNumber}</title>
            <style>
              @page { size: 80mm auto; margin: 0; }
              body {
                font-family: 'Courier New', Courier, monospace;
                width: 72mm;
                margin: 4mm auto;
                font-size: 11px;
                color: #000;
                line-height: 1.3;
              }
              .center { text-align: center; }
              .right { text-align: right; }
              .bold { font-weight: bold; }
              .divider { border-top: 1px dashed #000; margin: 6px 0; }
              table { width: 100%; border-collapse: collapse; margin: 6px 0; }
              td { vertical-align: top; }
            </style>
          </head>
          <body onload="window.print(); setTimeout(() => window.close(), 500);">
            <div class="center bold" style="font-size: 14px;">${inv.restaurant?.name ?? 'RESTAURANTE'}</div>
            <div class="center">${inv.restaurant?.address ?? ''}</div>
            <div class="center">NIT: ${inv.restaurant?.taxId ?? ''}</div>
            <div class="divider"></div>
            
            <div><strong>FACTURA DE VENTA:</strong> ${inv.invoiceNumber}</div>
            <div><strong>FECHA:</strong> ${new Date(inv.issuedAt).toLocaleString('es-CO')}</div>
            <div><strong>MESA / CLIENTE:</strong> ${inv.table ? 'Mesa ' + inv.table.tableNumber : inv.customerName ?? 'Cliente General'}</div>
            <div class="divider"></div>

            <table>
              <thead>
                <tr style="border-bottom: 1px solid #000;">
                  <td class="bold">CANT/ITEM</td>
                  <td class="bold right">TOTAL</td>
                </tr>
              </thead>
              <tbody>
                ${inv.items
                  .map(
                    (it: { quantity: number; description: string; subtotal: number; taxAmount: number }) => `
                  <tr>
                    <td>${it.quantity}x ${it.description}</td>
                    <td class="right">$${(it.subtotal + it.taxAmount).toLocaleString('es-CO')}</td>
                  </tr>
                `,
                  )
                  .join('')}
              </tbody>
            </table>

            <div class="divider"></div>
            <table>
              <tr>
                <td>SUBTOTAL:</td>
                <td class="right">$${inv.subtotal.toLocaleString('es-CO')}</td>
              </tr>
              <tr>
                <td>IVA:</td>
                <td class="right">$${inv.taxAmount.toLocaleString('es-CO')}</td>
              </tr>
              ${inv.discountAmount > 0 ? `
              <tr>
                <td>DESCUENTO:</td>
                <td class="right">-$${inv.discountAmount.toLocaleString('es-CO')}</td>
              </tr>` : ''}
              <tr class="bold" style="font-size: 13px;">
                <td>TOTAL:</td>
                <td class="right">$${inv.total.toLocaleString('es-CO')}</td>
              </tr>
            </table>

            <div class="divider"></div>
            <div class="center">¡Gracias por su visita!</div>
            ${inv.restaurant?.brandTheme?.whiteLabelEnabled ? '' : '<div class="center" style="font-size: 9px; margin-top: 4px; opacity: 0.7;">Powered by iMenu POS</div>'}
          </body>
        </html>
      `

      printWin.document.write(ticketHtml)
      printWin.document.close()
    } catch (err) {
      console.error('Error al imprimir ticket:', err)
      alert('Error al generar la impresión del ticket')
    } finally {
      setPrinting(false)
    }
  }

  return (
    <button
      onClick={handlePrintTicket}
      disabled={printing}
      className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm rounded-lg transition-colors flex items-center gap-2"
    >
      🖨️ {printing ? 'Generando Ticket...' : 'Imprimir Ticket'}
    </button>
  )
}
