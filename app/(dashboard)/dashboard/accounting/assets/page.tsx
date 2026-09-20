'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

interface FixedAsset {
  id: string
  name: string
  category: 'KITCHEN_EQUIPMENT' | 'FURNITURE' | 'COMPUTING_POS' | 'VEHICLE' | 'OTHER'
  serialNumber: string | null
  acquisitionCost: number
  salvageValue: number
  usefulLifeMonths: number
  acquisitionDate: string
  notes: string | null
  monthlyDepreciation: number
  monthsElapsed: number
  effectiveMonths: number
  accumulatedDepreciation: number
  currentBookValue: number
  depreciationPercent: number
  isFullyDepreciated: boolean
}

interface AssetsSummary {
  totalAssets: number
  totalAcquisitionCost: number
  totalAccumulatedDepreciation: number
  totalNetBookValue: number
  monthlyTotalDepreciation: number
}

const CATEGORY_LABELS: Record<string, { label: string; icon: string; badge: string }> = {
  KITCHEN_EQUIPMENT: { label: 'Equipos de Cocina', icon: '🍳', badge: 'bg-amber-950/40 text-amber-400 border-amber-800/60' },
  FURNITURE: { label: 'Mobiliario y Enseres', icon: '🪑', badge: 'bg-blue-950/40 text-blue-400 border-blue-800/60' },
  COMPUTING_POS: { label: 'Cómputo y Puntos POS', icon: '💻', badge: 'bg-purple-950/40 text-purple-400 border-purple-800/60' },
  VEHICLE: { label: 'Vehículos / Domicilios', icon: '🛵', badge: 'bg-emerald-950/40 text-emerald-400 border-emerald-800/60' },
  OTHER: { label: 'Otros Activos', icon: '📦', badge: 'bg-zinc-800 text-zinc-300 border-zinc-700' },
}

export default function FixedAssetsPage() {
  const [assets, setAssets] = useState<FixedAsset[]>([])
  const [summary, setSummary] = useState<AssetsSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [depreciating, setDepreciating] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [form, setForm] = useState({
    name: '',
    category: 'KITCHEN_EQUIPMENT',
    serialNumber: '',
    acquisitionCost: 0,
    salvageValue: 0,
    usefulLifeMonths: 60, // 5 años default
    acquisitionDate: new Date().toISOString().slice(0, 10),
    notes: '',
  })

  const fetchAssets = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/accounting/assets')
      const data = await res.json()
      if (res.ok) {
        setAssets(data.assets ?? [])
        setSummary(data.summary ?? null)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAssets()
  }, [fetchAssets])

  const handleCategoryPreset = (cat: string) => {
    let months = 60
    if (cat === 'KITCHEN_EQUIPMENT') months = 60 // 5 años
    if (cat === 'FURNITURE') months = 120 // 10 años
    if (cat === 'COMPUTING_POS') months = 36 // 3 años
    if (cat === 'VEHICLE') months = 60 // 5 años
    setForm((prev) => ({ ...prev, category: cat, usefulLifeMonths: months }))
  }

  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setMessage(null)

    try {
      const res = await fetch('/api/accounting/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          acquisitionCost: Number(form.acquisitionCost),
          salvageValue: Number(form.salvageValue),
          usefulLifeMonths: Number(form.usefulLifeMonths),
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Error al registrar activo' })
        return
      }

      setMessage({ type: 'success', text: 'Activo fijo registrado exitosamente.' })
      setShowModal(false)
      setForm({
        name: '',
        category: 'KITCHEN_EQUIPMENT',
        serialNumber: '',
        acquisitionCost: 0,
        salvageValue: 0,
        usefulLifeMonths: 60,
        acquisitionDate: new Date().toISOString().slice(0, 10),
        notes: '',
      })
      fetchAssets()
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error de conexión' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteAsset = async (id: string, name: string) => {
    if (!confirm(`¿Estás seguro de dar de baja el activo "${name}"?`)) return

    try {
      const res = await fetch(`/api/accounting/assets/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setMessage({ type: 'success', text: `Activo "${name}" dado de baja.` })
        fetchAssets()
      }
    } catch {
      setMessage({ type: 'error', text: 'Error al dar de baja el activo.' })
    }
  }

  const handlePostDepreciation = async () => {
    if (!confirm('¿Deseas contabilizar la depreciación mensual del período actual como un gasto operacional en P&L?')) {
      return
    }

    setDepreciating(true)
    setMessage(null)

    try {
      const res = await fetch('/api/accounting/assets/depreciate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      const data = await res.json()
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Error al contabilizar depreciación' })
        return
      }

      setMessage({
        type: 'success',
        text: `✅ Depreciación de $${data.totalDepreciation?.toLocaleString('es-CO')} contabilizada en gastos del período ${data.month}.`,
      })
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error de conexión' })
    } finally {
      setDepreciating(false)
    }
  }

  // Monthly preview in modal
  const modalCost = Number(form.acquisitionCost) || 0
  const modalSalvage = Number(form.salvageValue) || 0
  const modalMonths = Number(form.usefulLifeMonths) || 1
  const modalMonthly = Math.max(0, (modalCost - modalSalvage) / modalMonths)

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard/accounting" className="text-zinc-400 hover:text-white text-sm mr-1">
              ← Contabilidad
            </Link>
            <span className="text-2xl">🏭</span>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Activos Fijos & Depreciación
            </h1>
          </div>
          <p className="text-sm text-zinc-400 mt-1">
            Control de equipos de cocina, mobiliario, POS y cálculo mensual de depreciación lineal.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={handlePostDepreciation}
            disabled={depreciating}
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-zinc-800 hover:bg-zinc-700 text-amber-400 border border-zinc-700 transition flex items-center gap-1.5 disabled:opacity-50"
            title="Genera un registro de gasto en P&L con la depreciación mensual total"
          >
            <span>⚙️</span>
            <span>{depreciating ? 'Contabilizando...' : 'Contabilizar Depreciación Mes'}</span>
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-amber-500 hover:bg-amber-400 text-black transition flex items-center gap-1.5 shadow-lg"
          >
            <span>+</span>
            <span>Registrar Activo</span>
          </button>
        </div>
      </div>

      {/* Alert Banner */}
      {message && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-sm ${
            message.type === 'success'
              ? 'bg-emerald-950/30 border-emerald-800 text-emerald-300'
              : 'bg-red-950/30 border-red-800 text-red-300'
          }`}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="text-xs opacity-70 hover:opacity-100">
            ✕
          </button>
        </div>
      )}

      {/* Summary KPI Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-zinc-900/90 border border-zinc-800 p-5 rounded-xl">
            <span className="text-xs text-zinc-400 uppercase font-semibold">Costo Total Histórico</span>
            <p className="text-2xl font-black text-white mt-1">
              ${summary.totalAcquisitionCost.toLocaleString('es-CO')}
            </p>
            <span className="text-[11px] text-zinc-500">{summary.totalAssets} activos en inventario</span>
          </div>

          <div className="bg-zinc-900/90 border border-zinc-800 p-5 rounded-xl">
            <span className="text-xs text-amber-400 uppercase font-semibold">Depreciación Acumulada</span>
            <p className="text-2xl font-black text-amber-400 mt-1">
              ${summary.totalAccumulatedDepreciation.toLocaleString('es-CO')}
            </p>
            <span className="text-[11px] text-zinc-500">Desgaste total histórico</span>
          </div>

          <div className="bg-zinc-900/90 border border-zinc-800 p-5 rounded-xl">
            <span className="text-xs text-emerald-400 uppercase font-semibold">Valor Neto en Libros</span>
            <p className="text-2xl font-black text-emerald-400 mt-1">
              ${summary.totalNetBookValue.toLocaleString('es-CO')}
            </p>
            <span className="text-[11px] text-zinc-500">Patrimonio actual en equipos</span>
          </div>

          <div className="bg-zinc-900/90 border border-zinc-800 p-5 rounded-xl">
            <span className="text-xs text-purple-400 uppercase font-semibold">Depreciación Mensual Total</span>
            <p className="text-2xl font-black text-purple-400 mt-1">
              ${summary.monthlyTotalDepreciation.toLocaleString('es-CO')}
            </p>
            <span className="text-[11px] text-zinc-500">Gasto mensual a P&L</span>
          </div>
        </div>
      )}

      {/* Assets Table */}
      {loading ? (
        <div className="p-16 text-center text-zinc-500 bg-zinc-900/40 rounded-2xl border border-zinc-800">
          Cargando inventario de activos fijos...
        </div>
      ) : assets.length === 0 ? (
        <div className="p-16 text-center text-zinc-500 bg-zinc-900/40 rounded-2xl border border-zinc-800 space-y-3">
          <p className="text-4xl">🏭</p>
          <p className="text-white font-medium">No hay activos fijos registrados</p>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            Registra tu maquinaria de cocina, mobiliario o computadores para calcular automáticamente el desgaste mensual.
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="mt-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold rounded-lg transition"
          >
            + Registrar Primer Activo
          </button>
        </div>
      ) : (
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-900/90 border-b border-zinc-800 text-xs text-zinc-400">
                <tr>
                  <th className="px-4 py-3 text-left">Activo / Categoría</th>
                  <th className="px-4 py-3 text-left">Serie / Placa</th>
                  <th className="px-4 py-3 text-right">Costo Compra</th>
                  <th className="px-4 py-3 text-right">Deprec. Mes</th>
                  <th className="px-4 py-3 text-right">Deprec. Acum.</th>
                  <th className="px-4 py-3 text-right">Valor Libros</th>
                  <th className="px-4 py-3 text-center w-40">Vida Útil</th>
                  <th className="px-4 py-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {assets.map((asset) => {
                  const catInfo = CATEGORY_LABELS[asset.category] || CATEGORY_LABELS.OTHER

                  return (
                    <tr key={asset.id} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-white">{asset.name}</p>
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border mt-0.5 ${catInfo.badge}`}
                        >
                          <span>{catInfo.icon}</span>
                          <span>{catInfo.label}</span>
                        </span>
                      </td>

                      <td className="px-4 py-3 font-mono text-xs text-zinc-400">
                        {asset.serialNumber || '—'}
                      </td>

                      <td className="px-4 py-3 text-right font-mono text-zinc-300">
                        ${asset.acquisitionCost.toLocaleString('es-CO')}
                      </td>

                      <td className="px-4 py-3 text-right font-mono text-purple-400">
                        ${asset.monthlyDepreciation.toLocaleString('es-CO')}
                      </td>

                      <td className="px-4 py-3 text-right font-mono text-amber-400">
                        ${asset.accumulatedDepreciation.toLocaleString('es-CO')}
                      </td>

                      <td className="px-4 py-3 text-right font-mono font-bold text-emerald-400">
                        ${asset.currentBookValue.toLocaleString('es-CO')}
                      </td>

                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px] text-zinc-400">
                            <span>{asset.effectiveMonths}m</span>
                            <span>{asset.usefulLifeMonths}m</span>
                          </div>
                          <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                asset.isFullyDepreciated
                                  ? 'bg-zinc-600'
                                  : asset.depreciationPercent > 80
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-500'
                              }`}
                              style={{ width: `${asset.depreciationPercent}%` }}
                            />
                          </div>
                          <p className="text-[10px] text-center text-zinc-500">
                            {asset.isFullyDepreciated ? 'Depreciado al 100%' : `${asset.depreciationPercent}% consumido`}
                          </p>
                        </div>
                      </td>

                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleDeleteAsset(asset.id, asset.name)}
                          className="px-2 py-1 text-xs text-zinc-500 hover:text-red-400 hover:bg-zinc-800 rounded transition"
                          title="Dar de baja activo"
                        >
                          Dar de baja
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Nuevo Activo */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>🏭</span> Registrar Activo Fijo
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-zinc-500 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAsset} className="space-y-4">
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Nombre del Activo *</label>
                <input
                  required
                  type="text"
                  placeholder="Ej. Horno Convector Rational 10 Bandejas"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Categoría *</label>
                  <select
                    value={form.category}
                    onChange={(e) => handleCategoryPreset(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500"
                  >
                    <option value="KITCHEN_EQUIPMENT">🍳 Cocina (5 años / 60m)</option>
                    <option value="FURNITURE">🪑 Mobiliario (10 años / 120m)</option>
                    <option value="COMPUTING_POS">💻 Cómputo / POS (3 años / 36m)</option>
                    <option value="VEHICLE">🛵 Vehículo (5 años / 60m)</option>
                    <option value="OTHER">📦 Otro Activo</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Nº Serie / Placa</label>
                  <input
                    type="text"
                    placeholder="SN-12345"
                    value={form.serialNumber}
                    onChange={(e) => setForm({ ...form, serialNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Costo Compra *</label>
                  <input
                    required
                    type="number"
                    min="1"
                    step="0.01"
                    placeholder="0"
                    value={form.acquisitionCost || ''}
                    onChange={(e) => setForm({ ...form, acquisitionCost: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white font-mono text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Valor Residual</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0"
                    value={form.salvageValue || ''}
                    onChange={(e) => setForm({ ...form, salvageValue: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white font-mono text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Vida Útil (Meses)</label>
                  <input
                    required
                    type="number"
                    min="1"
                    value={form.usefulLifeMonths || ''}
                    onChange={(e) => setForm({ ...form, usefulLifeMonths: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white font-mono text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Fecha de Adquisición *</label>
                <input
                  required
                  type="date"
                  value={form.acquisitionDate}
                  onChange={(e) => setForm({ ...form, acquisitionDate: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Monthly preview callout */}
              <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg flex items-center justify-between text-xs">
                <span className="text-zinc-400">Depreciación Mensual Estimada:</span>
                <span className="font-mono font-bold text-amber-400 text-sm">
                  ${modalMonthly.toLocaleString('es-CO', { maximumFractionDigits: 2 })} / mes
                </span>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-zinc-700 text-zinc-300 rounded-lg text-sm hover:bg-zinc-800 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-lg text-sm transition disabled:opacity-50"
                >
                  {submitting ? 'Guardando...' : 'Guardar Activo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
