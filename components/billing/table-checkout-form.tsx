'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface OrderItemInfo {
  id: string
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  subtotal: number
}

interface OrderInfo {
  id: string
  totalAmount: number
  items: OrderItemInfo[]
}

interface TableCheckoutFormProps {
  tableId: string
  sessionId: string
  tableNumber: number
  orders: OrderInfo[]
  taxConfig: {
    country: string
    standardRate: number
    taxName: string
  }
}

export function TableCheckoutForm({
  tableId,
  sessionId,
  tableNumber,
  orders,
  taxConfig,
}: TableCheckoutFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Customer data
  const [customerName, setCustomerName] = useState('')
  const [customerTaxId, setCustomerTaxId] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')

  // Payment method & discount
  const [paymentMethod, setPaymentMethod] = useState<
    'CASH' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'TRANSFER' | 'QR_CODE'
  >('CASH')
  const [discount, setDiscount] = useState('0')

  // Aggregate items across all orders of this table
  const itemMap = new Map<
    string,
    { productId: string; productName: string; quantity: number; unitPrice: number; total: number }
  >()

  orders.forEach((o) => {
    o.items.forEach((it) => {
      const existing = itemMap.get(it.productId)
      if (existing) {
        existing.quantity += it.quantity
        existing.total += it.subtotal
      } else {
        itemMap.set(it.productId, {
          productId: it.productId,
          productName: it.productName,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          total: it.subtotal,
        })
      }
    })
  })

  const aggregatedItems = Array.from(itemMap.values())
  const rawSubtotal = aggregatedItems.reduce((acc, i) => acc + i.total, 0)
  const discountAmount = parseFloat(discount) || 0
  const subtotalAfterDiscount = Math.max(0, rawSubtotal - discountAmount)

  // Tax calculation
  const taxRate = taxConfig.standardRate / 100
  const taxTotal = subtotalAfterDiscount * taxRate
  const finalTotal = subtotalAfterDiscount + taxTotal

  async function handleCheckout(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // 1. Create invoice
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableId,
          sessionId,
          customerName: customerName.trim() || undefined,
          customerTaxId: customerTaxId.trim() || undefined,
          customerEmail: customerEmail.trim() || undefined,
          discountAmount,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Error al emitir la factura')
      }

      const invoiceId = data.invoice.id
      const invoiceTotal = typeof data.invoice.total === 'number' ? data.invoice.total : parseFloat(data.invoice.total)

      // 2. Register initial payment
      const payRes = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: invoiceTotal,
          method: paymentMethod,
        }),
      })

      if (!payRes.ok) {
        const payData = await payRes.json()
        throw new Error(payData.error || 'Factura creada pero error al registrar el pago')
      }

      // 3. Successfully issued & paid -> Redirect to invoice detail view
      router.push(`/dashboard/billing/invoices/${invoiceId}`)
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error en la facturación')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleCheckout} className="grid grid-cols-1 md:grid-cols-3 gap-8">
      {/* Left Column: Aggregated Items & Totals */}
      <div className="md:col-span-2 bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-6">
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
          Resumen de Consumos (Mesa {tableNumber})
        </h2>

        <div className="divide-y divide-zinc-800">
          {aggregatedItems.map((item) => (
            <div key={item.productId} className="py-3 flex justify-between items-center text-sm">
              <div>
                <p className="font-medium text-white">{item.productName}</p>
                <p className="text-xs text-zinc-500 font-mono">
                  {item.quantity} x ${item.unitPrice.toLocaleString('es-CO')}
                </p>
              </div>
              <span className="font-mono font-bold text-white">
                ${item.total.toLocaleString('es-CO')}
              </span>
            </div>
          ))}
        </div>

        {/* Totals Breakdown */}
        <div className="border-t border-zinc-800 pt-4 space-y-2 text-sm font-mono">
          <div className="flex justify-between text-zinc-400">
            <span>Subtotal Bruto:</span>
            <span>${rawSubtotal.toLocaleString('es-CO')}</span>
          </div>

          <div className="flex justify-between text-zinc-400 items-center">
            <span>Descuento ($):</span>
            <input
              type="number"
              min="0"
              step="100"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              className="w-28 bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-right text-white text-xs focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex justify-between text-zinc-400">
            <span>Base Imponible:</span>
            <span>${subtotalAfterDiscount.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</span>
          </div>

          <div className="flex justify-between text-zinc-400">
            <span>{taxConfig.taxName} ({taxConfig.standardRate}%):</span>
            <span>${taxTotal.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</span>
          </div>

          <div className="flex justify-between text-xl font-bold text-emerald-400 pt-3 border-t border-zinc-800">
            <span>TOTAL A PAGAR:</span>
            <span>${finalTotal.toLocaleString('es-CO')}</span>
          </div>
        </div>
      </div>

      {/* Right Column: Customer Fiscal Data & Payment Method */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-6 flex flex-col justify-between">
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
            Datos del Cliente / Factura
          </h2>

          {error && <div className="p-3 bg-red-950/60 text-red-300 rounded-lg text-xs">{error}</div>}

          <div>
            <label className="block text-xs text-zinc-400 mb-1">Nombre o Razón Social</label>
            <input
              type="text"
              placeholder="Consumidor Final"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white placeholder-zinc-600 text-xs focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1">NIT / Cédula / Documento Fiscal</label>
            <input
              type="text"
              placeholder="Ej. 222222222222 (Consumidor Final)"
              value={customerTaxId}
              onChange={(e) => setCustomerTaxId(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white placeholder-zinc-600 text-xs font-mono focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1">Correo para Factura Electrónica</label>
            <input
              type="email"
              placeholder="cliente@email.com (opcional)"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white placeholder-zinc-600 text-xs focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="pt-2 border-t border-zinc-800">
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
              Método de Pago *
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as typeof paymentMethod)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-amber-500"
            >
              <option value="CASH">Efectivo 💵</option>
              <option value="CREDIT_CARD">Tarjeta de Crédito 💳</option>
              <option value="DEBIT_CARD">Tarjeta de Débito 💳</option>
              <option value="TRANSFER">Transferencia (Nequi / Daviplata) 📱</option>
              <option value="QR_CODE">Código QR 📲</option>
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-sm rounded-lg transition-colors shadow-lg shadow-emerald-950"
        >
          {loading ? 'Generando Factura...' : '✅ Facturar y Liberar Mesa'}
        </button>
      </div>
    </form>
  )
}
