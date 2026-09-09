'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react'
import { io, type Socket } from 'socket.io-client'
import {
  WsStaffEvent,
  WsServerEvent,
  type ServerToClientEvents,
  type StaffToServerEvents,
  type FoodCourtPaymentUpdatedPayload,
} from '@/types/websocket-events'
import QRCode from 'qrcode'

type StaffSocket = Socket<ServerToClientEvents, StaffToServerEvents>

export interface TablePaymentItem {
  id: string
  restaurantId: string
  restaurantName: string
  restaurantSlug: string
  restaurantLogo?: string | null
  status: 'PENDING' | 'PAID' | 'VOIDED'
  totalAmount: number
  paidAt?: string | null
  invoiceId?: string | null
  invoiceNumber?: string | null
}

export interface TableActiveSession {
  id: string
  sessionToken: string
  startedAt: string
  payments: TablePaymentItem[]
}

export interface FoodCourtTableItem {
  id: string
  tableNumber: number
  zone?: string | null
  status: string
  activeSession?: TableActiveSession | null
}

interface FoodCourtStaffTablesProps {
  foodCourtId: string
  foodCourtSlug: string
  initialTables: FoodCourtTableItem[]
  canManage: boolean
  currency?: string
}

const PAYMENT_METHODS = [
  { id: 'CASH', label: '💵 Efectivo' },
  { id: 'DEBIT_CARD', label: '💳 Tarjeta Débito' },
  { id: 'CREDIT_CARD', label: '💳 Tarjeta Crédito' },
  { id: 'TRANSFER', label: '📲 Transferencia / Nequi' },
  { id: 'QR_CODE', label: '📱 QR Bancario' },
] as const

export function FoodCourtStaffTables({
  foodCourtId,
  foodCourtSlug,
  initialTables,
  canManage,
  currency = 'COP',
}: FoodCourtStaffTablesProps) {
  const [tables, setTables] = useState<FoodCourtTableItem[]>(initialTables)
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'PENDING' | 'PAID_ALL' | 'AVAILABLE'>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [isLiveConnected, setIsLiveConnected] = useState(false)
  const socketRef = useRef<StaffSocket | null>(null)

  // Modal Crear Mesa
  const [isTableModalOpen, setIsTableModalOpen] = useState(false)
  const [newTableNumber, setNewTableNumber] = useState<number>(
    tables.length > 0 ? Math.max(...tables.map((t) => t.tableNumber)) + 1 : 1,
  )
  const [newTableZone, setNewTableZone] = useState('')
  const [isCreatingTable, setIsCreatingTable] = useState(false)

  // Modal QR
  const [qrModalData, setQrModalData] = useState<{
    tableNumber: number
    qrCodeDataUrl: string
    menuUrl: string
  } | null>(null)
  const [qrLoadingTableId, setQrLoadingTableId] = useState<string | null>(null)

  // Modal Cuenta / Checklist de Pagos de Mesa
  const [selectedBillTable, setSelectedBillTable] = useState<FoodCourtTableItem | null>(null)
  const [processingRestaurantId, setProcessingRestaurantId] = useState<string | null>(null)
  const [selectedPaymentMethods, setSelectedPaymentMethods] = useState<Record<string, string>>({})
  const [isReleasingTable, setIsReleasingTable] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  // Formateadores
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(val)

  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
    } catch {
      return ''
    }
  }

  // Sincronización WebSocket en tiempo real
  useEffect(() => {
    const socketUrl =
      process.env.NEXT_PUBLIC_SOCKET_URL ||
      (typeof window !== 'undefined' ? window.location.origin : '')

    const socket: StaffSocket = io(socketUrl, {
      path: '/api/socketio',
      transports: ['websocket', 'polling'],
    })
    socketRef.current = socket

    socket.on('connect', () => {
      setIsLiveConnected(true)
      socket.emit(WsStaffEvent.JOIN_STAFF_ROOM, {
        foodCourtId,
        staffToken: 'staff-token',
      })
    })

    socket.on('disconnect', () => setIsLiveConnected(false))

    // Actualización de pago en tiempo real
    socket.on(
      WsServerEvent.FOOD_COURT_PAYMENT_UPDATED,
      (payload: FoodCourtPaymentUpdatedPayload) => {
        setTables((prev) =>
          prev.map((tbl) => {
            const matchesTable = tbl.id === payload.tableId || tbl.activeSession?.id === payload.sessionId
            if (!matchesTable || !tbl.activeSession) return tbl

            const updatedPayments = tbl.activeSession.payments.map((p) =>
              p.restaurantId === payload.restaurantId
                ? {
                    ...p,
                    status: payload.status,
                    totalAmount: payload.totalAmount,
                    paidAt: payload.paidAt ?? p.paidAt,
                  }
                : p,
            )

            // Si el restaurante aún no existía en el listado local de pagos, agregarlo
            const exists = updatedPayments.some((p) => p.restaurantId === payload.restaurantId)
            const finalPayments = exists
              ? updatedPayments
              : [
                  ...updatedPayments,
                  {
                    id: `pay-${payload.restaurantId}`,
                    restaurantId: payload.restaurantId,
                    restaurantName: 'Restaurante',
                    restaurantSlug: '',
                    status: payload.status,
                    totalAmount: payload.totalAmount,
                    paidAt: payload.paidAt,
                  },
                ]

            return {
              ...tbl,
              activeSession: {
                ...tbl.activeSession,
                payments: finalPayments,
              },
            }
          }),
        )

        // También sincronizar si el modal de cuenta de esta mesa está abierto
        setSelectedBillTable((prev) => {
          if (!prev || (prev.id !== payload.tableId && prev.activeSession?.id !== payload.sessionId)) {
            return prev
          }
          if (!prev.activeSession) return prev

          return {
            ...prev,
            activeSession: {
              ...prev.activeSession,
              payments: prev.activeSession.payments.map((p) =>
                p.restaurantId === payload.restaurantId
                  ? {
                      ...p,
                      status: payload.status,
                      totalAmount: payload.totalAmount,
                      paidAt: payload.paidAt ?? p.paidAt,
                    }
                  : p,
              ),
            },
          }
        })
      },
    )

    // Notificación de sesión finalizada
    socket.on(WsServerEvent.SESSION_TERMINATED, ({ tableId }) => {
      setTables((prev) =>
        prev.map((tbl) =>
          tbl.id === tableId ? { ...tbl, status: 'AVAILABLE', activeSession: null } : tbl,
        ),
      )
      setSelectedBillTable((prev) => (prev?.id === tableId ? null : prev))
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [foodCourtId])

  // Estadísticas globales de las mesas
  const stats = useMemo(() => {
    const total = tables.length
    const active = tables.filter((t) => t.status === 'ACTIVE_QR_SESSION').length
    const available = tables.filter((t) => t.status === 'AVAILABLE').length

    let allPaidCount = 0
    let pendingCount = 0

    tables.forEach((t) => {
      if (t.status === 'ACTIVE_QR_SESSION' && t.activeSession?.payments.length) {
        const hasPending = t.activeSession.payments.some((p) => p.status === 'PENDING')
        if (hasPending) {
          pendingCount++
        } else {
          allPaidCount++
        }
      }
    })

    return { total, active, available, allPaidCount, pendingCount }
  }, [tables])

  // Filtrado de mesas
  const filteredTables = useMemo(() => {
    return tables.filter((t) => {
      // Búsqueda por texto
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        const matchesNumber = `mesa ${t.tableNumber}`.includes(query) || `${t.tableNumber}`.includes(query)
        const matchesZone = t.zone?.toLowerCase().includes(query) || false
        if (!matchesNumber && !matchesZone) return false
      }

      // Filtro de estado
      if (filter === 'ACTIVE') return t.status === 'ACTIVE_QR_SESSION'
      if (filter === 'AVAILABLE') return t.status === 'AVAILABLE'
      if (filter === 'PAID_ALL') {
        return (
          t.status === 'ACTIVE_QR_SESSION' &&
          Boolean(t.activeSession?.payments.length) &&
          t.activeSession!.payments.every((p) => p.status === 'PAID')
        )
      }
      if (filter === 'PENDING') {
        return (
          t.status === 'ACTIVE_QR_SESSION' &&
          Boolean(t.activeSession?.payments.length) &&
          t.activeSession!.payments.some((p) => p.status === 'PENDING')
        )
      }
      return true
    })
  }, [tables, filter, searchQuery])

  // Crear nueva mesa
  const handleCreateTable = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsCreatingTable(true)
    try {
      const res = await fetch('/api/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          foodCourtId,
          tableNumber: Number(newTableNumber),
          zone: newTableZone || undefined,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al crear mesa')
      }
      const created = await res.json()
      setTables((prev) => [...prev, { ...created, status: 'AVAILABLE', activeSession: null }].sort((a, b) => a.tableNumber - b.tableNumber))
      setIsTableModalOpen(false)
      setNewTableZone('')
      setNewTableNumber((prev) => prev + 1)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setIsCreatingTable(false)
    }
  }

  // Generar o ver sesión QR
  const handleGenerateSession = async (table: FoodCourtTableItem) => {
    setQrLoadingTableId(table.id)
    try {
      const res = await fetch(`/api/tables/${table.id}/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ foodCourtId, ttlSeconds: 7200 }),
      })
      if (!res.ok) throw new Error('Error al generar sesión QR')
      const data = await res.json()
      const origin = typeof window !== 'undefined' ? window.location.origin : ''
      const menuUrl = `${origin}/plaza/${foodCourtSlug}/${table.id}?token=${data.sessionToken}`
      const qrCodeDataUrl = await QRCode.toDataURL(menuUrl, {
        width: 320,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
      })

      setQrModalData({
        tableNumber: table.tableNumber,
        qrCodeDataUrl,
        menuUrl,
      })

      // Actualizar estado local si pasó a estar activa
      setTables((prev) =>
        prev.map((t) =>
          t.id === table.id
            ? {
                ...t,
                status: 'ACTIVE_QR_SESSION',
                activeSession: t.activeSession || {
                  id: data.sessionId || `session-${table.id}`,
                  sessionToken: data.sessionToken,
                  startedAt: new Date().toISOString(),
                  payments: [],
                },
              }
            : t,
        ),
      )
    } catch (err: any) {
      alert(err.message)
    } finally {
      setQrLoadingTableId(null)
    }
  }

  // Registrar cobro individual de un restaurante en la mesa
  const handleMarkPayment = async (
    table: FoodCourtTableItem,
    payment: TablePaymentItem,
    status: 'PAID' | 'PENDING',
  ) => {
    if (!table.activeSession) return
    setProcessingRestaurantId(payment.restaurantId)
    setActionError(null)

    const paymentMethod = selectedPaymentMethods[payment.restaurantId] || 'CASH'

    try {
      const res = await fetch(`/api/food-courts/${foodCourtId}/payments`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: table.activeSession.id,
          restaurantId: payment.restaurantId,
          status,
          paymentMethod,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al registrar pago')
      }

      // Actualizar estado local
      const nowIso = new Date().toISOString()
      setTables((prev) =>
        prev.map((t) => {
          if (t.id !== table.id || !t.activeSession) return t
          return {
            ...t,
            activeSession: {
              ...t.activeSession,
              payments: t.activeSession.payments.map((p) =>
                p.restaurantId === payment.restaurantId
                  ? { ...p, status, paidAt: status === 'PAID' ? nowIso : null }
                  : p,
              ),
            },
          }
        }),
      )

      setSelectedBillTable((prev) => {
        if (!prev || !prev.activeSession) return prev
        return {
          ...prev,
          activeSession: {
            ...prev.activeSession,
            payments: prev.activeSession.payments.map((p) =>
              p.restaurantId === payment.restaurantId
                ? { ...p, status, paidAt: status === 'PAID' ? nowIso : null }
                : p,
            ),
          },
        }
      })
    } catch (err: any) {
      setActionError(err.message)
    } finally {
      setProcessingRestaurantId(null)
    }
  }

  // Liberar mesa / cerrar sesión
  const handleReleaseTable = async (table: FoodCourtTableItem, force = false) => {
    if (!table.activeSession) return

    const hasPending = table.activeSession.payments.some((p) => p.status === 'PENDING')
    if (hasPending && !force) {
      const confirmForce = confirm(
        '⚠️ Esta mesa tiene restaurantes con cobro PENDIENTE. ¿Estás seguro de que deseas forzar el cierre y liberar la mesa?',
      )
      if (!confirmForce) return
    }

    setIsReleasingTable(true)
    setActionError(null)

    try {
      const res = await fetch(`/api/tables/${table.id}/session`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionToken: table.activeSession.sessionToken,
          foodCourtId,
          forceClose: true,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al cerrar sesión de mesa')
      }

      setTables((prev) =>
        prev.map((t) =>
          t.id === table.id ? { ...t, status: 'AVAILABLE', activeSession: null } : t,
        ),
      )
      setSelectedBillTable(null)
    } catch (err: any) {
      setActionError(err.message)
    } finally {
      setIsReleasingTable(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Barra de estado y conexión en vivo */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-3 h-3 rounded-full ${
              isLiveConnected ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'
            }`}
          />
          <div>
            <span className="text-sm font-bold text-white block">
              Monitoreo Interno de Mesas en Vivo
            </span>
            <span className="text-xs text-zinc-400">
              {isLiveConnected
                ? 'Conectado a la sala WebSocket de la plaza · Actualización instantánea'
                : 'Conectando al servidor en tiempo real...'}
            </span>
          </div>
        </div>

        {canManage && (
          <button
            onClick={() => setIsTableModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-amber-500/20"
          >
            <span>+</span> Nueva Mesa
          </button>
        )}
      </div>

      {/* KPI Cards de Mesas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4">
          <span className="text-xs text-zinc-400 font-medium">Total Mesas</span>
          <p className="text-2xl font-black text-white mt-1">{stats.total}</p>
          <span className="text-[11px] text-zinc-500 mt-1 block">
            {stats.available} disponibles
          </span>
        </div>

        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4">
          <span className="text-xs text-amber-400 font-medium flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            En Servicio Activo
          </span>
          <p className="text-2xl font-black text-amber-300 mt-1">{stats.active}</p>
          <span className="text-[11px] text-zinc-400 mt-1 block">
            Mesas con sesión abierta
          </span>
        </div>

        <div className="bg-emerald-950/30 border border-emerald-800/40 rounded-2xl p-4">
          <span className="text-xs text-emerald-400 font-medium flex items-center gap-1.5">
            <span>✅</span>
            Todos los Sitios Pagados
          </span>
          <p className="text-2xl font-black text-emerald-400 mt-1">{stats.allPaidCount}</p>
          <span className="text-[11px] text-emerald-400/80 mt-1 block font-medium">
            Listas para liberar
          </span>
        </div>

        <div className="bg-amber-950/20 border border-amber-800/40 rounded-2xl p-4">
          <span className="text-xs text-amber-400 font-medium flex items-center gap-1.5">
            <span>⏳</span>
            Con Pagos Pendientes
          </span>
          <p className="text-2xl font-black text-amber-300 mt-1">{stats.pendingCount}</p>
          <span className="text-[11px] text-amber-400/80 mt-1 block">
            Requieren cobro o conciliación
          </span>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Pestañas de filtro rápido */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            onClick={() => setFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              filter === 'ALL'
                ? 'bg-amber-500 text-black'
                : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            Todas ({tables.length})
          </button>
          <button
            onClick={() => setFilter('ACTIVE')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              filter === 'ACTIVE'
                ? 'bg-amber-500 text-black'
                : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            En Servicio ({stats.active})
          </button>
          <button
            onClick={() => setFilter('PAID_ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              filter === 'PAID_ALL'
                ? 'bg-emerald-500 text-black'
                : 'bg-zinc-900 border border-zinc-800 text-emerald-400 hover:bg-emerald-950/30'
            }`}
          >
            ✅ Pagadas ({stats.allPaidCount})
          </button>
          <button
            onClick={() => setFilter('PENDING')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              filter === 'PENDING'
                ? 'bg-amber-500 text-black'
                : 'bg-zinc-900 border border-zinc-800 text-amber-400 hover:bg-amber-950/30'
            }`}
          >
            ⏳ Con Pendientes ({stats.pendingCount})
          </button>
          <button
            onClick={() => setFilter('AVAILABLE')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              filter === 'AVAILABLE'
                ? 'bg-zinc-700 text-white'
                : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            Disponibles ({stats.available})
          </button>
        </div>

        {/* Input de búsqueda */}
        <div className="relative w-full sm:w-64">
          <input
            type="text"
            placeholder="Buscar mesa o zona..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500/50"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white text-xs"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Grid de Mesas */}
      {filteredTables.length === 0 ? (
        <div className="text-center py-16 text-zinc-500 text-xs bg-zinc-900/30 rounded-3xl border border-zinc-800/60">
          No se encontraron mesas que coincidan con el filtro seleccionado.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredTables.map((table) => {
            const isSessionActive = table.status === 'ACTIVE_QR_SESSION'
            const payments = table.activeSession?.payments || []
            const totalAmount = payments.reduce((acc, p) => acc + p.totalAmount, 0)
            const paidCount = payments.filter((p) => p.status === 'PAID').length
            const pendingCount = payments.filter((p) => p.status === 'PENDING').length
            const isFullyPaid = payments.length > 0 && pendingCount === 0
            const hasPending = payments.length > 0 && pendingCount > 0
            const pendingAmount = payments
              .filter((p) => p.status === 'PENDING')
              .reduce((acc, p) => acc + p.totalAmount, 0)
            const isLoadingQr = qrLoadingTableId === table.id

            // Borde e indicador según estado de cobro
            let cardClasses = 'bg-zinc-900/80 border-zinc-800 hover:border-zinc-700'
            if (isSessionActive) {
              if (isFullyPaid) {
                cardClasses =
                  'bg-emerald-950/20 border-emerald-600/50 ring-1 ring-emerald-500/30 shadow-lg shadow-emerald-950/20'
              } else if (hasPending) {
                cardClasses =
                  'bg-amber-950/20 border-amber-600/40 ring-1 ring-amber-500/20 shadow-lg shadow-amber-950/10'
              } else {
                cardClasses = 'bg-zinc-900/90 border-amber-500/40'
              }
            }

            return (
              <div
                key={table.id}
                className={`rounded-2xl border p-5 flex flex-col justify-between space-y-4 transition-all ${cardClasses}`}
              >
                {/* Header de la Tarjeta */}
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-black text-white">
                          Mesa {table.tableNumber}
                        </span>
                        {table.zone && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700/50">
                            {table.zone}
                          </span>
                        )}
                      </div>
                      {table.activeSession && (
                        <span className="text-[11px] text-zinc-500 block mt-0.5">
                          Inició: {formatTime(table.activeSession.startedAt)}
                        </span>
                      )}
                    </div>

                    {/* Status Dot */}
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${
                          isSessionActive
                            ? isFullyPaid
                              ? 'bg-emerald-400'
                              : 'bg-amber-400 animate-pulse'
                            : 'bg-zinc-600'
                        }`}
                      />
                      <span className="text-[10px] uppercase font-bold text-zinc-400">
                        {isSessionActive ? 'En servicio' : 'Libre'}
                      </span>
                    </div>
                  </div>

                  {/* Estado Interno de Cobros (El requerimiento clave del usuario) */}
                  <div className="mt-4">
                    {!isSessionActive ? (
                      <div className="bg-zinc-950/50 border border-zinc-800/80 rounded-xl p-3 text-center">
                        <span className="text-xs text-zinc-500">Mesa disponible</span>
                      </div>
                    ) : payments.length === 0 ? (
                      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-center">
                        <span className="text-xs font-semibold text-amber-300 block">
                          🟡 En servicio (sin pedidos)
                        </span>
                        <span className="text-[10px] text-zinc-400">
                          Comensales revisando el menú
                        </span>
                      </div>
                    ) : isFullyPaid ? (
                      <div className="bg-emerald-500/15 border border-emerald-500/40 rounded-xl p-3 text-emerald-300">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 font-black text-xs">
                            <span>✅</span>
                            <span>TODOS LOS SITIOS PAGADOS</span>
                          </div>
                          <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-bold px-1.5 py-0.5 rounded">
                            {paidCount}/{payments.length}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center justify-between text-[11px] text-emerald-400/90 font-medium">
                          <span>Total recaudado:</span>
                          <span className="font-mono font-bold">
                            {formatCurrency(totalAmount)}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-amber-500/15 border border-amber-500/30 rounded-xl p-3 text-amber-300">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 font-black text-xs">
                            <span>⏳</span>
                            <span>COBROS PENDIENTES</span>
                          </div>
                          <span className="text-[10px] bg-amber-500/30 text-amber-200 font-bold px-1.5 py-0.5 rounded">
                            {paidCount} de {payments.length} pagados
                          </span>
                        </div>
                        <div className="mt-1 flex items-center justify-between text-[11px] text-zinc-400">
                          <span>Falta cobrar:</span>
                          <span className="font-mono font-bold text-amber-400">
                            {formatCurrency(pendingAmount)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Listado de Restaurantes de esta mesa */}
                  {payments.length > 0 && (
                    <div className="mt-3 space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {payments.map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-zinc-950/40 border border-zinc-800/40"
                        >
                          <div className="flex items-center gap-1.5 min-w-0 pr-2">
                            <span
                              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                p.status === 'PAID' ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'
                              }`}
                            />
                            <span className="text-zinc-300 font-medium truncate">
                              {p.restaurantName}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-mono text-zinc-400 text-[11px]">
                              {formatCurrency(p.totalAmount)}
                            </span>
                            <span
                              className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                                p.status === 'PAID'
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              }`}
                            >
                              {p.status === 'PAID' ? '✓ PAGADO' : 'PENDIENTE'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Acciones de la Tarjeta */}
                <div className="space-y-2 pt-2 border-t border-zinc-800/60">
                  {isSessionActive ? (
                    <>
                      <button
                        onClick={() => setSelectedBillTable(table)}
                        className="w-full py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        <span>📋</span>
                        <span>Ver Cuenta & Cobrar</span>
                      </button>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => handleGenerateSession(table)}
                          disabled={isLoadingQr}
                          className="py-1.5 px-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] font-medium transition-colors flex items-center justify-center gap-1"
                        >
                          {isLoadingQr ? (
                            <span className="w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <>
                              <span>📱</span>
                              <span>Código QR</span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => handleReleaseTable(table, false)}
                          className={`py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1 ${
                            isFullyPaid
                              ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20'
                              : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400'
                          }`}
                        >
                          <span>🔒</span>
                          <span>{isFullyPaid ? 'Liberar Mesa' : 'Cerrar Mesa'}</span>
                        </button>
                      </div>
                    </>
                  ) : (
                    <button
                      onClick={() => handleGenerateSession(table)}
                      disabled={isLoadingQr}
                      className="w-full py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-amber-400 font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
                    >
                      {isLoadingQr ? (
                        <span className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <span>⚡</span>
                          <span>Iniciar Sesión / Ver QR</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal: Cuenta y Checklist de Pagos por Restaurante */}
      {selectedBillTable && selectedBillTable.activeSession && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 max-w-xl w-full shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            {/* Header Modal */}
            <div className="flex items-start justify-between border-b border-zinc-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-black text-white">
                    Cuenta — Mesa {selectedBillTable.tableNumber}
                  </h3>
                  {selectedBillTable.zone && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300">
                      Zona {selectedBillTable.zone}
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-400 mt-1">
                  Sesión iniciada a las {formatTime(selectedBillTable.activeSession.startedAt)} ·
                  Checklist de pagos por restaurante
                </p>
              </div>
              <button
                onClick={() => setSelectedBillTable(null)}
                className="text-zinc-500 hover:text-white p-1 rounded-lg text-lg"
              >
                ✕
              </button>
            </div>

            {actionError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
                {actionError}
              </div>
            )}

            {/* Checklist de Restaurantes */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Restaurantes con órdenes en esta mesa
              </h4>

              {selectedBillTable.activeSession.payments.length === 0 ? (
                <div className="text-center py-6 text-zinc-500 text-xs bg-zinc-950/40 rounded-2xl border border-zinc-800/40">
                  No hay pedidos registrados aún en esta sesión de mesa.
                </div>
              ) : (
                selectedBillTable.activeSession.payments.map((p) => {
                  const isPaid = p.status === 'PAID'
                  const isProcessing = processingRestaurantId === p.restaurantId
                  const selectedMethod = selectedPaymentMethods[p.restaurantId] || 'CASH'

                  return (
                    <div
                      key={p.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        isPaid
                          ? 'bg-emerald-950/15 border-emerald-500/30'
                          : 'bg-zinc-950/60 border-zinc-800'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`w-2.5 h-2.5 rounded-full ${
                              isPaid ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'
                            }`}
                          />
                          <div>
                            <span className="text-sm font-bold text-white block">
                              {p.restaurantName}
                            </span>
                            {isPaid && p.paidAt && (
                              <span className="text-[11px] text-emerald-400 block">
                                Cobrado a las {formatTime(p.paidAt)}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-base font-mono font-bold text-white block">
                            {formatCurrency(p.totalAmount)}
                          </span>
                          <span
                            className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                              isPaid
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            }`}
                          >
                            {isPaid ? '✓ PAGADO' : 'PENDIENTE'}
                          </span>
                        </div>
                      </div>

                      {/* Selector de método de pago y botón de cobro si está pendiente */}
                      {!isPaid && (
                        <div className="mt-3 pt-3 border-t border-zinc-800/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-zinc-400">Método:</span>
                            <select
                              value={selectedMethod}
                              onChange={(e) =>
                                setSelectedPaymentMethods((prev) => ({
                                  ...prev,
                                  [p.restaurantId]: e.target.value,
                                }))
                              }
                              className="bg-zinc-900 border border-zinc-700 text-zinc-200 text-xs rounded-lg px-2.5 py-1 focus:outline-none focus:border-amber-500"
                            >
                              {PAYMENT_METHODS.map((m) => (
                                <option key={m.id} value={m.id}>
                                  {m.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          <button
                            onClick={() => handleMarkPayment(selectedBillTable, p, 'PAID')}
                            disabled={isProcessing}
                            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20"
                          >
                            {isProcessing ? (
                              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <>
                                <span>✓</span>
                                <span>Marcar Pago Recibido</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>

            {/* Resumen de Totales */}
            {selectedBillTable.activeSession.payments.length > 0 && (
              <div className="bg-zinc-950/80 border border-zinc-800 rounded-2xl p-4 space-y-2">
                <div className="flex justify-between text-xs text-zinc-400">
                  <span>Total consumido en plaza:</span>
                  <span className="font-mono text-white font-semibold">
                    {formatCurrency(
                      selectedBillTable.activeSession.payments.reduce(
                        (sum, p) => sum + p.totalAmount,
                        0,
                      ),
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-emerald-400">
                  <span>Total cobrado / pagado:</span>
                  <span className="font-mono font-bold">
                    {formatCurrency(
                      selectedBillTable.activeSession.payments
                        .filter((p) => p.status === 'PAID')
                        .reduce((sum, p) => sum + p.totalAmount, 0),
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-amber-400 pt-1 border-t border-zinc-800">
                  <span>Saldo pendiente:</span>
                  <span className="font-mono font-bold">
                    {formatCurrency(
                      selectedBillTable.activeSession.payments
                        .filter((p) => p.status === 'PENDING')
                        .reduce((sum, p) => sum + p.totalAmount, 0),
                    )}
                  </span>
                </div>
              </div>
            )}

            {/* Acciones Finales: Liberar Mesa */}
            <div className="pt-2 border-t border-zinc-800 flex flex-col sm:flex-row items-stretch justify-end gap-3">
              <button
                onClick={() => setSelectedBillTable(null)}
                className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs"
              >
                Cerrar Ventana
              </button>

              {selectedBillTable.activeSession.payments.every((p) => p.status === 'PAID') &&
              selectedBillTable.activeSession.payments.length > 0 ? (
                <button
                  onClick={() => handleReleaseTable(selectedBillTable, false)}
                  disabled={isReleasingTable}
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 animate-pulse"
                >
                  {isReleasingTable ? (
                    <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>🔒</span>
                      <span>Liberar Mesa Ahora (Pagos Completados)</span>
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={() => handleReleaseTable(selectedBillTable, true)}
                  disabled={isReleasingTable}
                  className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-red-950/60 text-zinc-400 hover:text-red-300 border border-zinc-700 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  <span>⚠️</span>
                  <span>Forzar Cierre de Mesa</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Crear Mesa */}
      {isTableModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">Nueva Mesa en Plaza</h3>
            <form onSubmit={handleCreateTable} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-400 font-semibold mb-1">
                  Número de Mesa
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={newTableNumber}
                  onChange={(e) => setNewTableNumber(Number(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-white text-sm"
                />
              </div>

              <div>
                <label className="block text-zinc-400 font-semibold mb-1">
                  Zona / Sector (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej: Terraza, Zona Norte, Patio"
                  value={newTableZone}
                  onChange={(e) => setNewTableZone(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-white text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsTableModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreatingTable}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold"
                >
                  {isCreatingTable ? 'Creando...' : 'Crear Mesa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Código QR de Mesa */}
      {qrModalData && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-white">
                Mesa {qrModalData.tableNumber} — QR Plaza
              </h3>
              <button
                onClick={() => setQrModalData(null)}
                className="text-zinc-500 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="bg-white p-4 rounded-2xl inline-block shadow-inner">
              <img
                src={qrModalData.qrCodeDataUrl}
                alt={`QR Mesa ${qrModalData.tableNumber}`}
                className="w-56 h-56 mx-auto"
              />
            </div>

            <div className="space-y-2">
              <a
                href={qrModalData.qrCodeDataUrl}
                download={`qr-plaza-${foodCourtSlug}-mesa-${qrModalData.tableNumber}.png`}
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs block transition-colors"
              >
                📥 Descargar PNG para imprimir
              </a>
              <a
                href={qrModalData.menuUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs block transition-colors"
              >
                🌐 Abrir Menú en pestaña nueva
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
