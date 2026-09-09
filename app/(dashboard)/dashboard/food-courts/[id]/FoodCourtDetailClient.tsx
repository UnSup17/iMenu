'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  FoodCourtStaffTables,
  type FoodCourtTableItem,
} from '@/components/food-court/FoodCourtStaffTables'

interface RestaurantOption {
  id: string
  name: string
  slug: string
  logoUrl?: string | null
  cuisineType?: string | null
}

interface MembershipItem {
  id: string
  restaurantId: string
  orderIndex: number
  isActive: boolean
  restaurant: RestaurantOption
}

interface FoodCourtDetail {
  id: string
  name: string
  slug: string
  description?: string | null
  logoUrl?: string | null
  currency: string
  isActive: boolean
  memberships: MembershipItem[]
  tables: FoodCourtTableItem[]
}

interface FoodCourtDetailClientProps {
  foodCourt: FoodCourtDetail
  availableRestaurants: RestaurantOption[]
  canManage: boolean
}

export function FoodCourtDetailClient({
  foodCourt,
  availableRestaurants,
  canManage,
}: FoodCourtDetailClientProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'members' | 'tables' | 'settings'>('tables')

  // Membership state
  const [selectedRestaurantId, setSelectedRestaurantId] = useState('')
  const [isAddingMember, setIsAddingMember] = useState(false)
  const [memberError, setMemberError] = useState<string | null>(null)

  // Settings state
  const [name, setName] = useState(foodCourt.name)
  const [slug, setSlug] = useState(foodCourt.slug)
  const [description, setDescription] = useState(foodCourt.description || '')
  const [logoUrl, setLogoUrl] = useState(foodCourt.logoUrl || '')
  const [currency, setCurrency] = useState(foodCourt.currency)
  const [isActive, setIsActive] = useState(foodCourt.isActive)
  const [isSavingSettings, setIsSavingSettings] = useState(false)
  const [settingsSuccess, setSettingsSuccess] = useState(false)

  // Add member
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedRestaurantId) return
    setIsAddingMember(true)
    setMemberError(null)

    try {
      const res = await fetch(`/api/food-courts/${foodCourt.id}/memberships`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurantId: selectedRestaurantId }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al agregar restaurante')
      }

      setSelectedRestaurantId('')
      router.refresh()
    } catch (err: any) {
      setMemberError(err.message)
    } finally {
      setIsAddingMember(false)
    }
  }

  // Remove member
  const handleRemoveMember = async (restaurantId: string) => {
    if (!confirm('¿Deseas remover este restaurante de la plaza?')) return

    try {
      const res = await fetch(
        `/api/food-courts/${foodCourt.id}/memberships?restaurantId=${restaurantId}`,
        { method: 'DELETE' },
      )
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error)
      }
      router.refresh()
    } catch (err: any) {
      alert(err.message || 'Error al remover')
    }
  }

  // Move member up/down
  const handleMoveMember = async (index: number, direction: 'up' | 'down') => {
    const newMembers = [...foodCourt.memberships]
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= newMembers.length) return

    const temp = newMembers[index]
    newMembers[index] = newMembers[targetIndex]
    newMembers[targetIndex] = temp

    const reordered = newMembers.map((m, idx) => ({
      restaurantId: m.restaurantId,
      orderIndex: idx,
    }))

    try {
      await fetch(`/api/food-courts/${foodCourt.id}/memberships`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberships: reordered }),
      })
      router.refresh()
    } catch (e) {
      console.error(e)
    }
  }



  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSavingSettings(true)
    setSettingsSuccess(false)

    try {
      const res = await fetch(`/api/food-courts/${foodCourt.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          slug,
          description,
          logoUrl: logoUrl || null,
          currency,
          isActive,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al guardar configuración')
      }

      setSettingsSuccess(true)
      router.refresh()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setIsSavingSettings(false)
    }
  }

  // Restaurants not yet in the food court
  const existingRestaurantIds = new Set(foodCourt.memberships.map((m) => m.restaurantId))
  const eligibleRestaurants = availableRestaurants.filter((r) => !existingRestaurantIds.has(r.id))

  return (
    <div className="space-y-6">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center gap-2 text-xs text-zinc-400">
        <Link href="/dashboard/food-courts" className="hover:text-amber-400 transition-colors">
          Plazas Gastronómicas
        </Link>
        <span>›</span>
        <span className="text-white font-semibold">{foodCourt.name}</span>
      </div>

      {/* Main Header Card */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          {foodCourt.logoUrl ? (
            <img
              src={foodCourt.logoUrl}
              alt=""
              className="w-16 h-16 rounded-2xl object-cover border border-zinc-700 bg-zinc-800 shrink-0"
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400 font-black text-3xl flex items-center justify-center shrink-0">
              🏪
            </div>
          )}

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {foodCourt.name}
              </h1>
              <span
                className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                  foodCourt.isActive
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-zinc-800 text-zinc-400'
                }`}
              >
                {foodCourt.isActive ? 'Activa' : 'Inactiva'}
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Ruta del QR: <span className="font-mono text-amber-400">/plaza/{foodCourt.slug}/[mesaId]</span>
            </p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="flex items-center gap-4 text-xs">
          <div className="bg-zinc-950/60 border border-zinc-800 rounded-2xl px-4 py-2.5 text-center">
            <span className="text-lg font-black text-white block">{foodCourt.memberships.length}</span>
            <span className="text-zinc-500">Restaurantes</span>
          </div>
          <div className="bg-zinc-950/60 border border-zinc-800 rounded-2xl px-4 py-2.5 text-center">
            <span className="text-lg font-black text-white block">{foodCourt.tables.length}</span>
            <span className="text-zinc-500">Mesas</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-800 gap-6 text-sm font-bold">
        <button
          onClick={() => setActiveTab('members')}
          className={`pb-3 transition-colors border-b-2 ${
            activeTab === 'members'
              ? 'border-amber-400 text-amber-400'
              : 'border-transparent text-zinc-400 hover:text-white'
          }`}
        >
          🍽️ Restaurantes Miembros ({foodCourt.memberships.length})
        </button>
        <button
          onClick={() => setActiveTab('tables')}
          className={`pb-3 transition-colors border-b-2 ${
            activeTab === 'tables'
              ? 'border-amber-400 text-amber-400'
              : 'border-transparent text-zinc-400 hover:text-white'
          }`}
        >
          🪑 Mesas & Códigos QR ({foodCourt.tables.length})
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`pb-3 transition-colors border-b-2 ${
            activeTab === 'settings'
              ? 'border-amber-400 text-amber-400'
              : 'border-transparent text-zinc-400 hover:text-white'
          }`}
        >
          ⚙️ Configuración
        </button>
      </div>

      {/* Tab 1: Memberships */}
      {activeTab === 'members' && (
        <div className="space-y-6">
          {canManage && eligibleRestaurants.length > 0 && (
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-5">
              <h3 className="text-sm font-bold text-white mb-2">Agregar restaurante a esta plaza</h3>
              {memberError && (
                <div className="p-2 mb-3 rounded-lg bg-red-500/10 text-red-400 text-xs">
                  {memberError}
                </div>
              )}
              <form onSubmit={handleAddMember} className="flex flex-col sm:flex-row gap-3">
                <select
                  value={selectedRestaurantId}
                  onChange={(e) => setSelectedRestaurantId(e.target.value)}
                  className="flex-1 bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-2.5 text-white text-xs focus:outline-none focus:border-amber-500"
                >
                  <option value="">Selecciona un restaurante de la organización...</option>
                  {eligibleRestaurants.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} {r.cuisineType ? `(${r.cuisineType})` : ''}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  disabled={!selectedRestaurantId || isAddingMember}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs transition-all disabled:opacity-50"
                >
                  {isAddingMember ? 'Agregando...' : '+ Agregar a la plaza'}
                </button>
              </form>
            </div>
          )}

          {foodCourt.memberships.length === 0 ? (
            <div className="text-center py-12 text-zinc-500 text-sm bg-zinc-900/30 rounded-3xl border border-zinc-800/60">
              Esta plaza no tiene restaurantes asociados aún.
            </div>
          ) : (
            <div className="space-y-3">
              {foodCourt.memberships.map((m, idx) => (
                <div
                  key={m.id}
                  className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 flex items-center justify-between gap-4 transition-all hover:border-zinc-700"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-bold text-zinc-500 w-6">
                      #{idx + 1}
                    </span>
                    {m.restaurant.logoUrl ? (
                      <img
                        src={m.restaurant.logoUrl}
                        alt=""
                        className="w-10 h-10 rounded-xl object-cover border border-zinc-700"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 font-bold flex items-center justify-center">
                        {m.restaurant.name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <h4 className="font-extrabold text-sm text-white">{m.restaurant.name}</h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-zinc-400">/{m.restaurant.slug}</span>
                        {m.restaurant.cuisineType && (
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300">
                            {m.restaurant.cuisineType}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {canManage && (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleMoveMember(idx, 'up')}
                        disabled={idx === 0}
                        title="Mover arriba en el mosaico"
                        className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 disabled:opacity-30"
                      >
                        ▲
                      </button>
                      <button
                        onClick={() => handleMoveMember(idx, 'down')}
                        disabled={idx === foodCourt.memberships.length - 1}
                        title="Mover abajo en el mosaico"
                        className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 disabled:opacity-30"
                      >
                        ▼
                      </button>
                      <button
                        onClick={() => handleRemoveMember(m.restaurantId)}
                        title="Remover restaurante"
                        className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 ml-2"
                      >
                        🗑️
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Tables & QRs & Real-time Staff Checklist */}
      {activeTab === 'tables' && (
        <FoodCourtStaffTables
          foodCourtId={foodCourt.id}
          foodCourtSlug={foodCourt.slug}
          initialTables={foodCourt.tables}
          canManage={canManage}
          currency={foodCourt.currency}
        />
      )}

      {/* Tab 3: Settings */}
      {activeTab === 'settings' && (
        <form onSubmit={handleSaveSettings} className="bg-zinc-900/80 border border-zinc-800 rounded-3xl p-6 max-w-xl space-y-4 text-xs">
          {settingsSuccess && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold">
              ✓ Configuración actualizada correctamente
            </div>
          )}

          <div>
            <label className="block text-zinc-300 font-semibold mb-1">Nombre</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-white text-sm"
            />
          </div>

          <div>
            <label className="block text-zinc-300 font-semibold mb-1">Slug URL</label>
            <input
              type="text"
              required
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-white text-sm font-mono"
            />
          </div>

          <div>
            <label className="block text-zinc-300 font-semibold mb-1">Descripción</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-white text-sm"
            />
          </div>

          <div>
            <label className="block text-zinc-300 font-semibold mb-1">URL del Logo</label>
            <input
              type="url"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-white text-sm"
            />
          </div>

          <div>
            <label className="block text-zinc-300 font-semibold mb-1">Moneda</label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-white text-sm"
            >
              <option value="COP">COP ($)</option>
              <option value="USD">USD ($)</option>
              <option value="MXN">MXN ($)</option>
              <option value="EUR">EUR (€)</option>
            </select>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="isActive"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 rounded text-amber-500"
            />
            <label htmlFor="isActive" className="text-zinc-300 font-semibold">
              Plaza activa (comensales pueden ingresar a ver los menús)
            </label>
          </div>

          {canManage && (
            <div className="pt-4">
              <button
                type="submit"
                disabled={isSavingSettings}
                className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-sm disabled:opacity-50"
              >
                {isSavingSettings ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          )}
        </form>
      )}
    </div>
  )
}
