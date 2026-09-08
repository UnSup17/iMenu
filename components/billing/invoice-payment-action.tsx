'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function InvoicePaymentAction({
  invoiceId,
  remainingAmount,
}: {
  invoiceId: string
  remainingAmount: number
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [amount, setAmount] = useState(remainingAmount.toString())
  const [method, setMethod] = useState<'CASH' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'TRANSFER' | 'QR_CODE'>('CASH')

  async function handleRegisterPayment(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(amount),
          method,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Error al registrar el pago')
      }

      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al procesar pago')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleRegisterPayment} className="space-y-3">
      <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Registrar Pago</h3>

      {error && <div className="p-2 bg-red-950/60 text-red-300 rounded text-xs">{error}</div>}

      <div>
        <label className="block text-[11px] text-zinc-400 mb-1">Método de pago</label>
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value as typeof method)}
          className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-amber-500"
        >
          <option value="CASH">Efectivo</option>
          <option value="CREDIT_CARD">Tarjeta de Crédito</option>
          <option value="DEBIT_CARD">Tarjeta de Débito</option>
          <option value="TRANSFER">Transferencia (Nequi/Daviplata/Bancolombia)</option>
          <option value="QR_CODE">Código QR</option>
        </select>
      </div>

      <div>
        <label className="block text-[11px] text-zinc-400 mb-1">Monto a pagar ($)</label>
        <input
          type="number"
          step="0.01"
          max={remainingAmount}
          required
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-amber-500"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-xs rounded-lg transition-colors"
      >
        {loading ? 'Procesando...' : '💳 Registrar Cobro'}
      </button>
    </form>
  )
}
