'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
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

interface PdfJobStatus {
  id: string
  status: 'queued' | 'processing' | 'completed' | 'failed'
  totalPages: number
  processedPages: number
  progressPercentage: number
  pageImages: string[]
  error?: string
}

interface PdfMenuEditorProps {
  restaurantId: string
  initialPdfUrl: string | null
  initialPageImages?: string[]
  initialHotspots: SavedHotspot[]
  products: Product[]
}

// ─── Component ────────────────────────────────────────────────────────────

export function PdfMenuEditor({
  restaurantId,
  initialPdfUrl,
  initialPageImages = [],
  initialHotspots,
  products,
}: PdfMenuEditorProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(initialPdfUrl)
  const [pageImages, setPageImages] = useState<string[]>(initialPageImages)
  const [hotspots, setHotspots] = useState<SavedHotspot[]>(initialHotspots)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  // Estados del Worker en segundo plano
  const [jobId, setJobId] = useState<string | null>(null)
  const [jobStatus, setJobStatus] = useState<PdfJobStatus | null>(null)
  const [converting, setConverting] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Polling de estado del worker en background ───────────────────────────
  const checkJobProgress = useCallback(async (currentJobId: string) => {
    try {
      const res = await fetch(`/api/pdf/convert?jobId=${currentJobId}`)
      if (!res.ok) return

      const data = await res.json()
      if (data.success && data.job) {
        setJobStatus(data.job)

        if (data.job.status === 'completed') {
          if (Array.isArray(data.job.pageImages) && data.job.pageImages.length > 0) {
            setPageImages(data.job.pageImages)
          }
          setConverting(false)
        } else if (data.job.status === 'failed') {
          setConverting(false)
        }
      }
    } catch (err) {
      console.warn('[PdfMenuEditor] Error consultando progreso:', err)
    }
  }, [])

  useEffect(() => {
    if (!jobId || !converting) return

    const interval = setInterval(() => {
      checkJobProgress(jobId)
    }, 1500)

    return () => clearInterval(interval)
  }, [jobId, converting, checkJobProgress])

  // ── Iniciar conversión en background ─────────────────────────────────────
  async function handleStartConversion(overrideUrl?: string) {
    const targetUrl = overrideUrl || pdfUrl
    if (!targetUrl) return

    setConverting(true)
    setUploadError(null)

    try {
      const res = await fetch('/api/pdf/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantId,
          pdfUrl: targetUrl,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error al iniciar la conversión')

      setJobId(data.jobId)
      setJobStatus({
        id: data.jobId,
        status: 'queued',
        totalPages: 0,
        processedPages: 0,
        progressPercentage: 0,
        pageImages: [],
      })
    } catch (err) {
      setConverting(false)
      setUploadError(err instanceof Error ? err.message : 'Error al convertir el PDF')
    }
  }

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
      // Disparar automáticamente la optimización y conversión en segundo plano
      handleStartConversion(data.url)
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
    setPageImages([])
    setJobId(null)
    setJobStatus(null)
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
              Sube el PDF de tu menú físico. Soporta documentos extensos (&gt;50 páginas).
            </p>
          </div>
          {pdfUrl && (
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-amber-400 hover:text-amber-300 transition-colors flex-shrink-0 mt-1"
            >
              Ver PDF Canónico ↗
            </a>
          )}
        </div>

        {pdfUrl ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 bg-zinc-800/50 border border-zinc-700 rounded-xl px-4 py-3">
              <span className="text-2xl">📄</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white font-medium truncate">menu.pdf</p>
                <p className="text-xs text-zinc-500 truncate">{pdfUrl}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => handleStartConversion()}
                  disabled={converting}
                  className="text-xs px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-400
                             border border-amber-500/30 transition-colors font-medium disabled:opacity-50 flex items-center gap-1.5"
                  title="Optimizar páginas en WebP para carga móvil en <100ms"
                >
                  <span>⚡</span>
                  <span>{converting ? 'Optimizando...' : 'Optimizar WebP'}</span>
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading || converting}
                  className="text-xs px-3 py-1.5 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-zinc-300
                             transition-colors disabled:opacity-50"
                >
                  Reemplazar
                </button>
                <button
                  onClick={handleRemovePdf}
                  disabled={converting}
                  className="text-xs px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400
                             border border-red-500/30 transition-colors disabled:opacity-50"
                >
                  Quitar
                </button>
              </div>
            </div>

            {/* ── Banner / Barra de progreso en segundo plano ── */}
            {jobStatus && (
              <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    {jobStatus.status === 'processing' && (
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                      </span>
                    )}
                    {jobStatus.status === 'completed' && (
                      <span className="text-emerald-400 font-medium">✓ Completado</span>
                    )}
                    {jobStatus.status === 'queued' && (
                      <span className="text-zinc-400">En cola de procesamiento...</span>
                    )}
                    {jobStatus.status === 'failed' && (
                      <span className="text-red-400 font-medium">✕ Falló</span>
                    )}
                    <span className="text-zinc-300 font-medium">
                      {jobStatus.status === 'processing'
                        ? `Procesando páginas: ${jobStatus.processedPages} de ${jobStatus.totalPages}`
                        : jobStatus.status === 'completed'
                        ? `${jobStatus.totalPages} páginas optimizadas en WebP (~40KB/pág)`
                        : jobStatus.status === 'failed'
                        ? jobStatus.error || 'Error en la conversión'
                        : 'Preparando worker...'}
                    </span>
                  </div>
                  <span className="text-zinc-400 font-mono font-semibold">
                    {jobStatus.progressPercentage}%
                  </span>
                </div>

                {/* Barra de progreso animada */}
                <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      jobStatus.status === 'completed'
                        ? 'bg-emerald-500'
                        : jobStatus.status === 'failed'
                        ? 'bg-red-500'
                        : 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-400 animate-pulse'
                    }`}
                    style={{ width: `${Math.max(4, jobStatus.progressPercentage)}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-zinc-500">
                  <span>Compresión Sharp WebP (85% fidelidad)</span>
                  <span>Aceleración móvil: de 30s a &lt;100ms</span>
                </div>
              </div>
            )}

            {/* ── Galería de páginas pre-renderizadas ── */}
            {pageImages.length > 0 && (
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Páginas WebP listas para móviles ({pageImages.length})
                  </p>
                  <span className="text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                    Carga perimetral activa
                  </span>
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                  {pageImages.map((imgUrl, idx) => (
                    <a
                      key={idx}
                      href={imgUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group relative aspect-[9/14] bg-zinc-800 rounded-lg overflow-hidden border border-zinc-700/60 hover:border-amber-500/60 transition-all"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imgUrl}
                        alt={`Página ${idx + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        loading="lazy"
                      />
                      <span className="absolute bottom-1 right-1 bg-black/70 backdrop-blur-sm text-[10px] text-zinc-300 font-mono px-1.5 py-0.5 rounded">
                        #{idx + 1}
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            )}
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
              <p className="text-zinc-500 text-xs mt-1">o arrastra el archivo aquí (máx. 20MB)</p>
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
