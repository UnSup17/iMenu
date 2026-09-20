'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface InvItem {
  id: string
  name: string
  sku: string | null
  unit: string
  currentStock: number
  minStock: number
  supplier: string | null
}

type DiscrepancyResult = {
  itemId: string
  itemName: string
  systemStock: number
  countedQty: number
  discrepancy: number
}

function playBeep() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(880, ctx.currentTime)
    gain.gain.setValueAtTime(0.15, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.15)
  } catch {
    // Ignore audio error if blocked
  }
}

export default function PhysicalCountPage() {
  const [items, setItems] = useState<InvItem[]>([])
  const [lastCountAt, setLastCountAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [notes, setNotes] = useState('')
  const [counts, setCounts] = useState<Record<string, string>>({})
  const [results, setResults] = useState<DiscrepancyResult[] | null>(null)
  const [error, setError] = useState('')
  const [scanValue, setScanValue] = useState('')
  const [scanMode, setScanMode] = useState(false)
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [lastScannedItem, setLastScannedItem] = useState<{ id: string; name: string } | null>(null)

  const scanInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const scanIntervalRef = useRef<number | null>(null)

  useEffect(() => {
    fetch('/api/inventory/physical-count')
      .then((r) => r.json())
      .then((data) => {
        const itemsData = data.items ?? []
        setItems(itemsData)
        setLastCountAt(data.lastCountAt)
        // Pre-fill with current system stock
        const prefilled: Record<string, string> = {}
        itemsData.forEach((i: InvItem) => {
          prefilled[i.id] = String(i.currentStock)
        })
        setCounts(prefilled)
      })
      .finally(() => setLoading(false))
  }, [])

  const matchAndFocusItem = useCallback(
    (code: string) => {
      const trimmed = code.trim().toLowerCase()
      if (!trimmed) return false

      const found = items.find(
        (i) =>
          i.sku?.toLowerCase() === trimmed ||
          i.name.toLowerCase() === trimmed ||
          i.id.toLowerCase() === trimmed ||
          (trimmed.length > 2 && i.name.toLowerCase().includes(trimmed))
      )

      if (found) {
        playBeep()
        setLastScannedItem({ id: found.id, name: found.name })
        const el = document.getElementById(`count-${found.id}`) as HTMLInputElement | null
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
          el.focus()
          el.select()
        }
        return true
      }
      return false
    },
    [items]
  )

  const handleScanBarcode = (e: React.FormEvent) => {
    e.preventDefault()
    if (!scanValue.trim()) return
    const matched = matchAndFocusItem(scanValue)
    if (!matched) {
      setError(`No se encontró ningún insumo con SKU o nombre: "${scanValue}"`)
    } else {
      setError('')
    }
    setScanValue('')
  }

  // Camera Barcode Scanning logic
  const stopCamera = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
      scanIntervalRef.current = null
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop())
      mediaStreamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setCameraActive(false)
  }, [])

  const startCamera = async () => {
    setCameraError('')
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError('La cámara no está soportada en este navegador.')
        return
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      mediaStreamRef.current = stream
      setCameraActive(true)

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

      // Check native BarcodeDetector support
      if ('BarcodeDetector' in window) {
        try {
          const detector = new (window as any).BarcodeDetector({
            formats: ['qr_code', 'ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e'],
          })

          scanIntervalRef.current = window.setInterval(async () => {
            if (!videoRef.current || videoRef.current.readyState < 2) return
            try {
              const barcodes = await detector.detect(videoRef.current)
              if (barcodes.length > 0) {
                const rawValue = barcodes[0].rawValue
                if (rawValue) {
                  matchAndFocusItem(rawValue)
                }
              }
            } catch {
              // Ignore single frame detection errors
            }
          }, 350)
        } catch {
          // BarcodeDetector initialisation failed, fallback to manual scanner
        }
      }
    } catch (err: any) {
      console.error('Camera error:', err)
      setCameraError(
        err.name === 'NotAllowedError'
          ? 'Permiso de cámara denegado. Habilita el acceso en los ajustes del navegador.'
          : 'No se pudo acceder a la cámara del dispositivo.'
      )
      stopCamera()
    }
  }

  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [stopCamera])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const payload = items.map((item) => ({
        inventoryItemId: item.id,
        countedQty: parseFloat(counts[item.id] ?? String(item.currentStock)) || 0,
      }))

      const res = await fetch('/api/inventory/physical-count', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ counts: payload, notes }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Error al guardar conteo')
        return
      }
      setResults(data.results)
    } finally {
      setSubmitting(false)
    }
  }

  const adjustedItems = results?.filter((r) => Math.abs(r.discrepancy) > 0.001) ?? []

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">📋 Conteo Físico de Inventario</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Ingresa las cantidades físicas contadas — el sistema calculará discrepancias y ajustará el
            stock automáticamente
          </p>
          {lastCountAt && (
            <p className="text-xs text-zinc-600 mt-1">
              Último conteo:{' '}
              {new Date(lastCountAt).toLocaleDateString('es-CO', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          )}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              if (cameraActive) {
                stopCamera()
              } else {
                startCamera()
              }
            }}
            className={`px-4 py-2 rounded-lg border text-sm transition-colors flex items-center gap-1.5 ${
              cameraActive
                ? 'border-red-500 text-red-400 bg-red-950/20 hover:bg-red-950/40'
                : 'border-amber-500 text-amber-400 bg-amber-950/20 hover:bg-amber-950/40'
            }`}
          >
            <span>{cameraActive ? '⏹️ Detener Cámara' : '📷 Abrir Cámara'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setScanMode(!scanMode)
              setTimeout(() => scanInputRef.current?.focus(), 100)
            }}
            className={`px-4 py-2 rounded-lg border text-sm transition-colors ${
              scanMode
                ? 'border-amber-500 text-amber-400 bg-amber-950/20'
                : 'border-zinc-700 text-zinc-300 hover:bg-zinc-800'
            }`}
          >
            ⌨️ {scanMode ? 'Ocultar Lector SKU' : 'Lector SKU / USB'}
          </button>
        </div>
      </div>

      {/* Camera Barcode Live Viewport */}
      {cameraActive && (
        <div className="mb-6 rounded-2xl border border-amber-500/50 bg-black overflow-hidden relative shadow-2xl">
          <div className="p-3 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between text-xs text-zinc-300">
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              <span>Cámara en vivo — Apunta al código de barras o QR del insumo</span>
            </span>
            <button
              onClick={stopCamera}
              className="text-zinc-500 hover:text-zinc-200 text-xs px-2 py-0.5 rounded bg-zinc-800"
            >
              Cerrar visor
            </button>
          </div>

          <div className="relative aspect-video max-h-72 w-full flex items-center justify-center bg-zinc-950">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              autoPlay
              playsInline
              muted
            />

            {/* Viewfinder Target Box Overlay */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-64 h-36 border-2 border-amber-400/80 rounded-xl relative shadow-[0_0_20px_rgba(245,158,11,0.3)]">
                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-amber-300 -translate-x-0.5 -translate-y-0.5" />
                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-amber-300 translate-x-0.5 -translate-y-0.5" />
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-amber-300 -translate-x-0.5 translate-y-0.5" />
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-amber-300 translate-x-0.5 translate-y-0.5" />
                <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-red-500/60 animate-pulse" />
              </div>
            </div>
          </div>

          {lastScannedItem && (
            <div className="p-3 bg-emerald-950/80 border-t border-emerald-800 text-emerald-300 text-xs flex items-center justify-between">
              <span>
                🎯 Detectado: <strong>{lastScannedItem.name}</strong>
              </span>
              <span className="text-[11px] text-emerald-400/70">
                Campo de conteo enfocado abajo
              </span>
            </div>
          )}
        </div>
      )}

      {/* Camera error message */}
      {cameraError && (
        <div className="mb-4 p-3 rounded-lg border border-red-900 bg-red-950/40 text-red-300 text-xs">
          {cameraError}
        </div>
      )}

      {/* Barcode / SKU text input for USB handheld scanners */}
      {(scanMode || cameraActive) && (
        <form onSubmit={handleScanBarcode} className="mb-4 flex gap-3">
          <input
            ref={scanInputRef}
            type="text"
            value={scanValue}
            onChange={(e) => setScanValue(e.target.value)}
            placeholder="Escanea con pistola de código de barras o escribe SKU / nombre..."
            className="flex-1 px-4 py-2 bg-amber-950/20 border border-amber-800/60 rounded-lg text-amber-100 text-sm placeholder-amber-900/80 focus:outline-none focus:border-amber-500"
            autoFocus
          />
          <button
            type="submit"
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-black font-semibold rounded-lg text-sm transition-colors"
          >
            Buscar
          </button>
        </form>
      )}

      {/* Results panel */}
      {results && (
        <div
          className={`mb-6 rounded-xl border p-4 ${
            adjustedItems.length === 0
              ? 'border-emerald-800 bg-emerald-950/20'
              : 'border-amber-800 bg-amber-950/20'
          }`}
        >
          <h2
            className={`font-bold mb-3 ${
              adjustedItems.length === 0 ? 'text-emerald-400' : 'text-amber-400'
            }`}
          >
            {adjustedItems.length === 0
              ? '✅ Sin discrepancias — Stock perfecto'
              : `⚠️ ${adjustedItems.length} ajustes realizados`}
          </h2>
          {adjustedItems.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-zinc-500 border-b border-zinc-800 pb-1">
                  <th className="pb-2 text-left">Insumo</th>
                  <th className="pb-2 text-right">Stock Sistema</th>
                  <th className="pb-2 text-right">Contado</th>
                  <th className="pb-2 text-right">Discrepancia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/40">
                {adjustedItems.map((r) => (
                  <tr key={r.itemId}>
                    <td className="py-1.5 text-white">{r.itemName}</td>
                    <td className="py-1.5 text-right text-zinc-400 font-mono">
                      {r.systemStock.toFixed(3)}
                    </td>
                    <td className="py-1.5 text-right text-white font-mono">
                      {r.countedQty.toFixed(3)}
                    </td>
                    <td
                      className={`py-1.5 text-right font-mono font-bold ${
                        r.discrepancy > 0 ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {r.discrepancy > 0 ? `+${r.discrepancy.toFixed(3)}` : r.discrepancy.toFixed(3)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 rounded-lg border border-red-800 bg-red-950/40 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Main Table Form */}
      {loading ? (
        <div className="text-center py-20 text-zinc-600">Cargando inventario...</div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 overflow-hidden mb-6">
            <table className="w-full text-sm">
              <thead className="bg-zinc-900 border-b border-zinc-800 text-xs text-zinc-400">
                <tr>
                  <th className="px-4 py-3 text-left">Insumo</th>
                  <th className="px-4 py-3 text-left">SKU</th>
                  <th className="px-4 py-3 text-left">Unidad</th>
                  <th className="px-4 py-3 text-right">Stock en Sistema</th>
                  <th className="px-4 py-3 text-right w-44">Cantidad Contada</th>
                  <th className="px-4 py-3 text-right">Discrepancia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {items.map((item) => {
                  const countedVal = counts[item.id] ?? ''
                  const countedNum = parseFloat(countedVal) || 0
                  const systemStock = item.currentStock
                  const diff = countedVal === '' ? 0 : countedNum - systemStock
                  const isScanned = lastScannedItem?.id === item.id

                  return (
                    <tr
                      key={item.id}
                      className={`transition-colors ${
                        isScanned
                          ? 'bg-amber-950/30'
                          : 'hover:bg-zinc-900/50'
                      }`}
                    >
                      <td className="px-4 py-3 font-medium text-white">
                        {item.name}
                        {isScanned && (
                          <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            Escaneado
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-zinc-500 font-mono text-xs">
                        {item.sku ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-zinc-400">{item.unit}</td>
                      <td className="px-4 py-3 text-right font-mono text-zinc-300">
                        {systemStock.toFixed(3)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <input
                          id={`count-${item.id}`}
                          type="number"
                          step="0.001"
                          min="0"
                          value={counts[item.id] ?? ''}
                          onChange={(e) =>
                            setCounts({ ...counts, [item.id]: e.target.value })
                          }
                          className="w-32 px-3 py-1 bg-zinc-800 border border-zinc-700 rounded-lg text-right text-white font-mono text-sm focus:outline-none focus:border-amber-500"
                        />
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs">
                        {countedVal === '' ? (
                          <span className="text-zinc-600">—</span>
                        ) : Math.abs(diff) < 0.001 ? (
                          <span className="text-emerald-400">✓ 0.000</span>
                        ) : (
                          <span
                            className={
                              diff > 0 ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'
                            }
                          >
                            {diff > 0 ? `+${diff.toFixed(3)}` : diff.toFixed(3)}
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1">
              <label className="text-xs text-zinc-400 mb-1 block">
                Notas del conteo / auditoría (opcional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ej. Auditoría de fin de mes, revisión de bodega central..."
                className="w-full px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div className="pt-5">
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-lg text-sm transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <span>{submitting ? 'Guardando...' : '💾 Guardar Conteo y Ajustar Stock'}</span>
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  )
}
