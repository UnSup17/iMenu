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
import { RecommendModal } from './RecommendModal'
import { RecommendationToast } from './RecommendationToast'
import {
  WsClientEvent,
  WsServerEvent,
  type SharedCartItemPayload,
  type TableParticipantsPayload,
  type ConfirmedOrderPayload,
  type RecommendProductPayload,
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
  // Soporte de Identidad de Marca / White-Label
  brandLogoUrl?: string | null
  brandCoverBannerUrl?: string | null
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
  brandLogoUrl,
  brandCoverBannerUrl,
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
  const [recommendationsMap, setRecommendationsMap] = useState<
    Map<string, { fromUserName: string; note?: string; timestamp: number }>
  >(new Map())
  const [activeToast, setActiveToast] = useState<RecommendProductPayload | null>(null)
  const [recommendingProduct, setRecommendingProduct] = useState<ProductModalData | null>(null)
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

    // Listener de recomendaciones entre comensales en tiempo real
    const handleProductRecommended = (data: RecommendProductPayload) => {
      // Si el usuario actual fue quien envió la recomendación, no mostrar toast a sí mismo
      if (userAlias && data.fromUserName.trim().toLowerCase() === userAlias.trim().toLowerCase()) {
        return
      }

      setRecommendationsMap((prev) => {
        const next = new Map(prev)
        next.set(data.productId, {
          fromUserName: data.fromUserName,
          note: data.note,
          timestamp: data.timestamp,
        })
        return next
      })

      setActiveToast(data)
    }

    socket.on(WsServerEvent.TABLE_PARTICIPANTS_UPDATED, handleParticipantsUpdate)
    socket.on(WsServerEvent.SHARED_CART_UPDATED, handleSharedCartUpdate)
    socket.on(WsServerEvent.TABLE_ORDERS_UPDATED, handleTableOrdersUpdate)
    socket.on(WsServerEvent.PRODUCT_RECOMMENDED, handleProductRecommended)
    // @ts-ignore custom events
    socket.on('product:unavailable', handleProductUnavailable)
    // @ts-ignore custom events
    socket.on('product:available', handleProductAvailable)
    return () => {
      socket.off(WsServerEvent.TABLE_PARTICIPANTS_UPDATED, handleParticipantsUpdate)
      socket.off(WsServerEvent.SHARED_CART_UPDATED, handleSharedCartUpdate)
      socket.off(WsServerEvent.TABLE_ORDERS_UPDATED, handleTableOrdersUpdate)
      socket.off(WsServerEvent.PRODUCT_RECOMMENDED, handleProductRecommended)
      // @ts-ignore custom events
      socket.off('product:unavailable', handleProductUnavailable)
      // @ts-ignore custom events
      socket.off('product:available', handleProductAvailable)
    }
  }, [restaurantId, tableId, sessionToken, userAlias, setSharedItems, setConfirmedOrders, addConfirmedOrder])

  const handleSendRecommendation = (data: {
    targetSocketId: string | 'ALL'
    targetUserName: string
    note?: string
  }): boolean => {
    if (!recommendingProduct || !userAlias) return false
    const socket = getSocket()

    const hotspot = pdfHotspots.find((h) => h.product.id === recommendingProduct.id)

    const payload: RecommendProductPayload = {
      restaurantId,
      tableId,
      sessionToken,
      fromUserName: userAlias,
      fromSocketId: socket.id || '',
      targetSocketId: data.targetSocketId,
      targetUserName: data.targetUserName,
      productId: recommendingProduct.id,
      productName: recommendingProduct.name,
      productPrice: recommendingProduct.basePrice,
      productImageUrl: recommendingProduct.imageUrl,
      pdfPage: hotspot ? hotspot.page : null,
      note: data.note,
      timestamp: Date.now(),
    }

    socket.emit(WsClientEvent.RECOMMEND_PRODUCT, payload)

    // Guardar también en el mapa local del emisor para ver la decoración distintiva
    setRecommendationsMap((prev) => {
      const next = new Map(prev)
      next.set(recommendingProduct.id, {
        fromUserName: userAlias,
        note: data.note,
        timestamp: Date.now(),
      })
      return next
    })

    return true
  }

  const handleViewRecommendation = (rec: RecommendProductPayload) => {
    setActiveToast(null)

    // Buscar el producto en categories o pdfHotspots
    let targetProduct: ProductModalData | null = null
    for (const cat of categories) {
      const found = cat.products.find((p) => p.id === rec.productId)
      if (found) {
        targetProduct = found
        break
      }
    }

    if (!targetProduct && pdfHotspots.length > 0) {
      const hs = pdfHotspots.find((h) => h.product.id === rec.productId)
      if (hs) targetProduct = hs.product
    }

    if (!targetProduct) return

    // Si el platillo tiene hotspot en el PDF y el PDF está activo:
    const hs = pdfHotspots.find((h) => h.product.id === rec.productId)
    if (pdfUrl && hs !== undefined && viewMode === 'pdf') {
      const pageElem = document.getElementById(`pdf-page-${hs.page}`)
      if (pageElem) {
        pageElem.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
      const hotspotElem = document.getElementById(`pdf-hotspot-${rec.productId}`)
      if (hotspotElem) {
        hotspotElem.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    } else {
      if (viewMode === 'pdf') {
        setViewMode('list')
      }
      setTimeout(() => {
        const elem = document.getElementById(`product-${rec.productId}`)
        if (elem) {
          elem.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }, 100)
    }

    setSelectedProduct(targetProduct)
  }

  const handleSaveAlias = (alias: string) => {
    localStorage.setItem('imenu_user_alias', alias)
    setUserAlias(alias)
    setIsAliasModalOpen(false)
  }

  const formatPrice = (amount: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency }).format(amount)

  return (
    // Accesibilidad: lang implícita heredada del HTML; fuentes y colores dinámicos de marca
    <div
      className="min-h-dvh selection:bg-[var(--brand-primary)]/30 text-[17px] transition-colors"
      style={{
        backgroundColor: 'var(--brand-bg)',
        color: 'var(--brand-text)',
        fontFamily: 'var(--brand-font-body)',
      }}
    >

      {/* Modal para ingresar apodo de comensal */}
      <UserAliasModal
        isOpen={isAliasModalOpen}
        currentAlias={userAlias}
        onSave={handleSaveAlias}
        onClose={() => userAlias && setIsAliasModalOpen(false)}
      />

      {/* Banner de Portada Hero (si la marca lo tiene configurado) */}
      {brandCoverBannerUrl && (
        <div className="w-full h-36 sm:h-48 relative overflow-hidden">
          <img src={brandCoverBannerUrl} alt={restaurantName} className="w-full h-full object-cover" />
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(to top, var(--brand-bg) 0%, transparent 100%)',
            }}
          />
        </div>
      )}

      {/* ── Header ── */}
      <header
        className="sticky top-0 z-40 backdrop-blur-md border-b transition-colors"
        style={{
          backgroundColor: 'color-mix(in srgb, var(--brand-bg) 92%, transparent)',
          borderColor: 'color-mix(in srgb, var(--brand-surface) 60%, var(--brand-text) 15%)',
        }}
      >
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* Botón Volver al mosaico si estamos en contexto de plaza */}
            {onBackToMosaic && (
              <button
                id="btn-back-to-mosaic"
                onClick={onBackToMosaic}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border active:scale-95 shrink-0"
                style={{
                  backgroundColor: 'var(--brand-surface)',
                  borderColor: 'color-mix(in srgb, var(--brand-surface) 60%, var(--brand-text) 15%)',
                  color: 'var(--brand-primary)',
                }}
                aria-label={`Volver al mosaico de ${foodCourtName || 'la plaza'}`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                </svg>
                <span>Plaza</span>
              </button>
            )}

            {/* Logo o inicial del restaurante con Branding */}
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center font-bold text-lg overflow-hidden shrink-0 shadow-sm border"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--brand-primary) 15%, transparent)',
                borderColor: 'color-mix(in srgb, var(--brand-primary) 35%, transparent)',
                color: 'var(--brand-primary)',
              }}
              aria-hidden="true"
            >
              {brandLogoUrl ? (
                <img src={brandLogoUrl} alt={restaurantName} className="w-full h-full object-contain p-1" />
              ) : (
                restaurantName.charAt(0)
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1
                  className="text-base sm:text-lg font-black tracking-tight leading-tight"
                  style={{
                    color: 'var(--brand-text)',
                    fontFamily: 'var(--brand-font-heading)',
                  }}
                >
                  {restaurantName}
                </h1>
                {onNavigateRestaurant && (
                  <div className="flex items-center gap-1">
                    {hasPrevRestaurant && (
                      <button
                        onClick={() => onNavigateRestaurant('prev')}
                        className="p-1 rounded-md border"
                        style={{
                          backgroundColor: 'var(--brand-surface)',
                          borderColor: 'color-mix(in srgb, var(--brand-surface) 60%, var(--brand-text) 15%)',
                          color: 'var(--brand-muted)',
                        }}
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
                        className="p-1 rounded-md border"
                        style={{
                          backgroundColor: 'var(--brand-surface)',
                          borderColor: 'color-mix(in srgb, var(--brand-surface) 60%, var(--brand-text) 15%)',
                          color: 'var(--brand-muted)',
                        }}
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
                <span
                  className="text-sm font-semibold"
                  style={{ color: 'var(--brand-muted)' }}
                >
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
            className="relative flex items-center justify-center w-12 h-12 rounded-xl transition-all duration-200 active:scale-95 border focus-visible:outline-none"
            style={{
              backgroundColor: 'var(--brand-surface)',
              borderColor: 'color-mix(in srgb, var(--brand-surface) 60%, var(--brand-text) 15%)',
              color: 'var(--brand-text)',
            }}
            aria-label={`Ver carrito${totalItems > 0 ? `, ${totalItems} ${totalItems === 1 ? 'artículo' : 'artículos'}` : ', vacío'}`}
          >
            <span className="text-xl" aria-hidden="true">🛒</span>
            {totalItems > 0 && (
              <span
                className="absolute -top-1.5 -right-1.5 font-black text-xs rounded-full h-5 min-w-[20px] flex items-center justify-center px-1 border-2 shadow-md"
                style={{
                  backgroundColor: 'var(--brand-primary)',
                  color: '#ffffff',
                  borderColor: 'var(--brand-bg)',
                }}
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
            <div
              className="p-1 rounded-2xl flex gap-1 border"
              style={{
                backgroundColor: 'var(--brand-surface)',
                borderColor: 'color-mix(in srgb, var(--brand-surface) 60%, var(--brand-text) 15%)',
                borderRadius: 'var(--brand-radius)',
              }}
            >
              <button
                onClick={() => setViewMode('pdf')}
                aria-pressed={viewMode === 'pdf'}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-semibold transition-all duration-200 focus-visible:outline-none"
                style={viewMode === 'pdf' ? {
                  backgroundColor: 'var(--brand-primary)',
                  color: '#ffffff',
                  borderRadius: 'calc(var(--brand-radius) - 4px)',
                } : {
                  color: 'var(--brand-muted)',
                  borderRadius: 'calc(var(--brand-radius) - 4px)',
                }}
              >
                📋 Menú PDF
              </button>
              <button
                onClick={() => setViewMode('list')}
                aria-pressed={viewMode === 'list'}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-semibold transition-all duration-200 focus-visible:outline-none"
                style={viewMode === 'list' ? {
                  backgroundColor: 'var(--brand-primary)',
                  color: '#ffffff',
                  borderRadius: 'calc(var(--brand-radius) - 4px)',
                } : {
                  color: 'var(--brand-muted)',
                  borderRadius: 'calc(var(--brand-radius) - 4px)',
                }}
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
            className="max-w-2xl mx-auto overflow-x-auto scrollbar-none border-t"
            style={{
              borderColor: 'color-mix(in srgb, var(--brand-surface) 60%, var(--brand-text) 15%)',
            }}
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
                    className="flex-shrink-0 px-5 py-2.5 text-sm font-semibold transition-all duration-200 border min-h-[44px] focus-visible:outline-none"
                    style={isActive ? {
                      backgroundColor: 'color-mix(in srgb, var(--brand-primary) 18%, transparent)',
                      color: 'var(--brand-primary)',
                      borderColor: 'color-mix(in srgb, var(--brand-primary) 45%, transparent)',
                      borderRadius: 'var(--brand-radius)',
                      fontWeight: 700,
                    } : {
                      backgroundColor: 'var(--brand-surface)',
                      borderColor: 'color-mix(in srgb, var(--brand-surface) 60%, var(--brand-text) 15%)',
                      color: 'var(--brand-muted)',
                      borderRadius: 'var(--brand-radius)',
                    }}
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
            recommendedMap={recommendationsMap}
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
                {/* Encabezado de categoría */}
                <h2
                  className="text-base font-black uppercase tracking-wider mb-4 flex items-center gap-2.5"
                  style={{
                    color: 'var(--brand-text)',
                    fontFamily: 'var(--brand-font-heading)',
                  }}
                >
                  <span
                    className="w-1.5 h-4 rounded-full"
                    style={{ backgroundColor: 'var(--brand-primary)' }}
                    aria-hidden="true"
                  />
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
                        recommendation={recommendationsMap.get(product.id)}
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
              className="w-full flex items-center justify-between px-5 py-4 shadow-xl active:scale-98 transition-all font-bold text-base cursor-pointer focus-visible:outline-none"
              style={{
                backgroundColor: 'var(--brand-primary)',
                color: '#ffffff',
                borderRadius: 'var(--brand-radius)',
              }}
            >
              <div className="flex items-center gap-2">
                <span className="text-xl" aria-hidden="true">🛒</span>
                <span>{confirmedCount > 0 ? 'Ver Ronda Actual' : 'Ver Pedido Mesa'}</span>
              </div>
              <div className="flex items-center gap-2 bg-black/20 py-1.5 px-3 rounded-lg text-sm font-semibold border border-white/15">
                <span>{totalItems} {totalItems === 1 ? 'item' : 'items'}</span>
                <span className="w-1 h-1 bg-white/40 rounded-full" aria-hidden="true" />
                <span>{formatPrice(totalAmount)}</span>
              </div>
            </button>
          ) : confirmedCount > 0 ? (
            <button
              onClick={() => setCartOpen(true)}
              aria-label={`Ver pedidos en cocina: ${confirmedCount} ${confirmedCount === 1 ? 'platillo' : 'platillos'}, total ${formatPrice(confirmedTotalAmount)}`}
              className="w-full border flex items-center justify-between px-5 py-4 shadow-xl active:scale-98 transition-all font-bold text-base cursor-pointer focus-visible:outline-none"
              style={{
                backgroundColor: 'var(--brand-surface)',
                borderColor: 'color-mix(in srgb, #10b981 50%, transparent)',
                color: '#34d399',
                borderRadius: 'var(--brand-radius)',
              }}
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
              className="w-full border flex items-center justify-between px-5 py-4 shadow-xl active:scale-98 transition-all font-semibold text-base cursor-pointer focus-visible:outline-none"
              style={{
                backgroundColor: 'var(--brand-surface)',
                borderColor: 'color-mix(in srgb, var(--brand-surface) 60%, var(--brand-text) 15%)',
                color: 'var(--brand-text)',
                borderRadius: 'var(--brand-radius)',
              }}
            >
              <div className="flex items-center gap-2">
                <span aria-hidden="true">🛒</span>
                <span>Ver Pedido</span>
              </div>
              <span className="text-sm" style={{ color: 'var(--brand-muted)' }}>Sin artículos</span>
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
          recommendationInfo={recommendationsMap.get(selectedProduct.id) || null}
          onOpenRecommend={() => {
            if (!userAlias) {
              setIsAliasModalOpen(true)
              return
            }
            setRecommendingProduct(selectedProduct)
          }}
          onClose={() => setSelectedProduct(null)}
          onAdded={() => broadcastCartUpdate(useCartStore.getState().items)}
        />
      )}

      {/* ── Modal de Recomendación de Platillo ── */}
      {recommendingProduct && (
        <RecommendModal
          product={recommendingProduct}
          currency={currency}
          currentUserName={userAlias || 'Comensal'}
          participants={participants}
          onClose={() => setRecommendingProduct(null)}
          onSendRecommendation={handleSendRecommendation}
        />
      )}

      {/* ── Toast Flotante de Recomendación Recibida ── */}
      {activeToast && (
        <RecommendationToast
          recommendation={activeToast}
          currency={currency}
          onViewProduct={handleViewRecommendation}
          onDismiss={() => setActiveToast(null)}
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
          <div
            className="relative w-full max-w-sm border-l h-full flex flex-col shadow-2xl overflow-hidden animate-slide-in"
            style={{
              backgroundColor: 'var(--brand-surface)',
              borderColor: 'color-mix(in srgb, var(--brand-surface) 60%, var(--brand-text) 15%)',
            }}
          >
            <div
              className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0"
              style={{
                borderColor: 'color-mix(in srgb, var(--brand-surface) 60%, var(--brand-text) 15%)',
              }}
            >
              <h2
                className="font-bold text-lg"
                style={{
                  color: 'var(--brand-text)',
                  fontFamily: 'var(--brand-font-heading)',
                }}
              >
                Pedido de la Mesa
              </h2>
              <button
                onClick={() => setCartOpen(false)}
                aria-label="Cerrar pedido"
                className="p-2.5 rounded-xl border transition-colors"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--brand-surface) 80%, var(--brand-bg) 20%)',
                  borderColor: 'color-mix(in srgb, var(--brand-surface) 60%, var(--brand-text) 15%)',
                  color: 'var(--brand-text)',
                }}
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
  recommendation,
  onSelect,
}: {
  product: ProductModalData
  currency: string
  orderedBy?: string[]
  stockIssue?: StockIssueItem
  recommendation?: { fromUserName: string; note?: string }
  onSelect: () => void
}) {
  const formatPrice = (amount: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency }).format(amount)

  const hasModifiers =
    product.modifierGroups.length > 0 || product.ingredients.some((i) => i.isRemovable)

  const hasOrders = orderedBy.length > 0
  const isRecommended = Boolean(recommendation)
  const isOutOfStock = Boolean(stockIssue)

  // Descripción completa para lectores de pantalla
  const srDescription = [
    product.description,
    isRecommended ? `Recomendado por: ${recommendation?.fromUserName}` : null,
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
      id={`product-${product.id}`}
      onClick={isOutOfStock ? undefined : onSelect}
      disabled={isOutOfStock}
      aria-label={`${product.name}. ${srDescription}`}
      aria-disabled={isOutOfStock}
      className="w-full text-left overflow-hidden transition-all duration-300 p-4 relative border focus-visible:outline-none hover:shadow-md hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
      style={isOutOfStock ? {
        backgroundColor: 'color-mix(in srgb, var(--brand-surface) 50%, transparent)',
        borderColor: 'color-mix(in srgb, #ef4444 30%, transparent)',
        borderRadius: 'var(--brand-radius)',
        opacity: 0.65,
        cursor: 'not-allowed',
      } : isRecommended ? {
        backgroundColor: 'color-mix(in srgb, var(--brand-surface) 88%, var(--brand-primary) 12%)',
        borderColor: 'var(--brand-primary)',
        boxShadow: '0 0 16px -3px color-mix(in srgb, var(--brand-primary) 35%, transparent)',
        borderRadius: 'var(--brand-radius)',
      } : hasOrders ? {
        backgroundColor: 'color-mix(in srgb, var(--brand-surface) 90%, var(--brand-primary) 10%)',
        borderColor: 'color-mix(in srgb, var(--brand-primary) 40%, transparent)',
        borderRadius: 'var(--brand-radius)',
      } : {
        backgroundColor: 'var(--brand-surface)',
        borderColor: 'color-mix(in srgb, var(--brand-surface) 60%, var(--brand-text) 15%)',
        borderRadius: 'var(--brand-radius)',
      }}
    >
      {/* Badge de recomendación de comensal */}
      {isRecommended && recommendation && (
        <div
          className="mb-2.5 inline-flex items-center gap-1.5 border px-3 py-1 rounded-md text-xs font-black shadow-sm"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--brand-primary, #f59e0b) 22%, transparent)',
            color: 'var(--brand-primary, #f59e0b)',
            borderColor: 'color-mix(in srgb, var(--brand-primary, #f59e0b) 50%, transparent)',
          }}
          aria-hidden="true"
        >
          <span>⭐</span>
          <span>{recommendation.fromUserName} recomienda este plato</span>
        </div>
      )}

      {/* Badge de comensales — aria-hidden porque ya está en aria-label */}
      {hasOrders && (
        <div
          className="mb-2.5 inline-flex items-center gap-1.5 border px-3 py-1 rounded-md text-xs font-bold mr-2"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--brand-primary) 18%, transparent)',
            color: 'var(--brand-primary)',
            borderColor: 'color-mix(in srgb, var(--brand-primary) 35%, transparent)',
          }}
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
            {/* Nombre — texto más grande y tipografía de encabezado */}
            <h3
              className="font-bold leading-snug text-base sm:text-lg"
              style={{
                fontFamily: 'var(--brand-font-heading)',
                color: isOutOfStock ? 'var(--brand-muted)' : 'var(--brand-text)',
                textDecoration: isOutOfStock ? 'line-through' : 'none',
              }}
            >
              {product.name}
            </h3>
            {product.description && (
              <p
                className="text-sm mt-1 leading-relaxed line-clamp-2"
                style={{ color: 'var(--brand-muted)' }}
              >
                {product.description}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between mt-3.5">
            {/* Precio — grande y en el color de marca primario */}
            <span
              className="font-extrabold text-base sm:text-lg"
              style={{
                color: isOutOfStock ? 'var(--brand-muted)' : 'var(--brand-primary)',
              }}
              aria-hidden="true"
            >
              {formatPrice(product.basePrice)}
            </span>

            <div className="flex items-center gap-2">
              {hasModifiers && !isOutOfStock && (
                <span
                  className="text-xs font-bold tracking-wide border px-2.5 py-1 rounded-md uppercase"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--brand-accent) 15%, transparent)',
                    color: 'var(--brand-accent)',
                    borderColor: 'color-mix(in srgb, var(--brand-accent) 35%, transparent)',
                  }}
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
                /* Indicador de acción en color de marca primario */
                <span
                  className="w-9 h-9 flex items-center justify-center text-base font-bold transition-all shadow-sm"
                  style={{
                    backgroundColor: 'var(--brand-primary)',
                    color: '#ffffff',
                    borderRadius: 'calc(var(--brand-radius) * 0.5)',
                  }}
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
          <div
            className="w-24 h-24 sm:w-28 sm:h-28 flex-shrink-0 rounded-xl overflow-hidden border shadow-inner"
            style={{
              borderColor: 'color-mix(in srgb, var(--brand-surface) 60%, var(--brand-text) 15%)',
              backgroundColor: 'color-mix(in srgb, var(--brand-surface) 80%, black 20%)',
            }}
          >
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
