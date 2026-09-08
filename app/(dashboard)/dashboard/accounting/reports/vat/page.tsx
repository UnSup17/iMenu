'use client'

import { useState, useEffect } from 'react'
import { VatReportData } from '@/lib/accounting/types'

export default function VatReportPage() {
  const [report, setReport] = useState<VatReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7))

  const fetchReport = async (monthStr: string) => {
    try {
      setLoading(true)
      const [year, month] = monthStr.split('-').map(Number)
      const startDate = new Date(year, month - 1, 1).toISOString()
      const endDate = new Date(year, month, 0, 23, 59, 59, 999).toISOString()

      const res = await fetch(`/api/accounting/reports/vat?startDate=${startDate}&endDate=${endDate}&label=${monthStr}`)
      if (!res.ok) throw new Error('Error al cargar reporte de IVA')
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
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🏛️</span>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Reporte Fiscal de IVA — DIAN (Colombia)
            </h1>
          </div>
          <p className="text-sm text-zinc-400 mt-1">
            Borrador auxiliar para la Declaración Bimestral o Cuatrimestral de IVA (Formulario 300).
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
          Calculando reporte de IVA...
        </div>
      ) : (
        <div className="space-y-6">
          {/* Tarjeta de Resumen DIAN */}
          <div
            className={`p-6 rounded-2xl border ${
              report.status === 'PAYABLE_TO_DIAN'
                ? 'bg-red-950/30 border-red-800/80 text-red-100'
                : 'bg-emerald-950/30 border-emerald-800/80 text-emerald-100'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider opacity-80">
                  {report.status === 'PAYABLE_TO_DIAN'
                    ? 'Total Impuesto a Cargo (Saldo a Pagar DIAN)'
                    : 'Saldo a Favor del Contribuyente'}
                </span>
                <p className="text-3xl font-black mt-1">
                  ${Math.abs(report.netVatBalance).toLocaleString('es-CO')}
                </p>
                <p className="text-xs opacity-75 mt-1">
                  Período: {report.periodLabel} (Tarifa general {report.taxRatePercent}%)
                </p>
              </div>

              <div className="sm:text-right">
                <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-zinc-900/90 text-white border border-zinc-700">
                  {report.status === 'PAYABLE_TO_DIAN' ? '🔴 Saldo a Pagar' : '🟢 Saldo a Favor'}
                </span>
              </div>
            </div>
          </div>

          {/* Formulario 300 DIAN - Simulación */}
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-6 space-y-6">
            <div className="border-b border-zinc-800 pb-4 flex justify-between items-center">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Desglose Formulario 300 DIAN
              </h2>
              <span className="text-xs text-zinc-500">Colombia UBL 2.1 Ready</span>
            </div>

            {/* SECCIÓN 1: INGRESOS POR OPERACIONES GRAVADAS */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400">
                1. Ingresos por Operaciones Gravadas (Ventas)
              </h3>
              <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between text-zinc-300">
                  <span>Renglón 27: Ingresos gravados a la tarifa general (19%)</span>
                  <span>${report.salesTaxableBase.toLocaleString('es-CO')}</span>
                </div>
                <div className="flex justify-between text-xs text-zinc-500">
                  <span>Facturas electrónicas emitidas en el período:</span>
                  <span>{report.invoicesCount} facturas</span>
                </div>
                <div className="pt-2 border-t border-zinc-800 flex justify-between font-bold text-white">
                  <span>Renglón 58: Impuesto generado a la tarifa general (19%)</span>
                  <span className="text-emerald-400">
                    ${report.vatCollected.toLocaleString('es-CO')}
                  </span>
                </div>
              </div>
            </div>

            {/* SECCIÓN 2: COMPRAS E IMPUESTOS DESCONTABLES */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-blue-400">
                2. Compras y Gastos (Impuestos Descontables)
              </h3>
              <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between text-zinc-300">
                  <span>Renglón 49: Compras y servicios gravados a la tarifa general</span>
                  <span>${report.expensesTaxableBase.toLocaleString('es-CO')}</span>
                </div>
                <div className="flex justify-between text-xs text-zinc-500">
                  <span>Facturas de proveedores registradas con IVA:</span>
                  <span>{report.expensesCount} compras</span>
                </div>
                <div className="pt-2 border-t border-zinc-800 flex justify-between font-bold text-white">
                  <span>Renglón 75: Total impuestos descontables</span>
                  <span className="text-blue-400">
                    ${report.vatPaid.toLocaleString('es-CO')}
                  </span>
                </div>
              </div>
            </div>

            {/* SECCIÓN 3: LIQUIDACIÓN PRIVADA */}
            <div className="space-y-3 pt-2 border-t border-zinc-800">
              <h3 className="text-xs font-bold uppercase tracking-wider text-purple-400">
                3. Liquidación Privada del Impuesto
              </h3>
              <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-700 space-y-2 text-sm">
                <div className="flex justify-between text-zinc-300">
                  <span>Total IVA Generado (Ventas):</span>
                  <span>${report.vatCollected.toLocaleString('es-CO')}</span>
                </div>
                <div className="flex justify-between text-zinc-300">
                  <span>(-) Total IVA Descontable (Compras):</span>
                  <span>-${report.vatPaid.toLocaleString('es-CO')}</span>
                </div>
                <div className="pt-3 border-t border-zinc-800 flex justify-between items-center text-base font-black text-white">
                  <span>
                    {report.status === 'PAYABLE_TO_DIAN'
                      ? 'Renglón 82: Saldo a pagar por el período fiscal'
                      : 'Renglón 83: Saldo a favor del período fiscal'}
                  </span>
                  <span
                    className={
                      report.status === 'PAYABLE_TO_DIAN' ? 'text-red-400' : 'text-emerald-400'
                    }
                  >
                    ${Math.abs(report.netVatBalance).toLocaleString('es-CO')}
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
