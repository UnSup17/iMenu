'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface FoodCourtListItem {
  id: string
  name: string
  slug: string
  description?: string | null
  logoUrl?: string | null
  currency: string
  isActive: boolean
  memberships: Array<{
    restaurant: {
      id: string
      name: string
      slug: string
      logoUrl?: string | null
      cuisineType?: string | null
    }
  }>
  _count: {
    tables: number
    users: number
  }
}

interface FoodCourtListClientProps {
  initialFoodCourts: FoodCourtListItem[]
  canCreate: boolean
}

export function FoodCourtListClient({ initialFoodCourts, canCreate }: FoodCourtListClientProps) {
  const router = useRouter()
  const [foodCourts, setFoodCourts] = useState<FoodCourtListItem[]>(initialFoodCourts)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [currency, setCurrency] = useState('COP')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleNameChange = (val: string) => {
    setName(val)
    if (!slug || slug === name.toLowerCase().replace(/[^a-z0-9]/g, '-')) {
      setSlug(
        val
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, ''),
      )
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/food-courts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          slug,
          description: description || undefined,
          logoUrl: logoUrl || undefined,
          currency,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al crear plaza')
      }

      const created = await res.json()
      setIsModalOpen(false)
      setName('')
      setSlug('')
      setDescription('')
      setLogoUrl('')
      router.push(`/dashboard/food-courts/${created.id}`)
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Error al crear la plaza')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <span>🏪</span> Plazas Gastronómicas
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Administra sedes compartidas donde múltiples restaurantes comparten mesas y meseros.
          </p>
        </div>

        {canCreate && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-sm transition-all transform active:scale-95 shadow-lg shadow-amber-500/20 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span>Nueva Plaza</span>
          </button>
        )}
      </div>

      {/* Grid of Food Courts */}
      {foodCourts.length === 0 ? (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-12 text-center max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-3xl flex items-center justify-center mx-auto mb-4">
            🏪
          </div>
          <h3 className="text-lg font-bold text-white mb-2">No hay plazas creadas aún</h3>
          <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
            Crea tu primera plaza gastronómica para agrupar restaurantes, compartir mesas y permitir que los comensales exploren varios menús desde un solo QR.
          </p>
          {canCreate && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm transition-all"
            >
              Crear primera plaza
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {foodCourts.map((fc) => (
            <Link
              key={fc.id}
              href={`/dashboard/food-courts/${fc.id}`}
              className="group block bg-zinc-900/80 hover:bg-zinc-800/80 border border-zinc-800 hover:border-amber-500/40 rounded-3xl p-6 transition-all duration-200 shadow-lg hover:shadow-amber-500/5"
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  {fc.logoUrl ? (
                    <img
                      src={fc.logoUrl}
                      alt=""
                      className="w-12 h-12 rounded-xl object-cover border border-zinc-700 bg-zinc-800"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 font-bold text-2xl flex items-center justify-center">
                      {fc.name.charAt(0)}
                    </div>
                  )}

                  <div>
                    <h3 className="font-extrabold text-base sm:text-lg text-white group-hover:text-amber-400 transition-colors">
                      {fc.name}
                    </h3>
                    <span className="text-xs text-zinc-500 font-mono">
                      /plaza/{fc.slug}
                    </span>
                  </div>
                </div>

                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    fc.isActive
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {fc.isActive ? 'Activa' : 'Inactiva'}
                </span>
              </div>

              {fc.description && (
                <p className="text-xs text-zinc-400 line-clamp-2 mb-4">
                  {fc.description}
                </p>
              )}

              {/* Members preview */}
              <div className="pt-4 border-t border-zinc-800/80 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-zinc-400">
                  <span className="font-bold text-white">{fc.memberships.length}</span>
                  <span>{fc.memberships.length === 1 ? 'restaurante' : 'restaurantes'}</span>
                </div>

                <div className="flex items-center gap-1.5 text-zinc-400">
                  <span className="font-bold text-white">{fc._count.tables}</span>
                  <span>{fc._count.tables === 1 ? 'mesa' : 'mesas'}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Modal Crear Plaza */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-white">Nueva Plaza Gastronómica</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Nombre de la plaza *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Mercado La Alameda"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Slug URL *</label>
                <input
                  type="text"
                  required
                  placeholder="ej. mercado-la-alameda"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-amber-500"
                />
                <span className="text-[11px] text-zinc-500 mt-1 block">
                  Se usará en los códigos QR: /plaza/{slug || '...'}
                </span>
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Descripción (opcional)</label>
                <textarea
                  rows={2}
                  placeholder="Espacio gastronómico con amplia variedad de comidas y bebidas..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3.5 py-2 text-white text-sm focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">URL del Logo (opcional)</label>
                <input
                  type="url"
                  placeholder="https://ejemplo.com/logo.png"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Moneda</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500"
                >
                  <option value="COP">COP ($)</option>
                  <option value="USD">USD ($)</option>
                  <option value="MXN">MXN ($)</option>
                  <option value="EUR">EUR (€)</option>
                </select>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-sm font-extrabold disabled:opacity-50 flex items-center gap-1.5"
                >
                  {loading && <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />}
                  <span>Guardar Plaza</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
