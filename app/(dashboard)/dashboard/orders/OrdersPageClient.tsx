'use client'

import { useEffect, useState, useCallback } from 'react'
import { io, type Socket } from 'socket.io-client'
import {
  WsStaffEvent,
  WsServerEvent,
  type ServerToClientEvents,
  type StaffToServerEvents,
  type OrderNotificationPayload,
  type CallWaiterPayload,
} from '@/types/websocket-events'

type StaffSocket = Socket<ServerToClientEvents, StaffToServerEvents>

interface OrdersPageClientProps {
  restaurantId: string
  initialOrders: OrderNotificationPayload[]
}

export function OrdersPageClient({ restaurantId, initialOrders }: OrdersPageClientProps) {
  const [orders, setOrders] = useState<OrderNotificationPayload[]>(initialOrders)
  const [alerts, setAlerts] = useState<CallWaiterPayload[]>([])
  const [connected, setConnected] = useState(false)

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount)

  const dismissAlert = useCallback((tableId: string, timestamp: string) => {
    setAlerts((prev) => prev.filter((a) => !(a.tableId === tableId && a.timestamp === timestamp)))
  }, [])

  useEffect(() => {
    const socketUrl =
      process.env.NEXT_PUBLIC_SOCKET_URL ||
      (typeof window !== 'undefined' ? window.location.origin : '')

    const socket: StaffSocket = io(socketUrl, {
      path: '/api/socketio',
      transports: ['websocket', 'polling'],
    })

    socket.on('connect', () => {
      setConnected(true)
      socket.emit(WsStaffEvent.JOIN_STAFF_ROOM, {
        restaurantId,
        staffToken: 'placeholder-jwt', // TODO: usar JWT real del staff
      })
    })

    socket.on('disconnect', () => setConnected(false))

    socket.on(WsServerEvent.ORDER_RECEIVED, (order) => {
      setOrders((prev) => [order, ...prev])
    })

    socket.on(WsServerEvent.ALERT_WAITER, (alert) => {
      setAlerts((prev) => [alert, ...prev])
    })

    return () => {
      socket.disconnect()
    }
  }, [restaurantId])

  const alertLabels: Record<string, string> = {
    HELP_REQUESTED: '🙋 Solicita asistencia',
    BILL_REQUESTED: '💳 Solicita la cuenta',
    SPILL_CLEANUP: '🧹 Solicita limpieza',
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Pedidos en Tiempo Real</h1>
        <div className={`flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full
                         ${connected ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
          <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
          {connected ? 'Conectado' : 'Desconectado'}
        </div>
      </div>

      {/* Alertas de mesero */}
      {alerts.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-zinc-400 mb-2 uppercase tracking-wide">
            🔔 Alertas ({alerts.length})
          </h2>
          <div className="space-y-2">
            {alerts.map((alert) => (
              <div
                key={`${alert.tableId}-${alert.timestamp}`}
                className="flex items-center justify-between bg-amber-500/10 border border-amber-500/30
                           rounded-xl px-4 py-3 animate-pulse"
              >
                <div>
                  <p className="font-semibold text-amber-300 text-sm">
                    Mesa {alert.tableNumber} — {alertLabels[alert.alertType] ?? alert.alertType}
                  </p>
                  <p className="text-xs text-zinc-400">{formatTime(alert.timestamp)}</p>
                </div>
                <button
                  onClick={() => dismissAlert(alert.tableId, alert.timestamp)}
                  className="text-xs text-zinc-500 hover:text-white bg-zinc-800 hover:bg-zinc-700
                             px-3 py-1.5 rounded-lg transition-colors"
                >
                  Reconocer
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Lista de órdenes */}
      <section>
        <h2 className="text-sm font-semibold text-zinc-400 mb-3 uppercase tracking-wide">
          Órdenes Recibidas
        </h2>

        {orders.length === 0 ? (
          <div className="text-center py-16 text-zinc-600">
            <p className="text-4xl mb-2">🍽️</p>
            <p className="text-sm">Esperando pedidos...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {orders.map((order) => (
              <OrderCard
                key={order.orderId}
                order={order}
                formatTime={formatTime}
                formatCurrency={formatCurrency}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function OrderCard({
  order,
  formatTime,
  formatCurrency,
}: {
  order: OrderNotificationPayload
  formatTime: (iso: string) => string
  formatCurrency: (n: number) => string
}) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3
                    hover:border-amber-500/30 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-bold text-white text-sm">Mesa {order.tableNumber}</p>
          <p className="text-xs text-zinc-400">{formatTime(order.createdAt)}</p>
        </div>
        <span className="text-[10px] bg-amber-500/20 text-amber-400 font-bold px-2 py-1 rounded-full">
          RECIBIDO
        </span>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-zinc-400">{order.itemsCount} ítem{order.itemsCount !== 1 ? 's' : ''}</span>
        <span className="font-bold text-amber-400">{formatCurrency(order.totalAmount)}</span>
      </div>

      <p className="text-[10px] text-zinc-600 font-mono truncate">#{order.orderId.split('-')[0]}</p>
    </div>
  )
}
