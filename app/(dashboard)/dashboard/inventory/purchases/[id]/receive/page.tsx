'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface PurchaseOrderItem {
  id: string
  quantity: number
  receivedQty: number
  unitCost: number
  subtotal: number
  inventoryItem: {
    id: string
    name: string
    unit: string
    currentStock: number
  }
}

interface PurchaseOrder {
  id: string
  orderNumber: string
  status: string
  notes: string | null
  expectedAt: string | null
  createdAt: string
  supplier: {
    id: string
    name: string
    phone: string | null
    contactName: string | null
  }
  items: PurchaseOrderItem[]
  createdBy: {
    name: string | null
  }
}

export default function ReceivePurchaseOrderPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const resolvedParams = use(params)
  const router = useRouter()

  const [order, setOrder] = useState<PurchaseOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // Mapping from purchaseOrderItemId -> qty to receive in this batch
  const [receivedInputs, setReceivedInputs] = useState<Record<string, number>>({})

  useEffect(() => {
    async function loadOrder() {
      try {
        const res = await fetch(`/api/inventory/purchases/${resolvedParams.id}`)
        const data = await res.json()
        if (!res.ok) {
          setError(data.error || 'No se pudo cargar la orden')
          return
        }
        setOrder(data.order)

        // Pre-fill receivedInputs with pending quantity
        const initialInputs: Record<string, number> = {}
        data.order.items.forEach((item: PurchaseOrderItem) => {
          const pending = Math.max(0, Number(item.quantity) - Number(item.receivedQty))
          initialInputs[item.id] = pending
        })
        setReceivedInputs(initialInputs)
      } catch (err: any) {
        setError(err.message || 'Error de conexión')
      } finally {
        setLoading(false)
      }
    }
    loadOrder()
  }, [resolvedParams.id])

  const handleInputChange = (itemId: string, value: number) => {
    setReceivedInputs((prev) => ({
      ...prev,
      [itemId]: Math.max(0, value),
    }))
  }

  const handleReceiveAll = () => {
    if (!order) return
    const allPending: Record<string, number> = {}
    order.items.forEach((item) => {
      const pending = Math.max(0, Number(item.quantity) - Number(item.receivedQty))
      allPending[item.id] = pending
    })
    setReceivedInputs(allPending)
  }

  const handleResetAll = () => {
    if (!order) return
    const reset: Record<string, number> = {}
    order.items.forEach((item) => {
      reset[item.id] = 0
    })
    setReceivedInputs(reset)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!order) return

    setSubmitting(true)
    setError('')

    try {
      // Build receive items payload
      const itemsPayload = order.items
        .map((item) => {
          const qtyToReceive = Number(receivedInputs[item.id] || 0)
          const newTotalReceived = Number(item.receivedQty) + qtyToReceive
          return {
            purchaseOrderItemId: item.id,
            receivedQty: newTotalReceived,
          }
        })
        .filter((it, idx) => {
          const qtyToReceive = Number(receivedInputs[order.items[idx].id] || 0)
          return qtyToReceive > 0
        })

      if (itemsPayload.length === 0) {
        setError('Debes ingresar al menos una cantidad mayor a 0 para recibir mercancía.')
        setSubmitting(false)
        return
      }

      const res = await fetch(`/api/inventory/purchases/${resolvedParams.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'receive',
          items: itemsPayload,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Error al procesar la recepción de mercancía')
        return
      }

      setSuccess(true)
      setTimeout(() => {
        router.push('/dashboard/inventory/purchases')
      }, 1500)
    } catch (err: any) {
      setError(err.message || 'Error de conexión')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8 max-w-5xl mx-auto text-center py-24 text-zinc-500">
        <p className="text-4xl mb-3 animate-pulse">📦</p>
        <p>Cargando información de la orden de compra...</p>
      </div>
    )
  }

  if (error && !order) {
    return (
      <div className="p-8 max-w-5xl mx-auto text-center py-20">
        <p className="text-red-400 font-semibold mb-2">Error</p>
        <p className="text-zinc-400 text-sm mb-6">{error}</p>
        <Link
          href="/dashboard/inventory/purchases"
          className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm"
        >
          ← Volver a Órdenes de Compra
        </Link>
      </div>
    )
  }

  if (!order) return null

  const totalOrderedItems = order.items.length
  const itemsWithPending = order.items.filter(
    (it) => Number(it.quantity) > Number(it.receivedQty)
  ).length

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Back button & Breadcrumb */}
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/dashboard/inventory/purchases"
          className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 transition-colors"
        >
          <span>←</span>
          <span>Volver a Órdenes de Compra</span>
        </Link>
        <span className="font-mono text-xs px-2.5 py-1 rounded-md bg-zinc-800 text-zinc-300 border border-zinc-700">
          {order.orderNumber}
        </span>
      </div>

      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <span>📥</span> Recepción de Mercancía en Almacén
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Proveedor: <strong className="text-white">{order.supplier.name}</strong>
            {order.supplier.phone && ` · Tel: ${order.supplier.phone}`}
            {order.supplier.contactName && ` · Contacto: ${order.supplier.contactName}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleReceiveAll}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 hover:bg-emerald-900/60 transition-colors"
          >
            ✓ Recibir Todo lo Pendiente
          </button>
          <button
            type="button"
            onClick={handleResetAll}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-zinc-800/60 border border-zinc-700 text-zinc-400 hover:bg-zinc-800 transition-colors"
          >
            Limpiar cantidades
          </button>
        </div>
      </div>

      {/* Success banner */}
      {success && (
        <div className="mb-6 p-4 rounded-xl border border-emerald-700/60 bg-emerald-950/40 text-emerald-300 flex items-center gap-3">
          <span className="text-2xl">🎉</span>
          <div>
            <p className="font-semibold text-sm">
              ¡Mercancía recibida e inventario actualizado exitosamente!
            </p>
            <p className="text-xs text-emerald-400/80 mt-0.5">
              Redirigiendo al panel de compras...
            </p>
          </div>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="mb-6 p-4 rounded-xl border border-red-800/60 bg-red-950/40 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 overflow-hidden mb-6 shadow-xl">
          <div className="p-4 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Desglose de Ítems a Recibir
            </span>
            <span className="text-xs text-zinc-500">
              {itemsWithPending} de {totalOrderedItems} ítems pendientes de entrega
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-900/80 border-b border-zinc-800 text-xs text-zinc-400">
                <tr>
                  <th className="px-4 py-3 text-left">Insumo / Ingrediente</th>
                  <th className="px-4 py-3 text-right">Cant. Pedida</th>
                  <th className="px-4 py-3 text-right">Ya Recibido</th>
                  <th className="px-4 py-3 text-right">Pendiente</th>
                  <th className="px-4 py-3 text-center w-52">A Recibir en esta Entrega</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {order.items.map((item) => {
                  const qty = Number(item.quantity)
                  const received = Number(item.receivedQty)
                  const pending = Math.max(0, qty - received)
                  const currentInput = receivedInputs[item.id] ?? 0
                  const isFullyReceived = pending <= 0

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-zinc-800/30 transition-colors ${
                        isFullyReceived ? 'opacity-60 bg-zinc-900/20' : ''
                      }`}
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-white">{item.inventoryItem.name}</p>
                        <p className="text-xs text-zinc-500">
                          Stock actual en sistema:{' '}
                          <span className="text-zinc-400 font-mono">
                            {Number(item.inventoryItem.currentStock).toFixed(3)}{' '}
                            {item.inventoryItem.unit}
                          </span>
                        </p>
                      </td>

                      <td className="px-4 py-3 text-right font-mono text-zinc-300">
                        {qty.toFixed(3)} {item.inventoryItem.unit}
                      </td>

                      <td className="px-4 py-3 text-right font-mono">
                        <span
                          className={
                            received >= qty
                              ? 'text-emerald-400 font-semibold'
                              : received > 0
                              ? 'text-amber-400'
                              : 'text-zinc-600'
                          }
                        >
                          {received.toFixed(3)} {item.inventoryItem.unit}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-right font-mono">
                        <span
                          className={
                            pending > 0 ? 'text-amber-400 font-bold' : 'text-zinc-600'
                          }
                        >
                          {pending.toFixed(3)} {item.inventoryItem.unit}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <input
                            type="number"
                            min="0"
                            step="0.001"
                            disabled={isFullyReceived || submitting}
                            value={currentInput === 0 && isFullyReceived ? 0 : currentInput || ''}
                            onChange={(e) =>
                              handleInputChange(item.id, parseFloat(e.target.value) || 0)
                            }
                            placeholder="0.000"
                            className="w-28 px-3 py-1.5 text-right bg-zinc-800 border border-zinc-700 rounded-lg text-white font-mono text-sm focus:outline-none focus:border-amber-500 disabled:opacity-40"
                          />
                          <span className="text-xs text-zinc-400 font-mono w-10">
                            {item.inventoryItem.unit}
                          </span>
                          {!isFullyReceived && (
                            <button
                              type="button"
                              onClick={() => handleInputChange(item.id, pending)}
                              title="Recibir pendiente completo"
                              className="px-2 py-1 text-xs rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white"
                            >
                              Todo
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Action bar */}
        <div className="flex items-center justify-between bg-zinc-900/60 p-4 rounded-xl border border-zinc-800">
          <p className="text-xs text-zinc-400">
            Al confirmar, el sistema registrará automáticamente los movimientos{' '}
            <code className="text-amber-400 font-mono">PURCHASE</code> y aumentará el stock en
            tiempo real vía WebSockets.
          </p>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/inventory/purchases"
              className="px-4 py-2 rounded-lg border border-zinc-700 text-zinc-300 text-sm hover:bg-zinc-800 transition-colors"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={submitting || success}
              className="px-6 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-colors shadow-lg disabled:opacity-50 flex items-center gap-2"
            >
              <span>{submitting ? 'Procesando entrada...' : '✅ Confirmar Ingreso a Stock'}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
