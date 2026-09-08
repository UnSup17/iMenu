/**
 * Invoice Builder — Lógica de cálculo de facturas
 *
 * Calcula subtotales, IVA, cargo por servicio y total a partir
 * de los pedidos abiertos de una mesa y la configuración fiscal
 * del restaurante (TaxConfig).
 */

import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

// ============================================================
// Types
// ============================================================

export interface InvoiceLineItem {
  productId: string | null
  description: string
  quantity: number
  unitPrice: number
  taxRate: number
  taxAmount: number
  subtotal: number  // unitPrice × qty (sin impuesto)
}

export interface InvoiceDraft {
  restaurantId: string
  tableId: string
  sessionId: string
  items: InvoiceLineItem[]
  subtotal: number       // suma de unitPrice × qty
  taxAmount: number      // suma de taxAmount por línea
  serviceCharge: number  // cargo por servicio (si aplica)
  total: number          // subtotal + taxAmount + serviceCharge - descuento
  vatRate: number
  serviceChargeRate: number
  currency: string
  currencySymbol: string
}

/**
 * Construye un borrador de factura a partir de todas las órdenes
 * activas de una sesión de mesa (sin crear nada en DB aún).
 */
export async function buildInvoiceDraft(
  restaurantId: string,
  tableId: string,
  sessionId: string,
  discountAmount = 0,
): Promise<InvoiceDraft> {
  // 1. Obtener configuración fiscal del restaurante
  const taxConfig = await prisma.taxConfig.findUnique({
    where: { restaurantId },
  })

  const vatRate = taxConfig?.vatEnabled ? taxConfig.vatRate.toNumber() : 0
  const serviceChargeRate = taxConfig?.serviceChargeEnabled
    ? taxConfig.serviceChargeRate.toNumber()
    : 0
  const currency = taxConfig?.currency ?? 'COP'
  const currencySymbol = taxConfig?.currencySymbol ?? '$'

  // 2. Cargar órdenes activas de la sesión (excluir canceladas)
  const orders = await prisma.order.findMany({
    where: {
      restaurantId,
      tableId,
      sessionId,
      status: { notIn: ['CANCELLED'] },
    },
    include: {
      items: {
        include: {
          product: { select: { name: true } },
          modifiers: {
            include: { modifierOption: { select: { name: true } } },
          },
        },
      },
    },
  })

  // 3. Construir líneas de factura
  const lines: InvoiceLineItem[] = []

  for (const order of orders) {
    for (const item of order.items) {
      const modifierNames = item.modifiers.map((m) => m.modifierOption.name)
      const description = modifierNames.length > 0
        ? `${item.product.name} (${modifierNames.join(', ')})`
        : item.product.name

      const unitPrice = item.unitPrice.toNumber()
      const qty = item.quantity
      const lineSubtotal = unitPrice * qty
      const lineTax = parseFloat((lineSubtotal * vatRate).toFixed(2))

      lines.push({
        productId: item.productId,
        description,
        quantity: qty,
        unitPrice,
        taxRate: vatRate,
        taxAmount: lineTax,
        subtotal: lineSubtotal,
      })
    }
  }

  // 4. Calcular totales
  const subtotal = lines.reduce((s, l) => s + l.subtotal, 0)
  const taxAmount = lines.reduce((s, l) => s + l.taxAmount, 0)
  const serviceCharge = parseFloat((subtotal * serviceChargeRate).toFixed(2))
  const total = subtotal + taxAmount + serviceCharge - discountAmount

  return {
    restaurantId,
    tableId,
    sessionId,
    items: lines,
    subtotal: parseFloat(subtotal.toFixed(2)),
    taxAmount: parseFloat(taxAmount.toFixed(2)),
    serviceCharge,
    total: parseFloat(total.toFixed(2)),
    vatRate,
    serviceChargeRate,
    currency,
    currencySymbol,
  }
}

/**
 * Genera el número de factura siguiente para un restaurante.
 * Usa una transacción con bloqueo para garantizar unicidad.
 * Retorna algo como "FV-0042"
 */
export async function generateInvoiceNumber(restaurantId: string): Promise<string> {
  return await prisma.$transaction(async (tx) => {
    const config = await tx.taxConfig.findUniqueOrThrow({
      where: { restaurantId },
      select: { invoicePrefix: true, nextInvoiceNumber: true },
    })

    const number = config.nextInvoiceNumber
    const formatted = `${config.invoicePrefix}-${String(number).padStart(4, '0')}`

    await tx.taxConfig.update({
      where: { restaurantId },
      data: { nextInvoiceNumber: number + 1 },
    })

    return formatted
  })
}

/**
 * Crea la factura en DB (status ISSUED) a partir del draft y la persiste.
 * No registra el pago — eso se hace por separado con registerPayment().
 */
export async function createInvoiceFromDraft(
  draft: InvoiceDraft,
  options: {
    waiterId?: string
    customerName?: string
    customerTaxId?: string
    customerEmail?: string
    notes?: string
    discountAmount?: number
  } = {},
): Promise<string> {
  const invoiceNumber = await generateInvoiceNumber(draft.restaurantId)
  const discountAmount = options.discountAmount ?? 0

  const invoice = await prisma.invoice.create({
    data: {
      restaurantId: draft.restaurantId,
      tableId: draft.tableId,
      sessionId: draft.sessionId,
      invoiceNumber,
      status: 'ISSUED',
      subtotal: new Prisma.Decimal(draft.subtotal),
      taxAmount: new Prisma.Decimal(draft.taxAmount),
      serviceCharge: new Prisma.Decimal(draft.serviceCharge),
      discountAmount: new Prisma.Decimal(discountAmount),
      total: new Prisma.Decimal(draft.total - discountAmount),
      waiterId: options.waiterId,
      customerName: options.customerName,
      customerTaxId: options.customerTaxId,
      customerEmail: options.customerEmail,
      notes: options.notes,
      items: {
        create: draft.items.map((line) => ({
          productId: line.productId,
          description: line.description,
          quantity: line.quantity,
          unitPrice: new Prisma.Decimal(line.unitPrice),
          taxRate: new Prisma.Decimal(line.taxRate),
          taxAmount: new Prisma.Decimal(line.taxAmount),
          subtotal: new Prisma.Decimal(line.subtotal),
        })),
      },
    },
  })

  return invoice.id
}
