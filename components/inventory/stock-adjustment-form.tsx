'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function StockAdjustmentForm({ itemId, unit }: { itemId: string; unit: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [type, setType] = useState<'ADJUSTMENT' | 'WASTE'>('ADJUSTMENT')
  const [quantity, setQuantity] = useState('')
  const [reason, setReason] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const parsedQty = parseFloat(quantity)
      const adjustedQty = type === 'WASTE' ? -Math.abs(parsedQty) : parsedQty

      const res = await fetch('/api/inventory/adjustments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inventoryItemId: itemId,
          type,
          quantity: adjustedQty,
          notes: reason.trim() || (type === 'WASTE' ? 'Registro de merma/desperdicio' : 'Ajuste manual de inventario'),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Error al registrar ajuste')
      }

      setQuantity('')
      setReason('')
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al realizar ajuste')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-4">
      {error && <div className="p-2.5 bg-red-950/50 text-red-300 rounded text-xs">{error}</div>}

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setType('ADJUSTMENT')}
          className={`py-1.5 px-3 text-xs font-semibold rounded-lg border transition-colors ${
            type === 'ADJUSTMENT'
              ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
              : 'border-zinc-800 text-zinc-400 hover:text-white'
          }`}
        >
          🔧 Ajuste (Conteo)
        </button>
        <button
          type="button"
          onClick={() => setType('WASTE')}
          className={`py-1.5 px-3 text-xs font-semibold rounded-lg border transition-colors ${
            type === 'WASTE'
              ? 'bg-red-500/20 border-red-500/50 text-red-300'
              : 'border-zinc-800 text-zinc-400 hover:text-white'
          }`}
        >
          🗑️ Merma / Daño
        </button>
      </div>

      <div>
        <label className="block text-xs text-zinc-400 mb-1">
          {type === 'ADJUSTMENT' ? 'Nueva cantidad real (conteo estocástico)' : `Cantidad mermada (${unit})`}
        </label>
        <input
          type="number"
          step="0.001"
          required
          placeholder={type === 'ADJUSTMENT' ? 'Ej. 15.5' : 'Ej. 0.5'}
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white placeholder-zinc-600 text-xs font-mono focus:outline-none focus:border-amber-500"
        />
      </div>

      <div>
        <label className="block text-xs text-zinc-400 mb-1">Motivo o nota</label>
        <input
          type="text"
          placeholder="Ej. Vencimiento, Empaque roto, Conteo semanal"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white placeholder-zinc-600 text-xs focus:outline-none focus:border-amber-500"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-white font-medium text-xs rounded-lg transition-colors"
      >
        {loading ? 'Procesando...' : 'Aplicar Ajuste'}
      </button>
    </form>
  )
}
