'use client'

import React, { useState } from 'react'

interface RecommendModalProps {
  product: {
    id: string
    name: string
    basePrice: number
    imageUrl?: string | null
  }
  currency?: string
  currentUserName: string
  participants: Array<{ socketId: string; userName: string }>
  onClose: () => void
  onSendRecommendation: (data: {
    targetSocketId: string | 'ALL'
    targetUserName: string
    note?: string
  }) => Promise<boolean> | boolean
}

const QUICK_NOTES = [
  '¡Tienen que probar esto!',
  '¿Pedimos uno al centro para compartir?',
  '¡Este es mi favorito de la casa!',
  '¡Se ve delicioso!',
]

export function RecommendModal({
  product,
  currency = 'MXN',
  currentUserName,
  participants,
  onClose,
  onSendRecommendation,
}: RecommendModalProps) {
  const [target, setTarget] = useState<string>('ALL') // 'ALL' o socketId
  const [note, setNote] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  // Filtrar otros participantes excluyendo al usuario actual
  const otherParticipants = participants.filter(
    (p) => p.userName.trim().toLowerCase() !== currentUserName.trim().toLowerCase()
  )

  const selectedParticipant = otherParticipants.find((p) => p.socketId === target)
  const targetUserName = target === 'ALL' ? 'A toda la mesa' : selectedParticipant?.userName || 'Comensal'

  const formatPrice = (amount: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency }).format(amount)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const ok = await onSendRecommendation({
        targetSocketId: target as string | 'ALL',
        targetUserName,
        note: note.trim() || undefined,
      })
      if (ok) {
        setIsSuccess(true)
        setTimeout(() => {
          onClose()
        }, 1200)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="recommend-modal-title"
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Container */}
      <div
        className="relative w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden border shadow-2xl animate-in fade-in zoom-in-95 duration-200"
        style={{
          backgroundColor: 'var(--brand-surface, #18181b)',
          borderColor: 'color-mix(in srgb, var(--brand-surface, #18181b) 60%, var(--brand-text, #ffffff) 15%)',
          borderRadius: 'var(--brand-radius, 1.25rem)',
          color: 'var(--brand-text, #ffffff)',
        }}
      >
        {/* Header */}
        <div
          className="px-5 py-4 border-b flex items-center justify-between"
          style={{
            borderColor: 'color-mix(in srgb, var(--brand-surface, #18181b) 75%, var(--brand-text, #ffffff) 15%)',
          }}
        >
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl flex items-center justify-center text-lg bg-[var(--brand-primary)]/15 border border-[var(--brand-primary)]/30 text-[var(--brand-primary)]">
              💡
            </span>
            <div>
              <h3 id="recommend-modal-title" className="text-base font-bold font-heading leading-tight">
                Recomendar Platillo
              </h3>
              <p className="text-xs text-zinc-400">Sugiere este item a tus acompañantes de mesa</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            aria-label="Cerrar modal"
          >
            ✕
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Tarjeta del Producto a Recomendar */}
          <div
            className="flex items-center gap-3.5 p-3 rounded-2xl border"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--brand-surface, #18181b) 80%, var(--brand-bg, #09090b) 20%)',
              borderColor: 'color-mix(in srgb, var(--brand-surface, #18181b) 60%, var(--brand-text, #ffffff) 15%)',
            }}
          >
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-14 h-14 rounded-xl object-cover border border-white/10 shrink-0"
              />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-2xl shrink-0">
                🍽️
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-bold truncate font-heading">{product.name}</h4>
              <p className="text-xs font-semibold text-[var(--brand-primary)]">
                {formatPrice(product.basePrice)}
              </p>
            </div>
          </div>

          {/* Selector de Destinatario */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-zinc-300">
              ¿A quién deseas recomendarle este plato?
            </label>

            {/* Opción 1: A toda la mesa */}
            <button
              type="button"
              onClick={() => setTarget('ALL')}
              className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                target === 'ALL'
                  ? 'bg-[var(--brand-primary)]/15 border-[var(--brand-primary)] ring-1 ring-[var(--brand-primary)]'
                  : 'bg-zinc-900/40 border-zinc-800/80 hover:bg-zinc-800/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center text-lg">
                  👥
                </span>
                <div>
                  <p className="text-sm font-bold text-white">A toda la mesa</p>
                  <p className="text-xs text-zinc-400">
                    Notificar a todos los comensales presentes
                  </p>
                </div>
              </div>
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                  target === 'ALL'
                    ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)] text-black'
                    : 'border-zinc-600'
                }`}
              >
                {target === 'ALL' && <span className="text-[10px] font-black">✓</span>}
              </div>
            </button>

            {/* Opción 2: Participantes específicos */}
            {otherParticipants.length > 0 ? (
              <div className="pt-2 space-y-2">
                <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                  O a alguien en específico de la mesa:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {otherParticipants.map((participant) => {
                    const isSelected = target === participant.socketId
                    return (
                      <button
                        key={participant.socketId}
                        type="button"
                        onClick={() => setTarget(participant.socketId)}
                        className={`flex items-center justify-between p-2.5 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'bg-[var(--brand-primary)]/15 border-[var(--brand-primary)] ring-1 ring-[var(--brand-primary)]'
                            : 'bg-zinc-900/30 border-zinc-800/60 hover:bg-zinc-800/40'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-zinc-800 text-zinc-200 border border-zinc-700 flex items-center justify-center text-xs font-bold shrink-0">
                            {participant.userName.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-xs font-bold text-zinc-200 truncate">
                            {participant.userName}
                          </span>
                        </div>
                        <div
                          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)] text-black'
                              : 'border-zinc-600'
                          }`}
                        >
                          {isSelected && <span className="text-[8px] font-black">✓</span>}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-zinc-500 italic px-1">
                💡 Eres el único comensal activo registrado con alias en este momento. La sugerencia quedará disponible para toda la mesa.
              </p>
            )}
          </div>

          {/* Notas Rápidas */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-zinc-300">
              Añade un mensaje o motivo (Opcional):
            </label>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_NOTES.map((quick) => (
                <button
                  key={quick}
                  type="button"
                  onClick={() => setNote(quick)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all ${
                    note === quick
                      ? 'bg-[var(--brand-primary)]/20 text-[var(--brand-primary)] border-[var(--brand-primary)]/40 font-semibold'
                      : 'bg-zinc-900/60 text-zinc-400 border-zinc-800 hover:text-white hover:bg-zinc-800'
                  }`}
                >
                  {quick}
                </button>
              ))}
            </div>

            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ej: ¡Este plato es perfecto para compartir o maridar con tu bebida!"
              rows={2}
              maxLength={150}
              className="w-full text-xs p-3 rounded-xl border transition-colors focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)] resize-none"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--brand-surface, #18181b) 80%, var(--brand-bg, #09090b) 20%)',
                borderColor: 'color-mix(in srgb, var(--brand-surface, #18181b) 60%, var(--brand-text, #ffffff) 15%)',
                color: 'var(--brand-text, #ffffff)',
              }}
            />
          </div>

          {/* Botones de Acción */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isSuccess}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-extrabold transition-all shadow-lg active:scale-95 disabled:opacity-50 cursor-pointer"
              style={{
                backgroundColor: isSuccess ? '#10b981' : 'var(--brand-primary, #f59e0b)',
                color: '#ffffff',
              }}
            >
              {isSuccess ? (
                <>
                  <span>✓</span>
                  <span>¡Recomendación Enviada!</span>
                </>
              ) : isSubmitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Enviando...</span>
                </>
              ) : (
                <>
                  <span>✨</span>
                  <span>Enviar Recomendación</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
