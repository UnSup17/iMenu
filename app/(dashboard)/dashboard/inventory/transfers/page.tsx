'use client'

import { useState, useEffect, useCallback } from 'react'

interface Restaurant { id: string; name: string }
interface InvItem { id: string; name: string; unit: string; currentStock: number }
interface Movement {
  id: string
  quantity: number
  stockBefore: number
  stockAfter: number
  reference: string | null
  notes: string | null
  createdAt: string
  inventoryItem: { name: string; unit: string }
  createdBy: { name: string | null }
}

export default function TransfersPage() {
  const [siblings, setSiblings] = useState<Restaurant[]>([])
  const [inventoryItems, setInventoryItems] = useState<InvItem[]>([])
  const [outbound, setOutbound] = useState<Movement[]>([])
  const [inbound, setInbound] = useState<Movement[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [activeTab, setActiveTab] = useState<'outbound' | 'inbound'>('outbound')

  const [form, setForm] = useState({
    destinationRestaurantId: '',
    notes: '',
    items: [{ inventoryItemId: '', quantity: 0 }],
  })

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const [transfersRes, itemsRes] = await Promise.all([
      fetch('/api/inventory/transfers'),
      fetch('/api/inventory/items'),
    ])
    const [transfersData, itemsData] = await Promise.all([
      transfersRes.json(),
      itemsRes.json(),
    ])
    setSiblings(transfersData.siblings ?? [])
    setOutbound(transfersData.outboundMovements ?? [])
    setInbound(transfersData.inboundMovements ?? [])
    setInventoryItems(itemsData.items ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const addItem = () => setForm((f) => ({ ...f, items: [...f.items, { inventoryItemId: '', quantity: 0 }] }))
  const removeItem = (i: number) => setForm((f) => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }))
  const updateItem = (i: number, field: string, value: string | number) =>
    setForm((f) => ({ ...f, items: f.items.map((item, idx) => idx === i ? { ...item, [field]: value } : item) }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    setSuccess('')
    try {
      const res = await fetch('/api/inventory/transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          items: form.items.map((it) => ({
            inventoryItemId: it.inventoryItemId,
            quantity: Number(it.quantity),
          })),
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Error al procesar transferencia'); return }
      setSuccess(`✅ Transferencia ${data.transferRef} procesada exitosamente`)
      setShowForm(false)
      setForm({ destinationRestaurantId: '', notes: '', items: [{ inventoryItemId: '', quantity: 0 }] })
      fetchAll()
    } finally {
      setSubmitting(false)
    }
  }

  const movements = activeTab === 'outbound' ? outbound : inbound

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">🔄 Transferencias entre Sedes</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Mueve insumos entre sucursales de tu organización de forma atómica y trazable
          </p>
        </div>
        <button
          onClick={() => { setSuccess(''); setError(''); setShowForm(true) }}
          disabled={siblings.length === 0}
          title={siblings.length === 0 ? 'Necesitas al menos 2 sedes en la misma organización' : ''}
          className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed"
        >
          + Nueva Transferencia
        </button>
      </div>

      {siblings.length === 0 && !loading && (
        <div className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 text-center">
          <p className="text-zinc-500 text-sm">Las transferencias entre sedes requieren que el restaurante pertenezca a una organización con múltiples sucursales.</p>
        </div>
      )}

      {success && <p className="mb-4 text-emerald-400 text-sm">{success}</p>}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-xl p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-white mb-4">Nueva Transferencia de Insumos</h2>
            {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Sede de destino *</label>
                <select
                  required
                  value={form.destinationRestaurantId}
                  onChange={(e) => setForm({ ...form, destinationRestaurantId: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500"
                >
                  <option value="">Seleccionar sede...</option>
                  {siblings.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-zinc-400">Insumos a transferir</label>
                  <button type="button" onClick={addItem} className="text-xs text-amber-500 hover:text-amber-400">+ Agregar</button>
                </div>
                <div className="space-y-2">
                  {form.items.map((item, i) => {
                    const invItem = inventoryItems.find((inv) => inv.id === item.inventoryItemId)
                    return (
                      <div key={i} className="grid grid-cols-[1fr_120px_auto] gap-2 items-center">
                        <select
                          required
                          value={item.inventoryItemId}
                          onChange={(e) => updateItem(i, 'inventoryItemId', e.target.value)}
                          className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500"
                        >
                          <option value="">Insumo...</option>
                          {inventoryItems.map((inv) => (
                            <option key={inv.id} value={inv.id}>
                              {inv.name} ({inv.currentStock.toFixed(2)} {inv.unit} disp.)
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          required
                          min="0.001"
                          step="0.001"
                          max={invItem?.currentStock ?? undefined}
                          placeholder="Cantidad"
                          value={item.quantity || ''}
                          onChange={(e) => updateItem(i, 'quantity', parseFloat(e.target.value) || 0)}
                          className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500 text-right"
                        />
                        {form.items.length > 1 && (
                          <button type="button" onClick={() => removeItem(i)} className="text-red-500 hover:text-red-400 text-lg leading-none">×</button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Notas / motivo</label>
                <input
                  type="text"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500"
                  placeholder="Ej. Apoyo evento de fin de semana"
                />
              </div>

              <div className="bg-amber-950/20 border border-amber-900/40 rounded-lg p-3 text-xs text-amber-300">
                ⚠️ La transferencia es <strong>irreversible</strong>. El stock se descontará de esta sede y se sumará en la sede destino de forma instantánea.
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 px-4 py-2 border border-zinc-700 text-zinc-300 rounded-lg text-sm hover:bg-zinc-800">
                  Cancelar
                </button>
                <button type="submit" disabled={submitting} className="flex-1 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-lg text-sm disabled:opacity-50">
                  {submitting ? 'Procesando...' : '🔄 Confirmar Transferencia'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-zinc-900/40 rounded-xl p-1 border border-zinc-800 w-fit">
        <button
          onClick={() => setActiveTab('outbound')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'outbound' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
        >
          📤 Enviadas ({outbound.length})
        </button>
        <button
          onClick={() => setActiveTab('inbound')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'inbound' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
        >
          📥 Recibidas ({inbound.length})
        </button>
      </div>

      {loading ? (
        <div className="text-center py-20 text-zinc-600">Cargando historial...</div>
      ) : movements.length === 0 ? (
        <div className="text-center py-16 text-zinc-600">
          <p className="text-4xl mb-3">{activeTab === 'outbound' ? '📤' : '📥'}</p>
          <p className="text-zinc-500">Sin {activeTab === 'outbound' ? 'transferencias enviadas' : 'transferencias recibidas'}</p>
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900 border-b border-zinc-800">
              <tr>
                {['Referencia', 'Insumo', 'Cantidad', 'Stock Antes', 'Stock Después', 'Notas', 'Fecha', 'Por'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {movements.map((m) => (
                <tr key={m.id} className="hover:bg-zinc-900/50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-zinc-400">{m.reference ?? '—'}</td>
                  <td className="px-4 py-3 font-medium text-white">{m.inventoryItem.name}</td>
                  <td className="px-4 py-3">
                    <span className={`font-mono font-bold ${m.quantity > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {m.quantity > 0 ? '+' : ''}{m.quantity.toFixed(3)} {m.inventoryItem.unit}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-zinc-500 text-xs">{Number(m.stockBefore).toFixed(3)}</td>
                  <td className="px-4 py-3 font-mono text-zinc-300 text-xs">{Number(m.stockAfter).toFixed(3)}</td>
                  <td className="px-4 py-3 text-zinc-500 text-xs max-w-[200px] truncate">{m.notes ?? '—'}</td>
                  <td className="px-4 py-3 text-zinc-500 text-xs">{new Date(m.createdAt).toLocaleDateString('es-CO')}</td>
                  <td className="px-4 py-3 text-zinc-400 text-xs">{m.createdBy.name ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
