'use client'

import { useState } from 'react'
import Link from 'next/link'

interface ReconciledPair {
  bankTransaction: {
    date: string
    description: string
    amount: number
    type: 'CREDIT' | 'DEBIT'
    reference?: string
  }
  systemRecord: {
    id: string
    type: 'PAYMENT' | 'EXPENSE'
    description: string
    date: string
    amount: number
    methodOrCategory?: string
  }
  confidence: number
  difference: number
}

interface UnmatchedBankItem {
  date: string
  description: string
  amount: number
  type: 'CREDIT' | 'DEBIT'
  reference?: string
}

interface UnmatchedSystemItem {
  id: string
  type: 'PAYMENT' | 'EXPENSE'
  description: string
  date: string
  amount: number
  methodOrCategory?: string
}

interface ReconciliationResult {
  summary: {
    totalBankRecords: number
    totalReconciledCount: number
    totalUnmatchedBank: number
    totalUnmatchedSystem: number
    totalReconciledAmount: number
    matchRate: number
  }
  reconciled: ReconciledPair[]
  unmatchedBank: UnmatchedBankItem[]
  unmatchedSystem: UnmatchedSystemItem[]
}

const DEMO_CSV = `Fecha,Descripcion,Valor,Saldo
${new Date().toISOString().slice(0, 10)},PAGO ABONO FACTURA POS ELECTRONICO,150000,5200000
${new Date().toISOString().slice(0, 10)},PAGO PROVEEDOR DISTRIBUIDORA CARNES,-250000,4950000
${new Date().toISOString().slice(0, 10)},TRANSFERENCIA RECIBIDA NEQUI,48000,4998000
${new Date().toISOString().slice(0, 10)},COMISION MANEJO CUENTA BANCARIA,-18500,4979500`

export default function BankReconciliationPage() {
  const [preset, setPreset] = useState<'generic' | 'bancolombia' | 'davivienda'>('generic')
  const [csvContent, setCsvContent] = useState('')
  const [fileName, setFileName] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ReconciliationResult | null>(null)
  const [activeTab, setActiveTab] = useState<'reconciled' | 'unmatched_bank' | 'unmatched_system'>('reconciled')
  const [error, setError] = useState<string | null>(null)

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      setCsvContent(text)
    }
    reader.readAsText(file)
  }

  const handleRunReconciliation = async (customCsv?: string) => {
    const contentToUse = customCsv || csvContent
    if (!contentToUse.trim()) {
      setError('Por favor selecciona un archivo CSV o pega el extracto bancario')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/accounting/bank-reconciliation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          csvContent: contentToUse,
          preset,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Error al procesar la conciliación')
      }

      setResult(data)
    } catch (err: any) {
      setError(err.message || 'Error de conexión con el servidor')
    } finally {
      setLoading(false)
    }
  }

  const loadDemo = () => {
    setPreset('generic')
    setCsvContent(DEMO_CSV)
    setFileName('extracto_bancario_demo.csv')
    handleRunReconciliation(DEMO_CSV)
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
            <span className="text-xs text-blue-400 font-medium">Tesorería</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white mt-1">
            Conciliación Bancaria Inteligente
          </h1>
          <p className="text-sm text-zinc-400 mt-0.5">
            Carga tus extractos bancarios en CSV y concilia automáticamente ventas (tarjeta, transferencias, QR)
            y egresos contra los movimientos bancarios reales con tolerancia de fechas.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadDemo}
            className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs text-zinc-300 font-medium px-3.5 py-2 rounded-lg transition-colors"
          >
            ⚡ Cargar Datos Demo
          </button>
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="mt-6 p-4 rounded-xl border bg-rose-950/40 border-rose-800/80 text-rose-300 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-xs opacity-70 hover:opacity-100">
            ✕
          </button>
        </div>
      )}

      {/* Upload Zone & Config */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* Step 1: Format preset */}
        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">
              Paso 1: Formato del Extracto
            </span>
            <h3 className="text-base font-medium text-white mt-1">Entidad Bancaria</h3>
            <p className="text-xs text-zinc-400 mt-1">
              Selecciona el banco de origen para mapear adecuadamente las columnas de fecha, concepto y valor.
            </p>

            <div className="mt-4 space-y-2">
              <label
                className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors ${
                  preset === 'generic'
                    ? 'bg-blue-950/30 border-blue-600/80 text-white'
                    : 'bg-zinc-950/60 border-zinc-800/80 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="preset"
                    value="generic"
                    checked={preset === 'generic'}
                    onChange={() => setPreset('generic')}
                    className="accent-blue-500"
                  />
                  <div>
                    <div className="text-sm font-medium">Estándar Universal CSV</div>
                    <div className="text-xs text-zinc-500">Fecha, Descripción, Monto (+/-)</div>
                  </div>
                </div>
                <span className="text-xs font-mono">.CSV</span>
              </label>

              <label
                className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors ${
                  preset === 'bancolombia'
                    ? 'bg-blue-950/30 border-blue-600/80 text-white'
                    : 'bg-zinc-950/60 border-zinc-800/80 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="preset"
                    value="bancolombia"
                    checked={preset === 'bancolombia'}
                    onChange={() => setPreset('bancolombia')}
                    className="accent-blue-500"
                  />
                  <div>
                    <div className="text-sm font-medium">Bancolombia Sucursal Virtual</div>
                    <div className="text-xs text-zinc-500">Movimientos Cuenta Ahorros / Corriente</div>
                  </div>
                </div>
                <span className="text-xs font-mono">.CSV</span>
              </label>

              <label
                className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors ${
                  preset === 'davivienda'
                    ? 'bg-blue-950/30 border-blue-600/80 text-white'
                    : 'bg-zinc-950/60 border-zinc-800/80 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="preset"
                    value="davivienda"
                    checked={preset === 'davivienda'}
                    onChange={() => setPreset('davivienda')}
                    className="accent-blue-500"
                  />
                  <div>
                    <div className="text-sm font-medium">Davivienda Empresas</div>
                    <div className="text-xs text-zinc-500">Extracto Débito / Crédito</div>
                  </div>
                </div>
                <span className="text-xs font-mono">.CSV</span>
              </label>
            </div>
          </div>
        </div>

        {/* Step 2: Upload CSV */}
        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 lg:col-span-2 flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">
              Paso 2: Cargar Archivo CSV
            </span>
            <h3 className="text-base font-medium text-white mt-1">Archivo del Extracto Bancario</h3>
            <p className="text-xs text-zinc-400 mt-1">
              Arrastra tu archivo o selecciónalo desde tu computador.
            </p>

            <div className="mt-4 border-2 border-dashed border-zinc-800 hover:border-zinc-700 rounded-2xl p-6 text-center bg-zinc-950/40 transition-colors relative">
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="w-10 h-10 rounded-full bg-blue-950/40 text-blue-400 flex items-center justify-center mx-auto mb-2 text-lg">
                📄
              </div>
              <p className="text-sm font-medium text-zinc-200">
                {fileName ? fileName : 'Seleccionar archivo CSV o arrastrar aquí'}
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                {csvContent ? `${csvContent.split('\n').length} líneas leídas` : 'Archivos CSV delimitados por coma o punto y coma'}
              </p>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end gap-3">
            <button
              onClick={() => handleRunReconciliation()}
              disabled={loading || !csvContent.trim()}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors shadow-lg shadow-blue-950/40"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Conciliando movimientos...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Ejecutar Conciliación
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Results Section */}
      {result && (
        <div className="mt-8 space-y-6">
          {/* Summary KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800">
              <span className="text-xs font-medium text-zinc-400">Tasa de Conciliación</span>
              <div className="flex items-baseline gap-2 mt-2">
                <p className="text-3xl font-bold font-mono text-blue-400">
                  {result.summary.matchRate}%
                </p>
                <span className="text-xs text-zinc-500">
                  ({result.summary.totalReconciledCount} de {result.summary.totalBankRecords})
                </span>
              </div>
              <div className="w-full bg-zinc-800 h-2 rounded-full mt-3 overflow-hidden">
                <div
                  className="bg-blue-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, result.summary.matchRate)}%` }}
                />
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800">
              <span className="text-xs font-medium text-zinc-400">Monto Total Conciliado</span>
              <p className="text-2xl font-bold font-mono text-emerald-400 mt-2">
                ${result.summary.totalReconciledAmount.toLocaleString('es-CO')}
              </p>
              <span className="text-xs text-zinc-500 mt-1 block">
                Movimientos cruzados con éxito
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800">
              <span className="text-xs font-medium text-zinc-400">Pendientes en Banco</span>
              <p className="text-2xl font-bold font-mono text-amber-400 mt-2">
                {result.summary.totalUnmatchedBank}
              </p>
              <span className="text-xs text-zinc-500 mt-1 block">
                Comisiones, abonos o retenciones no registradas
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800">
              <span className="text-xs font-medium text-zinc-400">Pendientes en Sistema POS</span>
              <p className="text-2xl font-bold font-mono text-purple-400 mt-2">
                {result.summary.totalUnmatchedSystem}
              </p>
              <span className="text-xs text-zinc-500 mt-1 block">
                Pagos o gastos registrados sin extracto
              </span>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
            <button
              onClick={() => setActiveTab('reconciled')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 ${
                activeTab === 'reconciled'
                  ? 'bg-blue-600 text-white'
                  : 'text-zinc-400 hover:text-zinc-200 bg-zinc-900/40'
              }`}
            >
              <span>Conciliados</span>
              <span className="px-1.5 py-0.5 rounded-full bg-blue-900/60 text-xs">
                {result.reconciled.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('unmatched_bank')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 ${
                activeTab === 'unmatched_bank'
                  ? 'bg-amber-600 text-white'
                  : 'text-zinc-400 hover:text-zinc-200 bg-zinc-900/40'
              }`}
            >
              <span>Solo en Banco</span>
              <span className="px-1.5 py-0.5 rounded-full bg-amber-950/60 text-xs">
                {result.unmatchedBank.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('unmatched_system')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 ${
                activeTab === 'unmatched_system'
                  ? 'bg-purple-600 text-white'
                  : 'text-zinc-400 hover:text-zinc-200 bg-zinc-900/40'
              }`}
            >
              <span>Solo en Sistema POS</span>
              <span className="px-1.5 py-0.5 rounded-full bg-purple-950/60 text-xs">
                {result.unmatchedSystem.length}
              </span>
            </button>
          </div>

          {/* Active Tab View */}
          <div className="rounded-2xl bg-zinc-900/40 border border-zinc-800 overflow-hidden">
            {activeTab === 'reconciled' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-zinc-900/80 text-xs font-semibold text-zinc-400 uppercase tracking-wider border-b border-zinc-800">
                    <tr>
                      <th className="py-3 px-4">Movimiento Bancario</th>
                      <th className="py-3 px-4">Fecha Banco</th>
                      <th className="py-3 px-4 text-right">Monto Banco</th>
                      <th className="py-3 px-4">Registro en Sistema POS</th>
                      <th className="py-3 px-4 text-right">Monto Sistema</th>
                      <th className="py-3 px-4 text-center">Confianza</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {result.reconciled.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-zinc-500 text-xs">
                          No se encontraron transacciones conciliadas
                        </td>
                      </tr>
                    ) : (
                      result.reconciled.map((pair, idx) => (
                        <tr key={idx} className="hover:bg-zinc-800/20 transition-colors">
                          <td className="py-3 px-4 font-medium text-white max-w-xs truncate">
                            {pair.bankTransaction.description}
                          </td>
                          <td className="py-3 px-4 text-xs font-mono text-zinc-400 whitespace-nowrap">
                            {pair.bankTransaction.date}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-medium text-white whitespace-nowrap">
                            ${pair.bankTransaction.amount.toLocaleString('es-CO')}
                          </td>
                          <td className="py-3 px-4 text-xs text-zinc-300 max-w-xs truncate">
                            <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 text-[10px] font-mono mr-1.5">
                              {pair.systemRecord.type}
                            </span>
                            {pair.systemRecord.description}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-zinc-300 whitespace-nowrap">
                            ${pair.systemRecord.amount.toLocaleString('es-CO')}
                          </td>
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${
                                pair.confidence >= 90
                                  ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/60'
                                  : 'bg-amber-950/40 text-amber-400 border-amber-800/60'
                              }`}
                            >
                              {pair.confidence}% match
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'unmatched_bank' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-zinc-900/80 text-xs font-semibold text-zinc-400 uppercase tracking-wider border-b border-zinc-800">
                    <tr>
                      <th className="py-3 px-4">Fecha</th>
                      <th className="py-3 px-4">Descripción del Movimiento</th>
                      <th className="py-3 px-4">Tipo</th>
                      <th className="py-3 px-4 text-right">Valor</th>
                      <th className="py-3 px-4 text-center">Acción Sugerida</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {result.unmatchedBank.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-emerald-400 text-xs">
                          ¡Excelente! Todos los movimientos del extracto bancario están conciliados.
                        </td>
                      </tr>
                    ) : (
                      result.unmatchedBank.map((item, idx) => (
                        <tr key={idx} className="hover:bg-zinc-800/20 transition-colors">
                          <td className="py-3 px-4 text-xs font-mono text-zinc-400 whitespace-nowrap">
                            {item.date}
                          </td>
                          <td className="py-3 px-4 text-zinc-200">{item.description}</td>
                          <td className="py-3 px-4 text-xs whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                item.type === 'CREDIT'
                                  ? 'bg-emerald-950/40 text-emerald-400'
                                  : 'bg-rose-950/40 text-rose-400'
                              }`}
                            >
                              {item.type === 'CREDIT' ? 'Abono / Ingreso' : 'Cargo / Egreso'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-medium text-amber-400 whitespace-nowrap">
                            ${item.amount.toLocaleString('es-CO')}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Link
                              href="/dashboard/accounting/expenses"
                              className="text-xs text-blue-400 hover:text-blue-300 underline"
                            >
                              Registrar Egreso
                            </Link>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'unmatched_system' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-zinc-900/80 text-xs font-semibold text-zinc-400 uppercase tracking-wider border-b border-zinc-800">
                    <tr>
                      <th className="py-3 px-4">Fecha Sistema</th>
                      <th className="py-3 px-4">Tipo</th>
                      <th className="py-3 px-4">Descripción / Concepto</th>
                      <th className="py-3 px-4">Medio / Categoría</th>
                      <th className="py-3 px-4 text-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {result.unmatchedSystem.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-emerald-400 text-xs">
                          No hay transacciones del sistema pendientes por conciliar.
                        </td>
                      </tr>
                    ) : (
                      result.unmatchedSystem.map((item, idx) => (
                        <tr key={idx} className="hover:bg-zinc-800/20 transition-colors">
                          <td className="py-3 px-4 text-xs font-mono text-zinc-400 whitespace-nowrap">
                            {item.date}
                          </td>
                          <td className="py-3 px-4 text-xs whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                item.type === 'PAYMENT'
                                  ? 'bg-emerald-950/40 text-emerald-400'
                                  : 'bg-amber-950/40 text-amber-400'
                              }`}
                            >
                              {item.type === 'PAYMENT' ? 'Cobro Venta' : 'Gasto'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-zinc-200">{item.description}</td>
                          <td className="py-3 px-4 text-xs text-zinc-400">
                            {item.methodOrCategory || '—'}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-medium text-purple-400 whitespace-nowrap">
                            ${item.amount.toLocaleString('es-CO')}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
