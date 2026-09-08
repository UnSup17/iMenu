'use client'

import { useState, useEffect } from 'react'
import { AnalyticsDashboardData } from '@/lib/analytics/engine'

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'year'>('month')

  const fetchAnalytics = async (range: string) => {
    try {
      setLoading(true)
      const now = new Date()
      let startDate: Date

      if (range === 'today') {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
      } else if (range === 'week') {
        const day = now.getDay()
        startDate = new Date(now.getTime() - (day === 0 ? 6 : day - 1) * 24 * 60 * 60 * 1000)
        startDate.setHours(0, 0, 0, 0)
      } else if (range === 'year') {
        startDate = new Date(now.getFullYear(), 0, 1)
      } else {
        // month
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      }

      const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

      const res = await fetch(
        `/api/analytics/dashboard?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
      )
      if (!res.ok) throw new Error('Error al cargar métricas')
      const json = await res.json()
      setData(json)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics(dateRange)
  }, [dateRange])

  const maxHourlySales = data ? Math.max(...data.salesByHour.map((h) => h.totalSales), 1) : 1
  const maxDaySales = data ? Math.max(...data.salesByDayOfWeek.map((d) => d.totalSales), 1) : 1

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">📈</span>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Business Intelligence & Analytics
            </h1>
          </div>
          <p className="text-sm text-zinc-400 mt-1">
            Inteligencia de ventas, análisis ABC de rentabilidad, rotación de mesas y horas pico.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Selector de Rango */}
          <div className="bg-zinc-900 border border-zinc-800 p-1 rounded-xl flex items-center gap-1">
            {(['today', 'week', 'month', 'year'] as const).map((rangeKey) => (
              <button
                key={rangeKey}
                onClick={() => setDateRange(rangeKey)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition ${
                  dateRange === rangeKey
                    ? 'bg-amber-500 text-zinc-950 font-bold'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {rangeKey === 'today'
                  ? 'Hoy'
                  : rangeKey === 'week'
                  ? 'Esta Semana'
                  : rangeKey === 'month'
                  ? 'Este Mes'
                  : 'Este Año'}
              </button>
            ))}
          </div>

          <a
            href="/api/analytics/export"
            download
            className="px-4 py-2 text-xs font-bold rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition flex items-center gap-2"
          >
            <span>📥</span>
            <span>Exportar CSV</span>
          </a>
        </div>
      </div>

      {loading || !data ? (
        <div className="p-12 text-center text-zinc-500 bg-zinc-900/40 rounded-xl border border-zinc-800">
          Procesando inteligencia operativa...
        </div>
      ) : (
        <div className="space-y-8">
          {/* Métricas Principales */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-zinc-900/80 border border-zinc-800 p-5 rounded-xl">
              <span className="text-xs text-zinc-500 uppercase font-semibold">Ventas Totales</span>
              <p className="text-2xl font-black text-emerald-400 mt-1">
                ${data.summary.totalRevenue.toLocaleString('es-CO')}
              </p>
              <span className="text-[11px] text-zinc-500">{data.periodLabel}</span>
            </div>

            <div className="bg-zinc-900/80 border border-zinc-800 p-5 rounded-xl">
              <span className="text-xs text-zinc-500 uppercase font-semibold">Ticket Promedio</span>
              <p className="text-2xl font-black text-amber-400 mt-1">
                ${data.summary.averageTicket.toLocaleString('es-CO')}
              </p>
              <span className="text-[11px] text-zinc-500">Por comensal / mesa</span>
            </div>

            <div className="bg-zinc-900/80 border border-zinc-800 p-5 rounded-xl">
              <span className="text-xs text-zinc-500 uppercase font-semibold">Rotación de Mesas</span>
              <p className="text-2xl font-black text-blue-400 mt-1">
                {data.tableTurnover.turnoverRatePerTable}x
              </p>
              <span className="text-[11px] text-zinc-500">
                {data.tableTurnover.averageSessionMinutes} min estadía promedio
              </span>
            </div>

            <div className="bg-zinc-900/80 border border-zinc-800 p-5 rounded-xl">
              <span className="text-xs text-zinc-500 uppercase font-semibold">Ítems Servidos</span>
              <p className="text-2xl font-black text-purple-400 mt-1">
                {data.summary.totalItemsSold}
              </p>
              <span className="text-[11px] text-zinc-500">Platos y bebidas despachados</span>
            </div>
          </div>

          {/* Gráficas: Horas Pico y Días de la Semana */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Ventas por Hora del Día */}
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-5 space-y-4">
              <h2 className="text-sm font-bold text-white flex items-center justify-between">
                <span>⏰ Ventas por Hora (Detección de Horas Pico)</span>
                <span className="text-xs font-normal text-zinc-500">00:00 - 23:00</span>
              </h2>

              <div className="h-44 flex items-end gap-1.5 pt-4 pb-1 border-b border-zinc-800">
                {data.salesByHour.map((h) => {
                  const heightPercent =
                    maxHourlySales > 0 ? (h.totalSales / maxHourlySales) * 100 : 0
                  return (
                    <div
                      key={h.hour}
                      className="flex-1 flex flex-col items-center gap-1 group relative h-full justify-end"
                    >
                      <div
                        style={{ height: `${Math.max(4, heightPercent)}%` }}
                        className={`w-full rounded-t transition-all ${
                          h.totalSales > 0
                            ? 'bg-amber-500 group-hover:bg-amber-400'
                            : 'bg-zinc-800/40'
                        }`}
                      />
                      {/* Tooltip */}
                      {h.totalSales > 0 && (
                        <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition bg-zinc-950 border border-zinc-700 text-[10px] p-1.5 rounded shadow-xl whitespace-nowrap pointer-events-none z-10">
                          <p className="font-bold text-white">{h.hourLabel}</p>
                          <p className="text-emerald-400">
                            ${h.totalSales.toLocaleString('es-CO')} ({h.invoicesCount} facturas)
                          </p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              <div className="flex justify-between text-[10px] text-zinc-500 px-1">
                <span>12:00 AM</span>
                <span>06:00 AM</span>
                <span>12:00 PM (Almuerzo)</span>
                <span>06:00 PM</span>
                <span>11:00 PM (Cena)</span>
              </div>
            </div>

            {/* Ventas por Día de la Semana */}
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-5 space-y-4">
              <h2 className="text-sm font-bold text-white flex items-center justify-between">
                <span>📅 Ventas por Día de la Semana</span>
                <span className="text-xs font-normal text-zinc-500">Lunes - Domingo</span>
              </h2>

              <div className="space-y-2 pt-2">
                {data.salesByDayOfWeek.map((d) => {
                  const widthPercent =
                    maxDaySales > 0 ? (d.totalSales / maxDaySales) * 100 : 0
                  return (
                    <div key={d.dayIndex} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-zinc-300">{d.dayName}</span>
                        <span className="font-bold text-white">
                          ${d.totalSales.toLocaleString('es-CO')}
                        </span>
                      </div>
                      <div className="h-2 w-full bg-zinc-950 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${widthPercent}%` }}
                          className="h-full bg-amber-500 rounded-full"
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Análisis ABC de Rentabilidad de Productos */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl overflow-hidden space-y-4 p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <span>🏆</span> Análisis ABC de Productos (Principio de Pareto)
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Clase A: Generan el 80% de tus ingresos · Clase B: Siguiente 15% · Clase C: Menos del 5%
                </p>
              </div>

              <div className="flex gap-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/60">
                  Clase A (Estrella)
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800/60">
                  Clase B (Moderado)
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
                  Clase C (Baja rotación)
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-zinc-300">
                <thead className="bg-zinc-950/60 text-xs uppercase text-zinc-400 border-b border-zinc-800">
                  <tr>
                    <th className="px-4 py-3">Plato / Producto</th>
                    <th className="px-4 py-3">Categoría</th>
                    <th className="px-4 py-3 text-center">Unidades Vendidas</th>
                    <th className="px-4 py-3 text-right">Ingresos Totales</th>
                    <th className="px-4 py-3 text-right">% de Ventas</th>
                    <th className="px-4 py-3 text-right">% Acumulado</th>
                    <th className="px-4 py-3 text-center">Clasificación ABC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {data.abcAnalysis.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-zinc-500">
                        No hay ventas registradas en el período seleccionado.
                      </td>
                    </tr>
                  ) : (
                    data.abcAnalysis.map((item) => (
                      <tr key={item.productId} className="hover:bg-zinc-800/40 transition">
                        <td className="px-4 py-3 font-bold text-white">{item.name}</td>
                        <td className="px-4 py-3 text-xs text-zinc-400">{item.categoryName}</td>
                        <td className="px-4 py-3 text-center font-semibold text-zinc-200">
                          {item.quantitySold}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-emerald-400">
                          ${item.totalRevenue.toLocaleString('es-CO')}
                        </td>
                        <td className="px-4 py-3 text-right text-zinc-300">
                          {item.revenuePercentage}%
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-xs text-zinc-400">
                          {item.cumulativePercentage}%
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`text-xs px-2.5 py-0.5 rounded-full font-black ${
                              item.classification === 'A'
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/80'
                                : item.classification === 'B'
                                ? 'bg-blue-950 text-blue-300 border border-blue-800/80'
                                : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                            }`}
                          >
                            Clase {item.classification}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
