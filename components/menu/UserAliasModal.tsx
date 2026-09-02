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
      <div className="relative w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-5 animate-scale-in">
        <div className="text-center space-y-1.5">
          <div className="w-14 h-14 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-2 text-amber-400">
            👥
          </div>
          <h2 className="text-lg font-black text-white leading-tight">
            ¡Bienvenido a la Mesa!
          </h2>
          <p className="text-xs text-zinc-400 leading-relaxed px-2">
            Ingresa tu nombre o apodo para colaborar en el pedido en tiempo real con la mesa.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="alias-input" className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
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
              className="w-full bg-zinc-800/80 border border-zinc-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-white placeholder-zinc-500 rounded-xl px-4 py-3 text-sm font-semibold transition-all outline-none"
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={!nameInput.trim()}
            className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-white font-bold rounded-xl shadow-lg shadow-amber-500/20 active:scale-98 transition-all disabled:opacity-50 disabled:hover:bg-amber-500 text-sm"
          >
            Unirse a la Mesa ➔
          </button>
        </form>
      </div>
    </div>
  )
}
