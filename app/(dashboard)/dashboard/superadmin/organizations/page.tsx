'use client'

import { useState, useEffect } from 'react'
import { PlanTier } from '@prisma/client'

interface OrganizationItem {
  id: string
  name: string
  slug: string
  plan: PlanTier
  createdAt: string
  restaurants: { id: string; name: string; slug: string; isActive: boolean }[]
  subscription: {
    id: string
    tier: PlanTier
    status: string
    currentPeriodEnd: string
  } | null
  _count: {
    users: number
    restaurants: number
  }
}

export default function SuperadminOrganizationsPage() {
  const [organizations, setOrganizations] = useState<OrganizationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchOrganizations = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/superadmin/organizations')
      if (!res.ok) throw new Error('Error al cargar organizaciones')
      const data = await res.json()
      setOrganizations(data)
    } catch (err: any) {
      console.error(err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrganizations()
  }, [])

  const handlePlanChange = async (orgId: string, newPlan: PlanTier) => {
    setUpdatingId(orgId)
    setError(null)
    setMessage(null)

    try {
      const res = await fetch('/api/superadmin/organizations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: orgId, plan: newPlan }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al actualizar plan')
      }

      setMessage(`Plan de la organización actualizado a ${newPlan}`)
      fetchOrganizations()
    } catch (err: any) {
      setError(err.message || 'Error al modificar la organización')
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="border-b border-zinc-800/80 pb-6">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🏢</span>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Superadmin — Gestión de Organizaciones SaaS
          </h1>
        </div>
        <p className="text-sm text-zinc-400 mt-1">
          Administración directa de cuentas de clientes gastronómicos, asignación de planes y monitoreo de sucursales.
        </p>
      </div>

      {message && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-800 rounded-xl text-xs font-medium text-emerald-300">
          {message}
        </div>
      )}
      {error && (
        <div className="p-3 bg-red-950/80 border border-red-800 rounded-xl text-xs font-medium text-red-300">
          {error}
        </div>
      )}

      {/* Tabla de Organizaciones */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
          <h2 className="text-sm font-bold text-white">Todas las Organizaciones</h2>
          <span className="text-xs text-zinc-500">{organizations.length} cuentas registradas</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-300">
            <thead className="bg-zinc-950/60 text-xs uppercase text-zinc-400 border-b border-zinc-800">
              <tr>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Slug</th>
                <th className="px-4 py-3 text-center">Sucursales</th>
                <th className="px-4 py-3 text-center">Usuarios</th>
                <th className="px-4 py-3 text-center">Estado</th>
                <th className="px-4 py-3 text-right">Plan Asignado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">
                    Cargando cuentas...
                  </td>
                </tr>
              ) : organizations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">
                    No hay organizaciones registradas en la plataforma.
                  </td>
                </tr>
              ) : (
                organizations.map((org) => (
                  <tr key={org.id} className="hover:bg-zinc-800/40 transition">
                    <td className="px-4 py-3 font-bold text-white">
                      <div>{org.name}</div>
                      <span className="text-[10px] text-zinc-500">ID: {org.id.slice(0, 8)}...</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-zinc-400">{org.slug}</td>
                    <td className="px-4 py-3 text-center font-semibold text-zinc-200">
                      {org.restaurants.length}
                    </td>
                    <td className="px-4 py-3 text-center font-semibold text-zinc-200">
                      {org._count.users}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-emerald-950 text-emerald-300 border border-emerald-800/60">
                        {org.subscription?.status || 'Active'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <select
                        value={org.plan}
                        disabled={updatingId === org.id}
                        onChange={(e) => handlePlanChange(org.id, e.target.value as PlanTier)}
                        className="bg-zinc-950 border border-zinc-700 rounded-lg px-2.5 py-1 text-xs font-bold text-amber-400 focus:outline-none focus:border-amber-500"
                      >
                        <option value="BASIC">BASIC</option>
                        <option value="PRO">PRO</option>
                        <option value="ENTERPRISE">ENTERPRISE</option>
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
