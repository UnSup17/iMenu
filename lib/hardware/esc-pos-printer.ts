/**
 * lib/hardware/esc-pos-printer.ts
 *
 * Módulo de impresión térmica ESC/POS.
 *
 * Estrategias soportadas:
 *   1. NETWORK: Envío de bytes ESC/POS a una impresora en red (IP:puerto) vía el endpoint
 *      /api/hardware/print-escpos que usa net.Socket (Node.js, solo en server/API routes).
 *   2. BROWSER_WINDOW: Fallback — Impresión CSS 80mm vía window.open() (sin ESC/POS real).
 *
 * El cliente llama a printTicket() con la estrategia deseada. La estrategia NETWORK
 * requiere que la impresora esté accesible desde el servidor Next.js.
 */

export type PrintStrategy = 'NETWORK' | 'BROWSER_WINDOW'

export interface PrinterConfig {
  strategy: PrintStrategy
  /** Para NETWORK: IP de la impresora térmica en la LAN del restaurante */
  printerIp?: string
  /** Para NETWORK: Puerto de la impresora (defecto 9100 para impresoras Epson/Star en RAW) */
  printerPort?: number
}

export interface TicketPayload {
  restaurantName: string
  restaurantAddress?: string
  restaurantTaxId?: string
  invoiceNumber: string
  issuedAt: string
  tableLabel: string
  items: { quantity: number; description: string; total: number }[]
  subtotal: number
  taxAmount: number
  discountAmount?: number
  total: number
  currency: string
  tipAmount?: number
  poweredByIMenu?: boolean
}

/**
 * Construye el buffer ESC/POS para un ticket de 80mm (48 columnas).
 * Compatible con Epson TM-T20, TM-T88, Bixolon SRP-350, RONGTA, etc.
 */
export function buildEscPosBuffer(ticket: TicketPayload): number[] {
  const ESC = 0x1b
  const GS  = 0x1d
  const LF  = 0x0a

  const bytes: number[] = []

  const push = (arr: number[]) => bytes.push(...arr)
  const text = (str: string) => push(Array.from(str).map(c => c.charCodeAt(0)))
  const nl   = ()            => push([LF])
  const center = ()         => push([ESC, 0x61, 0x01])
  const left   = ()         => push([ESC, 0x61, 0x00])
  const bold   = (on: boolean) => push([ESC, 0x45, on ? 1 : 0])
  const doubleHeight = (on: boolean) => push([ESC, 0x21, on ? 0x10 : 0x00])
  const cutPaper = () => push([GS, 0x56, 0x41, 0x00])
  const divider = () => { left(); text('─'.repeat(32)); nl() }

  // Inicializar impresora
  push([ESC, 0x40]) // ESC @ = Initialize

  // Cabecera
  center(); bold(true); doubleHeight(true)
  text(ticket.restaurantName.substring(0, 24).toUpperCase()); nl()
  doubleHeight(false); bold(false)
  if (ticket.restaurantAddress) { text(ticket.restaurantAddress.substring(0, 32)); nl() }
  if (ticket.restaurantTaxId)   { text(`NIT: ${ticket.restaurantTaxId}`); nl() }

  divider()

  // Datos de la factura
  left(); bold(true); text(`FACTURA: ${ticket.invoiceNumber}`); bold(false); nl()
  text(`FECHA: ${new Date(ticket.issuedAt).toLocaleString('es-CO')}`); nl()
  text(`MESA: ${ticket.tableLabel}`); nl()

  divider()

  // Ítem de formato: CANT DESCRIPCION          PRECIO
  const COL = 32
  ticket.items.forEach(item => {
    const qty  = `${item.quantity}x `
    const prc  = item.total.toLocaleString('es-CO')
    const maxDesc = COL - qty.length - prc.length - 1
    const desc = item.description.substring(0, maxDesc).padEnd(maxDesc)
    text(`${qty}${desc} ${prc}`); nl()
  })

  divider()

  // Totales
  const col2 = (label: string, val: string) => {
    const padded = label.padEnd(COL - val.length)
    text(`${padded}${val}`); nl()
  }
  col2('SUBTOTAL:', `$${ticket.subtotal.toLocaleString('es-CO')}`)
  col2('IVA:', `$${ticket.taxAmount.toLocaleString('es-CO')}`)
  if (ticket.discountAmount && ticket.discountAmount > 0) {
    col2('DESCUENTO:', `-$${ticket.discountAmount.toLocaleString('es-CO')}`)
  }
  if (ticket.tipAmount && ticket.tipAmount > 0) {
    col2('PROPINA:', `$${ticket.tipAmount.toLocaleString('es-CO')}`)
  }
  bold(true); col2('TOTAL:', `$${ticket.total.toLocaleString('es-CO')}`); bold(false)

  divider()

  center()
  text('!Gracias por su visita!'); nl()
  if (ticket.poweredByIMenu !== false) {
    text('Powered by iMenu POS'); nl()
  }
  nl(); nl(); nl()

  cutPaper()

  return bytes
}

/**
 * Imprime un ticket via la estrategia especificada.
 * Llamar desde un Client Component.
 */
export async function printTicketNetwork(
  ticket: TicketPayload,
  config: { printerIp: string; printerPort?: number }
): Promise<{ ok: boolean; message: string }> {
  const buffer = buildEscPosBuffer(ticket)

  const res = await fetch('/api/hardware/print-escpos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      printerIp: config.printerIp,
      printerPort: config.printerPort ?? 9100,
      buffer,
    }),
  })

  const data = await res.json()
  return { ok: res.ok, message: data.message || data.error || '' }
}
