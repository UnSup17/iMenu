'use client'

import { useState, useRef } from 'react'
import { ALLERGENS } from '@/lib/constants/allergens'
import { ImageCropperModal } from './ImageCropperModal'

export interface ProductFormData {
  id?: string
  categoryId: string
  name: string
  description: string | null
  basePrice: number
  isAvailable: boolean
  imageUrl: string | null
  orderIndex?: number
  allergens?: string[] | string | null
  scheduledPrice?: number | null
  scheduledPriceDays?: number[] | string | null
  scheduledPriceStart?: string | null
  scheduledPriceEnd?: string | null
  scheduledPriceLabel?: string | null
}

interface Props {
  initial?: Partial<ProductFormData>
  categoryId: string
  categoryName?: string
  onSave: (data: ProductFormData) => Promise<void>
  onCancel: () => void
}

const DAYS_OF_WEEK = [
  { id: 1, label: 'Lun' },
  { id: 2, label: 'Mar' },
  { id: 3, label: 'Mié' },
  { id: 4, label: 'Jue' },
  { id: 5, label: 'Vie' },
  { id: 6, label: 'Sáb' },
  { id: 0, label: 'Dom' },
]

export function ProductForm({ initial, categoryId, categoryName = '', onSave, onCancel }: Props) {
  // Parsear alérgenos iniciales si vienen como JSON string
  const initialAllergens: string[] = (() => {
    if (!initial?.allergens) return []
    if (Array.isArray(initial.allergens)) return initial.allergens
    if (typeof initial.allergens === 'string') {
      try {
        const parsed = JSON.parse(initial.allergens)
        if (Array.isArray(parsed)) return parsed
      } catch {}
      return (initial.allergens as string).split(',').map((a: string) => a.trim()).filter(Boolean)
    }
    return []
  })()

  // Parsear días iniciales si vienen como string
  const initialDays: number[] = (() => {
    if (!initial?.scheduledPriceDays) return []
    if (Array.isArray(initial.scheduledPriceDays)) return initial.scheduledPriceDays as number[]
    if (typeof initial.scheduledPriceDays === 'string') {
      try {
        const parsed = JSON.parse(initial.scheduledPriceDays)
        if (Array.isArray(parsed)) return parsed
      } catch {}
      return (initial.scheduledPriceDays as string)
        .split(',')
        .map((d: string) => parseInt(d.trim(), 10))
        .filter((d: number) => !isNaN(d))
    }
    return []
  })()

  const [form, setForm] = useState<ProductFormData>({
    categoryId,
    name: '',
    description: null,
    basePrice: 0,
    isAvailable: true,
    imageUrl: null,
    orderIndex: 0,
    scheduledPrice: null,
    scheduledPriceStart: null,
    scheduledPriceEnd: null,
    scheduledPriceLabel: null,
    ...initial,
    allergens: initialAllergens,
    scheduledPriceDays: initialDays,
  })

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Subida de imagen y recorte
  const [uploadingImage, setUploadingImage] = useState(false)
  const [cropperRawSrc, setCropperRawSrc] = useState<string | null>(null)
  const [showUrlInput, setShowUrlInput] = useState(Boolean(initial?.imageUrl && !initial.imageUrl.startsWith('/uploads/')))
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Asistente IA
  const [showAiModal, setShowAiModal] = useState(false)
  const [aiIngredients, setAiIngredients] = useState('')
  const [aiGenerating, setAiGenerating] = useState(false)
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([])

  // Acordeón de Precios Dinámicos
  const [showScheduleSection, setShowScheduleSection] = useState(
    Boolean(initial?.scheduledPrice || initial?.scheduledPriceLabel || initial?.scheduledPriceDays?.length)
  )

  // ── Manejadores de Imagen ──────────────────────────────────────────────────

  async function handleFileChosen(file: File) {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCropperRawSrc(reader.result)
      }
    }
    reader.readAsDataURL(file)
  }

  async function handleConfirmCrop(blob: Blob) {
    setCropperRawSrc(null)
    setUploadingImage(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append('file', blob, 'dish_crop.webp')

      const res = await fetch('/api/menu/upload', {
        method: 'POST',
        body: formData,
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Error al subir la imagen')

      setForm((prev) => ({ ...prev, imageUrl: json.url }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir imagen recortada')
    } finally {
      setUploadingImage(false)
    }
  }

  // ── Manejadores de IA Culinaria ─────────────────────────────────────────────

  async function handleGenerateAiDescriptions() {
    if (!form.name.trim()) {
      setError('Por favor ingresa primero el nombre del producto para generar la descripción con IA')
      return
    }
    setAiGenerating(true)
    setError(null)
    try {
      const res = await fetch('/api/menu/generate-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          categoryName,
          ingredients: aiIngredients,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Error al generar')
      setAiSuggestions(json.descriptions || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error con la IA culinaria')
    } finally {
      setAiGenerating(false)
    }
  }

  // ── Manejadores de Alérgenos ────────────────────────────────────────────────

  function toggleAllergen(allergenId: string) {
    const current = Array.isArray(form.allergens) ? form.allergens : []
    if (current.includes(allergenId)) {
      setForm({ ...form, allergens: current.filter((id) => id !== allergenId) })
    } else {
      setForm({ ...form, allergens: [...current, allergenId] })
    }
  }

  // ── Manejadores de Días de Precios Dinámicos ────────────────────────────────

  function toggleDay(dayId: number) {
    const current = Array.isArray(form.scheduledPriceDays)
      ? (form.scheduledPriceDays as number[])
      : []
    if (current.includes(dayId)) {
      setForm({ ...form, scheduledPriceDays: current.filter((d) => d !== dayId) })
    } else {
      setForm({ ...form, scheduledPriceDays: [...current, dayId].sort() })
    }
  }

  const selectedAllergens: string[] = Array.isArray(form.allergens)
    ? form.allergens
    : typeof form.allergens === 'string'
    ? (form.allergens as string).split(',').map((s) => s.trim()).filter(Boolean)
    : []

  const selectedDays: number[] = Array.isArray(form.scheduledPriceDays)
    ? (form.scheduledPriceDays as number[])
    : []

  // ── Submit ──────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) {
      setError('El nombre del producto es obligatorio')
      return
    }
    if (form.basePrice < 0) {
      setError('El precio base no puede ser negativo')
      return
    }
    if (form.scheduledPrice !== null && form.scheduledPrice !== undefined && form.scheduledPrice < 0) {
      setError('El precio programado no puede ser negativo')
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
    <>
      <form onSubmit={handleSubmit} className="space-y-5">
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
            placeholder="ej. Hamburguesa Angus Trufada, Ceviche Clásico de la Costa…"
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2.5 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30"
          />
        </div>

        {/* Descripción con Asistente de IA */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs text-zinc-400 font-medium uppercase tracking-wider">
              Descripción del plato
            </label>
            <button
              type="button"
              onClick={() => {
                setShowAiModal(true)
                if (aiSuggestions.length === 0 && form.name.trim()) {
                  handleGenerateAiDescriptions()
                }
              }}
              className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 font-medium bg-amber-500/10 hover:bg-amber-500/20 px-2.5 py-1 rounded-md border border-amber-500/30 transition-all shadow-sm"
            >
              <span>✨</span> Generar con IA Culinaria
            </button>
          </div>
          <textarea
            id="product-description"
            rows={2}
            value={form.description ?? ''}
            onChange={(e) => setForm({ ...form, description: e.target.value || null })}
            placeholder="Descripción sensorial: ingredientes principales, cocción, notas de sabor…"
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2.5 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 resize-none"
          />
        </div>

        {/* Precio Base y Disponibilidad */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5 font-medium uppercase tracking-wider">
              Precio base ($) *
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
            <label className="flex items-center gap-3 cursor-pointer select-none pb-2">
              <div
                onClick={() => setForm({ ...form, isAvailable: !form.isAvailable })}
                className={`relative w-10 h-5 rounded-full transition-colors ${
                  form.isAvailable ? 'bg-emerald-500' : 'bg-zinc-700'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                    form.isAvailable ? 'translate-x-5' : ''
                  }`}
                />
              </div>
              <span className="text-sm font-medium text-zinc-300">Disponible para pedidos</span>
            </label>
          </div>
        </div>

        {/* Imagen del Producto: Subida Directa + Recorte */}
        <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/50 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400 font-medium uppercase tracking-wider flex items-center gap-1.5">
              <span>📸</span> Imagen del Producto
            </span>
            <button
              type="button"
              onClick={() => setShowUrlInput(!showUrlInput)}
              className="text-xs text-zinc-500 hover:text-amber-400 transition-colors"
            >
              {showUrlInput ? 'Ocultar URL manual' : '¿Usar URL externa?'}
            </button>
          </div>

          <div className="flex items-center gap-4">
            {form.imageUrl ? (
              <div className="relative group w-20 h-20 rounded-xl overflow-hidden border border-zinc-700 shrink-0 bg-zinc-900 shadow-md">
                <img
                  src={form.imageUrl}
                  alt={form.name || 'Foto producto'}
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => setForm({ ...form, imageUrl: null })}
                  className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs text-red-400 font-bold transition-opacity"
                >
                  Quitar 🗑️
                </button>
              </div>
            ) : (
              <div className="w-20 h-20 rounded-xl border-2 border-dashed border-zinc-800 flex items-center justify-center text-zinc-600 shrink-0 bg-zinc-900/40">
                <span className="text-2xl">🍽️</span>
              </div>
            )}

            <div className="flex-1 space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) handleFileChosen(e.target.files[0])
                }}
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={uploadingImage}
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg border border-zinc-700 transition-colors shadow-sm disabled:opacity-50"
                >
                  {uploadingImage ? 'Subiendo…' : '📁 Subir Imagen Directa'}
                </button>
                {form.imageUrl && (
                  <button
                    type="button"
                    onClick={() => setCropperRawSrc(form.imageUrl)}
                    className="px-3 py-1.5 text-xs font-medium text-amber-400 hover:text-amber-300 border border-amber-500/30 rounded-lg hover:bg-amber-500/10 transition-colors"
                  >
                    ✂️ Recortar
                  </button>
                )}
              </div>
              <p className="text-[11px] text-zinc-500">
                JPG, PNG o WebP. Editor de recorte integrado a 4:3 o 1:1.
              </p>
            </div>
          </div>

          {showUrlInput && (
            <div className="pt-2 border-t border-zinc-800">
              <input
                id="product-image-url"
                type="url"
                value={form.imageUrl ?? ''}
                onChange={(e) => setForm({ ...form, imageUrl: e.target.value || null })}
                placeholder="https://images.unsplash.com/..."
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-white text-xs placeholder-zinc-600 focus:outline-none focus:border-amber-500"
              />
            </div>
          )}
        </div>

        {/* Control de Alérgenos Reglamentario */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs text-zinc-400 font-medium uppercase tracking-wider">
              Alérgenos (Normativa Sanitaria / RGPD)
            </label>
            <span className="text-[11px] text-zinc-500">
              {selectedAllergens.length} seleccionados
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-44 overflow-y-auto p-2 bg-zinc-950/60 border border-zinc-800 rounded-xl">
            {ALLERGENS.map((item) => {
              const isSelected = selectedAllergens.includes(item.id)
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggleAllergen(item.id)}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-left border transition-all ${
                    isSelected
                      ? `${item.color} border-current shadow-sm`
                      : 'border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                  }`}
                >
                  <span className="text-sm">{item.icon}</span>
                  <span className="truncate">{item.name}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Acordeón: Precios Dinámicos / Happy Hour */}
        <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950/40">
          <button
            type="button"
            onClick={() => setShowScheduleSection(!showScheduleSection)}
            className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-zinc-800/40 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-base">⏰</span>
              <div>
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Programación de Precios / Happy Hour
                </span>
                <span className="text-[11px] text-zinc-500 block mt-0.5">
                  Precios dinámicos para promociones, fines de semana o franjas horarias
                </span>
              </div>
            </div>
            <span className={`text-xs text-zinc-400 transition-transform ${showScheduleSection ? 'rotate-180' : ''}`}>
              ▼
            </span>
          </button>

          {showScheduleSection && (
            <div className="p-4 border-t border-zinc-800 space-y-4 bg-zinc-900/40">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1 font-medium">
                    Precio Promocional ($)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={50}
                    value={form.scheduledPrice ?? ''}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        scheduledPrice: e.target.value ? parseFloat(e.target.value) : null,
                      })
                    }
                    placeholder="ej. 24900"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white text-xs font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1 font-medium">
                    Etiqueta de Promoción
                  </label>
                  <input
                    type="text"
                    value={form.scheduledPriceLabel ?? ''}
                    onChange={(e) =>
                      setForm({ ...form, scheduledPriceLabel: e.target.value || null })
                    }
                    placeholder="ej. Happy Hour 🍻, 2x1 Viernes"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Días activos */}
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5 font-medium">
                  Días activos de la promoción:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {DAYS_OF_WEEK.map((d) => {
                    const isDayActive = selectedDays.includes(d.id)
                    return (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => toggleDay(d.id)}
                        className={`px-3 py-1 text-xs font-bold rounded-lg border transition-all ${
                          isDayActive
                            ? 'bg-amber-500 border-amber-400 text-zinc-950 shadow-sm'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                        }`}
                      >
                        {d.label}
                      </button>
                    )
                  })}
                  <button
                    type="button"
                    onClick={() =>
                      setForm({
                        ...form,
                        scheduledPriceDays:
                          selectedDays.length === 7 ? [] : [0, 1, 2, 3, 4, 5, 6],
                      })
                    }
                    className="text-[11px] text-zinc-500 hover:text-amber-400 ml-2"
                  >
                    {selectedDays.length === 7 ? 'Desmarcar todos' : 'Todos'}
                  </button>
                </div>
              </div>

              {/* Horario */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1 font-medium">
                    Hora Inicio (HH:MM)
                  </label>
                  <input
                    type="time"
                    value={form.scheduledPriceStart ?? ''}
                    onChange={(e) =>
                      setForm({ ...form, scheduledPriceStart: e.target.value || null })
                    }
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1 font-medium">
                    Hora Fin (HH:MM)
                  </label>
                  <input
                    type="time"
                    value={form.scheduledPriceEnd ?? ''}
                    onChange={(e) =>
                      setForm({ ...form, scheduledPriceEnd: e.target.value || null })
                    }
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
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
            id="save-product-btn"
            className="px-6 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-zinc-950 font-semibold text-sm transition-colors shadow-lg shadow-amber-500/20"
          >
            {saving ? 'Guardando…' : '💾 Guardar Producto'}
          </button>
        </div>
      </form>

      {/* Modal de Recorte de Imagen */}
      {cropperRawSrc && (
        <ImageCropperModal
          imageSrc={cropperRawSrc}
          onClose={() => setCropperRawSrc(null)}
          onConfirm={handleConfirmCrop}
        />
      )}

      {/* Modal de Asistente IA Culinaria */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>✨</span> Generador de Descripciones con IA
              </h3>
              <button
                type="button"
                onClick={() => setShowAiModal(false)}
                className="text-zinc-400 hover:text-white p-1 rounded hover:bg-zinc-800"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs text-zinc-400 mb-1 font-medium">
                  Plato a redactar:
                </label>
                <div className="px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white text-xs font-semibold">
                  {form.name || '(Sin nombre)'}
                </div>
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1 font-medium">
                  Ingredientes clave o notas (opcional):
                </label>
                <input
                  type="text"
                  value={aiIngredients}
                  onChange={(e) => setAiIngredients(e.target.value)}
                  placeholder="ej. carne madurada, trufa, queso emmental, brioche de masa madre..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={aiGenerating || !form.name.trim()}
                  onClick={handleGenerateAiDescriptions}
                  className="px-4 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded-lg transition-colors shadow-sm disabled:opacity-50"
                >
                  {aiGenerating ? 'Redactando sugerencias…' : '✨ Generar 3 Opciones'}
                </button>
              </div>

              {aiSuggestions.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-zinc-800">
                  <p className="text-xs font-semibold text-zinc-300">
                    Elige una opción para insertar en el plato:
                  </p>
                  {aiSuggestions.map((desc, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        setForm({ ...form, description: desc })
                        setShowAiModal(false)
                      }}
                      className="p-3 rounded-xl bg-zinc-950 hover:bg-amber-500/10 border border-zinc-800 hover:border-amber-500/50 cursor-pointer transition-all group"
                    >
                      <p className="text-xs text-zinc-300 group-hover:text-white leading-relaxed">
                        {desc}
                      </p>
                      <span className="inline-block mt-2 text-[10px] text-amber-400 font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                        Usar esta descripción ➔
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
