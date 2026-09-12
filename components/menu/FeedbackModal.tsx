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
  locale?: Locale
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
  locale = 'es',
}: FeedbackModalProps) {
  const t = translations[locale] || translations.es
  const effectiveSessionId = sessionId || sessionToken
  const effectiveCustomerName = customerName || userAlias || ''

  const [rating, setRating] = useState<number>(5)
  const [hoverRating, setHoverRating] = useState<number>(0)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [comment, setComment] = useState('')
  const [name, setName] = useState(effectiveCustomerName)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const availableTags = [
    { id: 'delicious', label: t.tagDeliciousFood },
    { id: 'fast', label: t.tagQuickService },
    { id: 'friendly', label: t.tagFriendlyStaff },
    { id: 'atmosphere', label: t.tagGreatAtmosphere },
    { id: 'slow', label: t.tagSlowService },
    { id: 'cold', label: t.tagColdFood },
  ]

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

      setSuccess(true)
      setTimeout(() => {
        onClose()
        setSuccess(false)
      }, 2500)
    } catch {
      setError('Error de conexión con el servidor')
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-md p-6 sm:p-7 shadow-2xl space-y-5 text-white relative">
        <button
          onClick={onClose}
          type="button"
          className="absolute top-4 right-4 text-zinc-500 hover:text-white text-lg w-8 h-8 rounded-full bg-zinc-800/60 flex items-center justify-center transition-colors"
        >
          ✕
        </button>

        {success ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 bg-amber-500/20 border border-amber-500/30 text-amber-400 rounded-3xl flex items-center justify-center mx-auto text-3xl animate-bounce">
              ✨
            </div>
            <h3 className="text-xl font-black text-white">{t.ratingSentSuccess}</h3>
            <p className="text-xs text-zinc-400 leading-relaxed max-w-xs mx-auto">
              {t.ratingSentSubtitle}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="text-center space-y-1.5 pt-2">
              <h3 className="text-xl font-bold tracking-tight text-white">{t.rateTitle}</h3>
              <p className="text-xs text-zinc-400">{t.rateSubtitle}</p>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs text-center">
                {error}
              </div>
            )}

            {/* Stars Selector */}
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => {
                  const active = (hoverRating || rating) >= star
                  return (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setRating(star)}
                      className="text-3xl sm:text-4xl transition-transform hover:scale-125 focus:outline-none cursor-pointer"
                    >
                      <span className={active ? 'text-amber-400 drop-shadow-md' : 'text-zinc-700'}>
                        ★
                      </span>
                    </button>
                  )
                })}
              </div>
              <span className="text-xs font-semibold text-amber-400/90">
                {rating === 5 && '¡Excelente! 🌟'}
                {rating === 4 && 'Muy bueno 👍'}
                {rating === 3 && 'Aceptable 😐'}
                {rating === 2 && 'Regular 👎'}
                {rating === 1 && 'Mala experiencia 🙁'}
              </span>
            </div>

            {/* Tags Chips */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block text-center">
                ¿Qué destacarías de tu visita?
              </span>
              <div className="flex flex-wrap justify-center gap-1.5">
                {availableTags.map((tag) => {
                  const isSelected = selectedTags.includes(tag.id)
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTag(tag.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-amber-500 text-zinc-950 border-amber-400 font-bold shadow-sm'
                          : 'bg-zinc-950/60 text-zinc-300 border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      {tag.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Optional Comment */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                {t.rateComments}
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={t.rateCommentsPlaceholder}
                rows={3}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-zinc-950/80 border border-zinc-800 text-white placeholder:text-zinc-600 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-black text-sm shadow-lg shadow-amber-500/20 disabled:opacity-50 transition-all cursor-pointer"
            >
              {submitting ? t.submittingRating : t.submitRating}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
