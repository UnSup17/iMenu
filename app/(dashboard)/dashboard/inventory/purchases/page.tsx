'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

type OrderStatus = 'DRAFT' | 'SENT' | 'RECEIVED' | 'PARTIAL' | 'CANCELLED'

interface PurchaseOrder {
  id: string
  orderNumber: string
  status: OrderStatus
  total: number
  createdAt: string
  expectedAt: string | null
  supplier: { id: string; name: string; phone: string | null }
  items: Array<{
    id: string
    quantity: number
    receivedQty: number
    unitCost: number
    subtotal: number
    inventoryItem: { id: string; name: string; unit: string }
  }>
  createdBy: { name: string | null }
}

interface Supplier { id: string; name: string; phone: string | null }
interface InvItem { id: string; name: string; unit: string }

const STATUS_LABELS: Record<OrderStatus, string> = {
  DRAFT: '📝 Borrador',
  SENT: '📨 Enviada',
  RECEIVED: '✅ Recibida',
  PARTIAL: '⚠️ Parcial',
  CANCELLED: '❌ Cancelada',
}
const STATUS_COLORS: Record<OrderStatus, string> = {
  DRAFT: 'text-zinc-400 bg-zinc-800/60',
  SENT: 'text-blue-400 bg-blue-950/40',
  RECEIVED: 'text-emerald-400 bg-emerald-950/40',
  PARTIAL: 'text-amber-400 bg-amber-950/40',
  CANCELLED: 'text-red-400 bg-red-950/40',
}

export default function PurchasesPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [inventoryItems, setInventoryItems] = useState<InvItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const [form, setForm] = useState({
    supplierId: '',
    notes: '',
    expectedAt: '',
    items: [{ inventoryItemId: '', quantity: 0, unitCost: 0 }],
  })

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const [ordersRes, suppliersRes, itemsRes] = await Promise.all([
      fetch(`/api/inventory/purchases${statusFilter ? `?status=${statusFilter}` : ''}`),
      fetch('/api/inventory/suppliers'),
      fetch('/api/inventory/items'),
    ])
    const [ordersData, suppliersData, itemsData] = await Promise.all([
      ordersRes.json(), suppliersRes.json(), itemsRes.json(),
    ])
    setOrders(ordersData.orders ?? [])
    setSuppliers(suppliersData.suppliers ?? [])
    setInventoryItems(itemsData.items ?? [])
    setLoading(false)
  }, [statusFilter])

  useEffect(() => {
    fetchAll()
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search)
      const supplierParam = sp.get('supplier')
      if (supplierParam) {
        setForm((f) => ({ ...f, supplierId: supplierParam }))
        setShowForm(true)
      }
    }
  }, [fetchAll])

  const addItem = () => setForm((f) => ({
    ...f, items: [...f.items, { inventoryItemId: '', quantity: 0, unitCost: 0 }],
  }))

  const removeItem = (i: number) => setForm((f) => ({
    ...f, items: f.items.filter((_, idx) => idx !== i),
  }))

  const updateItem = (i: number, field: string, value: string | number) =>
    setForm((f) => ({
      ...f, items: f.items.map((item, idx) => idx === i ? { ...item, [field]: value } : item),
    }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/inventory/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          items: form.items.map((it) => ({
            inventoryItemId: it.inventoryItemId,
            quantity: Number(it.quantity),
            unitCost: Number(it.unitCost),
          })),
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Error'); return }
      setShowForm(false)
      setForm({ supplierId: '', notes: '', expectedAt: '', items: [{ inventoryItemId: '', quantity: 0, unitCost: 0 }] })
      fetchAll()
    } finally {
      setSaving(false)
    }
  }

  const handleAction = async (orderId: string, action: string) => {
    await fetch(`/api/inventory/purchases/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    fetchAll()
  }

  const handleWhatsApp = (order: PurchaseOrder) => {
    const phone = order.supplier.phone?.replace(/\D/g, '')
    if (!phone) return
    const itemsList = order.items.map((i) => `  • ${i.quantity} ${i.inventoryItem.unit} de ${i.inventoryItem.name}`).join('\n')
    const msg = encodeURIComponent(`Hola, adjunto orden de compra ${order.orderNumber}:\n${itemsList}\n\n¿Pueden confirmar disponibilidad y fecha de entrega?`)
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank')
  }

  const totalByStatus = orders.reduce((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">📦 Órdenes de Compra</h1>
          <p className="text-sm text-zinc-500 mt-1">Gestión de pedidos a proveedores y recepción de mercancía</p>
        </div>
        <div className="flex gap-3">
          <Link href="/dashboard/inventory/suppliers" className="px-4 py-2 rounded-lg border border-zinc-700 text-zinc-300 text-sm hover:bg-zinc-800">
            🏭 Proveedores
          </Link>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm"
          >
            + Nueva Orden
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        {(['DRAFT', 'SENT', 'PARTIAL', 'RECEIVED', 'CANCELLED'] as OrderStatus[]).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(statusFilter === s ? '' : s)}
            className={`rounded-xl p-3 border transition-all text-left ${statusFilter === s ? 'border-amber-500/50 bg-amber-950/20' : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700'}`}
          >
            <p className="text-xs text-zinc-500 uppercase mb-1">{STATUS_LABELS[s]}</p>
            <p className="text-2xl font-bold text-white">{totalByStatus[s] ?? 0}</p>
          </button>
        ))}
      </div>

      {/* New Order Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-white mb-4">Nueva Orden de Compra</h2>
            {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Proveedor *</label>
                  <select
                    required
                    value={form.supplierId}
                    onChange={(e) => setForm({ ...form, supplierId: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500"
                  >
                    <option value="">Seleccionar...</option>
                    {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Fecha esperada de entrega</label>
                  <input
                    type="date"
                    value={form.expectedAt}
                    onChange={(e) => setForm({ ...form, expectedAt: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-zinc-400">Ítems de la orden</label>
                  <button type="button" onClick={addItem} className="text-xs text-amber-500 hover:text-amber-400">+ Agregar ítem</button>
                </div>
                <div className="space-y-2">
                  {form.items.map((item, i) => (
                    <div key={i} className="grid grid-cols-[1fr_100px_100px_auto] gap-2 items-center">
                      <select
                        required
                        value={item.inventoryItemId}
                        onChange={(e) => updateItem(i, 'inventoryItemId', e.target.value)}
                        className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500"
                      >
                        <option value="">Insumo...</option>
                        {inventoryItems.map((inv) => <option key={inv.id} value={inv.id}>{inv.name} ({inv.unit})</option>)}
                      </select>
                      <input
                        type="number"
                        required
                        min="0.001"
                        step="0.001"
                        placeholder="Cant."
                        value={item.quantity || ''}
                        onChange={(e) => updateItem(i, 'quantity', parseFloat(e.target.value) || 0)}
                        className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500"
                      />
                      <input
                        type="number"
                        required
                        min="0"
                        step="0.01"
                        placeholder="Costo u."
                        value={item.unitCost || ''}
                        onChange={(e) => updateItem(i, 'unitCost', parseFloat(e.target.value) || 0)}
                        className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500"
                      />
                      {form.items.length > 1 && (
                        <button type="button" onClick={() => removeItem(i)} className="text-red-500 hover:text-red-400 text-lg leading-none">×</button>
                      )}
                    </div>
                  ))}
                </div>
                {/* Subtotal preview */}
                <div className="mt-2 text-right">
                  <span className="text-xs text-zinc-500">Total estimado: </span>
                  <span className="text-amber-400 font-mono font-bold text-sm">
                    ${form.items.reduce((a, it) => a + (it.quantity * it.unitCost), 0).toLocaleString('es-CO')}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Notas</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500"
                  placeholder="Instrucciones especiales, condiciones..."
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 px-4 py-2 border border-zinc-700 text-zinc-300 rounded-lg text-sm hover:bg-zinc-800">
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="flex-1 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-lg text-sm disabled:opacity-50">
                  {saving ? 'Creando...' : '📦 Crear Orden'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Orders List */}
      {loading ? (
        <div className="text-center py-20 text-zinc-600">Cargando órdenes...</div>
      ) : orders.length === 0 ? (
        <div className="text-center py-20 text-zinc-600">
          <p className="text-5xl mb-4">📦</p>
          <p className="text-lg font-medium text-zinc-400">Sin órdenes de compra</p>
          <button onClick={() => setShowForm(true)} className="mt-6 px-6 py-2 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-lg text-sm">
            + Crear primera orden
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <div key={o.id} className="rounded-xl border border-zinc-800 bg-zinc-900/40 overflow-hidden">
              <div
                className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-zinc-900/60 transition-colors"
                onClick={() => setExpandedId(expandedId === o.id ? null : o.id)}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-white">{o.orderNumber}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[o.status]}`}>
                      {STATUS_LABELS[o.status]}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-400 mt-0.5">{o.supplier.name} · {o.items.length} ítems</p>
                </div>
                <div className="text-right">
                  <p className="font-mono font-bold text-amber-400">${Number(o.total).toLocaleString('es-CO')}</p>
                  <p className="text-xs text-zinc-500">{new Date(o.createdAt).toLocaleDateString('es-CO')}</p>
                </div>
                <span className="text-zinc-600">{expandedId === o.id ? '▲' : '▼'}</span>
              </div>

              {expandedId === o.id && (
                <div className="border-t border-zinc-800 px-5 py-4">
                  {/* Items */}
                  <table className="w-full text-sm mb-4">
                    <thead>
                      <tr className="text-xs text-zinc-500 border-b border-zinc-800">
                        <th className="pb-2 text-left">Insumo</th>
                        <th className="pb-2 text-right">Pedido</th>
                        <th className="pb-2 text-right">Recibido</th>
                        <th className="pb-2 text-right">Costo u.</th>
                        <th className="pb-2 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {o.items.map((item) => (
                        <tr key={item.id} className="border-b border-zinc-800/40">
                          <td className="py-2 text-white">{item.inventoryItem.name}</td>
                          <td className="py-2 text-right text-zinc-300 font-mono">{item.quantity} {item.inventoryItem.unit}</td>
                          <td className="py-2 text-right font-mono">
                            <span className={item.receivedQty >= item.quantity ? 'text-emerald-400' : item.receivedQty > 0 ? 'text-amber-400' : 'text-zinc-600'}>
                              {item.receivedQty} {item.inventoryItem.unit}
                            </span>
                          </td>
                          <td className="py-2 text-right text-zinc-400 font-mono">${Number(item.unitCost).toLocaleString('es-CO')}</td>
                          <td className="py-2 text-right text-white font-mono">${Number(item.subtotal).toLocaleString('es-CO')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Actions */}
                  <div className="flex gap-2 flex-wrap">
                    {o.status === 'DRAFT' && (
                      <button
                        onClick={() => handleAction(o.id, 'send')}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium"
                      >
                        📨 Marcar como Enviada
                      </button>
                    )}
                    {(o.status === 'DRAFT' || o.status === 'SENT' || o.status === 'PARTIAL') && (
                      <Link
                        href={`/dashboard/inventory/purchases/${o.id}/receive`}
                        className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-medium"
                      >
                        ✅ Recibir Mercancía
                      </Link>
                    )}
                    {o.supplier.phone && (
                      <button
                        onClick={() => handleWhatsApp(o)}
                        className="px-3 py-1.5 bg-emerald-900/50 border border-emerald-800 text-emerald-400 hover:bg-emerald-900 rounded-lg text-xs font-medium"
                      >
                        💬 Enviar por WhatsApp
                      </button>
                    )}
                    {o.status !== 'CANCELLED' && o.status !== 'RECEIVED' && (
                      <button
                        onClick={() => handleAction(o.id, 'cancel')}
                        className="px-3 py-1.5 border border-zinc-700 text-zinc-500 hover:text-red-400 hover:border-red-900 rounded-lg text-xs font-medium"
                      >
                        Cancelar orden
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
