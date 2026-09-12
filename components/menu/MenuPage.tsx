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
import { LanguageSelector } from './LanguageSelector'
import { OrderHistoryTrackerModal } from './OrderHistoryTrackerModal'
import { FeedbackModal } from './FeedbackModal'
import { type Locale, translations, translateCategoryName } from '@/lib/i18n/menu-translations'
import { soundNotifier, requestNotificationPermission, sendBrowserNotification } from '@/lib/audio/chime'
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
  whiteLabelEnabled?: boolean
  // Modo sólo lectura (web)
  isViewOnly?: boolean
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
  whiteLabelEnabled = false,
  isViewOnly = false,
}: MenuPageProps) {
  const hasPdf = Boolean(pdfUrl)

  const [selectedProduct, setSelectedProduct] = useState<ProductModalData | null>(null)
  const [activeCategory, setActiveCategory] = useState<string>(categories[0]?.id ?? '')
  const [cartOpen, setCartOpen] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>(hasPdf ? 'pdf' : 'list')
  const [stockIssues, setStockIssues] = useState<StockIssueItem[]>(initialStockIssues)

  // i18n
  const [locale, setLocale] = useState<Locale>('es')
  const t = useCallback(
    (key: keyof (typeof translations)['es']) => {
      const dict = translations[locale] || translations.es
      return ((dict as any)[key] as string) || (key as string)
    },
    [locale],
  )

  // Tracker y Feedback
  const [isTrackerOpen, setIsTrackerOpen] = useState(false)
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false)
  const [statusAlert, setStatusAlert] = useState<{
    title: string
    message: string
    emoji: string
    timestamp: number
  } | null>(null)
  const [kitchenInfo, setKitchenInfo] = useState<{
    estimatedMinutes: number
    pace: 'calm' | 'normal' | 'busy'
  }>({
    estimatedMinutes: 20,
    pace: 'normal',
  })

  const userAlias = useCartStore((s) => s.userAlias)
  const setUserAlias = useCartStore((s) => s.setUserAlias)
  const setSharedItems = useCartStore((s) => s.setSharedItems)
  const setConfirmedOrders = useCartStore((s) => s.setConfirmedOrders)
  const addConfirmedOrder = useCartStore((s) => s.addConfirmedOrder)
  const updateConfirmedOrderStatus = useCartStore((s) => s.updateConfirmedOrderStatus)
  const confirmedOrders = useCartStore((s) => s.confirmedOrders)
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

  // Cargar apodo guardado o solicitarlo (solo si no es modo sólo lectura)
  useEffect(() => {
    if (isViewOnly) return
    if (!userAlias) {
      const savedAlias = localStorage.getItem('imenu_user_alias')
      if (savedAlias) {
        setUserAlias(savedAlias)
      } else {
        queueMicrotask(() => setIsAliasModalOpen(true))
      }
    }
  }, [userAlias, setUserAlias, isViewOnly])

  // Cargar tiempo estimado y carga de cocina
  useEffect(() => {
    if (!restaurantId) return
    fetch(`/api/kitchen/load?restaurantId=${restaurantId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setKitchenInfo({
            estimatedMinutes: data.estimatedMinutes,
            pace: data.pace,
          })
        }
      })
      .catch(() => {})
  }, [restaurantId])

  // Solicitar permiso de notificación del navegador cuando hay órdenes confirmadas
  useEffect(() => {
    if (!isViewOnly && confirmedCount > 0) {
      requestNotificationPermission().catch(() => {})
    }
  }, [isViewOnly, confirmedCount])

  // Función para retransmitir cambios del carrito por socket
  const broadcastCartUpdate = useCallback(
    (newItems: CartItem[]) => {
      if (isViewOnly || !userAlias) return
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
    [restaurantId, tableId, sessionToken, userAlias, isViewOnly],
  )

  // Conexión Socket.IO y listeners
  useEffect(() => {
    if (isViewOnly || !userAlias) return
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

    // Listener de cambio de estado de una orden en cocina/salón
    const handleOrderStatusUpdated = (data: {
      orderId: string
      tableId: string
      newStatus: string
      restaurantId?: string
    }) => {
      if (data.tableId === tableId) {
        updateConfirmedOrderStatus(data.orderId, data.newStatus)

        let alertMessage = ''
        let alertEmoji = '🔔'
        if (data.newStatus === 'PREPARING') {
          alertMessage = t('preparingNotification')
          alertEmoji = '🍳'
          soundNotifier.playOrderPreparingChime()
        } else if (data.newStatus === 'READY') {
          alertMessage = t('readyNotification')
          alertEmoji = '🔔'
          soundNotifier.playOrderReadyChime()
        } else if (data.newStatus === 'DELIVERED') {
          alertMessage = t('deliveredNotification')
          alertEmoji = '🍽️'
        }

        if (alertMessage) {
          const timestamp = Date.now()
          const statusDetail =
            data.newStatus === 'READY'
              ? t('statusReady')
              : data.newStatus === 'PREPARING'
              ? t('statusPreparing')
              : t('statusDelivered')

          setStatusAlert({
            title: alertMessage,
            message: `${t('orderStatus')}: ${statusDetail}`,
            emoji: alertEmoji,
            timestamp,
          })
          sendBrowserNotification(restaurantName, alertMessage, brandLogoUrl)
          setTimeout(() => {
            setStatusAlert((curr) => (curr?.timestamp === timestamp ? null : curr))
          }, 6000)
        }
      }
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
    socket.on(WsServerEvent.ORDER_STATUS_UPDATED, handleOrderStatusUpdated as any)
    socket.on(WsServerEvent.PRODUCT_RECOMMENDED, handleProductRecommended)
    // @ts-ignore custom events
    socket.on('product:unavailable', handleProductUnavailable)
    // @ts-ignore custom events
    socket.on('product:available', handleProductAvailable)
    return () => {
      socket.off(WsServerEvent.TABLE_PARTICIPANTS_UPDATED, handleParticipantsUpdate)
      socket.off(WsServerEvent.SHARED_CART_UPDATED, handleSharedCartUpdate)
      socket.off(WsServerEvent.TABLE_ORDERS_UPDATED, handleTableOrdersUpdate)
      socket.off(WsServerEvent.ORDER_STATUS_UPDATED, handleOrderStatusUpdated as any)
      socket.off(WsServerEvent.PRODUCT_RECOMMENDED, handleProductRecommended)
      // @ts-ignore custom events
      socket.off('product:unavailable', handleProductUnavailable)
      // @ts-ignore custom events
      socket.off('product:available', handleProductAvailable)
    }
  }, [
    restaurantId,
    tableId,
    sessionToken,
    userAlias,
    isViewOnly,
    t,
    restaurantName,
    brandLogoUrl,
    setSharedItems,
    setConfirmedOrders,
    addConfirmedOrder,
    updateConfirmedOrderStatus,
  ])

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
        {/* Banner de modo solo lectura */}
        {isViewOnly && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 text-amber-200 text-xs py-1.5 px-4 text-center font-medium flex items-center justify-center gap-2">
            <span aria-hidden="true">👀</span>
            <span>{t('viewOnlyBanner')}</span>
          </div>
        )}

        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
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
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1
                  className="text-base sm:text-lg font-black tracking-tight leading-tight truncate"
                  style={{
                    color: 'var(--brand-text)',
                    fontFamily: 'var(--brand-font-heading)',
                  }}
                >
                  {restaurantName}
                </h1>
                {onNavigateRestaurant && (
                  <div className="flex items-center gap-1 shrink-0">
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
              <div className="flex flex-wrap items-center gap-2 mt-0.5">
                {isViewOnly ? (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                    {t('viewOnlyMode')}
                  </span>
                ) : (
                  <>
                    <span
                      className="text-sm font-semibold"
                      style={{ color: 'var(--brand-muted)' }}
                    >
                      {t('table')} {tableNumber}
                    </span>
                    {/* Badge de comensales activos */}
                    <TableParticipantsBadge
                      participants={participants}
                      currentUserAlias={userAlias}
                      onEditAlias={() => setIsAliasModalOpen(true)}
                    />
                  </>
                )}

                {/* Badge de tiempo estimado de cocina */}
                {kitchenInfo.estimatedMinutes > 0 && (
                  <div
                    className="flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full border"
                    style={{
                      backgroundColor: 'color-mix(in srgb, #3b82f6 12%, transparent)',
                      borderColor: 'color-mix(in srgb, #3b82f6 30%, transparent)',
                      color: '#60a5fa',
                    }}
                    title={`${t('estimatedWait')}: ~${kitchenInfo.estimatedMinutes} min`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                    <span>~{kitchenInfo.estimatedMinutes} min {t('kitchenWaitShort')}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Acciones en header */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Selector de idioma */}
            <LanguageSelector currentLocale={locale} onLocaleChange={setLocale} />

            {/* Botón de Mis Pedidos confirmados (si existen) */}
            {!isViewOnly && confirmedCount > 0 && (
              <button
                onClick={() => setIsTrackerOpen(true)}
                className="relative flex items-center justify-center h-10 px-3 rounded-xl transition-all duration-200 active:scale-95 border text-xs font-bold gap-1.5 cursor-pointer"
                style={{
                  backgroundColor: 'color-mix(in srgb, #10b981 15%, transparent)',
                  borderColor: 'color-mix(in srgb, #10b981 40%, transparent)',
                  color: '#34d399',
                }}
                aria-label={`${t('myOrders')}: ${confirmedCount} platillos`}
                title={t('myOrders')}
              >
                <span className="text-base" aria-hidden="true">🍳</span>
                <span className="hidden sm:inline">{t('myOrders')}</span>
                <span className="text-[11px] bg-emerald-500/30 px-1.5 py-0.5 rounded-full font-black text-emerald-200 border border-emerald-400/30">
                  {confirmedCount}
                </span>
              </button>
            )}

            {/* Botón carrito en header — touch target mínimo 44px */}
            {!isViewOnly && (
              <button
                onClick={() => setCartOpen(true)}
                className="relative flex items-center justify-center w-11 h-11 rounded-xl transition-all duration-200 active:scale-95 border focus-visible:outline-none cursor-pointer"
                style={{
                  backgroundColor: 'var(--brand-surface)',
                  borderColor: 'color-mix(in srgb, var(--brand-surface) 60%, var(--brand-text) 15%)',
                  color: 'var(--brand-text)',
                }}
                aria-label={`Ver carrito${totalItems > 0 ? `, ${totalItems} ${totalItems === 1 ? 'artículo' : 'artículos'}` : ', vacío'}`}
              >
                <span className="text-lg" aria-hidden="true">🛒</span>
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
            )}
          </div>
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
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-semibold transition-all duration-200 focus-visible:outline-none cursor-pointer"
                style={viewMode === 'pdf' ? {
                  backgroundColor: 'var(--brand-primary)',
                  color: '#ffffff',
                  borderRadius: 'calc(var(--brand-radius) - 4px)',
                } : {
                  color: 'var(--brand-muted)',
                  borderRadius: 'calc(var(--brand-radius) - 4px)',
                }}
              >
                📋 {t('viewPdf')}
              </button>
              <button
                onClick={() => setViewMode('list')}
                aria-pressed={viewMode === 'list'}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-semibold transition-all duration-200 focus-visible:outline-none cursor-pointer"
                style={viewMode === 'list' ? {
                  backgroundColor: 'var(--brand-primary)',
                  color: '#ffffff',
                  borderRadius: 'calc(var(--brand-radius) - 4px)',
                } : {
                  color: 'var(--brand-muted)',
                  borderRadius: 'calc(var(--brand-radius) - 4px)',
                }}
              >
                🍔 {t('viewByCategory')}
              </button>
            </div>
          </div>
        )}

        {/* Category Tabs — accesibles como tablist con traducción i18n */}
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
                const categoryDisplayName = translateCategoryName(cat.name, locale)
                return (
                  <button
                    key={cat.id}
                    role="tab"
                    aria-selected={isActive}
                    aria-controls={`tabpanel-${cat.id}`}
                    id={`tab-${cat.id}`}
                    onClick={() => setActiveCategory(cat.id)}
                    className="flex-shrink-0 px-5 py-2.5 text-sm font-semibold transition-all duration-200 border min-h-[44px] focus-visible:outline-none cursor-pointer"
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
                    {categoryDisplayName}
                  </button>
                )
              })}
            </div>
          </nav>
        )}
      </header>

      {/* ── Alerta flotante de cambio de estado en vivo ── */}
      {statusAlert && (
        <aside
          aria-live="polite"
          className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-md shadow-2xl rounded-2xl p-4 border flex items-center justify-between gap-3 text-white backdrop-blur-md animate-bounce"
          style={{
            backgroundColor: 'rgba(16, 185, 129, 0.96)',
            borderColor: '#34d399',
            boxShadow: '0 20px 30px -10px rgba(16, 185, 129, 0.5)',
          }}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl" aria-hidden="true">🔔</span>
            <div>
              <p className="font-extrabold text-sm tracking-tight">{statusAlert.title}</p>
              <p className="text-xs text-emerald-100 font-medium">{statusAlert.message}</p>
            </div>
          </div>
          <button
            onClick={() => {
              setStatusAlert(null)
              setIsTrackerOpen(true)
            }}
            className="bg-white/20 hover:bg-white/30 text-white text-xs font-bold px-3 py-1.5 rounded-lg shrink-0 transition-colors cursor-pointer border border-white/30"
          >
            {t('viewHistory')}
          </button>
        </aside>
      )}

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
                {/* Encabezado de categoría con i18n */}
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
                  {translateCategoryName(cat.name, locale)}
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

          {/* Footer sutil del Menú QR (con soporte White-Label) */}
          <footer className="pt-8 pb-20 text-center select-none" aria-label="Información del restaurante">
            <p
              className="text-xs font-semibold tracking-wider uppercase opacity-70"
              style={{ color: 'var(--brand-muted)' }}
            >
              {restaurantName}
            </p>
            {!whiteLabelEnabled ? (
              <p
                className="text-[11px] mt-1 tracking-tight flex items-center justify-center gap-1.5 opacity-50"
                style={{ color: 'var(--brand-muted)' }}
              >
                <span>Experiencia digital por</span>
                <span className="font-bold text-white tracking-normal">iMenu</span>
              </p>
            ) : (
              <p
                className="text-[10px] mt-1 opacity-30"
                style={{ color: 'var(--brand-muted)' }}
              >
                Menú digital interactivo
              </p>
            )}
          </footer>
        </main>
      )}

      {/* ── Bottom Floating Bar (Waiter & Cart / Orders) ── */}
      <div
        className="fixed bottom-6 left-0 right-0 z-30 px-4 max-w-2xl mx-auto flex items-end gap-3 pointer-events-none"
        role="region"
        aria-label="Acciones de pedido"
      >
        {/* Llamar al mesero (solo si no es modo solo lectura) */}
        {!isViewOnly && (
          <div className="pointer-events-auto">
            <CallWaiterButton
              restaurantId={restaurantId}
              tableId={tableId}
              tableNumber={tableNumber}
              sessionToken={sessionToken}
              variant="compact"
            />
          </div>
        )}

        {/* Botón unificado Carrito/Pedido/Tracker */}
        <div className="flex-1 pointer-events-auto">
          {isViewOnly ? (
            <div
              className="w-full border flex items-center justify-between px-5 py-3.5 shadow-xl font-medium text-sm"
              style={{
                backgroundColor: 'var(--brand-surface)',
                borderColor: 'color-mix(in srgb, var(--brand-surface) 60%, var(--brand-text) 15%)',
                color: 'var(--brand-muted)',
                borderRadius: 'var(--brand-radius)',
              }}
            >
              <div className="flex items-center gap-2">
                <span aria-hidden="true">👀</span>
                <span className="font-semibold text-slate-200">{t('viewOnlyMode')}</span>
              </div>
              <span className="text-xs text-slate-400">
                {categories.reduce((acc, c) => acc + c.products.length, 0)} {t('items')}
              </span>
            </div>
          ) : totalItems > 0 && confirmedCount > 0 ? (
            <div className="flex gap-2">
              <button
                onClick={() => setIsTrackerOpen(true)}
                className="flex-1 border flex items-center justify-center gap-2 py-3 px-3 shadow-xl active:scale-98 transition-all font-bold text-xs sm:text-sm cursor-pointer"
                style={{
                  backgroundColor: 'var(--brand-surface)',
                  borderColor: 'color-mix(in srgb, #10b981 50%, transparent)',
                  color: '#34d399',
                  borderRadius: 'var(--brand-radius)',
                }}
              >
                <span aria-hidden="true">🍳</span>
                <span>{t('myOrders')} ({confirmedCount})</span>
              </button>
              <button
                onClick={() => setCartOpen(true)}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-3 shadow-xl active:scale-98 transition-all font-bold text-xs sm:text-sm cursor-pointer"
                style={{
                  backgroundColor: 'var(--brand-primary)',
                  color: '#ffffff',
                  borderRadius: 'var(--brand-radius)',
                }}
              >
                <span aria-hidden="true">🛒</span>
                <span>{t('cart')} ({totalItems})</span>
              </button>
            </div>
          ) : totalItems > 0 ? (
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
                <span>{confirmedCount > 0 ? t('cart') : t('viewOrder')}</span>
              </div>
              <div className="flex items-center gap-2 bg-black/20 py-1.5 px-3 rounded-lg text-sm font-semibold border border-white/15">
                <span>{totalItems} {totalItems === 1 ? 'item' : 'items'}</span>
                <span className="w-1 h-1 bg-white/40 rounded-full" aria-hidden="true" />
                <span>{formatPrice(totalAmount)}</span>
              </div>
            </button>
          ) : confirmedCount > 0 ? (
            <button
              onClick={() => setIsTrackerOpen(true)}
              aria-label={`${t('myOrders')}: ${confirmedCount} ${confirmedCount === 1 ? 'platillo' : 'platillos'}, total ${formatPrice(confirmedTotalAmount)}`}
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
                <span>{t('myOrders')} ({confirmedCount})</span>
                {kitchenInfo.estimatedMinutes > 0 && (
                  <span className="text-xs font-normal text-emerald-300/80">
                    (~{kitchenInfo.estimatedMinutes} min)
                  </span>
                )}
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
                <span>{t('viewOrder')}</span>
              </div>
              <span className="text-sm" style={{ color: 'var(--brand-muted)' }}>{t('emptyCart')}</span>
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
          restaurantId={restaurantId}
          restaurantName={restaurantName}
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
                {t('tableOrder')}
              </h2>
              <button
                onClick={() => setCartOpen(false)}
                aria-label="Cerrar pedido"
                className="p-2.5 rounded-xl border transition-colors cursor-pointer"
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

      {/* ── Modal de Apodo del Comensal ── */}
      <UserAliasModal
        isOpen={isAliasModalOpen}
        currentAlias={userAlias}
        onSave={(newAlias) => {
          setUserAlias(newAlias)
          setIsAliasModalOpen(false)
        }}
        onClose={() => setIsAliasModalOpen(false)}
      />

      {/* ── Modal de Historial y Seguimiento de Pedidos ── */}
      <OrderHistoryTrackerModal
        isOpen={isTrackerOpen}
        onClose={() => setIsTrackerOpen(false)}
        restaurantId={restaurantId}
        tableId={tableId}
        tableNumber={tableNumber}
        sessionToken={sessionToken}
        currency={currency}
        userAlias={userAlias}
        locale={locale}
        estimatedMinutes={kitchenInfo.estimatedMinutes}
        onOpenFeedback={() => setIsFeedbackOpen(true)}
      />

      {/* ── Modal de Calificación y Feedback ── */}
      <FeedbackModal
        isOpen={isFeedbackOpen}
        onClose={() => setIsFeedbackOpen(false)}
        restaurantId={restaurantId}
        tableId={tableId}
        sessionToken={sessionToken}
        userAlias={userAlias}
        locale={locale}
      />
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
