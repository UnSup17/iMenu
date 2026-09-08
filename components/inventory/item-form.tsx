'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface InventoryItemFormProps {
  initialData?: {
    id: string
    name: string
    sku: string | null
    unit: string
    minStock: number
    costPerUnit: number | null
  }
}

const UNITS = [
  { value: 'KG', label: 'Kilogramos (KG)' },
  { value: 'GRAM', label: 'Gramos (GRAM)' },
  { value: 'LITER', label: 'Litros (LITER)' },
  { value: 'ML', label: 'Mililitros (ML)' },
  { value: 'UNIT', label: 'Unidades (UNIT)' },
  { value: 'PORTION', label: 'Porciones (PORTION)' },
]

export function InventoryItemForm({ initialData }: InventoryItemFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState(initialData?.name ?? '')
  const [sku, setSku] = useState(initialData?.sku ?? '')
  const [unit, setUnit] = useState(initialData?.unit ?? 'KG')
  const [minStock, setMinStock] = useState(initialData?.minStock?.toString() ?? '1.0')
  const [costPerUnit, setCostPerUnit] = useState(initialData?.costPerUnit?.toString() ?? '')
  const [initialStock, setInitialStock] = useState('0')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const url = initialData ? `/api/inventory/items/${initialData.id}` : '/api/inventory/items'
      const method = initialData ? 'PATCH' : 'POST'

      const body: Record<string, unknown> = {
        name: name.trim(),
        sku: sku.trim() || undefined,
        unit,
        minStock: parseFloat(minStock) || 0,
        costPerUnit: costPerUnit ? parseFloat(costPerUnit) : undefined,
      }

      if (!initialData) {
        body.initialStock = parseFloat(initialStock) || 0
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Error al guardar el ítem')
      }

      router.push('/dashboard/inventory')
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-6">
      {error && (
        <div className="p-4 bg-red-950/50 border border-red-900/50 rounded-lg text-sm text-red-300">
          {error}
        </div>
      )}

      <div>
        <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
          Nombre del ingrediente / insumo *
        </label>
        <input
          type="text"
          required
          placeholder="Ej. Queso Mozzarella, Carne Molida, Carne de Pollo"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500 text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
            Código / SKU (opcional)
          </label>
          <input
            type="text"
            placeholder="Ej. ING-001"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500 text-sm font-mono"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
            Unidad de medida *
          </label>
          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-amber-500 text-sm"
          >
            {UNITS.map((u) => (
              <option key={u.value} value={u.value}>
                {u.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
            Stock mínimo de alerta *
          </label>
          <input
            type="number"
            step="0.001"
            min="0"
            required
            placeholder="1.0"
            value={minStock}
            onChange={(e) => setMinStock(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500 text-sm font-mono"
          />
          <p className="text-[11px] text-zinc-500 mt-1">
            Si el stock cae por debajo de esta cantidad, el sistema emitirá alertas.
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
            Costo estimado por unidad (opcional)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={costPerUnit}
            onChange={(e) => setCostPerUnit(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500 text-sm font-mono"
          />
        </div>
      </div>

      {!initialData && (
        <div>
          <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
            Stock inicial en inventario
          </label>
          <input
            type="number"
            step="0.001"
            min="0"
            placeholder="0.0"
            value={initialStock}
            onChange={(e) => setInitialStock(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500 text-sm font-mono"
          />
          <p className="text-[11px] text-zinc-500 mt-1">
            Cantidad actual que tienes disponible físicamente en cocina o bodega.
          </p>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 rounded-lg text-zinc-400 hover:text-white text-sm transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-semibold text-sm transition-colors"
        >
          {loading ? 'Guardando...' : initialData ? 'Actualizar Ítem' : 'Guardar Ítem'}
        </button>
      </div>
    </form>
  )
}
