'use client'

import { useState } from 'react'
import { ScheduleConfig, type ScheduleValue } from './ScheduleConfig'

export interface CategoryFormData {
  id?: string
  name: string
  orderIndex: number
  isActive: boolean
  isSpecialOffer: boolean
  offerLabel: string | null
  offerStartDate: string | null
  offerEndDate: string | null
  offerActiveDays: number[] | null
  offerStartTime: string | null
  offerEndTime: string | null
}

interface Props {
  initial?: CategoryFormData
  onSave: (data: CategoryFormData) => Promise<void>
  onCancel: () => void
}

const DEFAULT: CategoryFormData = {
  name: '',
  orderIndex: 0,
  isActive: true,
  isSpecialOffer: false,
  offerLabel: null,
  offerStartDate: null,
  offerEndDate: null,
  offerActiveDays: null,
  offerStartTime: null,
  offerEndTime: null,
}

export function CategoryForm({ initial = DEFAULT, onSave, onCancel }: Props) {
  const [form, setForm] = useState<CategoryFormData>(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const schedule: ScheduleValue = {
    offerStartDate: form.offerStartDate,
    offerEndDate: form.offerEndDate,
    offerActiveDays: form.offerActiveDays,
    offerStartTime: form.offerStartTime,
    offerEndTime: form.offerEndTime,
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) {
      setError('El nombre es obligatorio')
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
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Nombre */}
      <div>
        <label className="block text-xs text-zinc-400 mb-1.5 font-medium uppercase tracking-wider">
          Nombre de la categoría *
        </label>
        <input
          id="category-name"
          type="text"
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="ej. Hamburguesas, Almuerzo Ejecutivo, Menú Halloween…"
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2.5 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30"
        />
      </div>

      {/* Orden e Activo */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-zinc-400 mb-1.5 font-medium uppercase tracking-wider">
            Orden en menú
          </label>
          <input
            id="category-order"
            type="number"
            min={0}
            value={form.orderIndex}
            onChange={(e) => setForm({ ...form, orderIndex: parseInt(e.target.value) || 0 })}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30"
          />
        </div>
        <div className="flex flex-col justify-end">
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <div
              onClick={() => setForm({ ...form, isActive: !form.isActive })}
              className={`relative w-10 h-5 rounded-full transition-colors ${form.isActive ? 'bg-emerald-500' : 'bg-zinc-700'}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.isActive ? 'translate-x-5' : ''}`}
              />
            </div>
            <span className="text-sm text-zinc-300">Activa en el menú</span>
          </label>
        </div>
      </div>

      {/* Toggle: Oferta especial */}
      <div className={`rounded-xl border transition-colors ${form.isSpecialOffer ? 'border-amber-500/40 bg-amber-500/5' : 'border-zinc-800 bg-zinc-900/50'} p-4`}>
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <div
            onClick={() => setForm({ ...form, isSpecialOffer: !form.isSpecialOffer })}
            className={`relative w-10 h-5 rounded-full transition-colors ${form.isSpecialOffer ? 'bg-amber-500' : 'bg-zinc-700'}`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.isSpecialOffer ? 'translate-x-5' : ''}`}
            />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">✨ Es oferta / menú especial</p>
            <p className="text-xs text-zinc-500 mt-0.5">
              Define fechas, días y horarios en los que estará visible en el menú
            </p>
          </div>
        </label>

        {form.isSpecialOffer && (
          <div className="mt-4 space-y-4">
            {/* Etiqueta visual */}
            <div>
              <label className="block text-[11px] text-zinc-500 mb-1.5 uppercase tracking-wider">
                Etiqueta visual (opcional)
              </label>
              <input
                id="offer-label"
                type="text"
                value={form.offerLabel ?? ''}
                onChange={(e) => setForm({ ...form, offerLabel: e.target.value || null })}
                placeholder='ej. 🎃 Halloween, 🍱 Ejecutivo, 🍔 Burger Master…'
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30"
              />
            </div>

            <ScheduleConfig
              value={schedule}
              onChange={(s) =>
                setForm({
                  ...form,
                  offerStartDate: s.offerStartDate,
                  offerEndDate: s.offerEndDate,
                  offerActiveDays: s.offerActiveDays,
                  offerStartTime: s.offerStartTime,
                  offerEndTime: s.offerEndTime,
                })
              }
            />
          </div>
        )}
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
          id="save-category-btn"
          className="px-6 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-zinc-950 font-semibold text-sm transition-colors"
        >
          {saving ? 'Guardando…' : '💾 Guardar Categoría'}
        </button>
      </div>
    </form>
  )
}
