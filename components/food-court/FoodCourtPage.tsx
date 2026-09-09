'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { io, type Socket } from 'socket.io-client'
import {
  RestaurantMosaicCard,
  type RestaurantMosaicData,
} from './RestaurantMosaicCard'
import { FoodCourtBillSheet, type BillPaymentItem } from './FoodCourtBillSheet'
import { FoodCourtMenuViewer } from './FoodCourtMenuViewer'
import {
  WsClientEvent,
  WsServerEvent,
  type ConfirmedOrderPayload,
  type FoodCourtPaymentUpdatedPayload,
  type ClientToServerEvents,
  type ServerToClientEvents,
} from '@/types/websocket-events'

export interface FoodCourtRestaurantData {
  id: string
  name: string
  slug: string
  logoUrl?: string | null
  description?: string | null
  cuisineType?: string | null
  currency: string
  orderIndex: number
  categories: any[]
  pdfUrl?: string | null
  pdfHotspots?: any[]
  initialStockIssues?: any[]
}

export interface FoodCourtPageProps {
  foodCourt: {
    id: string
    name: string
    slug: string
    description?: string | null
    logoUrl?: string | null
    currency: string
  }
  tableId: string
  tableNumber: number
  sessionToken: string
  sessionId: string
  restaurants: FoodCourtRestaurantData[]
  initialPayments: BillPaymentItem[]
  initialConfirmedOrders?: ConfirmedOrderPayload[]
}

let socketInstance: Socket<ServerToClientEvents, ClientToServerEvents> | null = null

function getSocket(): Socket<ServerToClientEvents, ClientToServerEvents> {
  if (!socketInstance) {
    const socketUrl =
      process.env.NEXT_PUBLIC_SOCKET_URL ||
      (typeof window !== 'undefined' ? window.location.origin : '')

    socketInstance = io(socketUrl, {
      path: '/api/socketio',
      transports: ['websocket', 'polling'],
    })
  }
  return socketInstance
}

export function FoodCourtPage({
  foodCourt,
  tableId,
  tableNumber,
  sessionToken,
  sessionId,
  restaurants,
  initialPayments,
  initialConfirmedOrders = [],
}: FoodCourtPageProps) {
  const [selectedRestaurantSlug, setSelectedRestaurantSlug] = useState<string | null>(null)
  const [isBillSheetOpen, setIsBillSheetOpen] = useState(false)
  const [payments, setPayments] = useState<BillPaymentItem[]>(initialPayments)
  const [confirmedOrders, setConfirmedOrders] = useState<ConfirmedOrderPayload[]>(initialConfirmedOrders)
  const [isHighContrast, setIsHighContrast] = useState(false)
  const [isLargeText, setIsLargeText] = useState(false)

  // Sincronización WebSocket en tiempo real
  useEffect(() => {
    const socket = getSocket()

    // Unirse a la sala de la mesa en la plaza
    socket.emit(
      WsClientEvent.JOIN_TABLE_SESSION,
      {
        foodCourtId: foodCourt.id,
        tableId,
        sessionToken,
        userName: 'Comensal Plaza',
      },
      (ack) => {
        if (!ack.success) {
          console.warn('[FoodCourtPage] Error al unirse a la sesión WS:', ack.error)
        }
      },
    )

    // Escuchar pagos actualizados en tiempo real
    const handlePaymentUpdate = (payload: FoodCourtPaymentUpdatedPayload) => {
      setPayments((prev) => {
        const exists = prev.some((p) => p.restaurantId === payload.restaurantId)
        if (exists) {
          return prev.map((p) =>
            p.restaurantId === payload.restaurantId
              ? {
                  ...p,
                  status: payload.status,
                  totalAmount: payload.totalAmount,
                  paidAt: payload.paidAt,
                }
              : p,
          )
        } else {
          const rest = restaurants.find((r) => r.id === payload.restaurantId)
          return [
            ...prev,
            {
              id: payload.sessionId + payload.restaurantId,
              restaurantId: payload.restaurantId,
              restaurantName: rest?.name || 'Restaurante',
              restaurantSlug: rest?.slug || '',
              restaurantLogo: rest?.logoUrl,
              status: payload.status,
              totalAmount: payload.totalAmount,
              paidAt: payload.paidAt,
            },
          ]
        }
      })
    }

    // Escuchar órdenes de la mesa
    const handleOrdersUpdate = (order: ConfirmedOrderPayload) => {
      setConfirmedOrders((prev) => {
        if (prev.some((o) => o.orderId === order.orderId)) return prev
        return [...prev, order]
      })
    }

    socket.on(WsServerEvent.FOOD_COURT_PAYMENT_UPDATED, handlePaymentUpdate)
    socket.on(WsServerEvent.TABLE_ORDERS_UPDATED, handleOrdersUpdate)

    return () => {
      socket.off(WsServerEvent.FOOD_COURT_PAYMENT_UPDATED, handlePaymentUpdate)
      socket.off(WsServerEvent.TABLE_ORDERS_UPDATED, handleOrdersUpdate)
    }
  }, [foodCourt.id, tableId, sessionToken, restaurants])

  // Map restaurants to mosaic data with payment and order totals
  const mosaicRestaurants: RestaurantMosaicData[] = useMemo(() => {
    return restaurants.map((r) => {
      const payment = payments.find((p) => p.restaurantId === r.id)
      const paymentStatus = payment ? payment.status : 'NONE'
      const totalAmount = payment ? payment.totalAmount : 0

      // Conteo de órdenes confirmadas para este restaurante
      return {
        id: r.id,
        name: r.name,
        slug: r.slug,
        logoUrl: r.logoUrl,
        description: r.description,
        cuisineType: r.cuisineType,
        orderIndex: r.orderIndex,
        totalOrdersCount: totalAmount > 0 ? 1 : 0,
        totalAmount,
        paymentStatus,
        paidAt: payment?.paidAt,
      }
    })
  }, [restaurants, payments])

  // Totales de la mesa completa
  const totalTableAmount = payments.reduce((sum, p) => sum + p.totalAmount, 0)
  const paidCount = payments.filter((p) => p.status === 'PAID').length
  const totalVendorsOrdered = payments.filter((p) => p.totalAmount > 0).length

  const formatPrice = (amount: number) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: foodCourt.currency || 'COP',
      maximumFractionDigits: 0,
    }).format(amount)

  // Current selected restaurant navigation
  const currentIndex = restaurants.findIndex((r) => r.slug === selectedRestaurantSlug)
  const currentRestaurant = currentIndex >= 0 ? restaurants[currentIndex] : null

  const handleNavigate = (direction: 'next' | 'prev') => {
    if (currentIndex < 0) return
    if (direction === 'next' && currentIndex < restaurants.length - 1) {
      setSelectedRestaurantSlug(restaurants[currentIndex + 1].slug)
    } else if (direction === 'prev' && currentIndex > 0) {
      setSelectedRestaurantSlug(restaurants[currentIndex - 1].slug)
    }
  }

  // If a restaurant is selected, show its menu in the plaza viewer
  if (currentRestaurant) {
    return (
      <FoodCourtMenuViewer
        foodCourtSlug={foodCourt.slug}
        foodCourtName={foodCourt.name}
        tableId={tableId}
        tableNumber={tableNumber}
        sessionToken={sessionToken}
        restaurant={currentRestaurant}
        onBackToMosaic={() => setSelectedRestaurantSlug(null)}
        onNavigateRestaurant={handleNavigate}
        hasPrevRestaurant={currentIndex > 0}
        hasNextRestaurant={currentIndex < restaurants.length - 1}
      />
    )
  }

  return (
    <div
      className={`min-h-dvh flex flex-col transition-colors duration-200 ${
        isHighContrast
          ? 'bg-black text-white'
          : 'bg-zinc-950 text-white'
      } ${isLargeText ? 'text-lg' : 'text-base'}`}
    >
      {/* ── Header ── */}
      <header className="sticky top-0 z-40 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800">
        <div className="max-w-4xl mx-auto px-4 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {foodCourt.logoUrl ? (
              <img
                src={foodCourt.logoUrl}
                alt=""
                className="w-11 h-11 rounded-xl object-cover border border-zinc-700 bg-zinc-800 shadow-md"
              />
            ) : (
              <div className="w-11 h-11 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-black text-xl shadow-inner">
                🏪
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black tracking-tight leading-tight text-white">
                  {foodCourt.name}
                </h1>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  Mesa {tableNumber}
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                {restaurants.length} restaurantes disponibles
              </p>
            </div>
          </div>

          {/* Accessibility Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsLargeText((prev) => !prev)}
              aria-label="Aumentar tamaño de texto"
              title="Aumentar tamaño de texto"
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                isLargeText
                  ? 'bg-amber-400 text-black border-amber-300'
                  : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-800'
              }`}
            >
              A{isLargeText ? '−' : '+'}
            </button>

            <button
              onClick={() => setIsHighContrast((prev) => !prev)}
              aria-label="Modo alto contraste"
              title="Modo alto contraste para fácil lectura"
              className={`p-2 rounded-xl text-xs font-bold transition-all border ${
                isHighContrast
                  ? 'bg-amber-400 text-black border-amber-300'
                  : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-800'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* ── Main Content: Hero & Mosaic Grid ── */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6 pb-28 space-y-6">
        {/* Banner de bienvenida / explicación */}
        <div
          className={`rounded-2xl p-5 border transition-all ${
            isHighContrast
              ? 'bg-zinc-950 border-2 border-amber-400 text-white'
              : 'bg-gradient-to-r from-amber-500/10 via-zinc-900 to-zinc-900 border-amber-500/20'
          }`}
        >
          <div className="flex items-start gap-3">
            <span className="text-2xl shrink-0" aria-hidden="true">
              🍽️
            </span>
            <div>
              <h2 className="font-bold text-sm sm:text-base text-white">
                Sede Compartida — Explora cada menú a tu gusto
              </h2>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                Toca cualquier restaurante para ver su carta y pedir a su cocina. Cada comensal de la mesa puede elegir del restaurante que prefiera.
              </p>
            </div>
          </div>
        </div>

        {/* Mosaic Grid */}
        <section aria-labelledby="section-restaurants-title">
          <h2
            id="section-restaurants-title"
            className="text-xs uppercase tracking-widest font-black text-zinc-400 mb-3"
          >
            Restaurantes en esta plaza
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {mosaicRestaurants.map((res) => (
              <RestaurantMosaicCard
                key={res.id}
                restaurant={res}
                currency={foodCourt.currency}
                isHighContrast={isHighContrast}
                onClick={() => setSelectedRestaurantSlug(res.slug)}
              />
            ))}
          </div>
        </section>
      </main>

      {/* ── Sticky Bottom Bar: Total de la Mesa & Cuenta ── */}
      <footer className="fixed bottom-0 inset-x-0 z-40 bg-zinc-950/95 backdrop-blur-md border-t border-zinc-800 p-4 shadow-2xl">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div>
            <span className="text-[11px] uppercase tracking-wider text-zinc-400 font-bold block">
              Total Mesa #{tableNumber}
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-lg sm:text-xl font-black text-amber-400">
                {formatPrice(totalTableAmount)}
              </span>
              {totalVendorsOrdered > 0 && (
                <span className="text-xs text-zinc-400 hidden sm:inline">
                  ({paidCount} de {totalVendorsOrdered} pagados)
                </span>
              )}
            </div>
          </div>

          <button
            id="btn-open-bill-sheet"
            onClick={() => setIsBillSheetOpen(true)}
            aria-label="Ver cuenta de la mesa y checklist de pago"
            className="px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-sm transition-all transform active:scale-95 shadow-lg shadow-amber-500/20 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Ver cuenta</span>
          </button>
        </div>
      </footer>

      {/* ── Drawer de cuenta de la mesa ── */}
      <FoodCourtBillSheet
        isOpen={isBillSheetOpen}
        onClose={() => setIsBillSheetOpen(false)}
        foodCourtId={foodCourt.id}
        foodCourtName={foodCourt.name}
        tableNumber={tableNumber}
        sessionId={sessionId}
        payments={payments}
        currency={foodCourt.currency}
        isHighContrast={isHighContrast}
        onPaymentUpdated={(updated) => {
          setPayments((prev) =>
            prev.map((p) => (p.restaurantId === updated.restaurantId ? updated : p)),
          )
        }}
      />
    </div>
  )
}
