'use client'

import { useState } from 'react'

export function DianTestSetCard() {
  const [loadingTestSet, setLoadingTestSet] = useState(false)
  const [loadingSync, setLoadingSync] = useState(false)
  const [testResult, setTestResult] = useState<any>(null)
  const [syncResult, setSyncResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [testSetId, setTestSetId] = useState('')

  const handleRunTestSet = async () => {
    setLoadingTestSet(true)
    setError(null)
    setTestResult(null)

    try {
      const res = await fetch('/api/billing/electronic-invoicing/test-set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testSetId: testSetId.trim() || undefined,
          count: 5,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al ejecutar lote de pruebas')
      setTestResult(data)
    } catch (err: any) {
      setError(err.message || 'Error en ejecución de pruebas')
    } finally {
      setLoadingTestSet(false)
    }
  }

  const handleRunSyncWorker = async () => {
    setLoadingSync(true)
    setError(null)
    setSyncResult(null)

    try {
      const res = await fetch('/api/billing/electronic-invoicing/status')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al sincronizar estado')
      setSyncResult(data)
    } catch (err: any) {
      setError(err.message || 'Error en sincronización')
    } finally {
      setLoadingSync(false)
    }
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800/80 pb-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <span>🏛️</span> Habilitación DIAN & Set de Pruebas Automatizado
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Ejecuta el ciclo de habilitación oficial (SendTestSetAsync) y el worker de verificación (GetStatusZip).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRunSyncWorker}
            disabled={loadingSync}
            className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-lg border border-zinc-700 transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
          >
            <span>🔄</span>
            <span>{loadingSync ? 'Sincronizando...' : 'Sincronizar Pendientes'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-950/60 border border-red-800/80 rounded-lg text-xs text-red-300">
          {error}
        </div>
      )}

      {syncResult && (
        <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-300 space-y-1">
          <p className="font-semibold text-emerald-400">Resultado de sincronización:</p>
          <p>Facturas procesadas: {syncResult.processed ?? 0} | Actualizadas: {syncResult.updated ?? 0}</p>
          {syncResult.message && <p className="text-zinc-500">{syncResult.message}</p>}
        </div>
      )}

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-zinc-300 mb-1">
            TestSetId DIAN (Catálogo de Habilitación):
          </label>
          <div className="flex gap-3">
            <input
              type="text"
              value={testSetId}
              onChange={(e) => setTestSetId(e.target.value)}
              placeholder="Ej: a1b2c3d4-e5f6-7890-abcd-ef1234567890 (opcional)"
              className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-amber-500 placeholder-zinc-600"
            />
            <button
              onClick={handleRunTestSet}
              disabled={loadingTestSet}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition flex items-center gap-2 shadow-lg shadow-emerald-950 disabled:opacity-50 cursor-pointer"
            >
              <span>⚡</span>
              <span>{loadingTestSet ? 'Transmitiendo Lote...' : 'Ejecutar Set de Pruebas (5 Facturas)'}</span>
            </button>
          </div>
          <span className="text-[10px] text-zinc-500 block mt-1">
            Transmite 5 documentos de prueba (Estándar, B2B, Tarjeta, Efectivo, Contingencia) con generación de CUFE oficial y validación SOAP.
          </span>
        </div>

        {testResult && (
          <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-lg space-y-3 text-xs">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <span className="font-bold text-white">Resumen de Habilitación:</span>
              <span
                className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                  testResult.success
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    : 'bg-rose-950 text-rose-300 border border-rose-800'
                }`}
              >
                {testResult.passed} de {testResult.totalSent} Aprobados ({testResult.success ? '100%' : 'Con observaciones'})
              </span>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {testResult.items?.map((item: any, idx: number) => (
                <div
                  key={idx}
                  className="p-2 bg-zinc-900/60 border border-zinc-800/80 rounded flex items-center justify-between gap-2 text-[11px]"
                >
                  <div>
                    <span className="font-semibold text-white mr-2">{item.number}</span>
                    <span className="text-zinc-500 font-mono text-[10px]">
                      CUFE: {item.cufeOrCude.slice(0, 16)}...
                    </span>
                  </div>
                  <span className="text-emerald-400 font-medium">✓ {item.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
