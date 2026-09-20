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

  // Tip (propina voluntaria)
  const [tipPreset, setTipPreset] = useState<0 | 10 | 15 | 20 | -1>(0) // -1 = custom
  const [customTip, setCustomTip] = useState('')

  // División de cuenta / Pagos múltiples en caja
  const [isSplitPayment, setIsSplitPayment] = useState(false)
  const [splitRows, setSplitRows] = useState<
    { id: string; method: 'CASH' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'TRANSFER' | 'QR_CODE'; amount: number }[]
  >([
    { id: '1', method: 'CASH', amount: 0 },
    { id: '2', method: 'CREDIT_CARD', amount: 0 },
  ])

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

  // Tip calculation
  const tipAmount =
    tipPreset === -1
      ? Math.max(0, parseFloat(customTip) || 0)
      : Math.round((finalTotal * tipPreset) / 100)
  const grandTotal = finalTotal + tipAmount

  const totalSplitAssigned = splitRows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0)
  const splitRemaining = grandTotal - totalSplitAssigned

  async function handleCheckout(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (isSplitPayment) {
      if (Math.abs(splitRemaining) > 1) {
        setError(
          `La suma de los métodos de pago ($${totalSplitAssigned.toLocaleString('es-CO')}) debe ser igual al total a pagar ($${grandTotal.toLocaleString('es-CO')}). Faltan $${splitRemaining.toLocaleString('es-CO')}.`
        )
        setLoading(false)
        return
      }
    }

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

      // 2. Register payment(s)
      if (isSplitPayment) {
        for (const row of splitRows) {
          if (row.amount > 0) {
            const payRes = await fetch(`/api/invoices/${invoiceId}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                amount: row.amount,
                method: row.method,
              }),
            })
            if (!payRes.ok) {
              const payData = await payRes.json()
              throw new Error(payData.error || 'Error al registrar pago parcial')
            }
          }
        }
      } else {
        const payRes = await fetch(`/api/invoices/${invoiceId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: invoiceTotal + tipAmount,
            method: paymentMethod,
            tipAmount: tipAmount > 0 ? tipAmount : undefined,
          }),
        })

        if (!payRes.ok) {
          const payData = await payRes.json()
          throw new Error(payData.error || 'Factura creada pero error al registrar el pago')
        }
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

          {/* Propina voluntaria */}
          <div className="pt-3 border-t border-zinc-800/70">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Propina Voluntaria</span>
              {tipAmount > 0 && (
                <span className="text-xs font-mono font-bold text-amber-400">
                  +${tipAmount.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                </span>
              )}
            </div>
            <div className="grid grid-cols-4 gap-1.5 mb-2">
              {([0, 10, 15, 20] as const).map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => setTipPreset(pct)}
                  className={`py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                    tipPreset === pct
                      ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow font-black'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600'
                  }`}
                >
                  {pct === 0 ? 'Sin propina' : `${pct}%`}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setTipPreset(-1)}
              className={`w-full py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer mb-2 ${
                tipPreset === -1
                  ? 'bg-zinc-700 border-zinc-500 text-white'
                  : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              💬 Monto libre
            </button>
            {tipPreset === -1 && (
              <input
                type="number"
                min="0"
                step="1000"
                placeholder="Ej. 5000"
                value={customTip}
                onChange={(e) => setCustomTip(e.target.value)}
                className="w-full bg-zinc-950 border border-amber-500/40 rounded-lg px-3 py-2 text-white text-xs font-mono focus:outline-none focus:border-amber-500"
              />
            )}
          </div>

          <div className="flex justify-between text-xl font-bold text-emerald-400 pt-3 border-t border-zinc-800">
            <span>TOTAL A PAGAR:</span>
            <span>${grandTotal.toLocaleString('es-CO')}</span>
          </div>
          {tipAmount > 0 && (
            <p className="text-[10px] text-zinc-500 text-right -mt-1">
              Incluye ${tipAmount.toLocaleString('es-CO')} de propina voluntaria
            </p>
          )}
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

          <div className="pt-3 border-t border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Modalidad de Cobro
              </label>
              <div className="flex bg-zinc-950 p-1 rounded-lg border border-zinc-800 text-[11px]">
                <button
                  type="button"
                  onClick={() => setIsSplitPayment(false)}
                  className={`px-2.5 py-1 rounded-md font-semibold transition cursor-pointer ${
                    !isSplitPayment ? 'bg-amber-500 text-zinc-950 shadow-sm' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Pago Único
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsSplitPayment(true)
                    if (splitRows.length === 0 || splitRows.every((r) => r.amount === 0)) {
                      const half = Math.round(grandTotal / 2)
                      setSplitRows([
                        { id: '1', method: 'CASH', amount: half },
                        { id: '2', method: 'CREDIT_CARD', amount: grandTotal - half },
                      ])
                    }
                  }}
                  className={`px-2.5 py-1 rounded-md font-semibold transition cursor-pointer ${
                    isSplitPayment ? 'bg-amber-500 text-zinc-950 shadow-sm' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Dividir Cuenta
                </button>
              </div>
            </div>

            {!isSplitPayment ? (
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">
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
            ) : (
              <div className="space-y-2.5 p-3 rounded-xl bg-zinc-950/80 border border-zinc-800">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-zinc-400">Distribución de pagos:</span>
                  <span
                    className={`font-mono font-bold ${
                      Math.abs(splitRemaining) <= 1 ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    {Math.abs(splitRemaining) <= 1
                      ? '✓ Cubierto 100%'
                      : `Restante: $${splitRemaining.toLocaleString('es-CO')}`}
                  </span>
                </div>

                <div className="space-y-2">
                  {splitRows.map((row, idx) => (
                    <div key={row.id} className="flex gap-2 items-center">
                      <select
                        value={row.method}
                        onChange={(e) => {
                          const val = e.target.value as typeof row.method
                          setSplitRows((prev) =>
                            prev.map((r, i) => (i === idx ? { ...r, method: val } : r))
                          )
                        }}
                        className="bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-white text-xs w-36 focus:outline-none focus:border-amber-500"
                      >
                        <option value="CASH">Efectivo 💵</option>
                        <option value="CREDIT_CARD">Crédito 💳</option>
                        <option value="DEBIT_CARD">Débito 💳</option>
                        <option value="TRANSFER">Transferencia 📱</option>
                        <option value="QR_CODE">QR 📲</option>
                      </select>

                      <input
                        type="number"
                        min="0"
                        step="1000"
                        value={row.amount || ''}
                        onChange={(e) => {
                          const val = Math.max(0, parseFloat(e.target.value) || 0)
                          setSplitRows((prev) =>
                            prev.map((r, i) => (i === idx ? { ...r, amount: val } : r))
                          )
                        }}
                        placeholder="$0"
                        className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-amber-500"
                      />

                      {splitRows.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setSplitRows((prev) => prev.filter((_, i) => i !== idx))}
                          className="w-7 h-7 rounded-lg bg-zinc-800 hover:bg-red-950/60 hover:text-red-400 text-zinc-500 flex items-center justify-center text-xs transition-colors cursor-pointer"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() =>
                      setSplitRows((prev) => [
                        ...prev,
                        {
                          id: String(Date.now()),
                          method: 'CASH',
                          amount: Math.max(0, splitRemaining),
                        },
                      ])
                    }
                    className="flex-1 py-1.5 px-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-lg border border-zinc-800 text-[11px] font-semibold transition cursor-pointer"
                  >
                    + Agregar Método
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const half = Math.round(grandTotal / 2)
                      setSplitRows([
                        { id: '1', method: 'CASH', amount: half },
                        { id: '2', method: 'CREDIT_CARD', amount: grandTotal - half },
                      ])
                    }}
                    className="py-1.5 px-2.5 bg-zinc-900 hover:bg-zinc-800 text-amber-400 rounded-lg border border-zinc-800 text-[11px] font-semibold transition cursor-pointer"
                  >
                    50 / 50
                  </button>
                </div>
              </div>
            )}
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
