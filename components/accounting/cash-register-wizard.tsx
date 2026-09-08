'use client'

import { useState, useEffect } from 'react'
import { CashRegisterLiveSummary } from '@/lib/accounting/types'

interface CashRegisterWizardProps {
  onSuccess?: () => void
  onCancel?: () => void
}

export function CashRegisterWizard({ onSuccess, onCancel }: CashRegisterWizardProps) {
  const [openingBalance, setOpeningBalance] = useState('100000') // $100.000 base default
  const [actualCash, setActualCash] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [fetchingSummary, setFetchingSummary] = useState(true)
  const [summary, setSummary] = useState<CashRegisterLiveSummary | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchSummary = async (baseVal: string) => {
    try {
      setFetchingSummary(true)
      const baseNum = parseFloat(baseVal) || 0
      const res = await fetch(`/api/accounting/cash-register/current?openingBalance=${baseNum}`)
      if (!res.ok) throw new Error('Error al obtener datos en vivo de caja')
      const data: CashRegisterLiveSummary = await res.json()
      setSummary(data)
    } catch (err: any) {
      console.error(err)
      setError(err.message)
    } finally {
      setFetchingSummary(false)
    }
  }

  useEffect(() => {
    fetchSummary(openingBalance)
  }, [])

  const handleBaseChange = (val: string) => {
    setOpeningBalance(val)
    fetchSummary(val)
  }

  const expectedCash = summary ? summary.expectedCashInDrawer : 0
  const countedCash = parseFloat(actualCash) || 0
  const difference = countedCash - expectedCash

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!summary) return
    setError(null)
    setLoading(true)

    try {
      const res = await fetch('/api/accounting/cash-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: summary.date,
          openingBalance: summary.openingBalance,
          cashSales: summary.salesByMethod.cash,
          cardSales: summary.salesByMethod.card,
          transferSales: summary.salesByMethod.transfer,
          qrSales: summary.salesByMethod.qr,
          otherSales: summary.salesByMethod.other,
          totalIncome: summary.salesByMethod.total,
          totalExpenses: summary.expensesInCash,
          expectedCash,
          actualCash: countedCash,
          difference,
          notes: notes || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al guardar el cierre de caja')
      }

      onSuccess?.()
    } catch (err: any) {
      setError(err.message || 'Error al procesar el cierre')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 text-zinc-100">
      {error && (
        <div className="p-3 bg-red-950/60 border border-red-800/80 rounded-lg text-xs text-red-300">
          {error}
        </div>
      )}

      {/* 1. Base inicial y Ventas en Vivo */}
      <div className="bg-zinc-900/90 border border-zinc-800 p-4 rounded-xl space-y-4">
        <h3 className="text-sm font-semibold text-amber-400 flex items-center gap-2">
          <span>1.</span> Resumen de Movimientos Registrados Hoy
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">
              Base Inicial en Caja (Efectivo de Apertura) *
            </label>
            <input
              type="number"
              min="0"
              step="1000"
              value={openingBalance}
              onChange={(e) => handleBaseChange(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
              required
            />
          </div>

          <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-lg p-3 flex flex-col justify-center">
            <span className="text-xs text-zinc-500">Facturas Cobradas Hoy</span>
            <span className="text-lg font-bold text-zinc-200">
              {summary ? `${summary.invoicesPaidCount} facturas` : '...'}
            </span>
          </div>
        </div>

        {/* Desglose por método de pago */}
        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-zinc-800/80">
            <div className="bg-zinc-950/80 p-2.5 rounded-lg border border-emerald-950/60">
              <p className="text-[11px] text-zinc-400">Efectivo Cobrado</p>
              <p className="text-sm font-bold text-emerald-400">
                ${summary.salesByMethod.cash.toLocaleString('es-CO')}
              </p>
            </div>
            <div className="bg-zinc-950/80 p-2.5 rounded-lg border border-blue-950/60">
              <p className="text-[11px] text-zinc-400">Tarjetas Débito/Crédito</p>
              <p className="text-sm font-bold text-blue-400">
                ${summary.salesByMethod.card.toLocaleString('es-CO')}
              </p>
            </div>
            <div className="bg-zinc-950/80 p-2.5 rounded-lg border border-purple-950/60">
              <p className="text-[11px] text-zinc-400">Transferencias (Nequi/Davi)</p>
              <p className="text-sm font-bold text-purple-400">
                ${summary.salesByMethod.transfer.toLocaleString('es-CO')}
              </p>
            </div>
            <div className="bg-zinc-950/80 p-2.5 rounded-lg border border-amber-950/60">
              <p className="text-[11px] text-zinc-400">Códigos QR</p>
              <p className="text-sm font-bold text-amber-400">
                ${summary.salesByMethod.qr.toLocaleString('es-CO')}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 2. Arqueo y Cuadre de Efectivo */}
      <div className="bg-zinc-900/90 border border-zinc-800 p-4 rounded-xl space-y-4">
        <h3 className="text-sm font-semibold text-amber-400 flex items-center gap-2">
          <span>2.</span> Arqueo Físico y Cuadre de Caja
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-zinc-950/90 border border-zinc-800 p-3 rounded-lg space-y-2">
            <div className="flex justify-between text-xs text-zinc-400">
              <span>(+) Base de apertura:</span>
              <span>${(parseFloat(openingBalance) || 0).toLocaleString('es-CO')}</span>
            </div>
            <div className="flex justify-between text-xs text-zinc-400">
              <span>(+) Ventas en efectivo:</span>
              <span>${(summary?.salesByMethod.cash || 0).toLocaleString('es-CO')}</span>
            </div>
            <div className="flex justify-between text-xs text-red-400">
              <span>(-) Gastos de caja registrados:</span>
              <span>-${(summary?.expensesInCash || 0).toLocaleString('es-CO')}</span>
            </div>
            <div className="pt-2 border-t border-zinc-800 flex justify-between font-semibold text-sm text-zinc-200">
              <span>(=) Efectivo Teórico Esperado:</span>
              <span className="text-amber-400">${expectedCash.toLocaleString('es-CO')}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              Efectivo Físico Contado en Caja ($ COP) *
            </label>
            <input
              type="number"
              min="0"
              step="100"
              placeholder="Ej: 540000"
              value={actualCash}
              onChange={(e) => setActualCash(e.target.value)}
              className="w-full bg-zinc-950 border border-amber-500/80 rounded-lg px-3 py-2.5 text-base font-bold text-amber-300 focus:outline-none focus:ring-1 focus:ring-amber-500"
              required
            />

            {/* Alerta de descuadre */}
            {actualCash !== '' && (
              <div
                className={`mt-3 p-3 rounded-lg border text-xs font-medium ${
                  difference === 0
                    ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                    : difference > 0
                    ? 'bg-blue-950/60 border-blue-800 text-blue-300'
                    : 'bg-red-950/60 border-red-800 text-red-300'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span>
                    {difference === 0
                      ? '✨ Cuadre Perfecto (Sin diferencia)'
                      : difference > 0
                      ? `🟢 Sobrante en caja (+${difference.toLocaleString('es-CO')})`
                      : `🔴 Faltante en caja (-${Math.abs(difference).toLocaleString('es-CO')})`}
                  </span>
                  <span className="font-bold">
                    ${Math.abs(difference).toLocaleString('es-CO')}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">
            Observaciones o Justificación de Descuadre (Opcional)
          </label>
          <textarea
            rows={2}
            placeholder="Ej: Se entregó vuelto incorrecto en la mesa 3..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-sm rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80 transition"
          >
            Cancelar
          </button>
        )}
        <button
          type="submit"
          disabled={loading || fetchingSummary || actualCash === ''}
          className="px-6 py-2.5 text-sm font-bold rounded-lg bg-amber-500 text-zinc-950 hover:bg-amber-400 transition disabled:opacity-50"
        >
          {loading ? 'Cerrando Caja...' : '🔒 Confirmar y Cerrar Caja de Hoy'}
        </button>
      </div>
    </form>
  )
}
