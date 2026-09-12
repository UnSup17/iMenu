'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import Link from 'next/link'
import { io, type Socket } from 'socket.io-client'
import {
  WsStaffEvent,
  WsServerEvent,
  type ServerToClientEvents,
  type StaffToServerEvents,
  type CallWaiterPayload,
} from '@/types/websocket-events'
import { soundNotifier, triggerKitchenVibration } from '@/lib/audio/chime'

export interface EnrichedOrderItem {
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

export interface EnrichedOrder {
  id: string
  tableId: string
  tableNumber: number
  zone?: string | null
  waiterId?: string | null
  waiterName?: string | null
  status: 'RECEIVED' | 'PREPARING' | 'READY' | 'DELIVERED' | 'CANCELLED'
  priority: 'NORMAL' | 'URGENT'
  totalAmount: number
  notes?: string | null
  createdAt: string
  preparedAt?: string | null
  deliveredAt?: string | null
  itemsCount: number
  items: EnrichedOrderItem[]
}

interface OrdersPageClientProps {
  restaurantId: string
  initialOrders: EnrichedOrder[]
  waiters: { id: string; name: string }[]
  products: { id: string; name: string }[]
}

export function OrdersPageClient({
  restaurantId,
  initialOrders,
  waiters,
  products,
}: OrdersPageClientProps) {
  // Tab principal
  const [activeTab, setActiveTab] = useState<'active' | 'history' | 'metrics'>('active')

  // Estado de órdenes activas
  const [orders, setOrders] = useState<EnrichedOrder[]>(initialOrders)
  const [alerts, setAlerts] = useState<CallWaiterPayload[]>([])
  const [connected, setConnected] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [currentTime, setCurrentTime] = useState(Date.now())
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)

  // Filtros de Comandas Activas
  const [filterStatus, setFilterStatus] = useState<string>('ALL')
  const [filterPriority, setFilterPriority] = useState<string>('ALL')
  const [filterWaiter, setFilterWaiter] = useState<string>('ALL')
  const [filterHour, setFilterHour] = useState<string>('ALL')
  const [filterProduct, setFilterProduct] = useState<string>('ALL')

  // Historial del Día
  const [historyOrders, setHistoryOrders] = useState<EnrichedOrder[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historySearch, setHistorySearch] = useState('')
  const [historyDate, setHistoryDate] = useState(() => new Date().toISOString().split('T')[0])
  const [historySummary, setHistorySummary] = useState<{
    totalOrders: number
    totalRevenue: number
    avgPrepMinutes: number | null
    onTimeRate: number
  } | null>(null)

  // Métricas de Cocina
  const [kitchenStats, setKitchenStats] = useState<{
    avgPreparationTimeMinutes: number
    activeOrdersCount: number
    urgentOrdersCount: number
    todayCompletedCount: number
    onTimeRate: number
    productStats: {
      productId: string
      name: string
      orderCount: number
      avgMinutes: number
      isBottleneck: boolean
    }[]
  } | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)

  // Actualizar temporizador en vivo
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Cargar Historial al cambiar tab o filtros
  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true)
    try {
      const params = new URLSearchParams({
        restaurantId,
        date: historyDate,
        search: historySearch,
      })
      if (filterStatus !== 'ALL') params.set('status', filterStatus)
      if (filterPriority !== 'ALL') params.set('priority', filterPriority)
      if (filterWaiter !== 'ALL') params.set('waiterId', filterWaiter)
      if (filterHour !== 'ALL') params.set('hourRange', filterHour)
      if (filterProduct !== 'ALL') params.set('productId', filterProduct)

      const res = await fetch(`/api/orders/history?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setHistoryOrders(data.orders || [])
        setHistorySummary(data.summary || null)
      }
    } catch (e) {
      console.error('[OrdersPageClient] Error fetching history:', e)
    } finally {
      setHistoryLoading(false)
    }
  }, [restaurantId, historyDate, historySearch, filterStatus, filterPriority, filterWaiter, filterHour, filterProduct])

  // Cargar Métricas de Cocina
  const fetchKitchenStats = useCallback(async () => {
    setStatsLoading(true)
    try {
      const res = await fetch(`/api/kitchen/stats?restaurantId=${restaurantId}`)
      if (res.ok) {
        const data = await res.json()
        setKitchenStats(data)
      }
    } catch (e) {
      console.error('[OrdersPageClient] Error fetching stats:', e)
    } finally {
      setStatsLoading(false)
    }
  }, [restaurantId])

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory()
    } else if (activeTab === 'metrics') {
      fetchKitchenStats()
    }
  }, [activeTab, fetchHistory, fetchKitchenStats])

  // Conexión Socket.IO
  const socketRef = useRef<Socket<ServerToClientEvents, StaffToServerEvents> | null>(null)

  useEffect(() => {
    const socketUrl =
      process.env.NEXT_PUBLIC_SOCKET_URL ||
      (typeof window !== 'undefined' ? window.location.origin : '')

    const socket: Socket<ServerToClientEvents, StaffToServerEvents> = io(socketUrl, {
      path: '/api/socketio',
      transports: ['websocket', 'polling'],
    })

    socketRef.current = socket

    socket.on('connect', () => {
      setConnected(true)
      socket.emit(WsStaffEvent.JOIN_STAFF_ROOM, {
        restaurantId,
        staffToken: 'staff-portal',
      })
    })

    socket.on('disconnect', () => setConnected(false))

    // Nueva orden recibida
    socket.on(WsServerEvent.ORDER_RECEIVED, async (payload: any) => {
      if (soundEnabled) {
        soundNotifier.playKitchenNewOrderAlert()
        triggerKitchenVibration()
      }

      try {
        const res = await fetch(`/api/orders/${payload.orderId}`)
        if (res.ok) {
          const fresh = await res.json()
          setOrders((prev) => {
            if (prev.some((o) => o.id === fresh.id)) return prev
            const formatted: EnrichedOrder = {
              id: fresh.id,
              tableId: fresh.tableId,
              tableNumber: fresh.table?.tableNumber || payload.tableNumber,
              zone: fresh.table?.zone,
              waiterId: fresh.table?.assignedWaiter?.id || null,
              waiterName: fresh.table?.assignedWaiter?.name || null,
              status: fresh.status,
              priority: fresh.priority || 'NORMAL',
              totalAmount: Number(fresh.totalAmount),
              notes: fresh.notes,
              createdAt: fresh.createdAt,
              preparedAt: fresh.preparedAt,
              deliveredAt: fresh.deliveredAt,
              itemsCount: fresh.items.reduce((s: number, i: any) => s + i.quantity, 0),
              items: fresh.items.map((i: any) => ({
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
        console.error('[OrdersPageClient] Error loading new order:', err)
      }
    })

    // Actualización de estado de orden
    socket.on(WsServerEvent.ORDER_STATUS_UPDATED, (data: any) => {
      setOrders((prev) =>
        prev
          .map((o) => (o.id === data.orderId ? { ...o, status: data.newStatus } : o))
          .filter((o) => o.status !== 'DELIVERED' && o.status !== 'CANCELLED')
      )
    })

    // Alertas de mesero
    socket.on(WsServerEvent.ALERT_WAITER, (alert) => {
      setAlerts((prev) => [alert, ...prev])
      if (soundEnabled) {
        soundNotifier.playUrgentAlertChime()
      }
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [restaurantId, soundEnabled])

  // Descartar o atender alerta
  const dismissAlert = (tableId: string, timestamp: string) => {
    setAlerts((prev) => prev.filter((a) => !(a.tableId === tableId && a.timestamp === timestamp)))
  }

  const acknowledgeAlert = (alert: CallWaiterPayload) => {
    if (socketRef.current) {
      socketRef.current.emit(WsStaffEvent.WAITER_ACKNOWLEDGED, {
        restaurantId,
        tableId: alert.tableId,
        waiterId: 'staff-waiter',
        waiterName: 'Mesero',
        estimatedMinutes: 2,
        timestamp: new Date().toISOString(),
      })
    }
    dismissAlert(alert.tableId, alert.timestamp)
  }

  // Actualizar estado de comanda
  const handleUpdateStatus = async (
    order: EnrichedOrder,
    newStatus: 'PREPARING' | 'READY' | 'DELIVERED' | 'CANCELLED'
  ) => {
    setActionLoadingId(order.id)
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) throw new Error('Error al actualizar comanda')

      if (newStatus === 'READY' && soundEnabled) {
        soundNotifier.playOrderReadyChime()
      }

      if (newStatus === 'DELIVERED' || newStatus === 'CANCELLED') {
        setOrders((prev) => prev.filter((o) => o.id !== order.id))
      } else {
        setOrders((prev) =>
          prev.map((o) => (o.id === order.id ? { ...o, status: newStatus } : o))
        )
      }
    } catch (e: any) {
      alert(e.message)
    } finally {
      setActionLoadingId(null)
    }
  }

  // Toggle Prioridad Urgente
  const handleTogglePriority = async (order: EnrichedOrder) => {
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
    } catch (e: any) {
      alert(e.message)
    }
  }

  // Formato de moneda y tiempo
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(
      amount
    )

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  const getElapsed = (createdAtIso: string) => {
    const totalMinutes = Math.floor((currentTime - new Date(createdAtIso).getTime()) / 60000)
    return totalMinutes
  }

  // Órdenes activas filtradas
  const filteredActiveOrders = useMemo(() => {
    let list = orders

    if (filterStatus !== 'ALL') {
      list = list.filter((o) => o.status === filterStatus)
    }
    if (filterPriority !== 'ALL') {
      list = list.filter((o) => o.priority === filterPriority)
    }
    if (filterWaiter !== 'ALL') {
      list = list.filter((o) => o.waiterId === filterWaiter)
    }
    if (filterProduct !== 'ALL') {
      list = list.filter((o) => o.items.some((i) => i.productId === filterProduct))
    }
    if (filterHour !== 'ALL') {
      list = list.filter((o) => {
        const hour = new Date(o.createdAt).getHours()
        switch (filterHour) {
          case 'morning':
            return hour >= 6 && hour < 12
          case 'noon':
            return hour >= 12 && hour < 16
          case 'evening':
            return hour >= 16 && hour < 20
          case 'night':
            return hour >= 20 || hour < 6
          default:
            return true
        }
      })
    }

    return [...list].sort((a, b) => {
      if (a.priority === 'URGENT' && b.priority !== 'URGENT') return -1
      if (a.priority !== 'URGENT' && b.priority === 'URGENT') return 1
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
  }, [orders, filterStatus, filterPriority, filterWaiter, filterProduct, filterHour])

  const alertConfig: Record<string, { label: string; icon: string; bg: string; text: string }> = {
    HELP_REQUESTED: { label: 'Solicita Asistencia', icon: '🙋', bg: 'bg-amber-500/20 border-amber-500/40', text: 'text-amber-300' },
    BILL_REQUESTED: { label: 'Pide la Cuenta', icon: '💳', bg: 'bg-emerald-500/20 border-emerald-500/40', text: 'text-emerald-300' },
    SPILL_CLEANUP: { label: 'Limpieza en Mesa', icon: '🧹', bg: 'bg-blue-500/20 border-blue-500/40', text: 'text-blue-300' },
  }

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto text-white">
      {/* Header Superior y Accesos */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-white tracking-tight">Pedidos & Panel de Cocina</h1>
            <div
              className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${
                connected
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-red-500/10 text-red-400 border-red-500/30'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
              {connected ? 'WebSocket Conectado' : 'Desconectado'}
            </div>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Gestión de comandas en vivo, monitoreo de cocina KDS y estadísticas operativas.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Botón de Sonido */}
          <button
            onClick={() => {
              setSoundEnabled(!soundEnabled)
              if (!soundEnabled) soundNotifier.playKitchenNewOrderAlert()
            }}
            title={soundEnabled ? 'Sonido activado' : 'Sonido desactivado'}
            className={`p-2.5 rounded-xl border text-sm transition-all cursor-pointer ${
              soundEnabled
                ? 'bg-zinc-900 text-amber-400 border-zinc-700 hover:bg-zinc-800'
                : 'bg-zinc-900 text-zinc-500 border-zinc-800 hover:text-zinc-300'
            }`}
          >
            {soundEnabled ? '🔔 Alarma Activada' : '🔕 Alarma Mute'}
          </button>

          {/* Acceso directo a Pantalla KDS Tablet */}
          <Link
            href="/dashboard/kds"
            target="_blank"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
          >
            <span>📺</span>
            <span>Abrir Pantalla KDS (Tablet)</span>
            <span className="text-[10px] bg-zinc-950/20 px-1.5 py-0.5 rounded-md">↗</span>
          </Link>
        </div>
      </div>

      {/* Alertas de Mesero en Vivo */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-400 animate-ping" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-red-400">
              Llamados de Mesero Activos ({alerts.length})
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {alerts.map((alert) => {
              const cfg = alertConfig[alert.alertType] || alertConfig.HELP_REQUESTED
              return (
                <div
                  key={`${alert.tableId}-${alert.timestamp}`}
                  className={`flex items-center justify-between p-3.5 rounded-2xl border ${cfg.bg} backdrop-blur-sm animate-pulse`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{cfg.icon}</span>
                    <div>
                      <p className="font-extrabold text-white text-sm">
                        Mesa {alert.tableNumber}
                      </p>
                      <p className={`text-xs font-semibold ${cfg.text}`}>{cfg.label}</p>
                      <p className="text-[10px] text-zinc-400 mt-0.5">{formatTime(alert.timestamp)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => acknowledgeAlert(alert)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold transition-all cursor-pointer"
                    >
                      Atender
                    </button>
                    <button
                      onClick={() => dismissAlert(alert.tableId, alert.timestamp)}
                      className="p-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-xs cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Navegación por Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-zinc-900/70 border border-zinc-800 p-2 rounded-2xl">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            onClick={() => setActiveTab('active')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'active'
                ? 'bg-amber-500 text-zinc-950 font-black shadow-lg shadow-amber-500/20'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <span>📋</span>
            <span>Comandas Activas ({orders.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'history'
                ? 'bg-amber-500 text-zinc-950 font-black shadow-lg shadow-amber-500/20'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <span>📜</span>
            <span>Historial del Día & Búsqueda</span>
          </button>

          <button
            onClick={() => setActiveTab('metrics')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'metrics'
                ? 'bg-amber-500 text-zinc-950 font-black shadow-lg shadow-amber-500/20'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <span>📊</span>
            <span>Tiempos de Cocina & Métricas</span>
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* TAB 1: COMANDAS ACTIVAS                                      */}
      {/* ============================================================ */}
      {activeTab === 'active' && (
        <div className="space-y-4">
          {/* Barra de Filtros Avanzados */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3.5 flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-zinc-400 font-semibold">Estado:</span>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-zinc-950 border border-zinc-700 rounded-xl px-2.5 py-1.5 text-white font-medium focus:outline-none focus:border-amber-500"
              >
                <option value="ALL">Todos los estados</option>
                <option value="RECEIVED">📥 Recibidas</option>
                <option value="PREPARING">🍳 En Preparación</option>
                <option value="READY">🔔 Listas</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-zinc-400 font-semibold">Prioridad:</span>
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="bg-zinc-950 border border-zinc-700 rounded-xl px-2.5 py-1.5 text-white font-medium focus:outline-none focus:border-amber-500"
              >
                <option value="ALL">Todas</option>
                <option value="URGENT">🔥 Solo Urgentes</option>
                <option value="NORMAL">Normales</option>
              </select>
            </div>

            {waiters.length > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="text-zinc-400 font-semibold">Mesero:</span>
                <select
                  value={filterWaiter}
                  onChange={(e) => setFilterWaiter(e.target.value)}
                  className="bg-zinc-950 border border-zinc-700 rounded-xl px-2.5 py-1.5 text-white font-medium focus:outline-none focus:border-amber-500"
                >
                  <option value="ALL">Todos los meseros</option>
                  {waiters.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-center gap-1.5">
              <span className="text-zinc-400 font-semibold">Horario:</span>
              <select
                value={filterHour}
                onChange={(e) => setFilterHour(e.target.value)}
                className="bg-zinc-950 border border-zinc-700 rounded-xl px-2.5 py-1.5 text-white font-medium focus:outline-none focus:border-amber-500"
              >
                <option value="ALL">Todo el día</option>
                <option value="morning">🌅 Mañana (06:00 - 12:00)</option>
                <option value="noon">☀️ Mediodía (12:00 - 16:00)</option>
                <option value="evening">🌇 Tarde (16:00 - 20:00)</option>
                <option value="night">🌙 Noche (20:00 - 06:00)</option>
              </select>
            </div>

            {products.length > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="text-zinc-400 font-semibold">Platillo:</span>
                <select
                  value={filterProduct}
                  onChange={(e) => setFilterProduct(e.target.value)}
                  className="bg-zinc-950 border border-zinc-700 rounded-xl px-2.5 py-1.5 text-white font-medium focus:outline-none focus:border-amber-500 max-w-xs"
                >
                  <option value="ALL">Todos los platillos</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {(filterStatus !== 'ALL' ||
              filterPriority !== 'ALL' ||
              filterWaiter !== 'ALL' ||
              filterHour !== 'ALL' ||
              filterProduct !== 'ALL') && (
              <button
                onClick={() => {
                  setFilterStatus('ALL')
                  setFilterPriority('ALL')
                  setFilterWaiter('ALL')
                  setFilterHour('ALL')
                  setFilterProduct('ALL')
                }}
                className="text-amber-400 hover:underline text-xs font-semibold ml-auto cursor-pointer"
              >
                Limpiar filtros
              </button>
            )}
          </div>

          {/* Cuadrícula de Comandas Activas */}
          {filteredActiveOrders.length === 0 ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-16 text-center text-zinc-500 space-y-3">
              <span className="text-5xl block">🍽️</span>
              <p className="text-base font-bold text-zinc-300">No hay comandas activas con los filtros actuales</p>
              <p className="text-xs text-zinc-500">
                Los nuevos pedidos desde el menú QR o meseros se sincronizarán aquí automáticamente.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
              {filteredActiveOrders.map((order) => {
                const elapsedMin = getElapsed(order.createdAt)
                const isUrgent = order.priority === 'URGENT'
                const isLate = elapsedMin >= 20 || isUrgent

                return (
                  <div
                    key={order.id}
                    className={`bg-zinc-900 border rounded-3xl overflow-hidden flex flex-col shadow-xl transition-all ${
                      isUrgent
                        ? 'border-red-500 shadow-red-500/20 ring-1 ring-red-500'
                        : isLate
                        ? 'border-amber-500/60 shadow-amber-500/10'
                        : 'border-zinc-800'
                    }`}
                  >
                    {/* Header de la tarjeta */}
                    <div className="p-4 border-b border-zinc-800 flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-xl text-white">Mesa {order.tableNumber}</span>
                          {isUrgent && (
                            <span className="bg-red-500/20 text-red-300 border border-red-500/40 text-[10px] font-black uppercase px-2 py-0.5 rounded-full">
                              🔥 URGENTE
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-zinc-400 mt-0.5">
                          {order.zone || 'Salón'} {order.waiterName ? `• Atiende: ${order.waiterName}` : ''}
                        </p>
                      </div>

                      <div className="text-right">
                        <span
                          className={`text-xs font-black px-2.5 py-1 rounded-full border ${
                            order.status === 'READY'
                              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                              : order.status === 'PREPARING'
                              ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                              : 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                          }`}
                        >
                          {order.status === 'READY'
                            ? '🔔 LISTO'
                            : order.status === 'PREPARING'
                            ? '🍳 EN MARCHA'
                            : '📥 RECIBIDO'}
                        </span>
                        <p className="text-[11px] text-zinc-400 font-mono font-bold mt-1">
                          ⏱️ hace {elapsedMin} min
                        </p>
                      </div>
                    </div>

                    {/* Notas */}
                    {order.notes && (
                      <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-xs text-amber-300 font-semibold flex items-center gap-2">
                        <span>⚠️</span>
                        <span>{order.notes}</span>
                      </div>
                    )}

                    {/* Desglose de Platos */}
                    <div className="p-4 space-y-2.5 flex-1 divide-y divide-zinc-800/60 overflow-y-auto max-h-60">
                      {order.items.map((item) => (
                        <div key={item.id} className="pt-2 first:pt-0">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-extrabold text-white">
                              {item.quantity}× {item.name}
                            </span>
                            <span className="font-semibold text-zinc-400 text-xs">
                              {formatCurrency(item.subtotal)}
                            </span>
                          </div>

                          {/* Modificadores */}
                          {item.modifiers.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {item.modifiers.map((m, idx) => (
                                <span
                                  key={idx}
                                  className="text-[10px] bg-zinc-800 text-zinc-300 px-1.5 py-0.5 rounded border border-zinc-700 font-medium"
                                >
                                  {m}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Adicionales */}
                          {item.additions.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {item.additions.map((a) => (
                                <span
                                  key={a.id}
                                  className="text-[10px] bg-amber-500/10 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/20 font-medium"
                                >
                                  +{a.name} ({a.quantity})
                                </span>
                              ))}
                            </div>
                          )}

                          {item.itemNotes && (
                            <p className="text-[11px] text-amber-300 font-medium mt-0.5">
                              Nota: {item.itemNotes}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Total y Acciones */}
                    <div className="p-4 bg-zinc-950/80 border-t border-zinc-800 space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-zinc-400">Total comanda:</span>
                        <span className="font-black text-white text-sm">{formatCurrency(order.totalAmount)}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {order.status === 'RECEIVED' && (
                          <button
                            onClick={() => handleUpdateStatus(order, 'PREPARING')}
                            disabled={actionLoadingId === order.id}
                            className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1"
                          >
                            <span>🍳 Iniciar Preparación</span>
                          </button>
                        )}

                        {order.status === 'PREPARING' && (
                          <button
                            onClick={() => handleUpdateStatus(order, 'READY')}
                            disabled={actionLoadingId === order.id}
                            className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-xs transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1"
                          >
                            <span>🔔 Marcar Listo</span>
                          </button>
                        )}

                        {order.status === 'READY' && (
                          <button
                            onClick={() => handleUpdateStatus(order, 'DELIVERED')}
                            disabled={actionLoadingId === order.id}
                            className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1"
                          >
                            <span>🍽️ Marcar Servido</span>
                          </button>
                        )}

                        {/* Toggle Prioridad */}
                        <button
                          onClick={() => handleTogglePriority(order)}
                          title={order.priority === 'URGENT' ? 'Quitar prioridad urgente' : 'Hacer urgente'}
                          className={`px-3 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                            order.priority === 'URGENT'
                              ? 'bg-red-600 border-red-500 text-white'
                              : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white'
                          }`}
                        >
                          🔥
                        </button>

                        {/* Cancelar comanda */}
                        <button
                          onClick={() => {
                            if (confirm(`¿Cancelar orden de la Mesa ${order.tableNumber}?`)) {
                              handleUpdateStatus(order, 'CANCELLED')
                            }
                          }}
                          title="Cancelar orden"
                          className="px-2.5 py-2.5 rounded-xl bg-zinc-800 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 border border-zinc-700 text-xs transition-colors cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 2: HISTORIAL DEL DÍA & BÚSQUEDA                          */}
      {/* ============================================================ */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {/* KPI Banner del Historial */}
          {historySummary && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                <span className="text-xs text-zinc-400 font-semibold block">Total Pedidos</span>
                <p className="text-2xl font-black text-white mt-1">{historySummary.totalOrders}</p>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                <span className="text-xs text-zinc-400 font-semibold block">Ventas Totales</span>
                <p className="text-2xl font-bold text-amber-400 mt-1">
                  {formatCurrency(historySummary.totalRevenue)}
                </p>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                <span className="text-xs text-zinc-400 font-semibold block">Promedio Preparación</span>
                <p className="text-2xl font-bold text-emerald-400 mt-1">
                  {historySummary.avgPrepMinutes !== null ? `~${historySummary.avgPrepMinutes} min` : 'N/A'}
                </p>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                <span className="text-xs text-zinc-400 font-semibold block">A Tiempo (&le; 20 min)</span>
                <p className="text-2xl font-bold text-blue-400 mt-1">{historySummary.onTimeRate}%</p>
              </div>
            </div>
          )}

          {/* Barra de Búsqueda y Fecha */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[260px] relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">🔍</span>
              <input
                type="text"
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder="Buscar por mesa, ID, platillo o nota de cocina..."
                className="w-full pl-10 pr-4 py-2 bg-zinc-950 border border-zinc-700 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400 font-semibold">Fecha:</span>
              <input
                type="date"
                value={historyDate}
                onChange={(e) => setHistoryDate(e.target.value)}
                className="bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <button
              onClick={fetchHistory}
              disabled={historyLoading}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs rounded-xl transition-all cursor-pointer disabled:opacity-50"
            >
              {historyLoading ? 'Buscando...' : 'Actualizar'}
            </button>
          </div>

          {/* Tabla de Historial */}
          {historyLoading ? (
            <div className="text-center py-16 text-zinc-500">Cargando historial de pedidos...</div>
          ) : historyOrders.length === 0 ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-12 text-center text-zinc-500">
              No se encontraron pedidos para la fecha y búsqueda seleccionada.
            </div>
          ) : (
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-950 border-b border-zinc-800 text-zinc-400 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Mesa / ID</th>
                      <th className="px-4 py-3">Hora Pedido</th>
                      <th className="px-4 py-3">Platillos / Ítems</th>
                      <th className="px-4 py-3">Mesero</th>
                      <th className="px-4 py-3">Tiempo Prep.</th>
                      <th className="px-4 py-3">Total</th>
                      <th className="px-4 py-3 text-right">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/80">
                    {historyOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-zinc-800/40 transition-colors">
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-extrabold text-white text-sm">Mesa {order.tableNumber}</span>
                            {order.priority === 'URGENT' && (
                              <span className="text-[10px] bg-red-500/20 text-red-300 px-1.5 rounded font-bold">
                                🔥
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-zinc-500 font-mono truncate block max-w-[120px]">
                            #{order.id.split('-')[0]}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-zinc-300 font-medium">
                          {formatTime(order.createdAt)}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="space-y-0.5 max-w-sm">
                            {order.items.map((i) => (
                              <p key={i.id} className="text-zinc-200">
                                <span className="font-bold text-amber-400">{i.quantity}×</span> {i.name}
                              </p>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-zinc-400">{order.waiterName || '—'}</td>
                        <td className="px-4 py-3.5">
                          {order.preparedAt ? (
                            <span className="font-bold text-emerald-400">
                              ⏱️ {Math.floor((new Date(order.preparedAt).getTime() - new Date(order.createdAt).getTime()) / 60000)} min
                            </span>
                          ) : (
                            <span className="text-zinc-500">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 font-bold text-white">
                          {formatCurrency(order.totalAmount)}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <span
                            className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${
                              order.status === 'DELIVERED'
                                ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                                : order.status === 'READY'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                : order.status === 'PREPARING'
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                : order.status === 'CANCELLED'
                                ? 'bg-zinc-800 text-zinc-500 border-zinc-700 line-through'
                                : 'bg-zinc-800 text-zinc-300 border-zinc-700'
                            }`}
                          >
                            {order.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 3: MÉTRICAS DE COCINA & RENDIMIENTO                      */}
      {/* ============================================================ */}
      {activeTab === 'metrics' && (
        <div className="space-y-6">
          {statsLoading || !kitchenStats ? (
            <div className="text-center py-16 text-zinc-500">Calculando métricas de cocina...</div>
          ) : (
            <>
              {/* Tarjetas KPI de Rendimiento */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">⏱️</span>
                    <span className="text-xs text-zinc-400 font-bold">Tiempo Promedio</span>
                  </div>
                  <p className="text-3xl font-black text-amber-400">
                    ~{kitchenStats.avgPreparationTimeMinutes} <span className="text-sm font-normal text-zinc-400">min</span>
                  </p>
                  <p className="text-[11px] text-zinc-500 mt-1">Estimación según pedidos completados hoy</p>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">⚡</span>
                    <span className="text-xs text-zinc-400 font-bold">A Tiempo (&le; 20 min)</span>
                  </div>
                  <p className="text-3xl font-black text-emerald-400">
                    {kitchenStats.onTimeRate}%
                  </p>
                  <p className="text-[11px] text-zinc-500 mt-1">Tasa de cumplimiento de despacho</p>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">👨‍🍳</span>
                    <span className="text-xs text-zinc-400 font-bold">Comandas Activas</span>
                  </div>
                  <p className="text-3xl font-black text-white">
                    {kitchenStats.activeOrdersCount}
                  </p>
                  <p className="text-[11px] text-zinc-500 mt-1">
                    {kitchenStats.urgentOrdersCount} con prioridad urgente
                  </p>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">✅</span>
                    <span className="text-xs text-zinc-400 font-bold">Despachadas Hoy</span>
                  </div>
                  <p className="text-3xl font-black text-blue-400">
                    {kitchenStats.todayCompletedCount}
                  </p>
                  <p className="text-[11px] text-zinc-500 mt-1">Órdenes listas o entregadas</p>
                </div>
              </div>

              {/* Tiempos de Preparación por Plato & Cuellos de Botella */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-extrabold text-base text-white">
                      Análisis de Tiempo de Preparación por Platillo
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Identifica los platos más ágiles y los cuellos de botella que más demoran en cocina.
                    </p>
                  </div>
                </div>

                {kitchenStats.productStats.length === 0 ? (
                  <p className="text-xs text-zinc-500 py-8 text-center">
                    Aún no hay suficientes órdenes completadas hoy para calcular estadísticas por plato.
                  </p>
                ) : (
                  <div className="divide-y divide-zinc-800">
                    {kitchenStats.productStats.map((p) => (
                      <div key={p.productId} className="py-3 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2.5">
                          <span className="font-bold text-white text-sm">{p.name}</span>
                          {p.isBottleneck && (
                            <span className="bg-red-500/20 text-red-300 border border-red-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                              ⚠️ Cuello de botella (&gt;20 min)
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-6">
                          <span className="text-zinc-400">{p.orderCount} preparados</span>
                          <span
                            className={`font-mono font-black text-sm ${
                              p.isBottleneck ? 'text-red-400' : 'text-emerald-400'
                            }`}
                          >
                            ~{p.avgMinutes} min
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
