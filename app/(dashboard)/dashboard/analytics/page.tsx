'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { AnalyticsDashboardData } from '@/lib/analytics/engine'
import { TrendAreaChart } from '@/components/analytics/TrendAreaChart'
import { CategoryDonutChart } from '@/components/analytics/CategoryDonutChart'
import { BarGroupedChart } from '@/components/analytics/BarGroupedChart'
import { TableFloorPlanHeatmap } from '@/components/analytics/TableFloorPlanHeatmap'
import { DemandPredictionChart } from '@/components/analytics/DemandPredictionChart'
import { WaiterPerformanceTable } from '@/components/analytics/WaiterPerformanceTable'
import { ServiceChannelBreakdown } from '@/components/analytics/ServiceChannelBreakdown'

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'year'>('month')
  const [activeTab, setActiveTab] = useState<
    'OVERVIEW' | 'CATEGORIES' | 'WAITERS' | 'HEATMAP' | 'PREDICTION'
  >('OVERVIEW')

  // Email report state
  const [sendingEmail, setSendingEmail] = useState(false)
  const [emailStatus, setEmailStatus] = useState<string | null>(null)

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

  const handleSendEmailReport = async () => {
    setSendingEmail(true)
    setEmailStatus(null)
    try {
      const res = await fetch('/api/analytics/reports/email', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Error al enviar reporte')
      setEmailStatus('✅ Reporte semanal enviado exitosamente')
      setTimeout(() => setEmailStatus(null), 5000)
    } catch (err: any) {
      setEmailStatus(`⚠️ ${err.message || 'Error al enviar'}`)
    } finally {
      setSendingEmail(false)
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">📈</span>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Business Intelligence & Analytics
            </h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 uppercase tracking-wider">
              Suite Ejecutiva
            </span>
          </div>
          <p className="text-sm text-zinc-400 mt-1">
            Inteligencia de ventas, comparativas MoM/YoY, mapa térmico de salón y predicción de demanda.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Selector de Rango */}
          <div className="bg-zinc-900 border border-zinc-800 p-1 rounded-xl flex items-center gap-1">
            {(['today', 'week', 'month', 'year'] as const).map((rangeKey) => (
              <button
                key={rangeKey}
                onClick={() => setDateRange(rangeKey)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition cursor-pointer ${
                  dateRange === rangeKey
                    ? 'bg-amber-500 text-zinc-950 font-bold shadow-md shadow-amber-500/10'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {rangeKey === 'today'
                  ? 'Hoy'
                  : rangeKey === 'week'
                  ? 'Semana'
                  : rangeKey === 'month'
                  ? 'Mes'
                  : 'Año'}
              </button>
            ))}
          </div>

          {/* Botón Modo TV Ejecutivo */}
          <Link
            href="/dashboard/analytics/live-tv"
            target="_blank"
            className="px-3.5 py-2 text-xs font-bold rounded-xl bg-purple-950/70 hover:bg-purple-900 border border-purple-800/70 text-purple-300 transition flex items-center gap-2 cursor-pointer shadow-lg shadow-purple-950/40"
          >
            <span>📺</span>
            <span>Modo TV Ejecutivo ↗</span>
          </Link>

          {/* Botón Enviar Reporte por Correo */}
          <button
            onClick={handleSendEmailReport}
            disabled={sendingEmail}
            className="px-3.5 py-2 text-xs font-bold rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            <span>📧</span>
            <span>{sendingEmail ? 'Enviando...' : 'Reporte Email'}</span>
          </button>

          {/* Botón Exportar CSV */}
          <a
            href="/api/analytics/export"
            download
            className="px-3.5 py-2 text-xs font-bold rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition flex items-center gap-2"
          >
            <span>📥</span>
            <span>Exportar CSV</span>
          </a>
        </div>
      </div>

      {emailStatus && (
        <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-xs flex items-center justify-between">
          <span>{emailStatus}</span>
          <button onClick={() => setEmailStatus(null)} className="text-zinc-500 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* Summary KPI Cards con Comparativas MoM y YoY */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <div className="bg-zinc-900/90 border border-zinc-800 p-5 rounded-2xl relative overflow-hidden flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400">Ingresos Totales</span>
            <span className="text-lg">💰</span>
          </div>
          <div>
            <span className="font-mono text-2xl sm:text-3xl font-bold text-white tracking-tight">
              ${data?.summary.totalRevenue.toLocaleString('es-CO') ?? '0'}
            </span>
            <span className="text-[10px] text-zinc-500 block font-mono">COP</span>
          </div>
          <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[11px]">
            {data?.comparisons ? (
              <>
                <span
                  className={`font-semibold flex items-center gap-0.5 ${
                    data.comparisons.mom.revenue.growthPercent >= 0
                      ? 'text-emerald-400'
                      : 'text-rose-400'
                  }`}
                >
                  {data.comparisons.mom.revenue.growthPercent >= 0 ? '▲ +' : '▼ '}
                  {data.comparisons.mom.revenue.growthPercent}% MoM
                </span>
                <span className="text-zinc-500 font-mono">
                  {data.comparisons.yoy.revenue.growthPercent >= 0 ? '+' : ''}
                  {data.comparisons.yoy.revenue.growthPercent}% YoY
                </span>
              </>
            ) : (
              <span className="text-zinc-500">Calculando...</span>
            )}
          </div>
        </div>

        {/* Invoices Count */}
        <div className="bg-zinc-900/90 border border-zinc-800 p-5 rounded-2xl flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400">Facturas / Cuentas</span>
            <span className="text-lg">🧾</span>
          </div>
          <div>
            <span className="font-mono text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {data?.summary.totalInvoices ?? 0}
            </span>
            <span className="text-[10px] text-zinc-500 block">Comandas pagadas</span>
          </div>
          <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[11px]">
            {data?.comparisons ? (
              <span
                className={`font-semibold ${
                  data.comparisons.mom.invoicesCount.growthPercent >= 0
                    ? 'text-emerald-400'
                    : 'text-rose-400'
                }`}
              >
                {data.comparisons.mom.invoicesCount.growthPercent >= 0 ? '▲ +' : '▼ '}
                {data.comparisons.mom.invoicesCount.growthPercent}% vs. mes ant.
              </span>
            ) : (
              <span className="text-zinc-500">--</span>
            )}
            <span className="text-zinc-500 font-mono">
              ~{data?.tableTurnover.averageSessionMinutes ?? 45} min/mesa
            </span>
          </div>
        </div>

        {/* Average Ticket */}
        <div className="bg-zinc-900/90 border border-zinc-800 p-5 rounded-2xl flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400">Ticket Promedio</span>
            <span className="text-lg">🎯</span>
          </div>
          <div>
            <span className="font-mono text-2xl sm:text-3xl font-bold text-amber-400 tracking-tight">
              ${data?.summary.averageTicket.toLocaleString('es-CO') ?? '0'}
            </span>
            <span className="text-[10px] text-zinc-500 block font-mono">Por cliente / orden</span>
          </div>
          <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[11px]">
            {data?.comparisons ? (
              <span
                className={`font-semibold ${
                  data.comparisons.mom.averageTicket.growthPercent >= 0
                    ? 'text-emerald-400'
                    : 'text-rose-400'
                }`}
              >
                {data.comparisons.mom.averageTicket.growthPercent >= 0 ? '▲ +' : '▼ '}
                {data.comparisons.mom.averageTicket.growthPercent}% MoM
              </span>
            ) : (
              <span className="text-zinc-500">--</span>
            )}
            <span className="text-zinc-500 font-mono">
              {data?.tableTurnover.turnoverRatePerTable ?? 0} rot/mesa
            </span>
          </div>
        </div>

        {/* Total Items Sold */}
        <div className="bg-zinc-900/90 border border-zinc-800 p-5 rounded-2xl flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400">Platos & Bebidas</span>
            <span className="text-lg">🍽️</span>
          </div>
          <div>
            <span className="font-mono text-2xl sm:text-3xl font-bold text-emerald-400 tracking-tight">
              {data?.summary.totalItemsSold ?? 0}
            </span>
            <span className="text-[10px] text-zinc-500 block">Unidades despachadas</span>
          </div>
          <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[11px]">
            <span className="text-zinc-400">Salón en tiempo real:</span>
            <span className="text-emerald-400 font-bold font-mono">
              {data?.tableTurnover.occupiedNow ?? 0} mesas activas
            </span>
          </div>
        </div>
      </div>

      {/* Tabs de Navegación de Analítica */}
      <div className="flex items-center gap-2 border-b border-zinc-800/80 pb-1 overflow-x-auto">
        {[
          { id: 'OVERVIEW', label: '📊 Visión General', desc: 'Tendencia & Canales' },
          { id: 'CATEGORIES', label: '🍩 Mix & Categorías', desc: 'Análisis ABC Pareto' },
          { id: 'WAITERS', label: '👨‍🍳 Equipo de Meseros', desc: 'Rendimiento & Propinas' },
          { id: 'HEATMAP', label: '🔥 Heatmap de Salón', desc: 'Mapa térmico de mesas' },
          { id: 'PREDICTION', label: '🔮 Predicción Demanda', desc: 'Proyección a 7 días' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex flex-col items-start gap-0.5 whitespace-nowrap cursor-pointer ${
              activeTab === tab.id
                ? 'bg-zinc-800 text-white border border-amber-500/40 shadow-md shadow-amber-500/5'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            <span>{tab.label}</span>
            <span className="text-[10px] font-normal text-zinc-500">{tab.desc}</span>
          </button>
        ))}
      </div>

      {/* Contenido de cada pestaña */}
      {loading ? (
        <div className="h-64 flex flex-col items-center justify-center text-zinc-500 space-y-2">
          <span className="text-2xl animate-spin">⏳</span>
          <p className="text-xs">Compilando analítica y proyecciones en tiempo real...</p>
        </div>
      ) : data ? (
        <div className="space-y-6">
          {/* TAB 1: VISIÓN GENERAL */}
          {activeTab === 'OVERVIEW' && (
            <div className="space-y-6">
              <TrendAreaChart data={data.salesTrend} />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ServiceChannelBreakdown channels={data.serviceChannels} />
                <BarGroupedChart
                  hourlyData={data.salesByHour}
                  dayOfWeekData={data.salesByDayOfWeek}
                />
              </div>
            </div>
          )}

          {/* TAB 2: CATEGORÍAS & MIX ABC */}
          {activeTab === 'CATEGORIES' && (
            <div className="space-y-6">
              <CategoryDonutChart data={data.categoryDistribution} />

              {/* Tabla Análisis ABC de Productos */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800/80 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>🏷️</span> Análisis ABC de Rentabilidad (Regla de Pareto)
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Clasificación de productos: A (Top 80% de ingresos), B (Siguiente 15%), C (5% marginal)
                    </p>
                  </div>
                  <span className="text-xs text-zinc-500 font-mono">
                    {data.abcAnalysis.length} platos en carta
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-800 text-zinc-500 uppercase text-[10px]">
                        <th className="py-2.5 px-3">Producto</th>
                        <th className="py-2.5 px-3">Categoría</th>
                        <th className="py-2.5 px-3 text-right">Cantidad Vendida</th>
                        <th className="py-2.5 px-3 text-right">Facturación</th>
                        <th className="py-2.5 px-3 text-right">% Individual</th>
                        <th className="py-2.5 px-3 text-right">% Acumulado</th>
                        <th className="py-2.5 px-3 text-center">Clasificación ABC</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60 font-mono">
                      {data.abcAnalysis.map((prod) => (
                        <tr key={prod.productId} className="hover:bg-zinc-800/30 transition">
                          <td className="py-2.5 px-3 font-sans font-semibold text-white">
                            {prod.name}
                          </td>
                          <td className="py-2.5 px-3 font-sans text-zinc-400">
                            {prod.categoryName}
                          </td>
                          <td className="py-2.5 px-3 text-right text-zinc-300">
                            {prod.quantitySold}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-amber-400">
                            ${prod.totalRevenue.toLocaleString('es-CO')}
                          </td>
                          <td className="py-2.5 px-3 text-right text-zinc-300">
                            {prod.revenuePercentage}%
                          </td>
                          <td className="py-2.5 px-3 text-right text-zinc-500 text-[11px]">
                            {prod.cumulativePercentage}%
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                prod.classification === 'A'
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                  : prod.classification === 'B'
                                  ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                  : 'bg-zinc-800 text-zinc-400'
                              }`}
                            >
                              Clase {prod.classification}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: EQUIPO DE MESEROS */}
          {activeTab === 'WAITERS' && (
            <div className="space-y-6">
              <WaiterPerformanceTable waiters={data.waiters} />
            </div>
          )}

          {/* TAB 4: HEATMAP DE SALÓN */}
          {activeTab === 'HEATMAP' && (
            <div className="space-y-6">
              <TableFloorPlanHeatmap tables={data.tableHeatmap} />
            </div>
          )}

          {/* TAB 5: PREDICCIÓN DE DEMANDA */}
          {activeTab === 'PREDICTION' && (
            <div className="space-y-6">
              <DemandPredictionChart data={data.demandPrediction} />
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}
