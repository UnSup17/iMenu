'use client'

import { useState, useEffect } from 'react'

interface PeriodItem {
  id: string
  year: number
  month: number
  isClosed: boolean
  closedAt: string | null
  totalRevenue: string | number
  totalExpenses: string | number
  grossProfit: string | number
  vatCollected: string | number
  vatPaid: string | number
  vatOwed: string | number
  closedBy?: {
    name: string | null
    email: string | null
  }
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

export default function AccountingPeriodsPage() {
  const [periods, setPeriods] = useState<PeriodItem[]>([])
  const [loading, setLoading] = useState(true)
  const [closeLoading, setCloseLoading] = useState(false)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchPeriods = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/accounting/periods')
      if (!res.ok) throw new Error('Error al cargar períodos contables')
      const data = await res.json()
      setPeriods(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPeriods()
  }, [])

  const handleClosePeriod = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setCloseLoading(true)

    try {
      const res = await fetch('/api/accounting/periods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year: Number(selectedYear),
          month: Number(selectedMonth),
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al cerrar el período')
      }

      setMessage(`¡Período ${MONTH_NAMES[selectedMonth - 1]} ${selectedYear} cerrado exitosamente!`)
      fetchPeriods()
    } catch (err: any) {
      setError(err.message || 'Error al procesar el cierre de período')
    } finally {
      setCloseLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="border-b border-zinc-800/80 pb-6">
        <div className="flex items-center gap-2">
          <span className="text-2xl">📅</span>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Períodos Contables Mensuales
          </h1>
        </div>
        <p className="text-sm text-zinc-400 mt-1">
          Consolidación mensual oficial de ingresos, gastos e IVA para auditoría y archivo fiscal.
        </p>
      </div>

      {/* Formulario de Cierre de Período */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-6 space-y-4">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <span>🔒</span> Cerrar y Consolidar Nuevo Período
        </h2>
        <p className="text-xs text-zinc-400">
          Al cerrar un período, el sistema calcula de forma definitiva las ventas netas, costos, IVA generado e IVA descontable del mes seleccionado.
        </p>

        {message && (
          <div className="p-3 bg-emerald-950/60 border border-emerald-800 rounded-lg text-xs text-emerald-300">
            {message}
          </div>
        )}
        {error && (
          <div className="p-3 bg-red-950/60 border border-red-800 rounded-lg text-xs text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleClosePeriod} className="flex flex-col sm:flex-row items-center gap-4 pt-2">
          <div className="w-full sm:w-48">
            <label className="block text-xs text-zinc-400 mb-1">Año</label>
            <input
              type="number"
              min="2020"
              max="2050"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
              required
            />
          </div>

          <div className="w-full sm:w-56">
            <label className="block text-xs text-zinc-400 mb-1">Mes</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
              required
            >
              {MONTH_NAMES.map((name, idx) => (
                <option key={name} value={idx + 1}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div className="w-full sm:w-auto self-end pt-1">
            <button
              type="submit"
              disabled={closeLoading}
              className="w-full sm:w-auto px-6 py-2.5 text-sm font-bold rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 transition disabled:opacity-50"
            >
              {closeLoading ? 'Calculando y Cerrando...' : 'Cerrar Período'}
            </button>
          </div>
        </form>
      </div>

      {/* Historial de Períodos Cerrados */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
          <h2 className="text-sm font-bold text-white">
            Histórico de Períodos Contables
          </h2>
          <span className="text-xs text-zinc-500">{periods.length} períodos</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-300">
            <thead className="bg-zinc-950/60 text-xs uppercase text-zinc-400 border-b border-zinc-800">
              <tr>
                <th className="px-4 py-3">Período</th>
                <th className="px-4 py-3 text-right">Ventas Netas</th>
                <th className="px-4 py-3 text-right">Gastos Totales</th>
                <th className="px-4 py-3 text-right">Utilidad Bruta</th>
                <th className="px-4 py-3 text-right">IVA Generado</th>
                <th className="px-4 py-3 text-right">IVA Descontable</th>
                <th className="px-4 py-3 text-right">Saldo DIAN</th>
                <th className="px-4 py-3 text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-zinc-500">
                    Cargando períodos contables...
                  </td>
                </tr>
              ) : periods.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-zinc-500">
                    No hay períodos contables cerrados todavía.
                  </td>
                </tr>
              ) : (
                periods.map((p) => (
                  <tr key={p.id} className="hover:bg-zinc-800/40 transition">
                    <td className="px-4 py-3 font-bold text-white whitespace-nowrap">
                      {MONTH_NAMES[p.month - 1]} {p.year}
                    </td>
                    <td className="px-4 py-3 text-right text-emerald-400 font-semibold whitespace-nowrap">
                      ${Number(p.totalRevenue).toLocaleString('es-CO')}
                    </td>
                    <td className="px-4 py-3 text-right text-red-400 text-xs whitespace-nowrap">
                      ${Number(p.totalExpenses).toLocaleString('es-CO')}
                    </td>
                    <td className="px-4 py-3 text-right text-amber-300 font-medium whitespace-nowrap">
                      ${Number(p.grossProfit).toLocaleString('es-CO')}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-zinc-400 whitespace-nowrap">
                      ${Number(p.vatCollected).toLocaleString('es-CO')}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-zinc-400 whitespace-nowrap">
                      ${Number(p.vatPaid).toLocaleString('es-CO')}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-white whitespace-nowrap">
                      ${Number(p.vatOwed).toLocaleString('es-CO')}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-emerald-950 text-emerald-300 border border-emerald-800/60">
                        🔒 Cerrado
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
  )
}
