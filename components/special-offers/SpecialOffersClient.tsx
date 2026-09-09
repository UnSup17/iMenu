'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'

interface SpecialDish {
  id: string
  name: string
  description?: string | null
  basePrice: number
  isAvailable: boolean
  specialOfferStock: number | null
  specialOfferStockSold: number
  specialOfferCost: number | null
  categoryName: string
  offerLabel: string | null
}

interface SpecialCategory {
  id: string
  name: string
  offerLabel?: string | null
  offerStartDate?: string | null
  offerEndDate?: string | null
  offerActiveDays?: string | null
  offerStartTime?: string | null
  offerEndTime?: string | null
  isActive: boolean
  products: {
    id: string
    name: string
    basePrice: number
    isAvailable: boolean
    specialOfferStock: number | null
    specialOfferStockSold: number
    specialOfferCost: number | null
  }[]
}

interface ReportData {
  summary: {
    totalSpecialSales: number
    totalRegularSales: number
    specialSalesPercent: number
    totalSpecialUnits: number
    estimatedSpecialCost: number
    specialGrossProfit: number
    specialGrossMarginPercent: number
  }
  byOffer: {
    offerLabel: string
    unitsSold: number
    grossSales: number
    netSales: number
    estimatedCost: number
    grossProfit: number
    marginPercent: number
  }[]
  dishes: {
    productId: string | null
    name: string
    offerLabel?: string | null
    unitsSold: number
    unitPrice: number
    totalSales: number
    specialOfferStock?: number | null
    remainingStock?: number | null
  }[]
}

interface SpecialOffersClientProps {
  restaurantId: string
  restaurantName: string
  currency: string
  categories: SpecialCategory[]
  allSpecialDishes: SpecialDish[]
  report: ReportData
}

export function SpecialOffersClient({
  restaurantId,
  restaurantName,
  currency,
  categories,
  allSpecialDishes,
  report,
}: SpecialOffersClientProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'stock' | 'festivals' | 'accounting'>('stock')
  const [editingDish, setEditingDish] = useState<SpecialDish | null>(null)
  const [addPortions, setAddPortions] = useState<number>(10)
  const [unitCost, setUnitCost] = useState<number>(0)
  const [isUpdating, setIsUpdating] = useState(false)

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const handleUpdateStock = async (dishId: string, customAdd?: number) => {
    setIsUpdating(true)
    try {
      const res = await fetch(`/api/special-offers/dishes/${dishId}/stock`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          addStock: customAdd || addPortions,
          ...(unitCost > 0 && { specialOfferCost: unitCost }),
          isAvailable: true,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al actualizar cupo')
      }

      setEditingDish(null)
      router.refresh()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleToggleAvailable = async (dish: SpecialDish) => {
    try {
      const res = await fetch(`/api/special-offers/dishes/${dish.id}/stock`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isAvailable: !dish.isAvailable,
        }),
      })
      if (!res.ok) throw new Error('Error al actualizar disponibilidad')
      router.refresh()
    } catch (err: any) {
      alert(err.message)
    }
  }

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-900/60 border border-zinc-800 p-6 rounded-3xl backdrop-blur-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">✨</span>
            <h1 className="text-2xl font-black text-white tracking-tight">
              Ofertas Especiales & Platos de Temporada
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
              Festividades & Inventario
            </span>
          </div>
          <p className="text-zinc-400 text-xs mt-1">
            Gestión de platos fuera de menú, cupos de porciones preparadas, facturación y rentabilidad contable para {restaurantName}.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push('/dashboard/menu')}
            className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs transition-colors"
          >
            + Nueva Categoría / Menú
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-zinc-900/60 border border-zinc-800/80 p-4 rounded-2xl space-y-1">
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
            Ventas Ofertas (Mes)
          </span>
          <p className="text-xl sm:text-2xl font-black text-amber-400">
            {formatMoney(report.summary.totalSpecialSales)}
          </p>
          <span className="text-[10px] text-zinc-500 block">
            {report.summary.specialSalesPercent}% de las ventas totales
          </span>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800/80 p-4 rounded-2xl space-y-1">
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
            Porciones Servidas
          </span>
          <p className="text-xl sm:text-2xl font-black text-emerald-400">
            {report.summary.totalSpecialUnits} platos
          </p>
          <span className="text-[10px] text-zinc-500 block">Platos fuera de carta vendidos</span>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800/80 p-4 rounded-2xl space-y-1">
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
            Margen Bruto Promedio
          </span>
          <p className="text-xl sm:text-2xl font-black text-purple-400">
            {report.summary.specialGrossMarginPercent}%
          </p>
          <span className="text-[10px] text-zinc-500 block">
            Ganancia: {formatMoney(report.summary.specialGrossProfit)}
          </span>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800/80 p-4 rounded-2xl space-y-1">
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
            Platos Especiales
          </span>
          <p className="text-xl sm:text-2xl font-black text-white">
            {allSpecialDishes.length} activos
          </p>
          <span className="text-[10px] text-zinc-500 block">
            {categories.length} festividades configuradas
          </span>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex gap-2 border-b border-zinc-800 pb-2">
        <button
          onClick={() => setActiveTab('stock')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2
            ${
              activeTab === 'stock'
                ? 'bg-amber-500 text-black shadow-md'
                : 'bg-zinc-900 text-zinc-400 hover:text-white'
            }`}
        >
          <span>📦</span> Control de Cupos & Stock Diario
        </button>

        <button
          onClick={() => setActiveTab('festivals')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2
            ${
              activeTab === 'festivals'
                ? 'bg-amber-500 text-black shadow-md'
                : 'bg-zinc-900 text-zinc-400 hover:text-white'
            }`}
        >
          <span>🎉</span> Festividades & Temporadas ({categories.length})
        </button>

        <button
          onClick={() => setActiveTab('accounting')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2
            ${
              activeTab === 'accounting'
                ? 'bg-amber-500 text-black shadow-md'
                : 'bg-zinc-900 text-zinc-400 hover:text-white'
            }`}
        >
          <span>📊</span> Rentabilidad & Ventas Contables
        </button>
      </div>

      {/* TAB 1: Control de Cupos & Stock Diario */}
      {activeTab === 'stock' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">
              Stock de platos por porciones preparadas
            </h3>
            <span className="text-xs text-zinc-400">
              Cuando el cupo llega a 0, el plato se marca automáticamente como agotado en el menú.
            </span>
          </div>

          {allSpecialDishes.length === 0 ? (
            <div className="text-center py-12 text-zinc-500 text-xs bg-zinc-900/30 rounded-3xl border border-zinc-800/60">
              No tienes platos configurados en ofertas especiales o festividades. Crea una categoría con &quot;Oferta Especial&quot; en el Gestor de Menú.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {allSpecialDishes.map((dish) => {
                const hasQuota = dish.specialOfferStock !== null
                const totalStock = dish.specialOfferStock || 0
                const sold = dish.specialOfferStockSold
                const remaining = Math.max(0, totalStock - sold)
                const percentSold = totalStock > 0 ? Math.min(100, Math.round((sold / totalStock) * 100)) : 0
                const isOutOfStock = hasQuota && remaining <= 0

                return (
                  <div
                    key={dish.id}
                    className={`bg-zinc-900/80 border rounded-2xl p-5 flex flex-col justify-between space-y-4 transition-all
                      ${isOutOfStock ? 'border-rose-500/40' : 'border-zinc-800 hover:border-zinc-700'}`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                            {dish.offerLabel || dish.categoryName}
                          </span>
                          <h4 className="text-base font-black text-white mt-0.5">{dish.name}</h4>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase shrink-0
                            ${
                              isOutOfStock
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                                : dish.isAvailable
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                : 'bg-zinc-800 text-zinc-400'
                            }`}
                        >
                          {isOutOfStock ? 'AGOTADO' : dish.isAvailable ? 'DISPONIBLE' : 'PAUSADO'}
                        </span>
                      </div>

                      <div className="mt-3 flex items-center justify-between text-xs">
                        <span className="text-zinc-400 font-medium">Precio de carta:</span>
                        <span className="font-black text-white">{formatMoney(dish.basePrice)}</span>
                      </div>

                      {dish.specialOfferCost && (
                        <div className="flex items-center justify-between text-xs mt-1">
                          <span className="text-zinc-500">Costo unitario est.:</span>
                          <span className="font-mono text-zinc-300">{formatMoney(dish.specialOfferCost)}</span>
                        </div>
                      )}

                      {/* Barra de Progreso de Cupo */}
                      {hasQuota ? (
                        <div className="mt-4 space-y-1.5">
                          <div className="flex justify-between text-[11px]">
                            <span className="text-zinc-400">
                              Cupo: <strong className="text-white">{sold}</strong> de <strong>{totalStock}</strong> servidos
                            </span>
                            <span className={`font-bold ${remaining <= 3 ? 'text-rose-400' : 'text-emerald-400'}`}>
                              {remaining} restantes
                            </span>
                          </div>
                          <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-300 ${
                                remaining <= 0 ? 'bg-rose-500' : remaining <= 3 ? 'bg-amber-500' : 'bg-emerald-500'
                              }`}
                              style={{ width: `${percentSold}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="mt-4 p-2 rounded-xl bg-zinc-950/60 text-[11px] text-zinc-400 text-center border border-zinc-800">
                          Sin cupo fijo por porciones (disponibilidad ilimitada)
                        </div>
                      )}
                    </div>

                    {/* Botones de acción rápida */}
                    <div className="pt-2 border-t border-zinc-800/80 flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingDish(dish)
                          setAddPortions(10)
                          setUnitCost(dish.specialOfferCost || 0)
                        }}
                        className="flex-1 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-amber-400 text-xs font-bold transition-colors text-center"
                      >
                        + Ajustar Cupo
                      </button>

                      <button
                        onClick={() => handleToggleAvailable(dish)}
                        className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors
                          ${
                            dish.isAvailable
                              ? 'bg-zinc-800/80 hover:bg-zinc-800 text-zinc-300'
                              : 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
                          }`}
                        title="Alternar disponibilidad manual"
                      >
                        {dish.isAvailable ? 'Pausar' : 'Activar'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Festividades & Temporadas */}
      {activeTab === 'festivals' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-5 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-amber-400">{cat.offerLabel || 'Evento Especial'}</span>
                    <h4 className="text-lg font-black text-white">{cat.name}</h4>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase
                      ${cat.isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-500'}`}
                  >
                    {cat.isActive ? 'Activa' : 'Inactiva'}
                  </span>
                </div>

                {/* Info Horarios */}
                <div className="bg-zinc-950/60 p-3 rounded-xl border border-zinc-800 text-xs space-y-1 text-zinc-400">
                  <div className="flex justify-between">
                    <span>Fechas de vigencia:</span>
                    <span className="text-zinc-200">
                      {cat.offerStartDate
                        ? `${new Date(cat.offerStartDate).toLocaleDateString()} - ${cat.offerEndDate ? new Date(cat.offerEndDate).toLocaleDateString() : 'Sin fin'}`
                        : 'Siempre vigente'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Horario de servicio:</span>
                    <span className="text-zinc-200">
                      {cat.offerStartTime ? `${cat.offerStartTime} a ${cat.offerEndTime}` : 'Todo el día'}
                    </span>
                  </div>
                </div>

                {/* Platos asociados */}
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                    Platos en esta oferta ({cat.products.length})
                  </span>
                  <div className="space-y-1.5">
                    {cat.products.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between p-2 rounded-xl bg-zinc-950/40 text-xs border border-zinc-800/60"
                      >
                        <span className="font-bold text-white">{p.name}</span>
                        <span className="font-black text-amber-400">{formatMoney(p.basePrice)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: Rentabilidad & Ventas Contables */}
      {activeTab === 'accounting' && (
        <div className="space-y-6">
          {/* Desglose por Festividad */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-6 space-y-4">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <span>📊</span> Rentabilidad por Festividad y Oferta Especial
            </h3>

            {report.byOffer.length === 0 ? (
              <div className="text-center py-8 text-zinc-500 text-xs">
                No hay ventas facturadas de platos de oferta especial en el período actual.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-zinc-950 text-zinc-400 uppercase tracking-wider font-bold border-b border-zinc-800">
                    <tr>
                      <th className="p-3">Festividad / Oferta</th>
                      <th className="p-3 text-right">Porciones</th>
                      <th className="p-3 text-right">Ventas Brutas</th>
                      <th className="p-3 text-right">Costo Insumos</th>
                      <th className="p-3 text-right">Utilidad Neta</th>
                      <th className="p-3 text-right">Margen %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 font-medium">
                    {report.byOffer.map((o) => (
                      <tr key={o.offerLabel} className="hover:bg-zinc-800/30 transition-colors">
                        <td className="p-3 font-bold text-white">{o.offerLabel}</td>
                        <td className="p-3 text-right text-zinc-300">{o.unitsSold}</td>
                        <td className="p-3 text-right font-black text-amber-400">{formatMoney(o.grossSales)}</td>
                        <td className="p-3 text-right font-mono text-zinc-400">{formatMoney(o.estimatedCost)}</td>
                        <td className="p-3 text-right font-black text-emerald-400">{formatMoney(o.grossProfit)}</td>
                        <td className="p-3 text-right font-bold text-purple-400">{o.marginPercent}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Desglose por Plato Individual */}
          {report.dishes.length > 0 && (
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-6 space-y-4">
              <h3 className="text-base font-black text-white">
                Rendimiento por Plato de Festividad
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-zinc-950 text-zinc-400 uppercase tracking-wider font-bold border-b border-zinc-800">
                    <tr>
                      <th className="p-3">Plato</th>
                      <th className="p-3">Oferta</th>
                      <th className="p-3 text-right">Unidades Vendidas</th>
                      <th className="p-3 text-right">Precio Unitario</th>
                      <th className="p-3 text-right">Total Facturado</th>
                      <th className="p-3 text-right">Stock Restante</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 font-medium">
                    {report.dishes.map((d) => (
                      <tr key={d.name} className="hover:bg-zinc-800/30">
                        <td className="p-3 font-bold text-white">{d.name}</td>
                        <td className="p-3 text-zinc-400">{d.offerLabel || 'General'}</td>
                        <td className="p-3 text-right text-emerald-400 font-bold">{d.unitsSold}</td>
                        <td className="p-3 text-right font-mono text-zinc-300">{formatMoney(d.unitPrice)}</td>
                        <td className="p-3 text-right font-black text-amber-400">{formatMoney(d.totalSales)}</td>
                        <td className="p-3 text-right">
                          {d.remainingStock !== null && d.remainingStock !== undefined ? (
                            <span className={`font-bold ${d.remainingStock <= 0 ? 'text-rose-400' : 'text-zinc-200'}`}>
                              {d.remainingStock} porciones
                            </span>
                          ) : (
                            <span className="text-zinc-500">Ilimitado</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal de Ajuste de Cupo */}
      {editingDish && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 w-full max-w-sm space-y-4 shadow-2xl">
            <div>
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                {editingDish.offerLabel || editingDish.categoryName}
              </span>
              <h3 className="text-base font-black text-white mt-0.5">
                Ajustar Cupo: {editingDish.name}
              </h3>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-300 font-bold mb-1">
                  Agregar porciones al cupo de hoy
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    value={addPortions}
                    onChange={(e) => setAddPortions(Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white font-mono text-sm"
                  />
                  <span className="text-zinc-400 font-bold">porciones</span>
                </div>
                <p className="text-[10px] text-zinc-500 mt-1">
                  Actualmente preparadas: {editingDish.specialOfferStock ?? 0} | Vendidas: {editingDish.specialOfferStockSold}
                </p>
              </div>

              <div>
                <label className="block text-zinc-300 font-bold mb-1">
                  Costo unitario de preparación (para cálculo contable)
                </label>
                <input
                  type="number"
                  min="0"
                  value={unitCost}
                  onChange={(e) => setUnitCost(Number(e.target.value))}
                  placeholder="Ej. 12000"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white font-mono text-sm"
                />
                <p className="text-[10px] text-zinc-500 mt-1">
                  Si dejas 0 o vacío, se calculará con los costos de receta del inventario.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingDish(null)}
                className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isUpdating}
                onClick={() => handleUpdateStock(editingDish.id)}
                className="px-4 py-2 rounded-xl bg-amber-500 text-black font-extrabold text-xs shadow-lg shadow-amber-500/10 disabled:opacity-50"
              >
                {isUpdating ? 'Guardando...' : 'Confirmar y Habilitar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
