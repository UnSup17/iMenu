'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { io, type Socket } from 'socket.io-client'
import { useCartStore, type CartItem } from '@/store/cart-store'
import { ProductModal, type ProductModalData } from './ProductModal'
import { CartSheet } from './CartSheet'
import { CallWaiterButton } from '@/components/waiter/CallWaiterButton'
import { PdfMenuView } from './PdfMenuView'
import { UserAliasModal } from './UserAliasModal'
import { TableParticipantsBadge } from './TableParticipantsBadge'
import {
  WsClientEvent,
  WsServerEvent,
  type SharedCartItemPayload,
  type TableParticipantsPayload,
  type ConfirmedOrderPayload,
  type ClientToServerEvents,
  type ServerToClientEvents,
} from '@/types/websocket-events'

// ============================================================
// Types
// ============================================================

interface Category {
  id: string
  name: string
  products: ProductModalData[]
}

interface PdfHotspot {
  id: string
  page: number
  x: number
  y: number
  width: number
  height: number
  product: ProductModalData
}

interface StockIssueItem {
  productId: string
  ingredientName: string
  reason?: string
}

interface MenuPageProps {
  restaurantId: string
  restaurantName: string
  tableId: string
  tableNumber: number
  sessionToken: string
  currency: string
  categories: Category[]
  pdfUrl?: string | null
  pdfHotspots?: PdfHotspot[]
  initialStockIssues?: StockIssueItem[]
}

type ViewMode = 'list' | 'pdf'

let menuSocket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null

function getSocket(): Socket<ServerToClientEvents, ClientToServerEvents> {
  if (!menuSocket) {
    const socketUrl =
      process.env.NEXT_PUBLIC_SOCKET_URL ||
      (typeof window !== 'undefined' ? window.location.origin : '')

    menuSocket = io(socketUrl, {
      path: '/api/socketio',
      transports: ['websocket', 'polling'],
    })
  }
  return menuSocket
}

// ============================================================
// Menu Page
// ============================================================

export function MenuPage({
  restaurantId,
  restaurantName,
  tableId,
  tableNumber,
  sessionToken,
  currency,
  categories,
  pdfUrl,
  pdfHotspots = [],
  initialStockIssues = [],
}: MenuPageProps) {
  const hasPdf = Boolean(pdfUrl)

  const [selectedProduct, setSelectedProduct] = useState<ProductModalData | null>(null)
  const [activeCategory, setActiveCategory] = useState<string>(categories[0]?.id ?? '')
  const [cartOpen, setCartOpen] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>(hasPdf ? 'pdf' : 'list')
  const [stockIssues, setStockIssues] = useState<StockIssueItem[]>(initialStockIssues)

  const userAlias = useCartStore((s) => s.userAlias)
  const setUserAlias = useCartStore((s) => s.setUserAlias)
  const setSharedItems = useCartStore((s) => s.setSharedItems)
  const setConfirmedOrders = useCartStore((s) => s.setConfirmedOrders)
  const addConfirmedOrder = useCartStore((s) => s.addConfirmedOrder)
  const getOrderedByForProduct = useCartStore((s) => s.getOrderedByForProduct)
  const totalItems = useCartStore((s) => s.getTotalItemsCount())
  const totalAmount = useCartStore((s) => s.getTotalAmount())
  const confirmedCount = useCartStore((s) => s.getConfirmedItemsCount())
  const confirmedTotalAmount = useCartStore((s) => s.getConfirmedTotalAmount())

  const [isAliasModalOpen, setIsAliasModalOpen] = useState(false)
  const [participants, setParticipants] = useState<Array<{ socketId: string; userName: string }>>([])
  const isBroadcastingRef = useRef(false)

  // Cargar apodo guardado o solicitarlo
  useEffect(() => {
    if (!userAlias) {
      const savedAlias = localStorage.getItem('imenu_user_alias')
      if (savedAlias) {
        setUserAlias(savedAlias)
      } else {
        queueMicrotask(() => setIsAliasModalOpen(true))
      }
    }
  }, [userAlias, setUserAlias])

  // Función para retransmitir cambios del carrito por socket
  const broadcastCartUpdate = useCallback(
    (newItems: CartItem[]) => {
      if (!userAlias) return
      isBroadcastingRef.current = true
      const socket = getSocket()

      const payloadItems: SharedCartItemPayload[] = newItems.map((item) => ({
        cartItemId: item.cartItemId,
        productId: item.productId,
        name: item.name,
        basePrice: item.basePrice,
        unitCalculatedPrice: item.unitCalculatedPrice,
        quantity: item.quantity,
        selectedModifiers: item.selectedModifiers,
        removedIngredientIds: item.removedIngredientIds,
        notes: item.notes,
        orderedBy: item.orderedBy,
      }))

      socket.emit(WsClientEvent.UPDATE_SHARED_CART, {
        restaurantId,
        tableId,
        sessionToken,
        updatedBy: userAlias,
        items: payloadItems,
      })

      setTimeout(() => {
        isBroadcastingRef.current = false
      }, 500)
    },
    [restaurantId, tableId, sessionToken, userAlias],
  )

  // Conexión Socket.IO y listeners
  useEffect(() => {
    if (!userAlias) return
    const socket = getSocket()

    // Cargar órdenes confirmadas iniciales vía API
    fetch(`/api/orders?tableId=${tableId}&sessionToken=${sessionToken}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.orders) {
          setConfirmedOrders(data.orders)
        }
      })
      .catch((err) => console.error('Error al cargar órdenes de mesa:', err))

    // Unirse a la sesión de mesa enviando el alias
    socket.emit(
      WsClientEvent.JOIN_TABLE_SESSION,
      { restaurantId, tableId, sessionToken, userName: userAlias },
      (ack) => {
        if (ack.success) {
          if (ack.participants) setParticipants(ack.participants)
          if (ack.cart && ack.cart.length > 0) {
            setSharedItems(ack.cart)
          }
          if (ack.confirmedOrders) {
            setConfirmedOrders(ack.confirmedOrders)
          }
        }
      },
    )

    // Listener de actualización de participantes
    const handleParticipantsUpdate = (data: TableParticipantsPayload) => {
      if (data.tableId === tableId) {
        setParticipants(data.participants)
      }
    }

    // Listener de actualización del carrito compartido en tiempo real
    const handleSharedCartUpdate = (data: { items: SharedCartItemPayload[]; updatedBy: string }) => {
      if (isBroadcastingRef.current) return
      setSharedItems(data.items)
    }

    // Listener de nuevas órdenes confirmadas para la mesa
    const handleTableOrdersUpdate = (order: ConfirmedOrderPayload) => {
      addConfirmedOrder(order)
    }

    // Listeners de disponibilidad de stock en tiempo real
    const handleProductUnavailable = (data: StockIssueItem) => {
      setStockIssues((prev) => [...prev.filter((si) => si.productId !== data.productId), data])
    }

    const handleProductAvailable = (data: { productId: string }) => {
      setStockIssues((prev) => prev.filter((si) => si.productId !== data.productId))
    }

    socket.on(WsServerEvent.TABLE_PARTICIPANTS_UPDATED, handleParticipantsUpdate)
    socket.on(WsServerEvent.SHARED_CART_UPDATED, handleSharedCartUpdate)
    socket.on(WsServerEvent.TABLE_ORDERS_UPDATED, handleTableOrdersUpdate)
    // @ts-ignore custom events
    socket.on('product:unavailable', handleProductUnavailable)
    // @ts-ignore custom events
    socket.on('product:available', handleProductAvailable)
    return () => {
      socket.off(WsServerEvent.TABLE_PARTICIPANTS_UPDATED, handleParticipantsUpdate)
      socket.off(WsServerEvent.SHARED_CART_UPDATED, handleSharedCartUpdate)
      socket.off(WsServerEvent.TABLE_ORDERS_UPDATED, handleTableOrdersUpdate)
      // @ts-ignore custom events
      socket.off('product:unavailable', handleProductUnavailable)
      // @ts-ignore custom events
      socket.off('product:available', handleProductAvailable)
    }
  }, [restaurantId, tableId, sessionToken, userAlias, setSharedItems, setConfirmedOrders, addConfirmedOrder])

  const handleSaveAlias = (alias: string) => {
    localStorage.setItem('imenu_user_alias', alias)
    setUserAlias(alias)
    setIsAliasModalOpen(false)
  }

  const formatPrice = (amount: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency }).format(amount)

  return (
    <div className="min-h-dvh bg-zinc-950 text-white font-sans selection:bg-amber-500/30">

      {/* Modal para ingresar apodo de comensal */}
      <UserAliasModal
        isOpen={isAliasModalOpen}
        currentAlias={userAlias}
        onSave={handleSaveAlias}
        onClose={() => userAlias && setIsAliasModalOpen(false)}
      />

      {/* ── Header ── */}
      <header className="sticky top-0 z-40 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-900/80">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-bold text-sm">
              {restaurantName.charAt(0)}
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-black text-zinc-100 tracking-tight leading-tight">
                {restaurantName}
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                  Mesa {tableNumber}
                </span>

                {/* Badge de comensales activos */}
                <TableParticipantsBadge
                  participants={participants}
                  currentUserAlias={userAlias}
                  onEditAlias={() => setIsAliasModalOpen(true)}
                />
              </div>
            </div>
          </div>

          {/* Cart Icon in Header */}
          <button
            onClick={() => setCartOpen(true)}
            className="relative flex items-center justify-center w-10 h-10 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 rounded-xl transition-all duration-200 active:scale-95 text-zinc-300"
            aria-label="Ver carrito"
          >
            <span className="text-base">🛒</span>
            {totalItems > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-amber-500 text-white font-black text-[9px] rounded-full h-5 min-w-[20px] flex items-center justify-center px-1 border-2 border-zinc-950 shadow-md">
                {totalItems}
              </span>
            )}
          </button>
        </div>

        {/* Segmented Control PDF / Lista */}
        {hasPdf && (
          <div className="max-w-2xl mx-auto px-4 pb-3">
            <div className="bg-zinc-900/60 p-1 rounded-2xl flex gap-1 border border-zinc-900/80">
              <button
                onClick={() => setViewMode('pdf')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-xs font-semibold transition-all duration-200
                  ${
                    viewMode === 'pdf'
                      ? 'bg-amber-500 text-white shadow-md shadow-amber-500/10'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                aria-pressed={viewMode === 'pdf'}
              >
                📋 Menú Interactivo PDF
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-xs font-semibold transition-all duration-200
                  ${
                    viewMode === 'list'
                      ? 'bg-amber-500 text-white shadow-md shadow-amber-500/10'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                aria-pressed={viewMode === 'list'}
              >
                🍔 Lista por Categorías
              </button>
            </div>
          </div>
        )}

        {/* Category Tabs */}
        {viewMode === 'list' && (
          <div className="max-w-2xl mx-auto overflow-x-auto scrollbar-none border-t border-zinc-900/40">
            <div className="flex gap-2 px-4 py-3">
              {categories.map((cat) => {
                const isActive = activeCategory === cat.id
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-semibold transition-all duration-200 border
                      ${
                        isActive
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 font-bold'
                          : 'bg-zinc-900 border-zinc-850 text-zinc-400 hover:text-zinc-200'
                      }`}
                  >
                    {cat.name}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </header>

      {/* ── Vista PDF ── */}
      {viewMode === 'pdf' && pdfUrl && (
        <main className="max-w-2xl mx-auto px-2 py-4">
          <PdfMenuView
            pdfUrl={pdfUrl}
            hotspots={pdfHotspots}
            onSelectProduct={setSelectedProduct}
          />
        </main>
      )}

      {/* ── Vista Lista por categorías ── */}
      {viewMode === 'list' && (
        <main className="max-w-2xl mx-auto px-4 py-4 space-y-6">
          {categories
            .filter((cat) => !activeCategory || cat.id === activeCategory)
            .map((cat) => (
              <section key={cat.id}>
                <h2 className="text-sm font-black uppercase tracking-wider text-zinc-400 mb-3.5 flex items-center gap-2">
                  <span className="w-1.5 h-3 bg-amber-500 rounded-full" />
                  {cat.name}
                </h2>

                <div className="grid grid-cols-1 gap-3">
                  {cat.products.map((product) => {
                    const issue = stockIssues.find((si) => si.productId === product.id)
                    return (
                      <ProductCard
                        key={product.id}
                        product={product}
                        currency={currency}
                        orderedBy={getOrderedByForProduct(product.id)}
                        stockIssue={issue}
                        onSelect={() => setSelectedProduct(product)}
                      />
                    )
                  })}
                </div>
              </section>
            ))}
        </main>
      )}

      {/* ── Bottom Floating Bar (Waiter & Cart) ── */}
      <div className="fixed bottom-6 left-0 right-0 z-30 px-4 max-w-2xl mx-auto flex items-end gap-3 pointer-events-none">
        {/* Call Waiter Compact Button */}
        <div className="pointer-events-auto">
          <CallWaiterButton
            restaurantId={restaurantId}
            tableId={tableId}
            tableNumber={tableNumber}
            sessionToken={sessionToken}
            variant="compact"
          />
        </div>

        {/* Unified Cart/Pedido Button */}
        <div className="flex-1 pointer-events-auto">
          {totalItems > 0 ? (
            <button
              onClick={() => setCartOpen(true)}
              className="w-full bg-amber-500 hover:bg-amber-400 text-white rounded-2xl flex items-center justify-between px-5 py-4 shadow-xl shadow-amber-500/20 active:scale-98 transition-all font-bold text-sm sm:text-base group cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">🛒</span>
                <span>{confirmedCount > 0 ? 'Ver Ronda Actual' : 'Ver Pedido Mesa'}</span>
              </div>
              <div className="flex items-center gap-2 bg-black/15 py-1 px-3 rounded-lg text-xs sm:text-sm font-semibold border border-white/10">
                <span>
                  {totalItems} {totalItems === 1 ? 'item' : 'items'}
                </span>
                <span className="w-1 h-1 bg-white/40 rounded-full" />
                <span>{formatPrice(totalAmount)}</span>
              </div>
            </button>
          ) : confirmedCount > 0 ? (
            <button
              onClick={() => setCartOpen(true)}
              className="w-full bg-zinc-900/95 border border-emerald-500/40 hover:border-emerald-500/70 text-emerald-300 hover:text-white rounded-2xl flex items-center justify-between px-5 py-4 shadow-xl shadow-emerald-500/5 active:scale-98 transition-all font-bold text-sm sm:text-base group cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">🍳</span>
                <span>Ver Pedidos en Cocina</span>
              </div>
              <div className="flex items-center gap-2 bg-emerald-500/10 py-1 px-3 rounded-lg text-xs sm:text-sm font-semibold border border-emerald-500/20 text-emerald-300">
                <span>
                  {confirmedCount} {confirmedCount === 1 ? 'platillo' : 'platillos'}
                </span>
                <span className="w-1 h-1 bg-emerald-400/40 rounded-full" />
                <span>{formatPrice(confirmedTotalAmount)}</span>
              </div>
            </button>
          ) : (
            <button
              onClick={() => setCartOpen(true)}
              className="w-full bg-zinc-900/90 border border-zinc-800 text-zinc-400 hover:text-zinc-200 rounded-2xl flex items-center justify-between px-5 py-4 shadow-xl active:scale-98 transition-all font-semibold text-sm cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <span>🛒</span>
                <span>Ver Pedido (vacío)</span>
              </div>
              <span className="text-xs text-zinc-500">Sin items</span>
            </button>
          )}
        </div>
      </div>

      {/* Padding para el botón fijo */}
      <div className="h-28" />

      {/* ── Product Modal (compartido entre vista lista y PDF) ── */}
      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          currency={currency}
          stockIssue={stockIssues.find((si) => si.productId === selectedProduct.id)}
          onClose={() => setSelectedProduct(null)}
          onAdded={() => broadcastCartUpdate(useCartStore.getState().items)}
        />
      )}

      {/* ── Cart Drawer ── */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setCartOpen(false)}
          />
          <div className="relative w-full max-w-sm bg-zinc-900 border-l border-zinc-800 h-full flex flex-col shadow-2xl overflow-hidden animate-slide-in">
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 flex-shrink-0">
              <h2 className="font-bold text-white text-base">Pedido de la Mesa</h2>
              <button
                onClick={() => setCartOpen(false)}
                className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              <CartSheet
                restaurantId={restaurantId}
                tableId={tableId}
                sessionToken={sessionToken}
                currency={currency}
                onClose={() => setCartOpen(false)}
                onBroadcastCartUpdate={broadcastCartUpdate}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================
// Product Card
// ============================================================

function ProductCard({
  product,
  currency,
  orderedBy = [],
  stockIssue,
  onSelect,
}: {
  product: ProductModalData
  currency: string
  orderedBy?: string[]
  stockIssue?: StockIssueItem
  onSelect: () => void
}) {
  const formatPrice = (amount: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency }).format(amount)

  const hasModifiers =
    product.modifierGroups.length > 0 || product.ingredients.some((i) => i.isRemovable)

  const hasOrders = orderedBy.length > 0
  const isOutOfStock = Boolean(stockIssue)

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left bg-zinc-900/40 backdrop-blur-sm hover:bg-zinc-900 border
                 rounded-2xl overflow-hidden transition-all duration-300
                 hover:shadow-md hover:shadow-black/20 hover:scale-[1.01] active:scale-[0.99] group p-3.5 relative ${
                   isOutOfStock
                     ? 'border-red-900/50 bg-red-950/20 opacity-80'
                     : hasOrders
                     ? 'border-amber-500/50 bg-amber-500/5'
                     : 'border-zinc-900/60 hover:border-zinc-850'
                 }`}
    >
      {/* Badge de comensales */}
      {hasOrders && (
        <div className="mb-2 inline-flex items-center gap-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-md text-[10px] font-bold">
          <span>🏷️</span>
          <span>Pedida por: {orderedBy.join(', ')}</span>
        </div>
      )}

      {/* Badge de Sin Stock de ingrediente */}
      {isOutOfStock && (
        <div className="mb-2 inline-flex items-center gap-1 bg-red-950/80 text-red-300 border border-red-800 px-2 py-0.5 rounded-md text-[10px] font-bold">
          <span>⚠️</span>
          <span>Sin stock de {stockIssue?.ingredientName}</span>
        </div>
      )}

      <div className="flex items-center gap-4">
        {/* Content */}
        <div className="flex-1 min-w-0 flex flex-col justify-between h-full">
          <div>
            <h3
              className={`font-bold transition-colors text-sm sm:text-base leading-snug ${
                isOutOfStock ? 'text-zinc-400 line-through' : 'text-zinc-100 group-hover:text-amber-400'
              }`}
            >
              {product.name}
            </h3>
            {product.description && (
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed line-clamp-2">
                {product.description}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between mt-3">
            <span
              className={`font-extrabold text-sm sm:text-base ${
                isOutOfStock ? 'text-zinc-500' : 'text-amber-400'
              }`}
            >
              {formatPrice(product.basePrice)}
            </span>

            <div className="flex items-center gap-2">
              {hasModifiers && !isOutOfStock && (
                <span className="text-[9px] font-extrabold tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-md uppercase">
                  Personalizable
                </span>
              )}
              {isOutOfStock ? (
                <span className="px-2 py-1 bg-red-950/60 border border-red-900 text-red-400 text-[10px] font-bold rounded-lg uppercase">
                  Agotado
                </span>
              ) : (
                <span className="w-7 h-7 rounded-lg bg-zinc-800/80 border border-zinc-700/50 group-hover:bg-amber-500 group-hover:border-amber-400 text-zinc-400 group-hover:text-white flex items-center justify-center text-xs font-bold transition-all shadow-sm">
                  +
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Image */}
        {product.imageUrl && (
          <div className="w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 rounded-xl overflow-hidden border border-zinc-900 shadow-inner bg-zinc-800">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={product.imageUrl}
              alt={product.name}
              className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${
                isOutOfStock ? 'grayscale opacity-60' : ''
              }`}
            />
          </div>
        )}
      </div>
    </button>
  )
}
