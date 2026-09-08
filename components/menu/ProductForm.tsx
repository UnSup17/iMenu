'use client'

import { useState } from 'react'

export interface ProductFormData {
  id?: string
  categoryId: string
  name: string
  description: string | null
  basePrice: number
  isAvailable: boolean
  imageUrl: string | null
}

interface Props {
  initial?: Partial<ProductFormData>
  categoryId: string
  onSave: (data: ProductFormData) => Promise<void>
  onCancel: () => void
}

export function ProductForm({ initial, categoryId, onSave, onCancel }: Props) {
  const [form, setForm] = useState<ProductFormData>({
    categoryId,
    name: '',
    description: null,
    basePrice: 0,
    isAvailable: true,
    imageUrl: null,
    ...initial,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) {
      setError('El nombre es obligatorio')
      return
    }
    if (form.basePrice < 0) {
      setError('El precio no puede ser negativo')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await onSave(form)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Nombre */}
      <div>
        <label className="block text-xs text-zinc-400 mb-1.5 font-medium uppercase tracking-wider">
          Nombre del producto *
        </label>
        <input
          id="product-name"
          type="text"
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="ej. Hamburguesa Especial Halloween, Almuerzo Ejecutivo del Día…"
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2.5 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30"
        />
      </div>

      {/* Descripción */}
      <div>
        <label className="block text-xs text-zinc-400 mb-1.5 font-medium uppercase tracking-wider">
          Descripción (opcional)
        </label>
        <textarea
          id="product-description"
          rows={2}
          value={form.description ?? ''}
          onChange={(e) => setForm({ ...form, description: e.target.value || null })}
          placeholder="Ingredientes, nota especial, incluye…"
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2.5 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 resize-none"
        />
      </div>

      {/* Precio y Disponible */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-zinc-400 mb-1.5 font-medium uppercase tracking-wider">
            Precio base *
          </label>
          <input
            id="product-price"
            type="number"
            min={0}
            step={50}
            required
            value={form.basePrice}
            onChange={(e) => setForm({ ...form, basePrice: parseFloat(e.target.value) || 0 })}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30"
          />
        </div>
        <div className="flex flex-col justify-end">
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <div
              onClick={() => setForm({ ...form, isAvailable: !form.isAvailable })}
              className={`relative w-10 h-5 rounded-full transition-colors ${form.isAvailable ? 'bg-emerald-500' : 'bg-zinc-700'}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.isAvailable ? 'translate-x-5' : ''}`}
              />
            </div>
            <span className="text-sm text-zinc-300">Disponible</span>
          </label>
        </div>
      </div>

      {/* URL de imagen */}
      <div>
        <label className="block text-xs text-zinc-400 mb-1.5 font-medium uppercase tracking-wider">
          URL de imagen (opcional)
        </label>
        <input
          id="product-image-url"
          type="url"
          value={form.imageUrl ?? ''}
          onChange={(e) => setForm({ ...form, imageUrl: e.target.value || null })}
          placeholder="https://…"
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2.5 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30"
        />
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-950/60 border border-red-900 text-red-300 text-xs">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-2 rounded-lg border border-zinc-700 text-zinc-300 text-sm hover:bg-zinc-800 transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={saving}
          id="save-product-btn"
          className="px-6 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-zinc-950 font-semibold text-sm transition-colors"
        >
          {saving ? 'Guardando…' : '💾 Guardar Producto'}
        </button>
      </div>
    </form>
  )
}
