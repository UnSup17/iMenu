'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import type { ProductModalData } from './ProductModal'

// pdfjs-dist cargado dinámicamente — tipado con any para compatibilidad
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pdfjsLib: any = null

// ─── Types ────────────────────────────────────────────────────────────────

interface PdfHotspot {
  id: string
  page: number
  x: number
  y: number
  width: number
  height: number
  product: ProductModalData
}

interface PdfMenuViewProps {
  pdfUrl: string
  hotspots: PdfHotspot[]
  onSelectProduct: (product: ProductModalData) => void
}

// ─── Component ────────────────────────────────────────────────────────────

export function PdfMenuView({ pdfUrl, hotspots, onSelectProduct }: PdfMenuViewProps) {
  const [pageDataUrls, setPageDataUrls] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)

  const renderAllPages = useCallback(async () => {
    setIsLoading(true)
    try {
      if (!pdfjsLib) {
        pdfjsLib = await import('pdfjs-dist')
        pdfjsLib.GlobalWorkerOptions.workerSrc =
          `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`
      }

      const containerWidth = containerRef.current?.clientWidth ?? window.innerWidth
      const doc = await pdfjsLib.getDocument({ url: pdfUrl }).promise

      const urls: string[] = []

      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i)
        const viewport = page.getViewport({ scale: 1 })
        const scale = (containerWidth - 4) / viewport.width
        const scaled = page.getViewport({ scale })

        const canvas = document.createElement('canvas')
        canvas.width = scaled.width
        canvas.height = scaled.height
        const ctx = canvas.getContext('2d')!
        await page.render({ canvasContext: ctx, viewport: scaled, canvas }).promise

        urls.push(canvas.toDataURL('image/jpeg', 0.92))
      }

      setPageDataUrls(urls)
    } finally {
      setIsLoading(false)
    }
  }, [pdfUrl])

  useEffect(() => {
    renderAllPages()
  }, [renderAllPages])

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-zinc-400 text-sm animate-pulse">Cargando menú PDF…</p>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="space-y-4 pb-24">
      {pageDataUrls.map((dataUrl, pageIndex) => {
        const pageHotspots = hotspots.filter((h) => h.page === pageIndex)

        return (
          <div
            key={pageIndex}
            className="relative border border-zinc-800 rounded-xl overflow-hidden bg-white mx-auto"
            style={{ width: '100%' }}
          >
            {/* Imagen de la página */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={dataUrl}
              alt={`Página ${pageIndex + 1}`}
              className="block w-full"
              draggable={false}
            />

            {/* Hotspots como botones transparentes */}
            {pageHotspots.map((hs) => (
              <button
                key={hs.id}
                onClick={() => onSelectProduct(hs.product)}
                title={`Ver ${hs.product.name}`}
                style={{
                  position: 'absolute',
                  left: `${hs.x * 100}%`,
                  top: `${hs.y * 100}%`,
                  width: `${hs.width * 100}%`,
                  height: `${hs.height * 100}%`,
                }}
                className="group rounded transition-all duration-150
                           hover:bg-amber-500/20 hover:ring-2 hover:ring-amber-500/60
                           active:bg-amber-500/30 focus:outline-none focus:ring-2 focus:ring-amber-500"
                aria-label={`Abrir ${hs.product.name}`}
              >
                <span
                  className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100
                             transition-opacity bg-amber-500 text-white text-[9px] font-bold
                             px-1.5 py-0.5 rounded-full pointer-events-none leading-none"
                >
                  +
                </span>
              </button>
            ))}
          </div>
        )
      })}

      {hotspots.length === 0 && (
        <p className="text-center text-zinc-500 text-xs py-4">
          El administrador aún no ha configurado zonas interactivas en este menú.
        </p>
      )}
    </div>
  )
}
