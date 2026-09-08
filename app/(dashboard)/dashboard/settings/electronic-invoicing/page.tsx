'use client'

import { useState, useEffect } from 'react'

interface DianConfig {
  testMode: boolean
  softwareId?: string | null
  softwarePin?: string | null
  technicalKey?: string | null
  certificateUrl?: string | null
  certificatePassword?: string | null
  resolutionNumber?: string | null
  resolutionPrefix?: string | null
  resolutionFrom?: number | null
  resolutionTo?: number | null
  resolutionDate?: string | null
  resolutionEnd?: string | null
}

export default function DianElectronicInvoicingPage() {
  const [config, setConfig] = useState<DianConfig>({ testMode: true })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchConfig = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/billing/electronic-invoicing/config')
      if (!res.ok) throw new Error('Error al cargar configuración DIAN')
      const data = await res.json()
      setConfig(data)
    } catch (err: any) {
      console.error(err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchConfig()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setSaving(true)

    try {
      const res = await fetch('/api/billing/electronic-invoicing/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al guardar la configuración')
      }

      setMessage('¡Configuración tributaria DIAN guardada exitosamente!')
    } catch (err: any) {
      setError(err.message || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="border-b border-zinc-800/80 pb-6">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🏛️</span>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Facturación Electrónica DIAN — Colombia
          </h1>
        </div>
        <p className="text-sm text-zinc-400 mt-1">
          Configuración e integración directa con los servicios SOAP de la DIAN (Resolución 000042 / UBL 2.1).
        </p>
      </div>

      {message && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-800 rounded-xl text-xs font-medium text-emerald-300">
          {message}
        </div>
      )}
      {error && (
        <div className="p-3 bg-red-950/80 border border-red-800 rounded-xl text-xs font-medium text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-zinc-500 bg-zinc-900/40 rounded-xl border border-zinc-800">
          Cargando parámetros fiscales...
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* MODO DE AMBIENTE */}
          <div className="bg-zinc-900/90 border border-zinc-800 p-5 rounded-xl flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">Ambiente de Transmisión</h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                {config.testMode
                  ? '🟡 Ambiente de Habilitación / Pruebas (VPFE-HAB)'
                  : '🟢 Ambiente de Producción Oficial DIAN (VPFE)'}
              </p>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-xs text-zinc-400">Modo Pruebas:</span>
              <input
                type="checkbox"
                checked={config.testMode}
                onChange={(e) => setConfig({ ...config, testMode: e.target.checked })}
                className="rounded border-zinc-700 text-amber-500 focus:ring-amber-500 w-4 h-4"
              />
            </label>
          </div>

          {/* PASO 1: RESOLUCIÓN DE NUMERACIÓN */}
          <div className="bg-zinc-900/80 border border-zinc-800 p-5 rounded-xl space-y-4">
            <h3 className="text-sm font-bold text-amber-400 flex items-center gap-2">
              <span>1.</span> Resolución de Numeración de Facturación
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">
                  Número de Resolución DIAN
                </label>
                <input
                  type="text"
                  placeholder="Ej: 18760000001"
                  value={config.resolutionNumber || ''}
                  onChange={(e) => setConfig({ ...config, resolutionNumber: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">
                  Prefijo Autorizado
                </label>
                <input
                  type="text"
                  placeholder="Ej: FV, FE"
                  value={config.resolutionPrefix || ''}
                  onChange={(e) => setConfig({ ...config, resolutionPrefix: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white uppercase focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Rango Desde</label>
                <input
                  type="number"
                  placeholder="1"
                  value={config.resolutionFrom || ''}
                  onChange={(e) =>
                    setConfig({ ...config, resolutionFrom: parseInt(e.target.value) || null })
                  }
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Rango Hasta</label>
                <input
                  type="number"
                  placeholder="5000"
                  value={config.resolutionTo || ''}
                  onChange={(e) =>
                    setConfig({ ...config, resolutionTo: parseInt(e.target.value) || null })
                  }
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          {/* PASO 2: CREDENCIALES DEL SOFTWARE */}
          <div className="bg-zinc-900/80 border border-zinc-800 p-5 rounded-xl space-y-4">
            <h3 className="text-sm font-bold text-amber-400 flex items-center gap-2">
              <span>2.</span> Software y Clave Técnica DIAN
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">
                  Software ID (MUISCA)
                </label>
                <input
                  type="text"
                  placeholder="UUID generado por la DIAN"
                  value={config.softwareId || ''}
                  onChange={(e) => setConfig({ ...config, softwareId: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">PIN del Software</label>
                <input
                  type="password"
                  placeholder="PIN de 6 dígitos"
                  value={config.softwarePin || ''}
                  onChange={(e) => setConfig({ ...config, softwarePin: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-zinc-400 mb-1">
                  Clave Técnica de Facturación (Asignada en MUISCA)
                </label>
                <input
                  type="text"
                  placeholder="Clave técnica alfanumérica requerida para el hash CUFE"
                  value={config.technicalKey || ''}
                  onChange={(e) => setConfig({ ...config, technicalKey: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          {/* PASO 3: CERTIFICADO DIGITAL */}
          <div className="bg-zinc-900/80 border border-zinc-800 p-5 rounded-xl space-y-4">
            <h3 className="text-sm font-bold text-amber-400 flex items-center gap-2">
              <span>3.</span> Certificado de Firma Digital (.p12)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">
                  URL / Archivo del Certificado .p12
                </label>
                <input
                  type="text"
                  placeholder="https://blob.../certicámara.p12"
                  value={config.certificateUrl || ''}
                  onChange={(e) => setConfig({ ...config, certificateUrl: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">
                  Contraseña del Certificado
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={config.certificatePassword || ''}
                  onChange={(e) => setConfig({ ...config, certificatePassword: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 text-sm font-bold rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 transition disabled:opacity-50"
            >
              {saving ? 'Guardando Parámetros...' : 'Guardar Configuración DIAN'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
