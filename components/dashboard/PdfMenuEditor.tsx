'use client'

import { useState, useRef } from 'react'
import { HotspotDrawer, type HotspotRect } from './HotspotDrawer'

// ─── Types ────────────────────────────────────────────────────────────────

interface Product {
  id: string
  name: string
}

interface SavedHotspot {
  id: string
  page: number
  x: number
  y: number
  width: number
  height: number
  product: { id: string; name: string }
}

interface PdfMenuEditorProps {
  restaurantId: string
  initialPdfUrl: string | null
  initialHotspots: SavedHotspot[]
  products: Product[]
}

// ─── Component ────────────────────────────────────────────────────────────

export function PdfMenuEditor({
  restaurantId,
  initialPdfUrl,
  initialHotspots,
  products,
}: PdfMenuEditorProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(initialPdfUrl)
  const [hotspots, setHotspots] = useState<SavedHotspot[]>(initialHotspots)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Upload ─────────────────────────────────────────────────────────────
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setUploadError(null)

    try {
      const formData = new FormData()
      formData.append('pdf', file)

      const res = await fetch('/api/pdf/upload', { method: 'POST', body: formData })
      
      let data: any = {}
      const contentType = res.headers.get('content-type')
      if (contentType && contentType.includes('application/json')) {
        data = await res.json()
      } else {
        const text = await res.text()
        throw new Error(text.substring(0, 100) || `Error del servidor (${res.status})`)
      }

      if (!res.ok) throw new Error(data.error ?? 'Error al subir el archivo')

      setPdfUrl(data.url)
      // Al subir un nuevo PDF, los hotspots anteriores siguen siendo válidos.
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleRemovePdf() {
    if (!confirm('¿Eliminar el PDF del menú? Los hotspots se conservarán.')) return
    await fetch('/api/pdf/upload', { method: 'DELETE' })
    setPdfUrl(null)
  }

  // ── Hotspot CRUD ───────────────────────────────────────────────────────
  async function handleSaveHotspot(rect: HotspotRect, productId: string) {
    const res = await fetch('/api/pdf/hotspots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...rect, productId }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? 'Error al guardar')

    const product = products.find((p) => p.id === productId)!
    setHotspots((prev) => [
      ...prev,
      { ...data, product: { id: productId, name: product.name } },
    ])
  }

  async function handleDeleteHotspot(id: string) {
    const res = await fetch(`/api/pdf/hotspots?id=${id}`, { method: 'DELETE' })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error ?? 'Error al eliminar')
    }
    setHotspots((prev) => prev.filter((h) => h.id !== id))
  }

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ── Zona de Upload ── */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-bold text-white text-base">PDF del Menú</h2>
            <p className="text-sm text-zinc-400 mt-0.5">
              Sube el PDF de tu menú físico. Máx. 20 MB.
            </p>
          </div>
          {pdfUrl && (
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-amber-400 hover:text-amber-300 transition-colors flex-shrink-0 mt-1"
            >
              Ver PDF ↗
            </a>
          )}
        </div>

        {pdfUrl ? (
          <div className="flex items-center gap-3 bg-zinc-800/50 border border-zinc-700 rounded-xl px-4 py-3">
            <span className="text-2xl">📄</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white font-medium truncate">menu.pdf</p>
              <p className="text-xs text-zinc-500 truncate">{pdfUrl}</p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="text-xs px-3 py-1.5 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-zinc-300
                           transition-colors disabled:opacity-50"
              >
                Reemplazar
              </button>
              <button
                onClick={handleRemovePdf}
                className="text-xs px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400
                           border border-red-500/30 transition-colors"
              >
                Quitar
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full border-2 border-dashed border-zinc-700 hover:border-amber-500/50
                       rounded-xl py-10 flex flex-col items-center gap-3 transition-all
                       hover:bg-amber-500/5 disabled:opacity-50 group"
          >
            <span className="text-4xl">📋</span>
            <div className="text-center">
              <p className="text-white font-semibold text-sm group-hover:text-amber-400 transition-colors">
                {uploading ? 'Subiendo PDF…' : 'Haz clic para subir tu menú en PDF'}
              </p>
              <p className="text-zinc-500 text-xs mt-1">o arrastra el archivo aquí</p>
            </div>
          </button>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={handleFileChange}
        />

        {uploadError && (
          <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
            {uploadError}
          </p>
        )}
      </div>

      {/* ── Editor de Hotspots ── */}
      {pdfUrl ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
          <div>
            <h2 className="font-bold text-white text-base">Zonas Interactivas</h2>
            <p className="text-sm text-zinc-400 mt-0.5">
              Dibuja rectángulos sobre los productos en el PDF para vincularlos con el catálogo.
              Los clientes podrán tocar cada zona para abrir el producto con sus opciones.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3">
            <span className="text-lg">💡</span>
            <p className="text-xs text-amber-300">
              Arrastra el mouse sobre el nombre/imagen de un producto en el PDF para marcar la zona clickeable.
            </p>
          </div>

          <HotspotDrawer
            pdfUrl={pdfUrl}
            products={products}
            hotspots={hotspots}
            onSave={handleSaveHotspot}
            onDelete={handleDeleteHotspot}
          />

          {/* Resumen total */}
          {hotspots.length > 0 && (
            <div className="border-t border-zinc-800 pt-4">
              <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
                Total de zonas ({hotspots.length})
              </h3>
              <div className="space-y-1.5">
                {hotspots.map((hs) => (
                  <div
                    key={hs.id}
                    className="flex items-center justify-between text-xs text-zinc-400"
                  >
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      {hs.product.name}
                      <span className="text-zinc-600">— pág. {hs.page + 1}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-zinc-900/50 border border-zinc-800 border-dashed rounded-2xl px-6 py-10
                        flex flex-col items-center gap-2 text-center">
          <span className="text-3xl opacity-40">🗺️</span>
          <p className="text-zinc-500 text-sm">
            Sube un PDF para poder configurar las zonas interactivas
          </p>
        </div>
      )}
    </div>
  )
}
