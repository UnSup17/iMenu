'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function StockPurchaseForm({
  item,
}: {
  item: { id: string; name: string; unit: string }
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [quantity, setQuantity] = useState('')
  const [costPerUnit, setCostPerUnit] = useState('')
  const [supplier, setSupplier] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/inventory/items/${item.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quantity: parseFloat(quantity),
          unitCost: costPerUnit ? parseFloat(costPerUnit) : undefined,
          notes: supplier.trim() ? `Proveedor: ${supplier.trim()}` : undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Error al registrar la compra')
      }

      router.push('/dashboard/inventory')
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al registrar')
    } finally {
      setLoading(false)
    }
  }

  const totalCost = (parseFloat(quantity) || 0) * (parseFloat(costPerUnit) || 0)

  return (
    <form onSubmit={handleSubmit} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-6">
      {error && <div className="p-3 bg-red-950/50 text-red-300 rounded-lg text-sm">{error}</div>}

      <div>
        <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
          Cantidad comprada ({item.unit}) *
        </label>
        <input
          type="number"
          step="0.001"
          min="0.001"
          required
          placeholder="Ej. 10.0"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-white placeholder-zinc-600 font-mono text-sm focus:outline-none focus:border-amber-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
            Costo unitario ($)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={costPerUnit}
            onChange={(e) => setCostPerUnit(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-white placeholder-zinc-600 font-mono text-sm focus:outline-none focus:border-amber-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
            Costo total estimado
          </label>
          <div className="bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-amber-400 font-mono font-bold text-sm">
            ${totalCost.toLocaleString('es-CO', { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
          Proveedor (opcional)
        </label>
        <input
          type="text"
          placeholder="Ej. Distribuidora del Campo S.A.S."
          value={supplier}
          onChange={(e) => setSupplier(e.target.value)}
          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-white placeholder-zinc-600 text-sm focus:outline-none focus:border-amber-500"
        />
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 text-zinc-400 hover:text-white text-sm"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-sm rounded-lg transition-colors"
        >
          {loading ? 'Guardando...' : '➕ Registrar Entrada'}
        </button>
      </div>
    </form>
  )
}
