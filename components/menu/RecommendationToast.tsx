'use client'

import React, { useEffect, useState, useRef } from 'react'
import type { RecommendProductPayload } from '@/types/websocket-events'

interface RecommendationToastProps {
  recommendation: RecommendProductPayload
  currency?: string
  onViewProduct: (rec: RecommendProductPayload) => void
  onDismiss: () => void
  autoDismissMs?: number
}

export function RecommendationToast({
  recommendation,
  currency = 'MXN',
  onViewProduct,
  onDismiss,
  autoDismissMs = 12000,
}: RecommendationToastProps) {
  const [progress, setProgress] = useState(100)
  const [isPaused, setIsPaused] = useState(false)
  const startTimeRef = useRef(Date.now())
  const remainingMsRef = useRef(autoDismissMs)

  const formatPrice = (amount: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency }).format(amount)

  useEffect(() => {
    if (isPaused) return

    const interval = 50
    const timer = setInterval(() => {
      remainingMsRef.current -= interval
      const pct = Math.max(0, (remainingMsRef.current / autoDismissMs) * 100)
      setProgress(pct)

      if (remainingMsRef.current <= 0) {
        clearInterval(timer)
        onDismiss()
      }
    }, interval)

    return () => clearInterval(timer)
  }, [isPaused, autoDismissMs, onDismiss])

  const isDirect = recommendation.targetSocketId && recommendation.targetSocketId !== 'ALL'

  return (
    <aside
      role="status"
      aria-live="polite"
      aria-label={`Recomendación de platillo: ${recommendation.fromUserName} recomienda ${recommendation.productName}`}
      className="fixed top-4 left-3 right-3 sm:left-auto sm:right-4 sm:w-[400px] z-[150] shadow-2xl rounded-2xl border overflow-hidden backdrop-blur-xl transition-all duration-300 animate-in slide-in-from-top-4 fade-in"
      style={{
        backgroundColor: 'color-mix(in srgb, var(--brand-surface, #18181b) 95%, transparent)',
        borderColor: 'color-mix(in srgb, var(--brand-primary, #f59e0b) 60%, transparent)',
        boxShadow: '0 12px 36px -4px color-mix(in srgb, var(--brand-primary, #f59e0b) 35%, transparent), 0 0 0 1px color-mix(in srgb, var(--brand-primary, #f59e0b) 20%, transparent)',
        color: 'var(--brand-text, #ffffff)',
      }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Barra de progreso de auto-cierre */}
      <div className="h-1 w-full bg-white/10 overflow-hidden">
        <div
          className="h-full transition-all ease-linear"
          style={{
            width: `${progress}%`,
            backgroundColor: 'var(--brand-primary, #f59e0b)',
          }}
        />
      </div>

      <div className="p-4 space-y-3">
        {/* Cabecera del Toast */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xl animate-bounce">⭐</span>
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-[var(--brand-primary)] flex items-center gap-1.5">
                <span>{isDirect ? '¡Sugerencia para ti!' : '¡Sugerencia a la mesa!'}</span>
              </p>
              <p className="text-xs text-zinc-300">
                <strong className="text-white font-bold">{recommendation.fromUserName}</strong>{' '}
                {isDirect ? 'te recomienda este platillo:' : 'recomienda a la mesa:'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-colors text-xs"
            aria-label="Cerrar sugerencia"
          >
            ✕
          </button>
        </div>

        {/* Tarjeta del Platillo Recomendado */}
        <div
          className="flex items-center gap-3 p-2.5 rounded-xl border"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--brand-surface, #18181b) 70%, var(--brand-bg, #09090b) 30%)',
            borderColor: 'color-mix(in srgb, var(--brand-surface, #18181b) 50%, var(--brand-text, #ffffff) 15%)',
          }}
        >
          {recommendation.productImageUrl ? (
            <img
              src={recommendation.productImageUrl}
              alt={recommendation.productName}
              className="w-12 h-12 rounded-lg object-cover border border-white/10 shrink-0"
            />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xl shrink-0">
              🍽️
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h4 className="text-xs sm:text-sm font-bold truncate font-heading text-white">
              {recommendation.productName}
            </h4>
            <p className="text-xs font-extrabold text-[var(--brand-primary)]">
              {formatPrice(recommendation.productPrice)}
            </p>
          </div>
        </div>

        {/* Mensaje opcional del comensal */}
        {recommendation.note && (
          <p className="text-xs text-zinc-300 italic bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg line-clamp-2">
            "{recommendation.note}"
          </p>
        )}

        {/* Botón de Acción Principal */}
        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onDismiss}
            className="px-3 py-1.5 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
          >
            Después
          </button>
          <button
            type="button"
            onClick={() => onViewProduct(recommendation)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-extrabold shadow-lg transition-all active:scale-95 cursor-pointer hover:brightness-110"
            style={{
              backgroundColor: 'var(--brand-primary, #f59e0b)',
              color: '#ffffff',
            }}
          >
            <span>👀</span>
            <span>Ver Platillo</span>
          </button>
        </div>
      </div>
    </aside>
  )
}
