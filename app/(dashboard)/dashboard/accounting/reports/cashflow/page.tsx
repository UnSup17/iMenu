'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { CashflowReportData } from '@/lib/accounting/types'

export default function CashflowReportPage() {
  const [report, setReport] = useState<CashflowReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)) // YYYY-MM

  const fetchReport = async (monthStr: string) => {
    try {
      setLoading(true)
      const [year, month] = monthStr.split('-').map(Number)
      const startDate = new Date(year, month - 1, 1).toISOString()
      const endDate = new Date(year, month, 0, 23, 59, 59, 999).toISOString()

      const res = await fetch(
        `/api/accounting/reports/cashflow?startDate=${startDate}&endDate=${endDate}&label=${monthStr}`
      )
      if (!res.ok) throw new Error('Error al cargar reporte de Flujo de Caja')
      const data = await res.json()
      setReport(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReport(selectedMonth)
  }, [selectedMonth])

  // Compute SVG chart metrics
  const maxDayAmount = report
    ? Math.max(
        ...report.dailyTrend.map((d) => Math.max(d.inflows, d.outflows)),
        1
      )
    : 1

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/accounting/reports"
              className="text-zinc-400 hover:text-white text-sm mr-1"
            >
              ← Hub
            </Link>
            <span className="text-2xl">💧</span>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Reporte de Flujo de Caja (Cashflow)
            </h1>
          </div>
          <p className="text-sm text-zinc-400 mt-1">
            Entradas reales de efectivo, salidas operativas y liquidez neta del período.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
          />
          <a
            href={`/api/export/accounting/cashflow?month=${selectedMonth}`}
            download
            className="px-3.5 py-2 text-sm font-semibold rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition flex items-center gap-1.5"
          >
            <span>📥</span>
            <span>Excel</span>
          </a>
          <button
            onClick={() => window.print()}
            className="px-3.5 py-2 text-sm font-semibold rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition flex items-center gap-1.5"
          >
            <span>🖨️</span>
            <span>Imprimir</span>
          </button>
        </div>
      </div>

      {loading || !report ? (
        <div className="p-16 text-center text-zinc-500 bg-zinc-900/40 rounded-2xl border border-zinc-800">
          <p className="text-3xl mb-3 animate-pulse">💧</p>
          <p>Calculando flujo de caja en tiempo real...</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-zinc-900/90 border border-zinc-800 p-5 rounded-xl">
              <span className="text-xs text-emerald-400 uppercase font-bold tracking-wider">
                Total Entradas (+)
              </span>
              <p className="text-2xl font-black text-white mt-1">
                ${report.summary.totalInflows.toLocaleString('es-CO')}
              </p>
              <span className="text-[11px] text-zinc-500">
                {report.summary.inflowTransactionsCount} cobros registrados
              </span>
            </div>

            <div className="bg-zinc-900/90 border border-zinc-800 p-5 rounded-xl">
              <span className="text-xs text-red-400 uppercase font-bold tracking-wider">
                Total Salidas (-)
              </span>
              <p className="text-2xl font-black text-white mt-1">
                ${report.summary.totalOutflows.toLocaleString('es-CO')}
              </p>
              <span className="text-[11px] text-zinc-500">
                {report.summary.outflowTransactionsCount} gastos operativos
              </span>
            </div>

            <div
              className={`p-5 rounded-xl border ${
                report.summary.netCashflow >= 0
                  ? 'bg-emerald-950/20 border-emerald-800/80 text-emerald-100'
                  : 'bg-red-950/20 border-red-800/80 text-red-100'
              }`}
            >
              <span className="text-xs uppercase font-bold tracking-wider opacity-80">
                Flujo Neto de Caja
              </span>
              <p
                className={`text-2xl font-black mt-1 ${
                  report.summary.netCashflow >= 0 ? 'text-emerald-400' : 'text-red-400'
                }`}
              >
                ${report.summary.netCashflow.toLocaleString('es-CO')}
              </p>
              <span className="text-[11px] opacity-75">
                {report.summary.netCashflow >= 0 ? '🟢 Superávit de liquidez' : '🔴 Déficit de caja'}
              </span>
            </div>

            <div className="bg-zinc-900/90 border border-zinc-800 p-5 rounded-xl">
              <span className="text-xs text-amber-400 uppercase font-bold tracking-wider">
                Margen de Conversión
              </span>
              <p className="text-2xl font-black text-amber-400 mt-1">
                {report.summary.cashConversionRatio}%
              </p>
              <span className="text-[11px] text-zinc-500">
                Efectivo neto retenido de ventas
              </span>
            </div>
          </div>

          {/* Daily Cashflow Trend Visualizer */}
          <div className="bg-zinc-900/80 border border-zinc-800 p-6 rounded-2xl shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-bold text-white text-base">Evolución Diaria de Caja</h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Comparativa de ingresos (verde) vs. egresos (rojo) por día
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <span className="w-3 h-3 rounded bg-emerald-500 inline-block" />
                  <span>Entradas</span>
                </span>
                <span className="flex items-center gap-1.5 text-red-400">
                  <span className="w-3 h-3 rounded bg-red-500 inline-block" />
                  <span>Salidas</span>
                </span>
              </div>
            </div>

            {/* Daily Bar Chart */}
            <div className="h-44 flex items-end gap-1.5 pt-6 pb-2 border-b border-zinc-800 overflow-x-auto">
              {report.dailyTrend.map((day) => {
                const inHeight = Math.max(4, Math.round((day.inflows / maxDayAmount) * 120))
                const outHeight = Math.max(4, Math.round((day.outflows / maxDayAmount) * 120))

                return (
                  <div
                    key={day.date}
                    className="flex-1 min-w-[20px] flex flex-col items-center gap-1 group relative"
                  >
                    {/* Tooltip */}
                    <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center z-20 pointer-events-none">
                      <div className="bg-zinc-900 border border-zinc-700 text-white text-[11px] py-1 px-2 rounded shadow-2xl whitespace-nowrap">
                        <p className="font-bold">{day.date}</p>
                        <p className="text-emerald-400">
                          +${day.inflows.toLocaleString('es-CO')}
                        </p>
                        <p className="text-red-400">
                          -${day.outflows.toLocaleString('es-CO')}
                        </p>
                        <p
                          className={
                            day.net >= 0 ? 'text-emerald-300 font-bold' : 'text-red-300 font-bold'
                          }
                        >
                          Neto: ${day.net.toLocaleString('es-CO')}
                        </p>
                      </div>
                    </div>

                    <div className="w-full flex items-end justify-center gap-0.5">
                      <div
                        style={{ height: `${day.inflows > 0 ? inHeight : 2}px` }}
                        className="w-1/2 bg-emerald-500/80 rounded-t hover:bg-emerald-400 transition-all"
                      />
                      <div
                        style={{ height: `${day.outflows > 0 ? outHeight : 2}px` }}
                        className="w-1/2 bg-red-500/80 rounded-t hover:bg-red-400 transition-all"
                      />
                    </div>
                    <span className="text-[9px] text-zinc-500 font-mono">
                      {day.date.slice(-2)}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Breakdown Tables (Side by Side) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Inflows Breakdown */}
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden">
              <div className="p-4 bg-zinc-900/90 border-b border-zinc-800 flex items-center justify-between">
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <span>📥</span> Entradas por Medio de Pago
                </h3>
                <span className="text-xs font-mono text-emerald-400 font-semibold">
                  +${report.inflows.total.toLocaleString('es-CO')}
                </span>
              </div>
              <div className="p-4 space-y-3">
                {report.inflows.byMethod.length === 0 ? (
                  <p className="text-xs text-zinc-500 py-6 text-center">
                    Sin cobros registrados en este período
                  </p>
                ) : (
                  report.inflows.byMethod.map((item) => (
                    <div key={item.method} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-zinc-300 font-medium">
                          {item.methodLabel}{' '}
                          <span className="text-zinc-500">({item.count})</span>
                        </span>
                        <span className="font-mono text-white font-semibold">
                          ${item.amount.toLocaleString('es-CO')}{' '}
                          <span className="text-zinc-500 text-[11px]">
                            ({item.percentOfTotal}%)
                          </span>
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${item.percentOfTotal}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Outflows Breakdown */}
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden">
              <div className="p-4 bg-zinc-900/90 border-b border-zinc-800 flex items-center justify-between">
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <span>📤</span> Salidas por Concepto de Gasto
                </h3>
                <span className="text-xs font-mono text-red-400 font-semibold">
                  -${report.outflows.total.toLocaleString('es-CO')}
                </span>
              </div>
              <div className="p-4 space-y-3">
                {report.outflows.byCategory.length === 0 ? (
                  <p className="text-xs text-zinc-500 py-6 text-center">
                    Sin gastos registrados en este período
                  </p>
                ) : (
                  report.outflows.byCategory.map((item) => (
                    <div key={item.category} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-zinc-300 font-medium">
                          {item.categoryLabel}{' '}
                          <span className="text-zinc-500">({item.count})</span>
                        </span>
                        <span className="font-mono text-white font-semibold">
                          ${item.amount.toLocaleString('es-CO')}{' '}
                          <span className="text-zinc-500 text-[11px]">
                            ({item.percentOfTotal}%)
                          </span>
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-red-500 rounded-full"
                          style={{ width: `${item.percentOfTotal}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
