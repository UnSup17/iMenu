'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { io, type Socket } from 'socket.io-client'
import { WsStaffEvent, WsServerEvent } from '@/types/websocket-events'
import { soundNotifier, triggerKitchenVibration } from '@/lib/audio/chime'

export interface KdsOrderItem {
  id: string
  productId: string
  name: string
  quantity: number
  unitPrice: number
  subtotal: number
  itemNotes?: string | null
  isPrepared: boolean
  modifiers: string[]
  additions: { id: string; name: string; quantity: number; price: number }[]
}

export interface KdsOrder {
  id: string
  tableId: string
  tableNumber: number
  zone?: string | null
  waiterName?: string | null
  status: 'RECEIVED' | 'PREPARING' | 'READY' | 'DELIVERED' | 'CANCELLED'
  priority: 'NORMAL' | 'URGENT'
  totalAmount: number
  notes?: string | null
  createdAt: string
  preparedAt?: string | null
  deliveredAt?: string | null
  items: KdsOrderItem[]
}

interface KdsViewClientProps {
  restaurantId: string
  restaurantName: string
  initialOrders: KdsOrder[]
  fullscreenMode?: boolean
}

export function KdsViewClient({
  restaurantId,
  restaurantName,
  initialOrders,
  fullscreenMode = false,
}: KdsViewClientProps) {
  const [orders, setOrders] = useState<KdsOrder[]>(initialOrders)
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'RECEIVED' | 'PREPARING' | 'READY'>('ALL')
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isOverlayFullscreen, setIsOverlayFullscreen] = useState(fullscreenMode)
  const [currentTime, setCurrentTime] = useState(Date.now())
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null)
  const [newOrderAlert, setNewOrderAlert] = useState<{ id: string; tableNumber: number } | null>(null)
  const socketRef = useRef<Socket | null>(null)

  // Sincronizar estado de fullscreen del navegador
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement))
    }
    document.addEventListener('fullscreenchange', handleFsChange)
    return () => document.removeEventListener('fullscreenchange', handleFsChange)
  }, [])

  // Fullscreen toggle con soporte HTML5 y overlay
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
        .then(() => {
          setIsFullscreen(true)
          setIsOverlayFullscreen(true)
        })
        .catch(() => {
          setIsOverlayFullscreen((prev) => !prev)
        })
    } else {
      document.exitFullscreen()
        .then(() => {
          setIsFullscreen(false)
          if (!fullscreenMode) setIsOverlayFullscreen(false)
        })
        .catch(() => {
          setIsOverlayFullscreen(false)
        })
    }
  }

  // Socket.IO conexión en vivo para la cocina
  useEffect(() => {
    const socketUrl =
      process.env.NEXT_PUBLIC_SOCKET_URL ||
      (typeof window !== 'undefined' ? window.location.origin : '')

    const socket = io(socketUrl, {
      path: '/api/socketio',
      transports: ['websocket', 'polling'],
    })
    socketRef.current = socket

    socket.on('connect', () => {
      socket.emit(WsStaffEvent.JOIN_STAFF_ROOM, {
        restaurantId,
        staffToken: 'kds-screen',
      })
    })

    // Nueva orden recibida
    socket.on(WsServerEvent.ORDER_RECEIVED, async (payload: any) => {
      // Reproducir sonido y vibración
      if (soundEnabled) {
        soundNotifier.playKitchenNewOrderAlert()
        triggerKitchenVibration([300, 150, 300, 150, 450])
      }

      setNewOrderAlert({ id: payload.orderId, tableNumber: payload.tableNumber })
      setTimeout(() => setNewOrderAlert(null), 6000)

      // Cargar detalles completos de la nueva comanda
      try {
        const res = await fetch(`/api/orders/${payload.orderId}`)
        if (res.ok) {
          const freshOrder = await res.json()
          setOrders((prev) => {
            if (prev.some((o) => o.id === freshOrder.id)) return prev
            const formatted: KdsOrder = {
              id: freshOrder.id,
              tableId: freshOrder.tableId,
              tableNumber: freshOrder.table?.tableNumber || payload.tableNumber,
              zone: freshOrder.table?.zone,
              waiterName: freshOrder.table?.assignedWaiter?.name,
              status: freshOrder.status,
              priority: freshOrder.priority || 'NORMAL',
              totalAmount: Number(freshOrder.totalAmount),
              notes: freshOrder.notes,
              createdAt: freshOrder.createdAt,
              preparedAt: freshOrder.preparedAt,
              deliveredAt: freshOrder.deliveredAt,
              items: freshOrder.items.map((i: any) => ({
                id: i.id,
                productId: i.productId,
                name: i.product?.name || 'Platillo',
                quantity: i.quantity,
                unitPrice: Number(i.unitPrice),
                subtotal: Number(i.subtotal),
                itemNotes: i.itemNotes,
                isPrepared: Boolean(i.isPrepared),
                modifiers: (i.modifiers || []).map((m: any) => m.modifierOption?.name || m.name),
                additions: (i.additions || []).map((a: any) => ({
                  id: a.additionId || a.id,
                  name: a.addition?.name || a.name,
                  quantity: a.quantity,
                  price: Number(a.priceCharged || a.price),
                })),
              })),
            }
            return [formatted, ...prev]
          })
        }
      } catch (err) {
        console.error('[KDS] Error fetching new order details:', err)
      }
    })

    // Actualización de estado de comanda
    socket.on(WsServerEvent.ORDER_STATUS_UPDATED, (data: any) => {
      setOrders((prev) =>
        prev
          .map((o) => (o.id === data.orderId ? { ...o, status: data.newStatus } : o))
          .filter((o) => o.status !== 'DELIVERED' && o.status !== 'CANCELLED')
      )
    })

    // Checklist de ítem individual toggleado en otro terminal
    socket.on('kds:item_toggled', (data: { orderId: string; itemId: string; isPrepared: boolean }) => {
      setOrders((prev) =>
        prev.map((o) => {
          if (o.id !== data.orderId) return o
          return {
            ...o,
            items: o.items.map((i) =>
              i.id === data.itemId ? { ...i, isPrepared: data.isPrepared } : i
            ),
          }
        })
      )
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [restaurantId, soundEnabled])

  // Actualizar estado de comanda (A Cocinar -> Listo -> Servido)
  const handleUpdateStatus = async (
    order: KdsOrder,
    newStatus: 'PREPARING' | 'READY' | 'DELIVERED' | 'CANCELLED'
  ) => {
    setUpdatingOrderId(order.id)
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) throw new Error('Error al actualizar estado')

      if (newStatus === 'READY' && soundEnabled) {
        soundNotifier.playOrderReadyChime()
      }

      if (newStatus === 'DELIVERED' || newStatus === 'CANCELLED') {
        // Remover de la pantalla de cocina
        setOrders((prev) => prev.filter((o) => o.id !== order.id))
      } else {
        setOrders((prev) =>
          prev.map((o) => (o.id === order.id ? { ...o, status: newStatus } : o))
        )
      }
    } catch (err: any) {
      alert(err.message || 'Error al actualizar orden')
    } finally {
      setUpdatingOrderId(null)
    }
  }

  // Toggle de prioridad (Normal vs Urgente)
  const handleTogglePriority = async (order: KdsOrder) => {
    const nextPriority = order.priority === 'URGENT' ? 'NORMAL' : 'URGENT'
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority: nextPriority }),
      })
      if (!res.ok) throw new Error('Error al cambiar prioridad')

      if (nextPriority === 'URGENT' && soundEnabled) {
        soundNotifier.playUrgentAlertChime()
      }

      setOrders((prev) =>
        prev.map((o) => (o.id === order.id ? { ...o, priority: nextPriority } : o))
      )
    } catch (err: any) {
      alert(err.message)
    }
  }

  // Tachar / Check ítem individual
  const handleToggleItem = async (orderId: string, item: KdsOrderItem) => {
    const nextState = !item.isPrepared
    // Optimistic update
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId) return o
        return {
          ...o,
          items: o.items.map((i) => (i.id === item.id ? { ...i, isPrepared: nextState } : i)),
        }
      })
    )

    try {
      await fetch(`/api/orders/${orderId}/items/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPrepared: nextState }),
      })
    } catch (err) {
      console.warn('[KDS] Error saving item checklist state:', err)
    }
  }

  // Formateador de tiempo transcurrido (MM:SS)
  const getElapsed = (createdAtIso: string) => {
    const totalSeconds = Math.max(0, Math.floor((currentTime - new Date(createdAtIso).getTime()) / 1000))
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return {
      minutes,
      seconds,
      formatted: `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
    }
  }

  // Filtrado y ordenamiento de comandas (Urgentes primero, luego más antiguas)
  const filteredOrders = useMemo(() => {
    let list = orders

    if (statusFilter !== 'ALL') {
      list = list.filter((o) => o.status === statusFilter)
    }

    return [...list].sort((a, b) => {
      // Urgente siempre primero
      if (a.priority === 'URGENT' && b.priority !== 'URGENT') return -1
      if (a.priority !== 'URGENT' && b.priority === 'URGENT') return 1
      // Luego por orden de antigüedad (más viejas primero)
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    })
  }, [orders, statusFilter])

  // Contadores
  const counts = useMemo(() => {
    return {
      all: orders.length,
      received: orders.filter((o) => o.status === 'RECEIVED').length,
      preparing: orders.filter((o) => o.status === 'PREPARING').length,
      ready: orders.filter((o) => o.status === 'READY').length,
      urgent: orders.filter((o) => o.priority === 'URGENT').length,
    }
  }, [orders])

  return (
    <div
      className={`min-h-screen bg-zinc-950 text-white flex flex-col select-none ${
        isOverlayFullscreen ? 'fixed inset-0 z-50 overflow-hidden' : ''
      }`}
    >
      {/* Banner de Nueva Orden Flotante */}
      {newOrderAlert && (
        <div className="fixed top-4 right-4 z-50 bg-amber-500 text-zinc-950 px-6 py-4 rounded-2xl shadow-2xl shadow-amber-500/40 font-black flex items-center gap-3 border-2 border-amber-300 animate-bounce">
          <span className="text-2xl">🔔</span>
          <div>
            <p className="text-base tracking-wide uppercase">¡Nueva comanda!</p>
            <p className="text-xs font-bold text-zinc-900">Mesa {newOrderAlert.tableNumber}</p>
          </div>
        </div>
      )}

      {/* Barra de Control Superior KDS */}
      <header className="bg-zinc-900 border-b border-zinc-800 px-4 py-3 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🍳</span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-black text-lg tracking-wider text-white">KDS — Cocina</h1>
              <span className="text-xs bg-zinc-800 text-amber-400 font-mono px-2 py-0.5 rounded-full border border-zinc-700">
                {restaurantName}
              </span>
              {fullscreenMode && (
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Tablet View
                </span>
              )}
            </div>
            <p className="text-[11px] text-zinc-400">Kitchen Display System • Pantalla Táctil</p>
          </div>
        </div>

        {/* Filtros de estado */}
        <div className="flex items-center bg-zinc-950/80 p-1 rounded-xl border border-zinc-800 gap-1">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'ALL'
                ? 'bg-amber-500 text-zinc-950 shadow-md font-black'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Todas ({counts.all})
          </button>
          <button
            onClick={() => setStatusFilter('RECEIVED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'RECEIVED'
                ? 'bg-blue-600 text-white shadow-md font-black'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <span>📥 Recibidas</span>
            <span className="text-[10px] bg-zinc-900/60 px-1.5 py-0.2 rounded-full">
              {counts.received}
            </span>
          </button>
          <button
            onClick={() => setStatusFilter('PREPARING')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'PREPARING'
                ? 'bg-amber-500 text-zinc-950 shadow-md font-black'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <span>🍳 En Marcha</span>
            <span className="text-[10px] bg-zinc-900/60 px-1.5 py-0.2 rounded-full">
              {counts.preparing}
            </span>
          </button>
          <button
            onClick={() => setStatusFilter('READY')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'READY'
                ? 'bg-emerald-600 text-white shadow-md font-black'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <span>🔔 Listas</span>
            <span className="text-[10px] bg-zinc-900/60 px-1.5 py-0.2 rounded-full">
              {counts.ready}
            </span>
          </button>
        </div>

        {/* Acciones del KDS */}
        <div className="flex items-center gap-2">
          {counts.urgent > 0 && (
            <div className="flex items-center gap-1.5 bg-red-500/20 border border-red-500/40 text-red-300 px-3 py-1.5 rounded-xl text-xs font-extrabold animate-pulse">
              <span>🔥</span>
              <span>{counts.urgent} Urgente{counts.urgent > 1 ? 's' : ''}</span>
            </div>
          )}

          {!fullscreenMode && (
            <a
              href="/kds"
              target="_blank"
              rel="noopener noreferrer"
              title="Abrir en pestaña dedicada (Modo Tablet KDS sin barra lateral)"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold transition-all cursor-pointer"
            >
              <span>📱</span>
              <span>Modo Tablet</span>
            </a>
          )}

          <button
            onClick={() => {
              setSoundEnabled(!soundEnabled)
              if (!soundEnabled) soundNotifier.playKitchenNewOrderAlert()
            }}
            title={soundEnabled ? 'Sonido activado' : 'Sonido silenciado'}
            className={`p-2.5 rounded-xl border text-sm transition-all cursor-pointer ${
              soundEnabled
                ? 'bg-zinc-800 text-amber-400 border-zinc-700 hover:bg-zinc-700'
                : 'bg-zinc-900 text-zinc-500 border-zinc-800 hover:text-zinc-300'
            }`}
          >
            {soundEnabled ? '🔔' : '🔕'}
          </button>

          <button
            onClick={() => {
              soundNotifier.playKitchenNewOrderAlert()
              triggerKitchenVibration()
            }}
            title="Probar alarma sonora"
            className="px-2.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold border border-zinc-700 transition-all cursor-pointer"
          >
            🔊 Probar
          </button>

          <button
            onClick={toggleFullscreen}
            title={isFullscreen || isOverlayFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
            className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
              isFullscreen || isOverlayFullscreen
                ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-md font-black'
                : 'bg-zinc-800 hover:bg-zinc-700 text-white border-zinc-700'
            }`}
          >
            <span>{isFullscreen || isOverlayFullscreen ? '🗗' : '⛶'}</span>
            <span className="hidden md:inline">
              {isFullscreen || isOverlayFullscreen ? 'Salir' : 'Pantalla Completa'}
            </span>
          </button>
        </div>
      </header>

      {/* Contenedor Principal de Comandas */}
      <main className="flex-1 p-4 overflow-y-auto">
        {filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-zinc-600 space-y-4">
            <span className="text-6xl animate-pulse">👨‍🍳</span>
            <p className="text-xl font-bold text-zinc-400">Cocina al día — Sin comandas pendientes</p>
            <p className="text-xs text-zinc-500">
              Las nuevas órdenes recibidas aparecerán aquí en tiempo real con alarma sonora.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
            {filteredOrders.map((order) => {
              const elapsed = getElapsed(order.createdAt)
              const isUrgent = order.priority === 'URGENT'
              const isLate = elapsed.minutes >= 20 || isUrgent
              const isWarning = elapsed.minutes >= 12 && elapsed.minutes < 20

              // Color del header de comanda según urgencia
              const headerBg = isLate
                ? 'bg-red-600/90 border-red-500'
                : isWarning
                ? 'bg-amber-600/90 border-amber-500'
                : order.status === 'READY'
                ? 'bg-emerald-600/90 border-emerald-500'
                : 'bg-zinc-800 border-zinc-700'

              return (
                <div
                  key={order.id}
                  className={`bg-zinc-900 border rounded-3xl overflow-hidden flex flex-col shadow-2xl transition-all ${
                    isUrgent
                      ? 'border-red-500 shadow-red-500/20 ring-2 ring-red-500/30'
                      : isLate
                      ? 'border-red-500/60 shadow-red-500/10'
                      : 'border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  {/* Cabecera de Comanda */}
                  <div className={`px-4 py-3 border-b text-white flex items-start justify-between ${headerBg}`}>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-xl tracking-tight">Mesa {order.tableNumber}</span>
                        {isUrgent && (
                          <span className="text-[10px] font-black uppercase bg-white text-red-600 px-2 py-0.5 rounded-full shadow">
                            URGENTE
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-white/80 font-medium">
                        {order.zone || 'Salón'} {order.waiterName ? `• ${order.waiterName}` : ''}
                      </p>
                    </div>

                    {/* Cronómetro en vivo */}
                    <div className="text-right">
                      <div className="font-mono font-black text-xl tracking-wider flex items-center gap-1">
                        <span>⏱️</span>
                        <span>{elapsed.formatted}</span>
                      </div>
                      <p className="text-[10px] text-white/75 font-semibold">
                        {new Date(order.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Notas de la orden si tiene */}
                  {order.notes && (
                    <div className="bg-amber-500/10 border-b border-amber-500/20 px-3.5 py-2 text-xs text-amber-300 font-bold flex items-center gap-2">
                      <span>⚠️</span>
                      <span className="truncate">{order.notes}</span>
                    </div>
                  )}

                  {/* Lista de Platos con Checklist Táctil */}
                  <div className="p-3.5 space-y-3 flex-1 overflow-y-auto max-h-72 divide-y divide-zinc-800/60">
                    {order.items.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => handleToggleItem(order.id, item)}
                        className={`pt-2.5 first:pt-0 cursor-pointer group transition-all flex items-start gap-2.5 ${
                          item.isPrepared ? 'opacity-40 line-through' : ''
                        }`}
                      >
                        {/* Checkbox táctil */}
                        <div
                          className={`w-6 h-6 rounded-lg border flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 transition-colors ${
                            item.isPrepared
                              ? 'bg-emerald-500 border-emerald-400 text-zinc-950 font-black'
                              : 'border-zinc-700 bg-zinc-800 text-transparent group-hover:border-zinc-500'
                          }`}
                        >
                          ✓
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-black text-sm text-white">
                              {item.quantity}× {item.name}
                            </span>
                          </div>

                          {/* Modificadores */}
                          {item.modifiers.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {item.modifiers.map((mod, idx) => (
                                <span
                                  key={idx}
                                  className="text-[11px] font-bold bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded-md border border-zinc-700"
                                >
                                  {mod}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Adicionales */}
                          {item.additions.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {item.additions.map((add) => (
                                <span
                                  key={add.id}
                                  className="text-[10px] font-semibold bg-amber-500/15 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/30"
                                >
                                  +{add.name} {add.quantity > 1 ? `(${add.quantity})` : ''}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Notas particulares del plato */}
                          {item.itemNotes && (
                            <p className="text-[11px] text-amber-400 font-bold mt-1 bg-amber-500/10 px-2 py-0.5 rounded">
                              Nota: {item.itemNotes}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Barra de Acciones Táctiles KDS */}
                  <div className="p-3 bg-zinc-950/80 border-t border-zinc-800/80 space-y-2">
                    <div className="flex items-center gap-1.5">
                      {order.status === 'RECEIVED' && (
                        <button
                          onClick={() => handleUpdateStatus(order, 'PREPARING')}
                          disabled={updatingOrderId === order.id}
                          className="flex-1 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs transition-all shadow-lg shadow-amber-500/20 active:scale-95 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                        >
                          <span>🍳 Iniciar</span>
                        </button>
                      )}

                      {order.status === 'PREPARING' && (
                        <button
                          onClick={() => handleUpdateStatus(order, 'READY')}
                          disabled={updatingOrderId === order.id}
                          className="flex-1 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-xs transition-all shadow-lg shadow-emerald-500/20 active:scale-95 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                        >
                          <span>🔔 ¡Listo!</span>
                        </button>
                      )}

                      {order.status === 'READY' && (
                        <button
                          onClick={() => handleUpdateStatus(order, 'DELIVERED')}
                          disabled={updatingOrderId === order.id}
                          className="flex-1 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs transition-all shadow-lg shadow-blue-500/20 active:scale-95 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                        >
                          <span>🍽️ Servir</span>
                        </button>
                      )}

                      {/* Botón Prioridad Urgente */}
                      <button
                        onClick={() => handleTogglePriority(order)}
                        title={order.priority === 'URGENT' ? 'Quitar prioridad' : 'Hacer urgente'}
                        className={`px-3 py-3 rounded-2xl border text-xs font-bold transition-all active:scale-95 cursor-pointer ${
                          order.priority === 'URGENT'
                            ? 'bg-red-600 border-red-500 text-white shadow-lg shadow-red-600/30'
                            : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-700'
                        }`}
                      >
                        🔥
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
