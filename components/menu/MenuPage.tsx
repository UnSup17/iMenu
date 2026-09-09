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
  // Soporte de contexto de Plaza Gastronómica
  foodCourtSlug?: string
  foodCourtName?: string
  onBackToMosaic?: () => void
  onNavigateRestaurant?: (direction: 'next' | 'prev') => void
  hasPrevRestaurant?: boolean
  hasNextRestaurant?: boolean
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
  foodCourtSlug,
  foodCourtName,
  onBackToMosaic,
  onNavigateRestaurant,
  hasPrevRestaurant = false,
  hasNextRestaurant = false,
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
    // Accesibilidad: lang implícita heredada del HTML; fuente base ampliada a 17px via clase
    <div className="min-h-dvh bg-zinc-950 text-white font-sans selection:bg-amber-500/30 text-[17px]">

      {/* Modal para ingresar apodo de comensal */}
      <UserAliasModal
        isOpen={isAliasModalOpen}
        currentAlias={userAlias}
        onSave={handleSaveAlias}
        onClose={() => userAlias && setIsAliasModalOpen(false)}
      />

      {/* ── Header ── */}
      <header className="sticky top-0 z-40 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* Botón Volver al mosaico si estamos en contexto de plaza */}
            {onBackToMosaic && (
              <button
                id="btn-back-to-mosaic"
                onClick={onBackToMosaic}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-amber-400 text-xs font-bold transition-all border border-zinc-700/60 active:scale-95 shrink-0"
                aria-label={`Volver al mosaico de ${foodCourtName || 'la plaza'}`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                </svg>
                <span>Plaza</span>
              </button>
            )}

            {/* Logo inicial del restaurante */}
            <div
              className="w-11 h-11 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-lg"
              aria-hidden="true"
            >
              {restaurantName.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black text-white tracking-tight leading-tight">
                  {restaurantName}
                </h1>
                {onNavigateRestaurant && (
                  <div className="flex items-center gap-1">
                    {hasPrevRestaurant && (
                      <button
                        onClick={() => onNavigateRestaurant('prev')}
                        className="p-1 rounded-md bg-zinc-800 text-zinc-400 hover:text-white"
                        aria-label="Restaurante anterior"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                    )}
                    {hasNextRestaurant && (
                      <button
                        onClick={() => onNavigateRestaurant('next')}
                        className="p-1 rounded-md bg-zinc-800 text-zinc-400 hover:text-white"
                        aria-label="Siguiente restaurante"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-sm font-semibold text-zinc-300">
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

          {/* Botón carrito en header — touch target mínimo 44px */}
          <button
            onClick={() => setCartOpen(true)}
            className="relative flex items-center justify-center w-12 h-12 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded-xl transition-all duration-200 active:scale-95 text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            aria-label={`Ver carrito${totalItems > 0 ? `, ${totalItems} ${totalItems === 1 ? 'artículo' : 'artículos'}` : ', vacío'}`}
          >
            <span className="text-xl" aria-hidden="true">🛒</span>
            {totalItems > 0 && (
              <span
                className="absolute -top-1.5 -right-1.5 bg-amber-500 text-white font-black text-xs rounded-full h-5 min-w-[20px] flex items-center justify-center px-1 border-2 border-zinc-950 shadow-md"
                aria-hidden="true"
              >
                {totalItems}
              </span>
            )}
          </button>
        </div>

        {/* Segmented Control PDF / Lista */}
        {hasPdf && (
          <div className="max-w-2xl mx-auto px-4 pb-3" role="group" aria-label="Modo de vista del menú">
            <div className="bg-zinc-900 p-1 rounded-2xl flex gap-1 border border-zinc-800">
              <button
                onClick={() => setViewMode('pdf')}
                aria-pressed={viewMode === 'pdf'}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500
                  ${viewMode === 'pdf'
                    ? 'bg-amber-500 text-white shadow-md shadow-amber-500/10'
                    : 'text-zinc-300 hover:text-white hover:bg-zinc-800'
                  }`}
              >
                📋 Menú PDF
              </button>
              <button
                onClick={() => setViewMode('list')}
                aria-pressed={viewMode === 'list'}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500
                  ${viewMode === 'list'
                    ? 'bg-amber-500 text-white shadow-md shadow-amber-500/10'
                    : 'text-zinc-300 hover:text-white hover:bg-zinc-800'
                  }`}
              >
                🍔 Por Categorías
              </button>
            </div>
          </div>
        )}

        {/* Category Tabs — accesibles como tablist */}
        {viewMode === 'list' && (
          <nav
            aria-label="Categorías del menú"
            className="max-w-2xl mx-auto overflow-x-auto scrollbar-none border-t border-zinc-800/60"
          >
            <div
              role="tablist"
              aria-label="Categorías"
              className="flex gap-2 px-4 py-3"
            >
              {categories.map((cat) => {
                const isActive = activeCategory === cat.id
                return (
                  <button
                    key={cat.id}
                    role="tab"
                    aria-selected={isActive}
                    aria-controls={`tabpanel-${cat.id}`}
                    id={`tab-${cat.id}`}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`flex-shrink-0 px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 border min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500
                      ${isActive
                        ? 'bg-amber-500/15 text-amber-300 border-amber-500/40 font-bold'
                        : 'bg-zinc-900 border-zinc-700 text-zinc-200 hover:text-white hover:bg-zinc-800'
                      }`}
                  >
                    {cat.name}
                  </button>
                )
              })}
            </div>
          </nav>
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
        <main className="max-w-2xl mx-auto px-4 py-4 space-y-8">
          {categories
            .filter((cat) => !activeCategory || cat.id === activeCategory)
            .map((cat) => (
              <section
                key={cat.id}
                id={`tabpanel-${cat.id}`}
                role="tabpanel"
                aria-labelledby={`tab-${cat.id}`}
              >
                {/* Encabezado de categoría — tamaño aumentado para legibilidad */}
                <h2 className="text-base font-black uppercase tracking-wider text-zinc-200 mb-4 flex items-center gap-2.5">
                  <span className="w-1.5 h-4 bg-amber-500 rounded-full" aria-hidden="true" />
                  {cat.name}
                </h2>

                <div className="grid grid-cols-1 gap-4">
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
      <div
        className="fixed bottom-6 left-0 right-0 z-30 px-4 max-w-2xl mx-auto flex items-end gap-3 pointer-events-none"
        role="region"
        aria-label="Acciones de pedido"
      >
        {/* Llamar al mesero */}
        <div className="pointer-events-auto">
          <CallWaiterButton
            restaurantId={restaurantId}
            tableId={tableId}
            tableNumber={tableNumber}
            sessionToken={sessionToken}
            variant="compact"
          />
        </div>

        {/* Botón unificado Carrito/Pedido */}
        <div className="flex-1 pointer-events-auto">
          {totalItems > 0 ? (
            <button
              onClick={() => setCartOpen(true)}
              aria-label={`Ver pedido: ${totalItems} ${totalItems === 1 ? 'artículo' : 'artículos'}, total ${formatPrice(totalAmount)}`}
              className="w-full bg-amber-500 hover:bg-amber-400 text-white rounded-2xl flex items-center justify-between px-5 py-4 shadow-xl shadow-amber-500/20 active:scale-98 transition-all font-bold text-base cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <div className="flex items-center gap-2">
                <span className="text-xl" aria-hidden="true">🛒</span>
                <span>{confirmedCount > 0 ? 'Ver Ronda Actual' : 'Ver Pedido Mesa'}</span>
              </div>
              <div className="flex items-center gap-2 bg-black/15 py-1.5 px-3 rounded-lg text-sm font-semibold border border-white/10">
                <span>{totalItems} {totalItems === 1 ? 'item' : 'items'}</span>
                <span className="w-1 h-1 bg-white/40 rounded-full" aria-hidden="true" />
                <span>{formatPrice(totalAmount)}</span>
              </div>
            </button>
          ) : confirmedCount > 0 ? (
            <button
              onClick={() => setCartOpen(true)}
              aria-label={`Ver pedidos en cocina: ${confirmedCount} ${confirmedCount === 1 ? 'platillo' : 'platillos'}, total ${formatPrice(confirmedTotalAmount)}`}
              className="w-full bg-zinc-900 border border-emerald-500/50 hover:border-emerald-400 text-emerald-300 hover:text-white rounded-2xl flex items-center justify-between px-5 py-4 shadow-xl shadow-emerald-500/5 active:scale-98 transition-all font-bold text-base cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            >
              <div className="flex items-center gap-2">
                <span className="text-xl" aria-hidden="true">🍳</span>
                <span>Ver Pedidos en Cocina</span>
              </div>
              <div className="flex items-center gap-2 bg-emerald-500/10 py-1.5 px-3 rounded-lg text-sm font-semibold border border-emerald-500/20 text-emerald-300">
                <span>{confirmedCount} {confirmedCount === 1 ? 'platillo' : 'platillos'}</span>
                <span className="w-1 h-1 bg-emerald-400/40 rounded-full" aria-hidden="true" />
                <span>{formatPrice(confirmedTotalAmount)}</span>
              </div>
            </button>
          ) : (
            <button
              onClick={() => setCartOpen(true)}
              aria-label="Ver pedido, carrito vacío"
              className="w-full bg-zinc-900 border border-zinc-700 text-zinc-200 hover:text-white rounded-2xl flex items-center justify-between px-5 py-4 shadow-xl active:scale-98 transition-all font-semibold text-base cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500"
            >
              <div className="flex items-center gap-2">
                <span aria-hidden="true">🛒</span>
                <span>Ver Pedido</span>
              </div>
              <span className="text-sm text-zinc-400">Sin artículos</span>
            </button>
          )}
        </div>
      </div>

      {/* Padding para el botón fijo */}
      <div className="h-28" aria-hidden="true" />

      {/* ── Product Modal ── */}
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
        <div
          className="fixed inset-0 z-50 flex justify-end"
          role="dialog"
          aria-modal="true"
          aria-label="Pedido de la mesa"
        >
          <div
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            onClick={() => setCartOpen(false)}
            aria-hidden="true"
          />
          <div className="relative w-full max-w-sm bg-zinc-900 border-l border-zinc-800 h-full flex flex-col shadow-2xl overflow-hidden animate-slide-in">
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 flex-shrink-0">
              <h2 className="font-bold text-white text-lg">Pedido de la Mesa</h2>
              <button
                onClick={() => setCartOpen(false)}
                aria-label="Cerrar pedido"
                className="p-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 text-base"
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
// Product Card — Accesibilidad para adultos mayores
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

  // Descripción completa para lectores de pantalla
  const srDescription = [
    product.description,
    hasOrders ? `Pedida por: ${orderedBy.join(', ')}` : null,
    isOutOfStock ? `Agotado — sin stock de ${stockIssue?.ingredientName}` : null,
    hasModifiers && !isOutOfStock ? 'Personalizable' : null,
    `Precio: ${formatPrice(product.basePrice)}`,
    !isOutOfStock ? 'Toca para agregar al pedido' : null,
  ]
    .filter(Boolean)
    .join('. ')

  return (
    <button
      onClick={isOutOfStock ? undefined : onSelect}
      disabled={isOutOfStock}
      aria-label={`${product.name}. ${srDescription}`}
      aria-disabled={isOutOfStock}
      className={`w-full text-left rounded-2xl overflow-hidden transition-all duration-300 p-4 relative
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950
        ${isOutOfStock
          ? 'border border-red-900/50 bg-red-950/20 opacity-70 cursor-not-allowed'
          : hasOrders
          ? 'border border-amber-500/50 bg-amber-500/5 hover:bg-zinc-900 hover:shadow-md hover:shadow-black/20 hover:scale-[1.01] active:scale-[0.99] cursor-pointer'
          : 'border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-900 hover:border-zinc-700 hover:shadow-md hover:shadow-black/20 hover:scale-[1.01] active:scale-[0.99] cursor-pointer'
        }`}
    >
      {/* Badge de comensales — aria-hidden porque ya está en aria-label */}
      {hasOrders && (
        <div
          className="mb-2.5 inline-flex items-center gap-1.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 px-3 py-1 rounded-md text-xs font-bold"
          aria-hidden="true"
        >
          <span>🏷️</span>
          <span>Pedida por: {orderedBy.join(', ')}</span>
        </div>
      )}

      {/* Badge de Sin Stock */}
      {isOutOfStock && (
        <div
          className="mb-2.5 inline-flex items-center gap-1.5 bg-red-950/80 text-red-300 border border-red-800 px-3 py-1 rounded-md text-xs font-bold"
          aria-hidden="true"
        >
          <span>⚠️</span>
          <span>Sin stock de {stockIssue?.ingredientName}</span>
        </div>
      )}

      <div className="flex items-center gap-4">
        {/* Contenido */}
        <div className="flex-1 min-w-0 flex flex-col justify-between h-full">
          <div>
            {/* Nombre — texto más grande y contraste alto */}
            <h3
              className={`font-bold leading-snug text-base sm:text-lg ${
                isOutOfStock ? 'text-zinc-400 line-through' : 'text-white'
              }`}
            >
              {product.name}
            </h3>
            {product.description && (
              <p className="text-sm text-zinc-300 mt-1 leading-relaxed line-clamp-2">
                {product.description}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between mt-3.5">
            {/* Precio — grande y visible */}
            <span
              className={`font-extrabold text-base sm:text-lg ${
                isOutOfStock ? 'text-zinc-500' : 'text-amber-400'
              }`}
              aria-hidden="true"
            >
              {formatPrice(product.basePrice)}
            </span>

            <div className="flex items-center gap-2">
              {hasModifiers && !isOutOfStock && (
                <span
                  className="text-xs font-bold tracking-wide bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2.5 py-1 rounded-md uppercase"
                  aria-hidden="true"
                >
                  Personalizable
                </span>
              )}
              {isOutOfStock ? (
                <span
                  className="px-3 py-1.5 bg-red-950/60 border border-red-900 text-red-300 text-xs font-bold rounded-lg uppercase"
                  aria-hidden="true"
                >
                  Agotado
                </span>
              ) : (
                /* Indicador de acción — sin texto redundante (ya cubierto por aria-label del botón) */
                <span
                  className="w-9 h-9 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-200 flex items-center justify-center text-base font-bold transition-all shadow-sm"
                  aria-hidden="true"
                >
                  +
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Imagen */}
        {product.imageUrl && (
          <div className="w-24 h-24 sm:w-28 sm:h-28 flex-shrink-0 rounded-xl overflow-hidden border border-zinc-800 shadow-inner bg-zinc-800">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={product.imageUrl}
              alt=""
              aria-hidden="true"
              className={`w-full h-full object-cover transition-transform duration-500 ${
                isOutOfStock ? 'grayscale opacity-60' : ''
              }`}
            />
          </div>
        )}
      </div>
    </button>
  )
}
