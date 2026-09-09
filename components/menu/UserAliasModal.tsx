'use client'

import { useState } from 'react'

interface UserAliasModalProps {
  isOpen: boolean
  currentAlias: string
  onSave: (alias: string) => void
  onClose?: () => void
}

export function UserAliasModal({
  isOpen,
  currentAlias,
  onSave,
  onClose,
}: UserAliasModalProps) {
  const [nameInput, setNameInput] = useState(currentAlias)

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = nameInput.trim()
    if (!trimmed) return
    onSave(trimmed)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />

      {/* Modal */}
      <div
        className="relative w-full max-w-sm border p-6 shadow-2xl space-y-5 animate-scale-in"
        style={{
          backgroundColor: 'var(--brand-surface)',
          borderColor: 'color-mix(in srgb, var(--brand-surface) 60%, var(--brand-text) 15%)',
          borderRadius: 'var(--brand-radius)',
        }}
      >
        <div className="text-center space-y-1.5">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-2 border"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--brand-primary) 15%, transparent)',
              borderColor: 'color-mix(in srgb, var(--brand-primary) 35%, transparent)',
              color: 'var(--brand-primary)',
            }}
          >
            👥
          </div>
          <h2
            className="text-lg font-black leading-tight"
            style={{
              color: 'var(--brand-text)',
              fontFamily: 'var(--brand-font-heading)',
            }}
          >
            ¡Bienvenido a la Mesa!
          </h2>
          <p
            className="text-xs leading-relaxed px-2"
            style={{ color: 'var(--brand-muted)' }}
          >
            Ingresa tu nombre o apodo para colaborar en el pedido en tiempo real con la mesa.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="alias-input"
              className="block text-[11px] font-bold uppercase tracking-wider mb-1.5"
              style={{ color: 'var(--brand-muted)' }}
            >
              Tu Nombre / Apodo
            </label>
            <input
              id="alias-input"
              type="text"
              required
              maxLength={20}
              placeholder="Ej. Zapata, Juan Diego, Daniel..."
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              className="w-full border rounded-xl px-4 py-3 text-sm font-semibold transition-all outline-none"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--brand-surface) 75%, var(--brand-bg) 25%)',
                borderColor: 'color-mix(in srgb, var(--brand-surface) 60%, var(--brand-text) 15%)',
                color: 'var(--brand-text)',
              }}
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={!nameInput.trim()}
            className="w-full py-3.5 font-bold shadow-lg active:scale-98 transition-all disabled:opacity-50 text-sm cursor-pointer"
            style={{
              backgroundColor: 'var(--brand-primary)',
              color: '#ffffff',
              borderRadius: 'calc(var(--brand-radius) * 0.7)',
            }}
          >
            Unirse a la Mesa ➔
          </button>
        </form>
      </div>
    </div>
  )
}
