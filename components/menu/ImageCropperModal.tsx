'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

interface Props {
  imageSrc: string
  onClose: () => void
  onConfirm: (croppedBlob: Blob, previewUrl: string) => void
}

type AspectRatio = '1:1' | '4:3' | '16:9'

const RATIO_VALUES: Record<AspectRatio, number> = {
  '1:1': 1,
  '4:3': 4 / 3,
  '16:9': 16 / 9,
}

export function ImageCropperModal({ imageSrc, onClose, onConfirm }: Props) {
  const [aspect, setAspect] = useState<AspectRatio>('4:3')
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [processing, setProcessing] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)

  // Cargar imagen
  useEffect(() => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      imageRef.current = img
      setOffset({ x: 0, y: 0 })
      setZoom(1)
      drawPreview(img, 1, { x: 0, y: 0 }, aspect)
    }
    img.src = imageSrc
  }, [imageSrc])

  const drawPreview = useCallback(
    (
      img: HTMLImageElement,
      currentZoom: number,
      currentOffset: { x: number; y: number },
      currentAspect: AspectRatio
    ) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const ratio = RATIO_VALUES[currentAspect]
      const width = 600
      const height = width / ratio

      canvas.width = width
      canvas.height = height

      ctx.clearRect(0, 0, width, height)

      // Dibujar fondo oscuro
      ctx.fillStyle = '#18181b'
      ctx.fillRect(0, 0, width, height)

      // Calcular escalado para cubrir el área del canvas (cover)
      const scale = Math.max(width / img.width, height / img.height) * currentZoom
      const drawWidth = img.width * scale
      const drawHeight = img.height * scale

      const drawX = (width - drawWidth) / 2 + currentOffset.x
      const drawY = (height - drawHeight) / 2 + currentOffset.y

      ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight)

      // Cuadrícula de tercios para encuadre fotográfico
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)'
      ctx.lineWidth = 1
      ctx.setLineDash([4, 4])

      // Líneas verticales
      ctx.beginPath()
      ctx.moveTo(width / 3, 0)
      ctx.lineTo(width / 3, height)
      ctx.moveTo((2 * width) / 3, 0)
      ctx.lineTo((2 * width) / 3, height)
      // Líneas horizontales
      ctx.moveTo(0, height / 3)
      ctx.lineTo(width, height / 3)
      ctx.moveTo(0, (2 * height) / 3)
      ctx.lineTo(width, (2 * height) / 3)
      ctx.stroke()
      ctx.setLineDash([])
    },
    []
  )

  useEffect(() => {
    if (imageRef.current) {
      drawPreview(imageRef.current, zoom, offset, aspect)
    }
  }, [zoom, offset, aspect, drawPreview])

  // Manejo de arrastre
  function handleMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    setIsDragging(true)
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y })
  }

  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!isDragging) return
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    })
  }

  function handleMouseUp() {
    setIsDragging(false)
  }

  function handleConfirmCrop() {
    const canvas = canvasRef.current
    if (!canvas || !imageRef.current) return

    setProcessing(true)

    // Crear canvas de alta resolución para el recorte final sin cuadrícula
    const ratio = RATIO_VALUES[aspect]
    const outWidth = aspect === '1:1' ? 800 : aspect === '4:3' ? 960 : 1280
    const outHeight = outWidth / ratio

    const exportCanvas = document.createElement('canvas')
    exportCanvas.width = outWidth
    exportCanvas.height = outHeight
    const ctx = exportCanvas.getContext('2d')

    if (ctx && imageRef.current) {
      const img = imageRef.current
      const scaleMultiplier = outWidth / canvas.width
      const scale = Math.max(outWidth / img.width, outHeight / img.height) * zoom
      const drawWidth = img.width * scale
      const drawHeight = img.height * scale

      const drawX = (outWidth - drawWidth) / 2 + offset.x * scaleMultiplier
      const drawY = (outHeight - drawHeight) / 2 + offset.y * scaleMultiplier

      ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight)

      exportCanvas.toBlob(
        (blob) => {
          if (blob) {
            const previewUrl = URL.createObjectURL(blob)
            onConfirm(blob, previewUrl)
          }
          setProcessing(false)
        },
        'image/webp',
        0.92
      )
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-700/80 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>✂️</span> Editor & Recorte de Imagen
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Ajusta la posición, encuadre y proporción estándar para tu menú
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Canvas Area */}
        <div className="p-6 flex flex-col items-center bg-zinc-950/70 select-none">
          <div className="relative border-2 border-dashed border-amber-500/40 rounded-xl overflow-hidden shadow-2xl bg-zinc-950 cursor-grab active:cursor-grabbing">
            <canvas
              ref={canvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              className="max-w-full max-h-[380px] object-contain block"
            />
          </div>
          <p className="text-[11px] text-zinc-500 mt-2 flex items-center gap-1.5">
            <span>👆</span> Arrastra la imagen para encuadrar y usa el zoom inferior
          </p>
        </div>

        {/* Controls */}
        <div className="p-6 space-y-4 border-t border-zinc-800 bg-zinc-900">
          {/* Proporción */}
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
              Proporción
            </span>
            <div className="flex bg-zinc-950 p-1 rounded-lg border border-zinc-800">
              <button
                type="button"
                onClick={() => setAspect('1:1')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                  aspect === '1:1'
                    ? 'bg-amber-500 text-zinc-950 shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                1:1 (Cuadrado)
              </button>
              <button
                type="button"
                onClick={() => setAspect('4:3')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                  aspect === '4:3'
                    ? 'bg-amber-500 text-zinc-950 shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                4:3 (Estándar Menú)
              </button>
              <button
                type="button"
                onClick={() => setAspect('16:9')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                  aspect === '16:9'
                    ? 'bg-amber-500 text-zinc-950 shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                16:9 (Banner)
              </button>
            </div>
          </div>

          {/* Zoom Slider */}
          <div className="flex items-center gap-4">
            <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider shrink-0">
              Zoom ({Math.round(zoom * 100)}%)
            </span>
            <input
              type="range"
              min="0.8"
              max="3"
              step="0.05"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="w-full accent-amber-500 bg-zinc-800 rounded-lg cursor-pointer h-1.5"
            />
            <button
              type="button"
              onClick={() => {
                setZoom(1)
                setOffset({ x: 0, y: 0 })
              }}
              className="text-xs text-zinc-400 hover:text-white hover:underline shrink-0"
            >
              Reset
            </button>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs text-zinc-400 hover:text-white border border-zinc-700 rounded-lg hover:bg-zinc-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={processing}
              onClick={handleConfirmCrop}
              className="px-5 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded-lg transition-colors shadow-lg shadow-amber-500/20 disabled:opacity-50"
            >
              {processing ? 'Procesando…' : '✓ Aplicar Recorte y Guardar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
