'use client'

import { useState } from 'react'
import { type Locale, translations } from '@/lib/i18n/menu-translations'

interface FeedbackModalProps {
  isOpen: boolean
  onClose: () => void
  restaurantId: string
  tableId?: string
  sessionId?: string
  sessionToken?: string
  customerName?: string
  userAlias?: string
  orderAmount?: number
  locale?: Locale
  onPointsEarned?: (points: number, tier: string) => void
}

export function FeedbackModal({
  isOpen,
  onClose,
  restaurantId,
  tableId,
  sessionId,
  sessionToken,
  customerName,
  userAlias,
  orderAmount = 0,
  locale = 'es',
  onPointsEarned,
}: FeedbackModalProps) {
  const t = translations[locale] || translations.es
  const effectiveSessionId = sessionId || sessionToken
  const effectiveCustomerName = customerName || userAlias || ''

  const [rating, setRating] = useState<number>(5)
  const [hoverRating, setHoverRating] = useState<number>(0)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [comment, setComment] = useState('')
  const [name, setName] = useState(effectiveCustomerName)
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Resultado del programa de lealtad
  const [loyaltyResult, setLoyaltyResult] = useState<{
    pointsAwarded: number
    totalPoints: number
    tierLabel: string
    tierBadge: string
    couponCode: string
    discountPercent: number
    description: string
  } | null>(null)

  if (!isOpen) return null

  const availableTags = [
    { id: 'delicious', label: t.tagDeliciousFood },
    { id: 'fast', label: t.tagQuickService },
    { id: 'friendly', label: t.tagFriendlyStaff },
    { id: 'atmosphere', label: t.tagGreatAtmosphere },
    { id: 'slow', label: t.tagSlowService },
    { id: 'cold', label: t.tagColdFood },
  ]

  const estimatedPoints = 50 + Math.floor((orderAmount || 0) / 1000)

  function toggleTag(tagId: string) {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      // 1. Guardar feedback
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantId,
          tableId,
          sessionId: effectiveSessionId,
          rating,
          tags: selectedTags.join(','),
          comment,
          customerName: name,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Error al enviar feedback')
        setSubmitting(false)
        return
      }

      // 2. Si el cliente colocó su teléfono, acreditar puntos en el programa de lealtad
      if (phone.trim()) {
        try {
          const loyaltyRes = await fetch('/api/loyalty', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              restaurantId,
              customerPhone: phone.trim(),
              customerName: name.trim() || null,
              customerEmail: email.trim() || null,
              orderAmount,
              rating,
              feedbackId: data.id,
            }),
          })

          const loyaltyData = await loyaltyRes.json()
          if (loyaltyRes.ok && loyaltyData.success) {
            setLoyaltyResult({
              pointsAwarded: loyaltyData.pointsAwarded,
              totalPoints: loyaltyData.member.points,
              tierLabel: loyaltyData.member.tierLabel,
              tierBadge: loyaltyData.member.tierBadge,
              couponCode: loyaltyData.rewardCoupon.code,
              discountPercent: loyaltyData.rewardCoupon.discountPercent,
              description: loyaltyData.rewardCoupon.description,
            })

            if (onPointsEarned) {
              onPointsEarned(loyaltyData.pointsAwarded, loyaltyData.member.tier)
            }
            setSubmitting(false)
            return
          }
        } catch {
          // Si falla lealtad, aún mostramos éxito del feedback
        }
      }

      // Si no proporcionó teléfono, mostrar éxito estándar
      setLoyaltyResult({
        pointsAwarded: 0,
        totalPoints: 0,
        tierLabel: 'Registrado',
        tierBadge: '⭐',
        couponCode: '',
        discountPercent: 0,
        description: '¡Gracias por ayudarnos a mejorar!',
      })
      setSubmitting(false)
    } catch {
      setError('Error de conexión con el servidor')
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-md p-6 sm:p-7 shadow-2xl space-y-5 text-white relative max-h-[92vh] overflow-y-auto">
        <button
          onClick={onClose}
          type="button"
          className="absolute top-4 right-4 text-zinc-500 hover:text-white text-lg w-8 h-8 rounded-full bg-zinc-800/60 flex items-center justify-center transition-colors cursor-pointer"
        >
          ✕
        </button>

        {loyaltyResult ? (
          /* Pantalla de Éxito & Tarjeta de Recompensas de Lealtad */
          <div className="text-center py-3 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-amber-500/20 border border-amber-500/30 text-amber-400 rounded-3xl flex items-center justify-center mx-auto text-3xl shadow-lg shadow-amber-500/20 animate-bounce">
              ⭐
            </div>

            <div>
              <h3 className="text-xl font-bold text-white">¡Gracias por tu Opinión!</h3>
              <p className="text-xs text-zinc-400 mt-1">
                Tus comentarios son fundamentales para brindarte siempre la mejor experiencia gastronómica.
              </p>
            </div>

            {loyaltyResult.couponCode && (
              <div className="p-4 rounded-2xl bg-zinc-950 border border-amber-500/40 text-left space-y-3 relative overflow-hidden shadow-inner">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 font-bold text-[10px] border border-amber-500/20">
                    🎁 CLUB DE CLIENTES FRECUENTES
                  </span>
                  <span className="text-xs font-bold text-white font-mono">
                    {loyaltyResult.tierBadge}
                  </span>
                </div>

                <div className="flex items-baseline justify-between pt-1">
                  <div>
                    <p className="text-2xl font-black text-amber-400">+{loyaltyResult.pointsAwarded} pts</p>
                    <p className="text-[11px] text-zinc-400">Puntos ganados en esta visita</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-white">{loyaltyResult.totalPoints} pts</p>
                    <p className="text-[10px] text-zinc-500">Saldo acumulado</p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1">
                  <span className="text-[10px] text-zinc-400 uppercase font-semibold">
                    Tu Cupón de Beneficio:
                  </span>
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-black text-white text-base tracking-wider">
                      {loyaltyResult.couponCode}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(loyaltyResult.couponCode)
                        alert('¡Cupón copiado al portapapeles!')
                      }}
                      className="px-2 py-1 rounded bg-amber-500/20 text-amber-400 text-[10px] font-bold hover:bg-amber-500/30 transition-colors"
                    >
                      Copiar
                    </button>
                  </div>
                  <p className="text-[10px] text-zinc-400 pt-1">
                    {loyaltyResult.description}
                  </p>
                </div>
              </div>
            )}

            <div className="pt-2">
              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs transition-colors cursor-pointer"
              >
                Cerrar y Continuar
              </button>
            </div>
          </div>
        ) : (
          /* Formulario de Calificación + Registro de Lealtad */
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="text-center space-y-1 pt-1">
              <h3 className="text-lg font-bold text-white">{t.rateTitle}</h3>
              <p className="text-xs text-zinc-400">{t.rateSubtitle}</p>
            </div>

            {/* Selector de Estrellas */}
            <div className="flex justify-center gap-2 py-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(star)}
                  className="text-3xl transition-transform hover:scale-125 focus:outline-none cursor-pointer"
                >
                  <span
                    className={
                      star <= (hoverRating || rating)
                        ? 'text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]'
                        : 'text-zinc-700'
                    }
                  >
                    ★
                  </span>
                </button>
              ))}
            </div>

            {/* Tags rápidos */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-400">{t.ratePrompt}</label>
              <div className="flex flex-wrap gap-1.5">
                {availableTags.map((tag) => {
                  const isSelected = selectedTags.includes(tag.id)
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTag(tag.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-sm'
                          : 'bg-zinc-800/60 border-zinc-700/60 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200'
                      }`}
                    >
                      {tag.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Comentario opcional */}
            <div className="space-y-1">
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={t.rateCommentsPlaceholder}
                rows={2}
                maxLength={500}
                className="w-full bg-zinc-950/60 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 transition-colors resize-none"
              />
            </div>

            {/* Sección de Lealtad & Puntos Frecuentes */}
            <div className="p-3.5 rounded-2xl bg-zinc-950/80 border border-amber-500/30 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span>🎁</span>
                  <span className="text-xs font-bold text-amber-400">
                    Gana puntos de Lealtad en tu visita
                  </span>
                </div>
                <span className="text-[10px] font-mono font-extrabold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300">
                  +{estimatedPoints} pts
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-tight">
                Ingresa tu celular para acumular puntos por tu consumo y calificación, canjeables por descuentos en tu próxima visita.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="WhatsApp / Celular *"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Tu Nombre / Apodo"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {error && (
              <p className="text-xs text-rose-400 text-center font-medium bg-rose-500/10 py-1.5 rounded-lg border border-rose-500/20">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-zinc-950 font-black text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-500/20"
            >
              {submitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                  <span>Enviando...</span>
                </>
              ) : (
                <span>Enviar Calificación & Acumular Puntos ★</span>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
