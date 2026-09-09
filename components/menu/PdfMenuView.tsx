'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import type { ProductModalData } from './ProductModal'

import { useCartStore } from '@/store/cart-store'

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
  recommendedMap?: Map<string, { fromUserName: string; note?: string }>
  onSelectProduct: (product: ProductModalData) => void
}

// ─── Component ────────────────────────────────────────────────────────────

export function PdfMenuView({
  pdfUrl,
  hotspots,
  recommendedMap,
  onSelectProduct,
}: PdfMenuViewProps) {
  const [pageDataUrls, setPageDataUrls] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)

  const getOrderedByForProduct = useCartStore((s) => s.getOrderedByForProduct)

  const renderAllPages = useCallback(async () => {
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
        <div
          className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: 'var(--brand-primary)', borderTopColor: 'transparent' }}
        />
        <p className="text-sm animate-pulse" style={{ color: 'var(--brand-muted)' }}>
          Cargando menú PDF…
        </p>
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
            id={`pdf-page-${pageIndex}`}
            className="relative border rounded-xl overflow-hidden bg-white mx-auto shadow-xl transition-all duration-300"
            style={{
              width: '100%',
              borderColor: 'color-mix(in srgb, var(--brand-surface) 60%, var(--brand-text) 15%)',
            }}
          >
            {/* Imagen de la página */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={dataUrl}
              alt={`Página ${pageIndex + 1}`}
              className="block w-full"
              draggable={false}
            />

            {/* Hotspots como botones transparentes con badges */}
            {pageHotspots.map((hs) => {
              const orderedByNames = getOrderedByForProduct(hs.product.id)
              const hasOrders = orderedByNames.length > 0
              const recommendation = recommendedMap?.get(hs.product.id)
              const isRecommended = Boolean(recommendation)

              return (
                <button
                  key={hs.id}
                  id={`pdf-hotspot-${hs.product.id}`}
                  onClick={() => onSelectProduct(hs.product)}
                  title={`Ver ${hs.product.name}`}
                  style={{
                    position: 'absolute',
                    left: `${hs.x * 100}%`,
                    top: `${hs.y * 100}%`,
                    width: `${hs.width * 100}%`,
                    height: `${hs.height * 100}%`,
                  }}
                  className={`group rounded transition-all duration-150 relative focus:outline-none focus:ring-2 ${
                    isRecommended
                      ? 'bg-[var(--brand-primary)]/30 ring-4 ring-[var(--brand-primary)] shadow-lg animate-pulse'
                      : hasOrders
                      ? 'bg-[var(--brand-primary)]/25 ring-2 ring-[var(--brand-primary)] shadow-md'
                      : 'hover:bg-[var(--brand-primary)]/20 hover:ring-2 hover:ring-[var(--brand-primary)]/60'
                  }`}
                  aria-label={`Abrir ${hs.product.name}`}
                >
                  {/* Badge de platillo recomendado por un comensal */}
                  {isRecommended && recommendation && (
                    <div
                      className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-white font-black text-[9px] px-2.5 py-0.5 rounded-full shadow-2xl border border-white/40 whitespace-nowrap flex items-center gap-1 z-20 animate-bounce"
                      style={{ backgroundColor: 'var(--brand-primary, #f59e0b)' }}
                    >
                      <span>⭐</span>
                      <span>{recommendation.fromUserName} recomienda</span>
                    </div>
                  )}

                  {/* Badge de comensales que ordenaron este platillo */}
                  {!isRecommended && hasOrders && (
                    <div
                      className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-white font-extrabold text-[9px] px-2 py-0.5 rounded-full shadow-lg border border-white/20 whitespace-nowrap flex items-center gap-1 z-10 animate-bounce"
                      style={{ backgroundColor: 'var(--brand-primary)' }}
                    >
                      <span>🏷️</span>
                      <span>{orderedByNames.join(', ')}</span>
                    </div>
                  )}

                  <span
                    className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100
                               transition-opacity text-white text-[9px] font-bold
                               px-1.5 py-0.5 rounded-full pointer-events-none leading-none shadow-md"
                    style={{ backgroundColor: 'var(--brand-primary)' }}
                  >
                    +
                  </span>
                </button>
              )
            })}
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
