'use client'

import { useState, useEffect } from 'react'

interface BranchItem {
  id: string
  name: string
  slug: string
  currency: string
  isActive: boolean
  createdAt: string
  tables: { id: string; status: string }[]
  _count: {
    orders: number
    invoices: number
    users: number
  }
}

interface LimitInfo {
  allowed: boolean
  currentCount: number
  maxAllowed: number
  tier: string
}

export default function BranchesPage() {
  const [branches, setBranches] = useState<BranchItem[]>([])
  const [limitInfo, setLimitInfo] = useState<LimitInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [currency, setCurrency] = useState('COP')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchBranches = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/org/branches')
      if (!res.ok) throw new Error('Error al cargar sucursales')
      const data = await res.json()
      setBranches(data.branches)
      setLimitInfo(data.limitInfo)
    } catch (err: any) {
      console.error(err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBranches()
  }, [])

  const handleNameChange = (val: string) => {
    setName(val)
    // Auto-generar slug
    const generatedSlug = val
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
    setSlug(generatedSlug)
  }

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setCreating(true)

    try {
      const res = await fetch('/api/org/branches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, slug, currency }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al crear la sucursal')
      }

      setShowModal(false)
      setName('')
      setSlug('')
      fetchBranches()
    } catch (err: any) {
      setError(err.message || 'Error al crear la sucursal')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">📍</span>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Gestión de Sucursales
            </h1>
          </div>
          <p className="text-sm text-zinc-400 mt-1">
            Administra las diferentes sedes de tu cadena, crea nuevas ubicaciones y monitorea su capacidad.
          </p>
        </div>

        <button
          onClick={() => {
            setError(null)
            setShowModal(true)
          }}
          className="px-5 py-2.5 text-sm font-bold rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 transition flex items-center gap-2"
        >
          <span>➕</span>
          <span>Agregar Sucursal</span>
        </button>
      </div>

      {/* Banner de Capacidad según Plan */}
      {limitInfo && (
        <div className="bg-zinc-900/90 border border-zinc-800 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
              Capacidad del Plan {limitInfo.tier}
            </span>
            <p className="text-sm text-zinc-200 mt-0.5">
              Tienes <span className="font-bold text-white">{limitInfo.currentCount}</span> de{' '}
              <span className="font-bold text-white">
                {limitInfo.maxAllowed === -1 ? 'Ilimitadas' : limitInfo.maxAllowed}
              </span>{' '}
              sucursales disponibles.
            </p>
          </div>

          {!limitInfo.allowed && (
            <a
              href="/dashboard/settings/billing"
              className="px-4 py-2 text-xs font-bold rounded-lg bg-amber-500 text-zinc-950 hover:bg-amber-400 transition"
            >
              Mejorar a Plan PRO / Enterprise →
            </a>
          )}
        </div>
      )}

      {/* Tabla de Sucursales */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-300">
            <thead className="bg-zinc-950/60 text-xs uppercase text-zinc-400 border-b border-zinc-800">
              <tr>
                <th className="px-4 py-3">Nombre de Sucursal</th>
                <th className="px-4 py-3">Slug (Menú QR)</th>
                <th className="px-4 py-3 text-center">Mesas</th>
                <th className="px-4 py-3 text-center">Personal</th>
                <th className="px-4 py-3 text-center">Facturas</th>
                <th className="px-4 py-3 text-center">Estado</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-zinc-500">
                    Cargando sucursales...
                  </td>
                </tr>
              ) : branches.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-zinc-500">
                    No hay sucursales registradas.
                  </td>
                </tr>
              ) : (
                branches.map((b) => (
                  <tr key={b.id} className="hover:bg-zinc-800/40 transition">
                    <td className="px-4 py-3 font-bold text-white whitespace-nowrap">
                      {b.name}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-amber-400/90">
                      /menu/{b.slug}
                    </td>
                    <td className="px-4 py-3 text-center font-medium text-zinc-200">
                      {b.tables.length}
                    </td>
                    <td className="px-4 py-3 text-center font-medium text-zinc-200">
                      {b._count.users}
                    </td>
                    <td className="px-4 py-3 text-center font-medium text-zinc-200">
                      {b._count.invoices}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-emerald-950 text-emerald-300 border border-emerald-800/60">
                        {b.isActive ? 'Activa' : 'Pausada'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <a
                        href={`/menu/${b.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-amber-400 hover:underline mr-3"
                      >
                        Menú QR ↗
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Nueva Sucursal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>📍</span> Nueva Sucursal / Sede
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-zinc-400 hover:text-white text-lg leading-none"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="p-3 bg-red-950/60 border border-red-800 rounded-lg text-xs text-red-300">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateBranch} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">
                  Nombre de la Sede / Sucursal *
                </label>
                <input
                  type="text"
                  placeholder="Ej: Sede Chapinero, Sede Poblado"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">
                  Identificador URL (Slug) *
                </label>
                <input
                  type="text"
                  placeholder="ej: sede-chapinero"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-amber-500"
                  required
                />
                <span className="text-[11px] text-zinc-500 block mt-1">
                  URL del cliente: /menu/{slug || '...'}
                </span>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">
                  Moneda Principal
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="COP">COP ($ Pesos Colombianos)</option>
                  <option value="MXN">MXN ($ Pesos Mexicanos)</option>
                  <option value="CLP">CLP ($ Pesos Chilenos)</option>
                  <option value="USD">USD ($ Dólares)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={creating}
                  className="px-4 py-2 text-sm rounded-lg text-zinc-400 hover:text-zinc-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 text-sm font-bold rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 transition disabled:opacity-50"
                >
                  {creating ? 'Creando Sede...' : 'Crear Sucursal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
