'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Supplier {
  id: string
  name: string
  taxId: string | null
  contactName: string | null
  phone: string | null
  email: string | null
  address: string | null
  notes: string | null
  isActive: boolean
  _count: { purchaseOrders: number }
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '', taxId: '', contactName: '', phone: '', email: '', address: '', notes: '',
  })

  const fetchSuppliers = async (q = '') => {
    setLoading(true)
    const res = await fetch(`/api/inventory/suppliers${q ? `?search=${encodeURIComponent(q)}` : ''}`)
    const data = await res.json()
    setSuppliers(data.suppliers ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchSuppliers() }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchSuppliers(search)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/inventory/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Error al guardar'); return }
      setShowForm(false)
      setForm({ name: '', taxId: '', contactName: '', phone: '', email: '', address: '', notes: '' })
      fetchSuppliers()
    } finally {
      setSaving(false)
    }
  }

  const handleWhatsApp = (supplier: Supplier) => {
    if (!supplier.phone) return
    const msg = encodeURIComponent(`Hola ${supplier.contactName ?? supplier.name}, necesitamos reponer inventario. ¿Pueden confirmar disponibilidad y enviar cotización?`)
    window.open(`https://wa.me/${supplier.phone.replace(/\D/g, '')}?text=${msg}`, '_blank')
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">🏭 Proveedores</h1>
          <p className="text-sm text-zinc-500 mt-1">Gestión de proveedores de insumos y materias primas</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/dashboard/inventory/purchases"
            className="px-4 py-2 rounded-lg border border-zinc-700 text-zinc-300 text-sm hover:bg-zinc-800 transition-colors"
          >
            📦 Órdenes de Compra
          </Link>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm transition-colors"
          >
            + Nuevo Proveedor
          </button>
        </div>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-3 mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar proveedor por nombre..."
          className="flex-1 px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-amber-500"
        />
        <button type="submit" className="px-4 py-2 bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-lg text-sm hover:bg-zinc-700">
          🔍 Buscar
        </button>
      </form>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg p-6">
            <h2 className="text-lg font-bold text-white mb-4">Nuevo Proveedor</h2>
            {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Nombre / Razón Social *</label>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500"
                    placeholder="Distribuidora ABC S.A.S."
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">NIT / Cédula</label>
                  <input
                    value={form.taxId}
                    onChange={(e) => setForm({ ...form, taxId: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500"
                    placeholder="900123456-7"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Contacto</label>
                  <input
                    value={form.contactName}
                    onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500"
                    placeholder="Carlos López"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">📱 WhatsApp</label>
                  <input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500"
                    placeholder="+573001234567"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500"
                    placeholder="pedidos@abc.com"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Dirección</label>
                  <input
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500"
                    placeholder="Cra 7 #45-12, Bogotá"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Notas internas</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500"
                  placeholder="Condiciones de pago, días de entrega..."
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-2 border border-zinc-700 text-zinc-300 rounded-lg text-sm hover:bg-zinc-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-lg text-sm disabled:opacity-50"
                >
                  {saving ? 'Guardando...' : 'Guardar Proveedor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="text-center py-20 text-zinc-600">Cargando proveedores...</div>
      ) : suppliers.length === 0 ? (
        <div className="text-center py-20 text-zinc-600">
          <p className="text-5xl mb-4">🏭</p>
          <p className="text-lg font-medium text-zinc-400">Sin proveedores registrados</p>
          <p className="text-sm mt-2 text-zinc-600">Agrega proveedores para gestionar tus compras de insumos</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-6 px-6 py-2 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-lg text-sm"
          >
            + Agregar primer proveedor
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900 border-b border-zinc-800">
              <tr>
                {['Proveedor', 'NIT', 'Contacto', 'WhatsApp', 'Pedidos', 'Acciones'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {suppliers.map((s) => (
                <tr key={s.id} className="hover:bg-zinc-900/50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-white">{s.name}</p>
                    {s.email && <p className="text-xs text-zinc-500">{s.email}</p>}
                  </td>
                  <td className="px-4 py-3 text-zinc-400 font-mono text-xs">{s.taxId ?? '—'}</td>
                  <td className="px-4 py-3 text-zinc-400">{s.contactName ?? '—'}</td>
                  <td className="px-4 py-3">
                    {s.phone ? (
                      <button
                        onClick={() => handleWhatsApp(s)}
                        title="Enviar mensaje por WhatsApp"
                        className="flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 text-xs font-medium transition-colors"
                      >
                        <span>💬</span>
                        <span>{s.phone}</span>
                      </button>
                    ) : (
                      <span className="text-zinc-600">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold text-amber-400 bg-amber-950/40">
                      {s._count.purchaseOrders} órdenes
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-3">
                      <Link
                        href={`/dashboard/inventory/purchases?supplier=${s.id}`}
                        className="text-xs text-amber-500 hover:text-amber-400 font-medium"
                      >
                        + Orden de compra
                      </Link>
                      <button
                        onClick={() => handleWhatsApp(s)}
                        disabled={!s.phone}
                        className="text-xs text-emerald-500 hover:text-emerald-400 font-medium disabled:opacity-30"
                      >
                        WhatsApp
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
