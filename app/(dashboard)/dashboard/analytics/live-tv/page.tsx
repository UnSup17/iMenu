'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { AnalyticsDashboardData } from '@/lib/analytics/engine'

export default function LiveTvExecutivePage() {
  const [data, setData] = useState<AnalyticsDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentTime, setCurrentTime] = useState<Date>(new Date())
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [dailyGoal] = useState<number>(5000000) // Meta configurable default: $5M COP

  // Reloj en tiempo real
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Cargar datos de hoy y refrescar cada 30 segundos
  const fetchTodayData = async () => {
    try {
      const now = new Date()
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)

      const res = await fetch(
        `/api/analytics/dashboard?startDate=${start.toISOString()}&endDate=${end.toISOString()}`
      )
      if (!res.ok) throw new Error('Error al cargar datos')
      const json = await res.json()
      setData(json)
    } catch (err) {
      console.error('Error en Live TV:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTodayData()
    const refreshTimer = setInterval(fetchTodayData, 30000) // Polling cada 30 seg
    return () => clearInterval(refreshTimer)
  }, [])

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {})
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {})
    }
  }

  const todayRevenue = data?.summary.totalRevenue || 0
  const todayInvoices = data?.summary.totalInvoices || 0
  const todayTicket = data?.summary.averageTicket || 0
  const goalProgress = Math.min(100, Math.round((todayRevenue / dailyGoal) * 100))
  const occupiedTables = data?.tableTurnover.occupiedNow || 0
  const totalTables = data?.tableTurnover.totalTables || 1

  return (
    <div className="fixed inset-0 z-50 bg-[#09090b] text-white flex flex-col p-6 sm:p-10 select-none overflow-hidden font-sans">
      {/* Top Header */}
      <header className="flex items-center justify-between border-b border-zinc-800/90 pb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-2xl shadow-lg shadow-amber-500/5">
            👑
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white uppercase">
                iMenu Executive Live Mode
              </h1>
              <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-950/80 border border-rose-800 text-rose-400 text-xs font-bold tracking-wider animate-pulse">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                EN VIVO
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-medium mt-0.5">
              Monitor de Desempeño Operativo & Financiero en Tiempo Real
            </p>
          </div>
        </div>

        {/* Reloj y Acciones */}
        <div className="flex items-center gap-6">
          <div className="text-right hidden sm:block">
            <p className="font-mono text-3xl font-black text-white tracking-widest drop-shadow">
              {currentTime.toLocaleTimeString('es-CO')}
            </p>
            <p className="text-xs text-zinc-400 font-medium capitalize">
              {currentTime.toLocaleDateString('es-CO', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleFullscreen}
              title="Pantalla Completa"
              className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-750 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-md"
            >
              <span>{isFullscreen ? '🗗' : '⛶'}</span>
              <span>{isFullscreen ? 'Salir Fullscreen' : 'Pantalla Completa'}</span>
            </button>

            <Link
              href="/dashboard/analytics"
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <span>✕</span>
              <span>Salir</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Grid Content */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 pt-6 overflow-hidden min-h-0">
        {/* Columna Izquierda: KPIs Gigantes */}
        <div className="lg:col-span-2 flex flex-col gap-6 justify-between min-h-0">
          {/* Card Principal: Ventas de Hoy */}
          <div className="bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 border border-zinc-800 rounded-3xl p-8 relative overflow-hidden shadow-2xl flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-amber-400 uppercase tracking-widest block">
                  Facturación Total de Hoy
                </span>
                <div className="flex items-baseline gap-4 mt-2">
                  <span className="font-mono text-5xl sm:text-6xl font-black text-white tracking-tight drop-shadow-md">
                    ${todayRevenue.toLocaleString('es-CO')}
                  </span>
                  <span className="text-sm font-semibold text-zinc-400">COP</span>
                </div>
              </div>

              {/* Indicador de Meta */}
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-xs text-zinc-400">Meta del Día</span>
                <span className="font-mono text-xl font-bold text-zinc-200">
                  ${dailyGoal.toLocaleString('es-CO')}
                </span>
                <span className="text-xs font-bold text-emerald-400 font-mono mt-1">
                  {goalProgress}% Completado
                </span>
              </div>
            </div>

            {/* Barra de progreso hacia la meta diaria */}
            <div className="mt-8 space-y-2">
              <div className="w-full h-3.5 bg-zinc-950 rounded-full overflow-hidden p-0.5 border border-zinc-800">
                <div
                  style={{ width: `${goalProgress}%` }}
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all duration-1000 shadow-md shadow-amber-500/20"
                />
              </div>
              <div className="flex justify-between text-xs text-zinc-500 font-mono">
                <span>0 COP</span>
                <span>Objetivo Diario: ${dailyGoal.toLocaleString('es-CO')}</span>
              </div>
            </div>
          </div>

          {/* Grid de 3 KPIs Secundarios */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
              <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold">
                <span>Comandas Cerradas</span>
                <span className="text-xl">🧾</span>
              </div>
              <div className="mt-3">
                <span className="font-mono text-3xl font-black text-white">
                  {todayInvoices}
                </span>
                <p className="text-[11px] text-zinc-500 mt-1">Cuentas pagadas hoy</p>
              </div>
            </div>

            <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
              <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold">
                <span>Ticket Promedio</span>
                <span className="text-xl">💳</span>
              </div>
              <div className="mt-3">
                <span className="font-mono text-3xl font-black text-emerald-400">
                  ${todayTicket.toLocaleString('es-CO')}
                </span>
                <p className="text-[11px] text-zinc-500 mt-1">Por mesa / comanda</p>
              </div>
            </div>

            <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
              <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold">
                <span>Mesas Ocupadas</span>
                <span className="text-xl">🪑</span>
              </div>
              <div className="mt-3">
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-3xl font-black text-amber-400">
                    {occupiedTables}
                  </span>
                  <span className="text-sm font-semibold text-zinc-400 font-mono">
                    / {totalTables}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 mt-1">
                  {totalTables > 0 ? Math.round((occupiedTables / totalTables) * 100) : 0}% del aforo en salón
                </p>
              </div>
            </div>
          </div>

          {/* Mini Gráfico de Barras por Hora de Hoy */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 shadow-lg flex-1 min-h-[140px] flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-zinc-400 font-semibold mb-2">
              <span className="flex items-center gap-2">
                <span>📊</span> Curva de Facturación Horaria (Jornada Actual)
              </span>
              <span className="font-mono text-zinc-500 text-[11px]">Intervalo: 08:00 - 23:00</span>
            </div>

            {/* Barras SVG de Hoy */}
            <div className="flex-1 flex items-end gap-1.5 pt-2">
              {data?.salesByHour.slice(8, 24).map((h) => {
                const maxHour = Math.max(...(data?.salesByHour.map((x) => x.totalSales) || [1]), 1)
                const heightPct = Math.max(6, Math.round((h.totalSales / maxHour) * 100))
                const isCurrent = currentTime.getHours() === h.hour

                return (
                  <div key={h.hour} className="flex-1 flex flex-col items-center gap-1 group">
                    <div
                      style={{ height: `${heightPct}%` }}
                      className={`w-full rounded-t-sm transition-all ${
                        isCurrent
                          ? 'bg-amber-400 shadow-md shadow-amber-400/30'
                          : h.totalSales > 0
                          ? 'bg-zinc-700 hover:bg-zinc-600'
                          : 'bg-zinc-850'
                      }`}
                      title={`${h.hourLabel}: $${h.totalSales.toLocaleString('es-CO')}`}
                    />
                    <span className={`text-[9px] font-mono ${isCurrent ? 'text-amber-400 font-bold' : 'text-zinc-600'}`}>
                      {h.hour}h
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Columna Derecha: Platos Más Pedidos & Canales */}
        <div className="flex flex-col gap-6 justify-between min-h-0">
          {/* Top Platos de la Jornada */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl flex-1 flex flex-col justify-between overflow-hidden">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>⭐</span> Platos Estrella del Día
              </h3>
              <span className="text-[10px] text-zinc-500 font-mono uppercase">Top Ventas</span>
            </div>

            <div className="space-y-3 pt-3 overflow-y-auto pr-1 flex-1">
              {data?.topProducts && data.topProducts.length > 0 ? (
                data.topProducts.map((p, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-zinc-950/80 border border-zinc-800/80 rounded-2xl flex items-center justify-between gap-3 shadow-sm"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-7 h-7 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-xs text-amber-400 shrink-0 font-mono">
                        #{idx + 1}
                      </span>
                      <div className="truncate">
                        <p className="font-bold text-xs text-white truncate">{p.name}</p>
                        <p className="text-[11px] text-zinc-400 font-mono">
                          {p.quantity} pedidos hoy
                        </p>
                      </div>
                    </div>
                    <span className="font-mono font-bold text-sm text-emerald-400 shrink-0">
                      ${p.revenue.toLocaleString('es-CO')}
                    </span>
                  </div>
                ))
              ) : (
                <div className="h-full flex items-center justify-center text-zinc-600 text-xs">
                  Aún no hay comandas despachadas hoy.
                </div>
              )}
            </div>
          </div>

          {/* Desglose por Canal de Servicio */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>🛵</span> Mix de Servicio en Vivo
            </h3>

            <div className="grid grid-cols-3 gap-2 text-center">
              {data?.serviceChannels.map((ch) => (
                <div key={ch.channel} className="p-3 bg-zinc-950 rounded-2xl border border-zinc-800/80">
                  <span className="text-lg block mb-1">
                    {ch.channel === 'DINE_IN' ? '🍽️' : ch.channel === 'BAR' ? '🍸' : '🛵'}
                  </span>
                  <span className="text-[10px] text-zinc-400 block truncate">
                    {ch.channel === 'DINE_IN' ? 'Salón' : ch.channel === 'BAR' ? 'Barra' : 'Delivery'}
                  </span>
                  <span className="font-mono font-black text-sm text-white block mt-0.5">
                    {ch.percentage}%
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    ${(ch.revenue / 1000).toFixed(0)}k
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
