'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

// pdfjs-dist: importamos dinámicamente en useEffect para evitar SSR issues
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pdfjsLib: any = null

// ─── Types ────────────────────────────────────────────────────────────────

export interface HotspotRect {
  page: number
  x: number      // 0.0–1.0
  y: number      // 0.0–1.0
  width: number  // 0.0–1.0
  height: number // 0.0–1.0
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

interface Product {
  id: string
  name: string
}

interface HotspotDrawerProps {
  pdfUrl: string
  products: Product[]
  hotspots: SavedHotspot[]
  onSave: (rect: HotspotRect, productId: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

// ─── Component ────────────────────────────────────────────────────────────

export function HotspotDrawer({
  pdfUrl,
  products,
  hotspots,
  onSave,
  onDelete,
}: HotspotDrawerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [currentPage, setCurrentPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [pdfDoc, setPdfDoc] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Estado de dibujo
  const [drawing, setDrawing] = useState(false)
  const [drawStart, setDrawStart] = useState({ x: 0, y: 0 })
  const [drawRect, setDrawRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null)

  // Estado de asignación de producto
  const [pendingRect, setPendingRect] = useState<HotspotRect | null>(null)
  const [selectedProductId, setSelectedProductId] = useState('')
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // ── Cargar pdfjs y renderizar página ──────────────────────────────────
  useEffect(() => {
    let cancelled = false

    async function init() {
      setIsLoading(true)
      if (!pdfjsLib) {
        pdfjsLib = await import('pdfjs-dist')
        pdfjsLib.GlobalWorkerOptions.workerSrc =
          `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`
      }
      const doc = await pdfjsLib.getDocument({ url: pdfUrl }).promise
      if (cancelled) return
      setPdfDoc(doc)
      setTotalPages(doc.numPages)
      setCurrentPage(0)
    }

    init().finally(() => { if (!cancelled) setIsLoading(false) })
    return () => { cancelled = true }
  }, [pdfUrl])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderPage = useCallback(async (doc: any, pageIndex: number) => {
    const canvas = canvasRef.current
    if (!canvas || !doc) return

    const page = await doc.getPage(pageIndex + 1) // pdfjs usa 1-indexed
    const containerWidth = canvas.parentElement?.clientWidth ?? 600
    const viewport = page.getViewport({ scale: 1 })
    const scale = (containerWidth - 32) / viewport.width
    const scaled = page.getViewport({ scale })

    canvas.width = scaled.width
    canvas.height = scaled.height

    const ctx = canvas.getContext('2d')!
    await page.render({ canvasContext: ctx, viewport: scaled, canvas }).promise
  }, [])

  useEffect(() => {
    if (pdfDoc) renderPage(pdfDoc, currentPage)
  }, [pdfDoc, currentPage, renderPage])

  // ── Calcular posición relativa al canvas ──────────────────────────────
  function getRelativePos(e: React.MouseEvent) {
    const rect = canvasRef.current!.getBoundingClientRect()
    return {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    }
  }

  function onMouseDown(e: React.MouseEvent) {
    if (e.button !== 0) return
    const pos = getRelativePos(e)
    setDrawStart(pos)
    setDrawRect({ x: pos.x, y: pos.y, w: 0, h: 0 })
    setDrawing(true)
  }

  function onMouseMove(e: React.MouseEvent) {
    if (!drawing) return
    const pos = getRelativePos(e)
    setDrawRect({
      x: Math.min(drawStart.x, pos.x),
      y: Math.min(drawStart.y, pos.y),
      w: Math.abs(pos.x - drawStart.x),
      h: Math.abs(pos.y - drawStart.y),
    })
  }

  function onMouseUp() {
    if (!drawing) return
    setDrawing(false)
    if (!drawRect || drawRect.w < 0.02 || drawRect.h < 0.02) {
      setDrawRect(null)
      return
    }
    setPendingRect({
      page: currentPage,
      x: drawRect.x,
      y: drawRect.y,
      width: drawRect.w,
      height: drawRect.h,
    })
    setDrawRect(null)
    setSelectedProductId(products[0]?.id ?? '')
  }

  async function handleConfirmHotspot() {
    if (!pendingRect || !selectedProductId) return
    setSaving(true)
    try {
      await onSave(pendingRect, selectedProductId)
      setPendingRect(null)
      setSelectedProductId('')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      await onDelete(id)
    } finally {
      setDeletingId(null)
    }
  }

  const pageHotspots = hotspots.filter((h) => h.page === currentPage)

  return (
    <div className="space-y-4">
      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center gap-3 justify-center">
          <button
            disabled={currentPage === 0}
            onClick={() => setCurrentPage((p) => p - 1)}
            className="px-3 py-1.5 rounded-lg bg-zinc-800 disabled:opacity-30 text-zinc-300 hover:bg-zinc-700 text-sm transition-colors"
          >
            ← Anterior
          </button>
          <span className="text-zinc-400 text-sm">
            Página {currentPage + 1} de {totalPages}
          </span>
          <button
            disabled={currentPage === totalPages - 1}
            onClick={() => setCurrentPage((p) => p + 1)}
            className="px-3 py-1.5 rounded-lg bg-zinc-800 disabled:opacity-30 text-zinc-300 hover:bg-zinc-700 text-sm transition-colors"
          >
            Siguiente →
          </button>
        </div>
      )}

      {/* Canvas + overlay de hotspots */}
      <div className="relative border border-zinc-700 rounded-xl overflow-hidden bg-white select-none">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/80 z-20">
            <div className="text-zinc-400 animate-pulse text-sm">Cargando PDF…</div>
          </div>
        )}

        <canvas
          ref={canvasRef}
          className="block w-full cursor-crosshair"
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
        />

        {/* Hotspots guardados en esta página */}
        {pageHotspots.map((hs) => (
          <div
            key={hs.id}
            title={hs.product.name}
            style={{
              position: 'absolute',
              left: `${hs.x * 100}%`,
              top: `${hs.y * 100}%`,
              width: `${hs.width * 100}%`,
              height: `${hs.height * 100}%`,
            }}
            className="border-2 border-amber-500 bg-amber-500/20 rounded flex items-start justify-start p-0.5 pointer-events-none"
          >
            <span className="text-[9px] font-bold bg-amber-500 text-white px-1 rounded leading-tight max-w-full truncate">
              {hs.product.name}
            </span>
          </div>
        ))}

        {/* Rectángulo siendo dibujado */}
        {drawRect && drawRect.w > 0 && (
          <div
            style={{
              position: 'absolute',
              left: `${drawRect.x * 100}%`,
              top: `${drawRect.y * 100}%`,
              width: `${drawRect.w * 100}%`,
              height: `${drawRect.h * 100}%`,
            }}
            className="border-2 border-dashed border-blue-400 bg-blue-400/10 pointer-events-none"
          />
        )}
      </div>

      <p className="text-xs text-zinc-500 text-center">
        Arrastra para marcar una zona y vincularla con un producto del catálogo
      </p>

      {/* Modal de asignación de producto */}
      {pendingRect && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setPendingRect(null)} />
          <div className="relative bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-4">
            <h3 className="font-bold text-white text-base">Vincular zona a producto</h3>
            <p className="text-xs text-zinc-400">
              Selecciona el producto del catálogo que se abrirá al tocar esta zona en el menú.
            </p>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200
                         focus:outline-none focus:border-amber-500/60"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <div className="flex gap-3">
              <button
                onClick={() => setPendingRect(null)}
                className="flex-1 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmHotspot}
                disabled={saving || !selectedProductId}
                className="flex-1 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-white font-bold text-sm
                           transition-colors disabled:opacity-50"
              >
                {saving ? 'Guardando…' : 'Guardar zona'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lista de hotspots de esta página */}
      {pageHotspots.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            Zonas en página {currentPage + 1}
          </h4>
          {pageHotspots.map((hs) => (
            <div
              key={hs.id}
              className="flex items-center justify-between bg-zinc-800/50 border border-zinc-700/50 rounded-lg px-3 py-2"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
                <span className="text-sm text-zinc-200 truncate">{hs.product.name}</span>
              </div>
              <button
                onClick={() => handleDelete(hs.id)}
                disabled={deletingId === hs.id}
                className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50 flex-shrink-0 ml-2 transition-colors"
              >
                {deletingId === hs.id ? '…' : 'Eliminar'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
