'use client'

import { useState, useEffect } from 'react'
import { PLReportData } from '@/lib/accounting/types'

export default function PLReportPage() {
  const [report, setReport] = useState<PLReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)) // YYYY-MM

  const fetchReport = async (monthStr: string) => {
    try {
      setLoading(true)
      const [year, month] = monthStr.split('-').map(Number)
      const startDate = new Date(year, month - 1, 1).toISOString()
      const endDate = new Date(year, month, 0, 23, 59, 59, 999).toISOString()

      const res = await fetch(`/api/accounting/reports/pl?startDate=${startDate}&endDate=${endDate}&label=${monthStr}`)
      if (!res.ok) throw new Error('Error al cargar reporte P&L')
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

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">📊</span>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Estado de Resultados (P&L)
            </h1>
          </div>
          <p className="text-sm text-zinc-400 mt-1">
            Informe financiero de ingresos, costos de materia prima y gastos operacionales.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
          />
          <button
            onClick={() => window.print()}
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition"
          >
            🖨️ Imprimir
          </button>
        </div>
      </div>

      {loading || !report ? (
        <div className="p-12 text-center text-zinc-500 bg-zinc-900/40 rounded-xl border border-zinc-800">
          Generando estado de resultados...
        </div>
      ) : (
        <div className="space-y-6">
          {/* Tarjetas resumen de alto nivel */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-zinc-900/90 border border-zinc-800 p-5 rounded-xl">
              <span className="text-xs text-zinc-500 uppercase font-semibold">1. Ventas Netas</span>
              <p className="text-2xl font-black text-white mt-1">
                ${report.revenue.netSales.toLocaleString('es-CO')}
              </p>
              <span className="text-[11px] text-zinc-500">100% de la base</span>
            </div>

            <div className="bg-zinc-900/90 border border-zinc-800 p-5 rounded-xl">
              <span className="text-xs text-zinc-500 uppercase font-semibold">2. Utilidad Bruta</span>
              <p className="text-2xl font-black text-amber-400 mt-1">
                ${report.costOfSales.grossProfit.toLocaleString('es-CO')}
              </p>
              <span className="text-[11px] text-zinc-400">
                Margen Bruto: {report.costOfSales.grossMarginPercent.toFixed(1)}%
              </span>
            </div>

            <div className="bg-zinc-900/90 border border-zinc-800 p-5 rounded-xl">
              <span className="text-xs text-zinc-500 uppercase font-semibold">3. Utilidad Neta (EBITDA)</span>
              <p
                className={`text-2xl font-black mt-1 ${
                  report.netOperatingIncome >= 0 ? 'text-emerald-400' : 'text-red-400'
                }`}
              >
                ${report.netOperatingIncome.toLocaleString('es-CO')}
              </p>
              <span className="text-[11px] text-zinc-400">
                Margen Neto: {report.netMarginPercent.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Desglose Detallado Estilo Contable */}
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-6 space-y-6">
            {/* SECCIÓN INGRESOS */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-3">
                (+) INGRESOS OPERACIONALES
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-1.5 border-b border-zinc-800/60 text-zinc-300">
                  <span>Ventas Brutas ({report.revenue.invoicesCount} facturas pagadas)</span>
                  <span>${report.revenue.grossSales.toLocaleString('es-CO')}</span>
                </div>
                {report.revenue.discountTotal > 0 && (
                  <div className="flex justify-between py-1.5 border-b border-zinc-800/60 text-red-400">
                    <span>(-) Descuentos y Promociones</span>
                    <span>-${report.revenue.discountTotal.toLocaleString('es-CO')}</span>
                  </div>
                )}
                <div className="flex justify-between py-2 font-bold text-white bg-zinc-950/60 px-3 rounded-lg">
                  <span>(=) VENTAS NETAS</span>
                  <span>${report.revenue.netSales.toLocaleString('es-CO')}</span>
                </div>
              </div>
            </div>

            {/* SECCIÓN COSTO DE VENTAS */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-3">
                (-) COSTO DE MATERIA PRIMA E INSUMOS (COGS)
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-1.5 border-b border-zinc-800/60 text-zinc-300">
                  <span>Compras de Alimentos, Carnes y Verduras</span>
                  <span>${report.costOfSales.foodAndBeveragePurchases.toLocaleString('es-CO')}</span>
                </div>
                <div className="flex justify-between py-2 font-bold text-amber-300 bg-zinc-950/60 px-3 rounded-lg">
                  <span>(=) UTILIDAD BRUTA</span>
                  <span>
                    ${report.costOfSales.grossProfit.toLocaleString('es-CO')}{' '}
                    <span className="text-xs font-normal text-zinc-400">
                      ({report.costOfSales.grossMarginPercent.toFixed(1)}%)
                    </span>
                  </span>
                </div>
              </div>
            </div>

            {/* SECCIÓN GASTOS OPERACIONALES */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-red-400 mb-3">
                (-) GASTOS OPERACIONALES (OPEX)
              </h3>
              <div className="space-y-2 text-sm">
                {report.operatingExpenses.byCategory.length === 0 ? (
                  <p className="text-xs text-zinc-500 italic py-2">
                    No hay gastos operacionales registrados en este período.
                  </p>
                ) : (
                  report.operatingExpenses.byCategory.map((cat) => (
                    <div
                      key={cat.category}
                      className="flex justify-between py-1.5 border-b border-zinc-800/60 text-zinc-300"
                    >
                      <span>
                        {cat.categoryLabel} ({cat.count} registros)
                      </span>
                      <span>${cat.totalAmount.toLocaleString('es-CO')}</span>
                    </div>
                  ))
                )}
                <div className="flex justify-between py-2 font-semibold text-red-300 bg-zinc-950/40 px-3 rounded-lg">
                  <span>Total Gastos Operativos</span>
                  <span>-${report.operatingExpenses.totalOpex.toLocaleString('es-CO')}</span>
                </div>
              </div>
            </div>

            {/* UTILIDAD NETA FINAL */}
            <div className="pt-4 border-t-2 border-zinc-700">
              <div className="flex justify-between items-center bg-zinc-950 p-4 rounded-xl border border-zinc-700">
                <div>
                  <h4 className="text-base font-black text-white">UTILIDAD NETA OPERACIONAL</h4>
                  <p className="text-xs text-zinc-400">
                    Resultado final antes de impuestos a la renta
                  </p>
                </div>
                <div className="text-right">
                  <p
                    className={`text-2xl font-black ${
                      report.netOperatingIncome >= 0 ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    ${report.netOperatingIncome.toLocaleString('es-CO')}
                  </p>
                  <span className="text-xs font-bold text-zinc-400">
                    {report.netMarginPercent.toFixed(1)}% margen neto
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
