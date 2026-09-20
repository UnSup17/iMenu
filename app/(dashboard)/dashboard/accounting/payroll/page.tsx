'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

interface PayrollRecord {
  id: string
  description: string
  employeeName: string
  employeeId: string | null
  amount: number
  date: string
  registeredBy: string
}

interface PayrollSummary {
  totalRecords: number
  totalLaborCost: number
  averagePerRecord: number
}

export default function PayrollPage() {
  const [records, setRecords] = useState<PayrollRecord[]>([])
  const [summary, setSummary] = useState<PayrollSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7))
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Form state
  const [form, setForm] = useState({
    employeeName: '',
    employeeId: '',
    role: 'Mesero',
    period: new Date().toISOString().slice(0, 7),
    baseSalary: 1300000,
    overtimeAmount: 0,
    transportAllowance: 162000,
    tipsDistributed: 0,
    deductions: 104000, // aprox salud + pensión (8% sobre base en Colombia)
    paymentDate: new Date().toISOString().slice(0, 10),
    paymentMethod: 'TRANSFER' as 'TRANSFER' | 'CASH',
    notes: '',
  })

  // Live calculation of net pay
  const grossEarnings =
    (Number(form.baseSalary) || 0) +
    (Number(form.overtimeAmount) || 0) +
    (Number(form.transportAllowance) || 0) +
    (Number(form.tipsDistributed) || 0)
  const netEarnings = Math.max(0, grossEarnings - (Number(form.deductions) || 0))

  const fetchPayroll = useCallback(async () => {
    try {
      setLoading(true)
      const url = month ? `/api/accounting/payroll?month=${month}` : '/api/accounting/payroll'
      const res = await fetch(url)
      const data = await res.json()
      if (res.ok) {
        setRecords(data.records ?? [])
        setSummary(data.summary ?? null)
      }
    } catch (err) {
      console.error('Error fetching payroll:', err)
    } finally {
      setLoading(false)
    }
  }, [month])

  useEffect(() => {
    fetchPayroll()
  }, [fetchPayroll])

  const handleCreateDisbursement = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setMessage(null)

    try {
      const res = await fetch('/api/accounting/payroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeName: form.employeeName,
          employeeId: form.employeeId || null,
          role: form.role,
          period: form.period,
          baseSalary: Number(form.baseSalary),
          overtimeAmount: Number(form.overtimeAmount),
          transportAllowance: Number(form.transportAllowance),
          tipsDistributed: Number(form.tipsDistributed),
          deductions: Number(form.deductions),
          paymentDate: form.paymentDate,
          paymentMethod: form.paymentMethod,
          notes: form.notes || null,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Error al procesar pago de nómina')
      }

      setMessage({
        type: 'success',
        text: `Pago registrado exitosamente para ${data.employeeName}. Neto: $${data.totalNet.toLocaleString('es-CO')}`,
      })

      // Reset employee specific fields
      setForm((prev) => ({
        ...prev,
        employeeName: '',
        employeeId: '',
        notes: '',
      }))

      setShowModal(false)
      fetchPayroll()
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error de conexión' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/accounting"
              className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              ← Volver a Contabilidad
            </Link>
            <span className="text-zinc-600">/</span>
            <span className="text-xs text-emerald-400 font-medium">Recursos Humanos</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white mt-1">
            Gestión y Dispersión de Nómina
          </h1>
          <p className="text-sm text-zinc-400 mt-0.5">
            Registro simplificado de pagos de salarios, horas extras, auxilio de transporte y propinas.
            Sincronizado automáticamente como egresos contables (Mano de Obra).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5">
            <label htmlFor="month-picker" className="text-xs text-zinc-400">
              Período:
            </label>
            <input
              id="month-picker"
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="bg-transparent text-sm text-zinc-100 focus:outline-none cursor-pointer"
            />
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors shadow-lg shadow-emerald-950/40"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Registrar Pago
          </button>
        </div>
      </div>

      {/* Notifications */}
      {message && (
        <div
          className={`mt-6 p-4 rounded-xl border flex items-center justify-between text-sm ${
            message.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-300'
              : 'bg-rose-950/40 border-rose-800/80 text-rose-300'
          }`}
        >
          <span>{message.text}</span>
          <button
            onClick={() => setMessage(null)}
            className="text-xs opacity-70 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80">
          <span className="text-xs font-medium text-zinc-400">Total Nómina Dispersada</span>
          <p className="text-2xl font-bold font-mono text-emerald-400 mt-2">
            ${(summary?.totalLaborCost ?? 0).toLocaleString('es-CO')}
          </p>
          <span className="text-xs text-zinc-500 mt-1 block">
            Impacto directo en P&amp;L (Gastos de Mano de Obra)
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80">
          <span className="text-xs font-medium text-zinc-400">Total Comprobantes / Pagos</span>
          <p className="text-2xl font-bold font-mono text-white mt-2">
            {summary?.totalRecords ?? 0}
          </p>
          <span className="text-xs text-zinc-500 mt-1 block">
            Registros procesados en el mes seleccionado
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80">
          <span className="text-xs font-medium text-zinc-400">Promedio por Colaborador</span>
          <p className="text-2xl font-bold font-mono text-amber-400 mt-2">
            ${(summary?.averagePerRecord ?? 0).toLocaleString('es-CO')}
          </p>
          <span className="text-xs text-zinc-500 mt-1 block">
            Costo medio por dispersión
          </span>
        </div>
      </div>

      {/* Records Table */}
      <div className="mt-8 rounded-2xl bg-zinc-900/40 border border-zinc-800 overflow-hidden">
        <div className="p-4 sm:px-6 flex items-center justify-between border-b border-zinc-800/80">
          <div>
            <h2 className="text-base font-semibold text-white">Historial de Pagos de Nómina</h2>
            <p className="text-xs text-zinc-400">
              Desglose de dispersiones y comprobantes de egreso emitidos
            </p>
          </div>
          <button
            onClick={fetchPayroll}
            className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refrescar
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-zinc-500 text-sm">
            Cargando registros contables...
          </div>
        ) : records.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-12 h-12 rounded-full bg-zinc-800/60 text-zinc-400 flex items-center justify-center mx-auto mb-3 text-xl">
              👥
            </div>
            <h3 className="text-sm font-semibold text-zinc-200">No hay pagos registrados para este período</h3>
            <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
              Utiliza el botón &quot;Registrar Pago&quot; para ingresar el salario y prestaciones de tus colaboradores.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-900/80 text-xs font-semibold text-zinc-400 uppercase tracking-wider border-b border-zinc-800">
                <tr>
                  <th className="py-3 px-4">Fecha</th>
                  <th className="py-3 px-4">Colaborador</th>
                  <th className="py-3 px-4">C.C. / ID</th>
                  <th className="py-3 px-4">Detalle / Concepto</th>
                  <th className="py-3 px-4">Registrado por</th>
                  <th className="py-3 px-4 text-right">Neto Pagado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-zinc-800/20 transition-colors">
                    <td className="py-3 px-4 text-xs font-mono text-zinc-400 whitespace-nowrap">
                      {new Date(r.date).toLocaleDateString('es-CO')}
                    </td>
                    <td className="py-3 px-4 font-medium text-white">
                      {r.employeeName}
                    </td>
                    <td className="py-3 px-4 text-xs font-mono text-zinc-400">
                      {r.employeeId || '—'}
                    </td>
                    <td className="py-3 px-4 text-xs text-zinc-300 max-w-md truncate" title={r.description}>
                      {r.description}
                    </td>
                    <td className="py-3 px-4 text-xs text-zinc-400">
                      {r.registeredBy}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-emerald-400 whitespace-nowrap">
                      ${r.amount.toLocaleString('es-CO')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal - Registrar Pago de Nómina */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">Registrar Dispersión de Nómina</h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Calcula el neto a pagar y crea automáticamente el egreso en Contabilidad
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateDisbursement} className="overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-zinc-400 block mb-1">
                    Nombre del Colaborador *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Juan Pérez"
                    value={form.employeeName}
                    onChange={(e) => setForm({ ...form, employeeName: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-zinc-400 block mb-1">
                    Cédula / Identificación
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. 1020304050"
                    value={form.employeeId}
                    onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-zinc-400 block mb-1">
                    Cargo / Rol *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Chef de Cocina, Mesero"
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-zinc-400 block mb-1">
                    Período Liquidado *
                  </label>
                  <input
                    type="month"
                    required
                    value={form.period}
                    onChange={(e) => setForm({ ...form, period: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/80 space-y-3">
                <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block">
                  Desglose de Devengados y Deducciones
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-zinc-400 block mb-1">Salario Base ($)</label>
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      value={form.baseSalary}
                      onChange={(e) => setForm({ ...form, baseSalary: Number(e.target.value) })}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-sm font-mono text-zinc-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-zinc-400 block mb-1">Horas Extras / Recargos ($)</label>
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      value={form.overtimeAmount}
                      onChange={(e) => setForm({ ...form, overtimeAmount: Number(e.target.value) })}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-sm font-mono text-zinc-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-zinc-400 block mb-1">Auxilio Transporte ($)</label>
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      value={form.transportAllowance}
                      onChange={(e) => setForm({ ...form, transportAllowance: Number(e.target.value) })}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-sm font-mono text-zinc-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-zinc-800/60">
                  <div>
                    <label className="text-xs text-zinc-400 block mb-1">Propinas Distribuidas ($)</label>
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      value={form.tipsDistributed}
                      onChange={(e) => setForm({ ...form, tipsDistributed: Number(e.target.value) })}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-sm font-mono text-zinc-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-rose-400 block mb-1">Deducciones (Salud/Pensión) (-$)</label>
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      value={form.deductions}
                      onChange={(e) => setForm({ ...form, deductions: Number(e.target.value) })}
                      className="w-full bg-zinc-900 border border-rose-900/50 rounded-lg px-3 py-1.5 text-sm font-mono text-rose-300 focus:outline-none focus:border-rose-500"
                    />
                  </div>
                </div>

                {/* Calculation summary badge */}
                <div className="mt-2 p-3 bg-zinc-900/80 rounded-lg flex items-center justify-between border border-zinc-800">
                  <div>
                    <span className="text-xs text-zinc-400">Total Devengado: </span>
                    <span className="text-xs font-mono font-medium text-zinc-200">
                      ${grossEarnings.toLocaleString('es-CO')}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-zinc-400">Neto a Pagar: </span>
                    <span className="text-sm font-mono font-bold text-emerald-400">
                      ${netEarnings.toLocaleString('es-CO')}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-zinc-400 block mb-1">
                    Fecha de Pago
                  </label>
                  <input
                    type="date"
                    required
                    value={form.paymentDate}
                    onChange={(e) => setForm({ ...form, paymentDate: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-zinc-400 block mb-1">
                    Método de Pago
                  </label>
                  <select
                    value={form.paymentMethod}
                    onChange={(e) =>
                      setForm({ ...form, paymentMethod: e.target.value as 'TRANSFER' | 'CASH' })
                    }
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="TRANSFER">Transferencia Bancaria</option>
                    <option value="CASH">Efectivo</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-400 block mb-1">
                  Observaciones / Notas
                </label>
                <input
                  type="text"
                  placeholder="Ej. Quincena 2, incluye bono por puntualidad"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-4 border-t border-zinc-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-lg text-sm font-medium bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white transition-colors shadow-lg shadow-emerald-950/40"
                >
                  {submitting ? 'Registrando...' : 'Confirmar y Crear Egreso'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
