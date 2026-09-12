'use client'

import React, { useState, useEffect } from 'react'
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
  commissionPercentage?: number
  commissionFixedFee?: number
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

interface VendorReportItem {
  membershipId: string
  restaurantId: string
  restaurantName: string
  restaurantSlug: string
  restaurantLogo?: string | null
  cuisineType?: string | null
  commissionPercentage: number
  commissionFixedFee: number
  grossSales: number
  ordersCount: number
  commissionAmount: number
  netPayout: number
  averageTicket: number
}

interface ReportKPIs {
  totalGrossSales: number
  totalOrders: number
  avgTicket: number
  totalFoodCourtCommissions: number
  totalNetPayout: number
  activeSessionsCount: number
  totalSessionsCount: number
  tablesCount: number
}

interface RecentOrderReport {
  id: string
  orderNumber: string
  restaurantId: string
  restaurantName: string
  restaurantLogo?: string | null
  tableNumber: number
  status: string
  totalAmount: number
  itemsCount: number
  createdAt: string
  itemSummary: string
}

interface ReportsData {
  timeframe: string
  kpis: ReportKPIs
  vendors: VendorReportItem[]
  recentOrders: RecentOrderReport[]
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
  const [activeTab, setActiveTab] = useState<'tables' | 'reports' | 'commissions' | 'members' | 'settings'>('tables')

  // Membership state
  const [selectedRestaurantId, setSelectedRestaurantId] = useState('')
  const [isAddingMember, setIsAddingMember] = useState(false)
  const [memberError, setMemberError] = useState<string | null>(null)

  // Reports state
  const [reportTimeframe, setReportTimeframe] = useState<'today' | '7d' | '30d' | 'all'>('30d')
  const [reportsData, setReportsData] = useState<ReportsData | null>(null)
  const [isLoadingReports, setIsLoadingReports] = useState(false)
  const [reportsError, setReportsError] = useState<string | null>(null)

  // Commission editing state
  const [editingCommissions, setEditingCommissions] = useState<Record<string, { pct: number; fee: number }>>(() => {
    const map: Record<string, { pct: number; fee: number }> = {}
    for (const m of foodCourt.memberships) {
      map[m.restaurantId] = {
        pct: m.commissionPercentage ?? 0,
        fee: m.commissionFixedFee ?? 0,
      }
    }
    return map
  })
  const [savingCommissionFor, setSavingCommissionFor] = useState<string | null>(null)
  const [commissionToast, setCommissionToast] = useState<string | null>(null)
  const [selectedVendorStatement, setSelectedVendorStatement] = useState<VendorReportItem | null>(null)

  // Settings state
  const [name, setName] = useState(foodCourt.name)
  const [slug, setSlug] = useState(foodCourt.slug)
  const [description, setDescription] = useState(foodCourt.description || '')
  const [logoUrl, setLogoUrl] = useState(foodCourt.logoUrl || '')
  const [currency, setCurrency] = useState(foodCourt.currency)
  const [isActive, setIsActive] = useState(foodCourt.isActive)
  const [isSavingSettings, setIsSavingSettings] = useState(false)
  const [settingsSuccess, setSettingsSuccess] = useState(false)

  const formatPrice = (amount: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: foodCourt.currency || 'MXN' }).format(amount)

  // Fetch consolidated reports
  const fetchReports = async (timeframe: string) => {
    setIsLoadingReports(true)
    setReportsError(null)
    try {
      const res = await fetch(`/api/food-courts/${foodCourt.id}/reports?timeframe=${timeframe}`)
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al cargar reportes consolidados')
      }
      const data = await res.json()
      setReportsData(data)
    } catch (err: any) {
      setReportsError(err.message)
    } finally {
      setIsLoadingReports(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'reports' || activeTab === 'commissions') {
      fetchReports(reportTimeframe)
    }
  }, [activeTab, reportTimeframe])

  // Save Commission for a vendor
  const handleSaveCommission = async (restaurantId: string) => {
    const values = editingCommissions[restaurantId]
    if (!values) return

    setSavingCommissionFor(restaurantId)
    setCommissionToast(null)
    try {
      const res = await fetch(`/api/food-courts/${foodCourt.id}/memberships`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantId,
          commissionPercentage: values.pct,
          commissionFixedFee: values.fee,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al guardar comisiones')
      }

      setCommissionToast(`Comisiones actualizadas exitosamente`)
      setTimeout(() => setCommissionToast(null), 4000)
      fetchReports(reportTimeframe)
      router.refresh()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSavingCommissionFor(null)
    }
  }

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
      <div className="flex overflow-x-auto border-b border-zinc-800 gap-2 sm:gap-6 text-xs sm:text-sm font-bold scrollbar-none">
        <button
          onClick={() => setActiveTab('tables')}
          className={`pb-3 transition-colors border-b-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'tables'
              ? 'border-amber-400 text-amber-400'
              : 'border-transparent text-zinc-400 hover:text-white'
          }`}
        >
          🪑 Mesas en Vivo ({foodCourt.tables.length})
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`pb-3 transition-colors border-b-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'reports'
              ? 'border-amber-400 text-amber-400'
              : 'border-transparent text-zinc-400 hover:text-white'
          }`}
        >
          📊 Dashboard Consolidado
        </button>
        <button
          onClick={() => setActiveTab('commissions')}
          className={`pb-3 transition-colors border-b-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'commissions'
              ? 'border-amber-400 text-amber-400'
              : 'border-transparent text-zinc-400 hover:text-white'
          }`}
        >
          💰 Comisiones & Liquidación
        </button>
        <button
          onClick={() => setActiveTab('members')}
          className={`pb-3 transition-colors border-b-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'members'
              ? 'border-amber-400 text-amber-400'
              : 'border-transparent text-zinc-400 hover:text-white'
          }`}
        >
          🍽️ Locales ({foodCourt.memberships.length})
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`pb-3 transition-colors border-b-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'settings'
              ? 'border-amber-400 text-amber-400'
              : 'border-transparent text-zinc-400 hover:text-white'
          }`}
        >
          ⚙️ Configuración
        </button>
      </div>

      {/* ============================================================ */}
      {/* TAB 1: Real-time Staff Checklist & Tables                     */}
      {/* ============================================================ */}
      {activeTab === 'tables' && (
        <FoodCourtStaffTables
          foodCourtId={foodCourt.id}
          foodCourtSlug={foodCourt.slug}
          initialTables={foodCourt.tables}
          canManage={canManage}
          currency={foodCourt.currency}
        />
      )}

      {/* ============================================================ */}
      {/* TAB 2: Consolidated Reports & Dashboard                      */}
      {/* ============================================================ */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          {/* Header & Timeframe Filter */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-white">Dashboard Operativo de Plaza</h2>
              <p className="text-xs text-zinc-400">
                Métricas acumuladas de todos los restaurantes y mesas de la plaza
              </p>
            </div>

            <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 p-1 rounded-xl">
              {(
                [
                  { id: 'today', label: 'Hoy' },
                  { id: '7d', label: '7 Días' },
                  { id: '30d', label: '30 Días' },
                  { id: 'all', label: 'Histórico' },
                ] as const
              ).map((tf) => (
                <button
                  key={tf.id}
                  onClick={() => setReportTimeframe(tf.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    reportTimeframe === tf.id
                      ? 'bg-amber-500 text-black shadow-md'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {tf.label}
                </button>
              ))}
            </div>
          </div>

          {reportsError && (
            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
              {reportsError}
            </div>
          )}

          {isLoadingReports ? (
            <div className="py-16 text-center text-zinc-500 space-y-3">
              <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs">Cargando métricas consolidadas...</p>
            </div>
          ) : reportsData ? (
            <>
              {/* Primary KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-5 shadow-lg">
                  <div className="flex items-center justify-between text-zinc-400 text-xs mb-2">
                    <span>Ventas Brutas Plaza</span>
                    <span className="text-base">💰</span>
                  </div>
                  <p className="text-2xl font-black text-white">
                    {formatPrice(reportsData.kpis.totalGrossSales)}
                  </p>
                  <p className="text-[11px] text-zinc-500 mt-1">
                    Volumen total facturado en mesas
                  </p>
                </div>

                <div className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-5 shadow-lg">
                  <div className="flex items-center justify-between text-zinc-400 text-xs mb-2">
                    <span>Comisiones de Operador</span>
                    <span className="text-base">🏢</span>
                  </div>
                  <p className="text-2xl font-black text-amber-400">
                    {formatPrice(reportsData.kpis.totalFoodCourtCommissions)}
                  </p>
                  <p className="text-[11px] text-zinc-500 mt-1">
                    Ingresos retenidos para la plaza
                  </p>
                </div>

                <div className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-5 shadow-lg">
                  <div className="flex items-center justify-between text-zinc-400 text-xs mb-2">
                    <span>Pedidos Totales</span>
                    <span className="text-base">🧾</span>
                  </div>
                  <p className="text-2xl font-black text-white">
                    {reportsData.kpis.totalOrders}
                  </p>
                  <p className="text-[11px] text-emerald-400 mt-1 font-semibold">
                    Ticket Prom: {formatPrice(reportsData.kpis.avgTicket)}
                  </p>
                </div>

                <div className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-5 shadow-lg">
                  <div className="flex items-center justify-between text-zinc-400 text-xs mb-2">
                    <span>Rotación de Mesas</span>
                    <span className="text-base">🔄</span>
                  </div>
                  <p className="text-2xl font-black text-white">
                    {reportsData.kpis.activeSessionsCount} / {reportsData.kpis.tablesCount}
                  </p>
                  <p className="text-[11px] text-zinc-400 mt-1">
                    {reportsData.kpis.totalSessionsCount} sesiones iniciadas
                  </p>
                </div>
              </div>

              {/* Vendor Leaderboard (Ranking de Locales) */}
              <div className="bg-zinc-900/80 border border-zinc-800 rounded-3xl p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>🏆</span>
                      <span>Ranking de Ventas por Restaurante</span>
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Participación de mercado y desempeño dentro del food court
                    </p>
                  </div>
                  <span className="text-xs text-zinc-500">
                    {reportsData.vendors.length} locales
                  </span>
                </div>

                <div className="space-y-3">
                  {reportsData.vendors.map((v, idx) => {
                    const share =
                      reportsData.kpis.totalGrossSales > 0
                        ? (v.grossSales / reportsData.kpis.totalGrossSales) * 100
                        : 0

                    return (
                      <div
                        key={v.restaurantId}
                        className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-4 transition-all hover:border-zinc-700"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <span
                              className={`w-6 h-6 rounded-full text-xs font-black flex items-center justify-center shrink-0 ${
                                idx === 0
                                  ? 'bg-amber-400 text-black'
                                  : idx === 1
                                  ? 'bg-zinc-300 text-black'
                                  : idx === 2
                                  ? 'bg-amber-700 text-white'
                                  : 'bg-zinc-800 text-zinc-400'
                              }`}
                            >
                              {idx + 1}
                            </span>
                            {v.restaurantLogo ? (
                              <img
                                src={v.restaurantLogo}
                                alt=""
                                className="w-9 h-9 rounded-xl object-cover bg-zinc-800 shrink-0"
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-xl bg-zinc-800 flex items-center justify-center text-base shrink-0">
                                🍽️
                              </div>
                            )}
                            <div className="min-w-0">
                              <h4 className="text-xs font-bold text-white truncate">
                                {v.restaurantName}
                              </h4>
                              <p className="text-[10px] text-zinc-400">
                                {v.ordersCount} pedidos • Ticket prom: {formatPrice(v.averageTicket)}
                              </p>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-xs sm:text-sm font-black text-white">
                              {formatPrice(v.grossSales)}
                            </span>
                            <span className="text-[10px] text-amber-400 block font-bold">
                              {share.toFixed(1)}% del total
                            </span>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-zinc-800/80 rounded-full h-1.5 mt-3 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-amber-500 to-amber-300 h-1.5 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, Math.max(2, share))}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Recent Orders in Food Court */}
              <div className="bg-zinc-900/80 border border-zinc-800 rounded-3xl p-6 shadow-xl space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>🕒</span>
                  <span>Últimas Órdenes en la Plaza</span>
                </h3>

                {reportsData.recentOrders.length === 0 ? (
                  <p className="text-xs text-zinc-500 py-6 text-center">
                    No hay pedidos registrados en este período.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-zinc-800 text-zinc-500">
                          <th className="pb-2 font-semibold">Orden</th>
                          <th className="pb-2 font-semibold">Mesa</th>
                          <th className="pb-2 font-semibold">Restaurante</th>
                          <th className="pb-2 font-semibold">Platillos</th>
                          <th className="pb-2 font-semibold">Total</th>
                          <th className="pb-2 font-semibold">Estado</th>
                          <th className="pb-2 font-semibold">Fecha / Hora</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/50">
                        {reportsData.recentOrders.map((o) => (
                          <tr key={o.id} className="hover:bg-zinc-800/30">
                            <td className="py-2.5 font-mono text-zinc-400">#{o.orderNumber}</td>
                            <td className="py-2.5 font-bold text-amber-400">Mesa {o.tableNumber}</td>
                            <td className="py-2.5 text-white font-medium">{o.restaurantName}</td>
                            <td className="py-2.5 text-zinc-400 max-w-xs truncate">{o.itemSummary}</td>
                            <td className="py-2.5 font-black text-white">{formatPrice(o.totalAmount)}</td>
                            <td className="py-2.5">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  o.status === 'DELIVERED'
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                    : o.status === 'READY'
                                    ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                    : o.status === 'PREPARING'
                                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                    : 'bg-zinc-800 text-zinc-400'
                                }`}
                              >
                                {o.status}
                              </span>
                            </td>
                            <td className="py-2.5 text-zinc-500">
                              {new Date(o.createdAt).toLocaleTimeString('es-MX', {
                                hour: '2-digit',
                                minute: '2-digit',
                                day: '2-digit',
                                month: 'short',
                              })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 3: Commissions & Settlements (Liquidaciones)             */}
      {/* ============================================================ */}
      {activeTab === 'commissions' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-white">Gestión de Comisiones & Liquidaciones</h2>
              <p className="text-xs text-zinc-400">
                Define el porcentaje o cuota fija por pedido para cada restaurante y calcula el balance neto a liquidar
              </p>
            </div>

            <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 p-1 rounded-xl">
              {(
                [
                  { id: 'today', label: 'Hoy' },
                  { id: '7d', label: '7 Días' },
                  { id: '30d', label: '30 Días' },
                  { id: 'all', label: 'Histórico' },
                ] as const
              ).map((tf) => (
                <button
                  key={tf.id}
                  onClick={() => setReportTimeframe(tf.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    reportTimeframe === tf.id
                      ? 'bg-amber-500 text-black shadow-md'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {tf.label}
                </button>
              ))}
            </div>
          </div>

          {commissionToast && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-2">
              <span>✓</span>
              <span>{commissionToast}</span>
            </div>
          )}

          {reportsData && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-zinc-900/80 border border-zinc-800 rounded-3xl p-5">
                <span className="text-xs text-zinc-400 block mb-1">Total Facturado</span>
                <span className="text-xl font-black text-white">
                  {formatPrice(reportsData.kpis.totalGrossSales)}
                </span>
              </div>
              <div className="bg-zinc-900/80 border border-zinc-800 rounded-3xl p-5">
                <span className="text-xs text-amber-400 font-semibold block mb-1">
                  Retención Comisiones Plaza
                </span>
                <span className="text-xl font-black text-amber-400">
                  {formatPrice(reportsData.kpis.totalFoodCourtCommissions)}
                </span>
              </div>
              <div className="bg-zinc-900/80 border border-zinc-800 rounded-3xl p-5">
                <span className="text-xs text-emerald-400 font-semibold block mb-1">
                  Saldo Neto a Liquidar a Locales
                </span>
                <span className="text-xl font-black text-emerald-400">
                  {formatPrice(reportsData.kpis.totalNetPayout)}
                </span>
              </div>
            </div>
          )}

          {/* Member Commission & Settlement Table */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-3xl p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white">Parámetros de Comisión por Local</h3>

            <div className="space-y-4">
              {foodCourt.memberships.map((m) => {
                const reportVendor = reportsData?.vendors.find((v) => v.restaurantId === m.restaurantId)
                const editing = editingCommissions[m.restaurantId] || {
                  pct: m.commissionPercentage ?? 0,
                  fee: m.commissionFixedFee ?? 0,
                }
                const isSaving = savingCommissionFor === m.restaurantId

                return (
                  <div
                    key={m.id}
                    className="bg-zinc-950/60 border border-zinc-800 rounded-2xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                  >
                    {/* Restaurant Info */}
                    <div className="flex items-center gap-3 min-w-[220px]">
                      {m.restaurant.logoUrl ? (
                        <img
                          src={m.restaurant.logoUrl}
                          alt=""
                          className="w-11 h-11 rounded-xl object-cover bg-zinc-800 shrink-0"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-xl bg-zinc-800 flex items-center justify-center text-lg shrink-0">
                          🍽️
                        </div>
                      )}
                      <div>
                        <h4 className="text-xs font-bold text-white">{m.restaurant.name}</h4>
                        <p className="text-[10px] text-zinc-400">
                          {m.restaurant.cuisineType || 'Comida'}
                        </p>
                      </div>
                    </div>

                    {/* Commission Configuration Inputs */}
                    <div className="flex flex-wrap items-center gap-3">
                      <div>
                        <label className="block text-[10px] text-zinc-400 font-medium mb-1">
                          % Comisión
                        </label>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.5"
                            value={editing.pct}
                            onChange={(e) =>
                              setEditingCommissions({
                                ...editingCommissions,
                                [m.restaurantId]: {
                                  ...editing,
                                  pct: parseFloat(e.target.value) || 0,
                                },
                              })
                            }
                            className="w-20 bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:border-amber-500 focus:outline-none"
                          />
                          <span className="text-xs text-zinc-500">%</span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] text-zinc-400 font-medium mb-1">
                          Cuota Fija / Pedido
                        </label>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={editing.fee}
                            onChange={(e) =>
                              setEditingCommissions({
                                ...editingCommissions,
                                [m.restaurantId]: {
                                  ...editing,
                                  fee: parseFloat(e.target.value) || 0,
                                },
                              })
                            }
                            className="w-24 bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:border-amber-500 focus:outline-none"
                          />
                          <span className="text-xs text-zinc-500">{foodCourt.currency}</span>
                        </div>
                      </div>

                      {canManage && (
                        <div className="pt-4">
                          <button
                            onClick={() => handleSaveCommission(m.restaurantId)}
                            disabled={isSaving}
                            className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
                          >
                            {isSaving ? 'Guardando...' : 'Guardar'}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Current Settlement Breakdown */}
                    {reportVendor && (
                      <div className="flex items-center gap-4 text-xs border-t lg:border-t-0 lg:border-l border-zinc-800 pt-3 lg:pt-0 lg:pl-4">
                        <div>
                          <span className="text-[10px] text-zinc-500 block">Ventas</span>
                          <span className="font-bold text-white">
                            {formatPrice(reportVendor.grossSales)}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-amber-500/80 block">Comisión</span>
                          <span className="font-bold text-amber-400">
                            -{formatPrice(reportVendor.commissionAmount)}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-emerald-500/80 block">Neto a Pagar</span>
                          <span className="font-black text-emerald-400">
                            {formatPrice(reportVendor.netPayout)}
                          </span>
                        </div>

                        <button
                          onClick={() => setSelectedVendorStatement(reportVendor)}
                          className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] font-semibold transition-colors cursor-pointer shrink-0 ml-auto lg:ml-0"
                        >
                          📄 Estado
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Statement Modal */}
          {selectedVendorStatement && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 max-w-md w-full space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-start justify-between border-b border-zinc-800 pb-3">
                  <div>
                    <h3 className="text-sm font-black text-white">
                      Estado de Cuenta — {selectedVendorStatement.restaurantName}
                    </h3>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Período: {reportTimeframe.toUpperCase()} • Plaza: {foodCourt.name}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedVendorStatement(null)}
                    className="text-zinc-400 hover:text-white text-xs cursor-pointer p-1"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex justify-between py-1 border-b border-zinc-800/50">
                    <span className="text-zinc-400">Ventas Brutas Generadas:</span>
                    <span className="font-bold text-white">
                      {formatPrice(selectedVendorStatement.grossSales)}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-zinc-800/50">
                    <span className="text-zinc-400">Total de Pedidos Despachados:</span>
                    <span className="font-bold text-white">
                      {selectedVendorStatement.ordersCount} órdenes
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-zinc-800/50">
                    <span className="text-zinc-400">
                      Comisión Porcentual ({selectedVendorStatement.commissionPercentage}%):
                    </span>
                    <span className="text-amber-400 font-semibold">
                      -
                      {formatPrice(
                        selectedVendorStatement.grossSales *
                          (selectedVendorStatement.commissionPercentage / 100),
                      )}
                    </span>
                  </div>
                  {selectedVendorStatement.commissionFixedFee > 0 && (
                    <div className="flex justify-between py-1 border-b border-zinc-800/50">
                      <span className="text-zinc-400">
                        Cuota Fija por Orden ({formatPrice(selectedVendorStatement.commissionFixedFee)} x {selectedVendorStatement.ordersCount}):
                      </span>
                      <span className="text-amber-400 font-semibold">
                        -
                        {formatPrice(
                          selectedVendorStatement.ordersCount *
                            selectedVendorStatement.commissionFixedFee,
                        )}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between py-1 border-b border-zinc-800/50">
                    <span className="text-zinc-400 font-semibold">Retención Total Plaza:</span>
                    <span className="text-amber-400 font-black">
                      -{formatPrice(selectedVendorStatement.commissionAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 bg-emerald-500/10 border border-emerald-500/20 px-3 rounded-xl">
                    <span className="font-black text-emerald-400">Total a Liquidar (Neto):</span>
                    <span className="font-black text-emerald-400 text-sm">
                      {formatPrice(selectedVendorStatement.netPayout)}
                    </span>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => {
                      window.print()
                    }}
                    className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold cursor-pointer"
                  >
                    🖨️ Imprimir Liquidación
                  </button>
                  <button
                    onClick={() => setSelectedVendorStatement(null)}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold cursor-pointer"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 4: Member Restaurants Management                         */}
      {/* ============================================================ */}
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
                  disabled={isAddingMember || !selectedRestaurantId}
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-extrabold disabled:opacity-50 shrink-0 cursor-pointer"
                >
                  {isAddingMember ? 'Agregando...' : '+ Agregar'}
                </button>
              </form>
            </div>
          )}

          {foodCourt.memberships.length === 0 ? (
            <div className="text-center py-12 text-zinc-500 bg-zinc-900/30 border border-zinc-800 rounded-3xl">
              <span className="text-4xl block mb-2">🍽️</span>
              <p className="text-sm font-semibold text-zinc-400">
                No hay restaurantes miembros registrados
              </p>
              <p className="text-xs mt-1">
                Agrega restaurantes para que aparezcan en el menú digital de la plaza
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {foodCourt.memberships.map((m, idx) => (
                <div
                  key={m.id}
                  className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-zinc-500 w-5">#{idx + 1}</span>
                    {m.restaurant.logoUrl ? (
                      <img
                        src={m.restaurant.logoUrl}
                        alt=""
                        className="w-10 h-10 rounded-xl object-cover bg-zinc-800 shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-sm shrink-0">
                        🍽️
                      </div>
                    )}
                    <div>
                      <h4 className="text-xs font-bold text-white">{m.restaurant.name}</h4>
                      <p className="text-[10px] text-zinc-400">
                        {m.restaurant.cuisineType || 'Comida'}
                      </p>
                    </div>
                  </div>

                  {canManage && (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleMoveMember(idx, 'up')}
                        disabled={idx === 0}
                        title="Mover arriba en el mosaico"
                        className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 disabled:opacity-30 cursor-pointer"
                      >
                        ▲
                      </button>
                      <button
                        onClick={() => handleMoveMember(idx, 'down')}
                        disabled={idx === foodCourt.memberships.length - 1}
                        title="Mover abajo en el mosaico"
                        className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 disabled:opacity-30 cursor-pointer"
                      >
                        ▼
                      </button>
                      <button
                        onClick={() => handleRemoveMember(m.restaurantId)}
                        title="Remover restaurante"
                        className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 ml-2 cursor-pointer"
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

      {/* ============================================================ */}
      {/* TAB 5: Food Court Settings                                    */}
      {/* ============================================================ */}
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
                className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-sm disabled:opacity-50 cursor-pointer"
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
