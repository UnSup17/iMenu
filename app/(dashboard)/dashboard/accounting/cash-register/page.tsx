'use client'

import { useState, useEffect } from 'react'
import { CashRegisterWizard } from '@/components/accounting/cash-register-wizard'

interface RegisterCloseItem {
  id: string
  date: string
  openingBalance: string | number
  cashSales: string | number
  cardSales: string | number
  transferSales: string | number
  qrSales: string | number
  totalIncome: string | number
  totalExpenses: string | number
  expectedCash: string | number
  actualCash: string | number
  difference: string | number
  notes: string | null
  createdAt: string
  closedBy: {
    name: string | null
    email: string | null
  }
}

export default function CashRegisterPage() {
  const [closes, setCloses] = useState<RegisterCloseItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showWizard, setShowWizard] = useState(false)

  const fetchCloses = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/accounting/cash-register')
      if (!res.ok) throw new Error('Error al cargar cierres de caja')
      const data = await res.json()
      setCloses(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCloses()
  }, [])

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🔒</span>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Cierre y Arqueo Diario de Caja
            </h1>
          </div>
          <p className="text-sm text-zinc-400 mt-1">
            Control de flujo diario de efectivo, conciliación con ventas electrónicas y auditoría de diferencias.
          </p>
        </div>

        <button
          onClick={() => setShowWizard(true)}
          className="px-5 py-2.5 text-sm font-bold rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 transition flex items-center gap-2 shadow-lg shadow-amber-500/10"
        >
          <span>🔒</span>
          <span>Nuevo Cierre de Caja</span>
        </button>
      </div>

      {/* Historial de Cierres */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-sm font-bold text-white">
            Historial de Arqueos y Cierres Registrados
          </h2>
          <span className="text-xs text-zinc-500">{closes.length} cierres totales</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-300">
            <thead className="bg-zinc-950/60 text-xs uppercase text-zinc-400 border-b border-zinc-800">
              <tr>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Responsable</th>
                <th className="px-4 py-3 text-right">Base Inicial</th>
                <th className="px-4 py-3 text-right">Ventas Efectivo</th>
                <th className="px-4 py-3 text-right">Total Ingresos</th>
                <th className="px-4 py-3 text-right">Esperado en Caja</th>
                <th className="px-4 py-3 text-right">Contado Real</th>
                <th className="px-4 py-3 text-center">Diferencia</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-zinc-500">
                    Cargando historial de cierres...
                  </td>
                </tr>
              ) : closes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-zinc-500">
                    No hay cierres de caja registrados aún. Realiza el primer arqueo de hoy.
                  </td>
                </tr>
              ) : (
                closes.map((item) => {
                  const diff = Number(item.difference)
                  return (
                    <tr key={item.id} className="hover:bg-zinc-800/40 transition">
                      <td className="px-4 py-3 font-semibold text-white whitespace-nowrap">
                        {new Date(item.date).toLocaleDateString('es-CO')}
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-300">
                        {item.closedBy.name || item.closedBy.email || 'Admin'}
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-zinc-400">
                        ${Number(item.openingBalance).toLocaleString('es-CO')}
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-emerald-400 font-medium">
                        ${Number(item.cashSales).toLocaleString('es-CO')}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-white">
                        ${Number(item.totalIncome).toLocaleString('es-CO')}
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-zinc-400">
                        ${Number(item.expectedCash).toLocaleString('es-CO')}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-amber-300">
                        ${Number(item.actualCash).toLocaleString('es-CO')}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                            diff === 0
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                              : diff > 0
                              ? 'bg-blue-950 text-blue-300 border border-blue-800/60'
                              : 'bg-red-950 text-red-300 border border-red-800/60'
                          }`}
                        >
                          {diff === 0
                            ? 'Exacto ($0)'
                            : diff > 0
                            ? `+$${diff.toLocaleString('es-CO')}`
                            : `-$${Math.abs(diff).toLocaleString('es-CO')}`}
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Wizard de Cierre de Caja */}
      {showWizard && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 w-full max-w-2xl shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>🔒</span> Asistente de Cierre de Caja y Arqueo
                </h2>
                <p className="text-xs text-zinc-400">
                  Conciliación de pagos del turno y conteo físico del efectivo.
                </p>
              </div>
              <button
                onClick={() => setShowWizard(false)}
                className="text-zinc-400 hover:text-white text-lg leading-none"
              >
                ✕
              </button>
            </div>

            <CashRegisterWizard
              onSuccess={() => {
                setShowWizard(false)
                fetchCloses()
              }}
              onCancel={() => setShowWizard(false)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
