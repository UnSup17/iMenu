'use client'

import { useState } from 'react'
import { useCartStore, type CartItem } from '@/store/cart-store'
import { type ConfirmedOrderItemPayload } from '@/types/websocket-events'

interface CartSheetProps {
  restaurantId: string
  tableId: string
  sessionToken: string
  currency?: string
  onClose?: () => void
  onBroadcastCartUpdate?: (items: CartItem[]) => void
}

type BillViewMode = 'global' | 'individual'

export function CartSheet({
  restaurantId,
  tableId,
  sessionToken,
  currency = 'MXN',
  onClose,
  onBroadcastCartUpdate,
}: CartSheetProps) {
  const {
    items,
    confirmedOrders,
    userAlias,
    removeItem,
    updateQuantity,
    clearCart,
    addConfirmedOrder,
    getTotalAmount,
    getTotalItemsCount,
    getConfirmedTotalAmount,
    getConfirmedItemsCount,
    getGrandTotalAmount,
    getGrandItemsCount,
    getBreakdownByUser,
  } = useCartStore()

  const [viewMode, setViewMode] = useState<BillViewMode>('global')
  const [successToast, setSuccessToast] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const draftAmount = getTotalAmount()
  const draftCount = getTotalItemsCount()
  const confirmedAmount = getConfirmedTotalAmount()
  const confirmedCount = getConfirmedItemsCount()
  const grandAmount = getGrandTotalAmount()
  const grandCount = getGrandItemsCount()
  const breakdown = getBreakdownByUser()

  const formatPrice = (amount: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency }).format(amount)

  const handleLocalUpdateQuantity = (cartItemId: string, q: number, userName?: string) => {
    updateQuantity(cartItemId, q, userName)
    if (onBroadcastCartUpdate) {
      setTimeout(() => onBroadcastCartUpdate(useCartStore.getState().items), 0)
    }
  }

  const handleLocalRemove = (cartItemId: string, userName?: string) => {
    removeItem(cartItemId, userName)
    if (onBroadcastCartUpdate) {
      setTimeout(() => onBroadcastCartUpdate(useCartStore.getState().items), 0)
    }
  }

  const handleLocalClear = () => {
    clearCart()
    if (onBroadcastCartUpdate) {
      setTimeout(() => onBroadcastCartUpdate([]), 0)
    }
  }

  async function handleSubmitOrder() {
    if (items.length === 0 || submitting) return
    setSubmitting(true)
    setErrorMsg(null)

    const payload = {
      restaurantId,
      tableId,
      sessionToken,
      items: items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        selectedModifierOptionIds: item.selectedModifiers.map((m) => m.optionId),
        removedIngredientIds: item.removedIngredientIds,
        notes: item.notes,
        orderedByNames: item.orderedBy.map((u) => u.userName),
      })),
    }

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json()
        setErrorMsg(data.error ?? 'Error al enviar el pedido')
        setSubmitting(false)
        return
      }

      const result = await res.json()

      // 1. Guardar la orden confirmada en el estado local de la mesa
      if (result.orderId) {
        addConfirmedOrder({
          orderId: result.orderId,
          status: result.status || 'RECEIVED',
          totalAmount: result.totalAmount,
          itemsCount: result.itemsCount,
          createdAt: result.createdAt || new Date().toISOString(),
          items: result.items || [],
        })
      }

      // 2. Limpiar sólo el borrador de la mesa
      handleLocalClear()

      // 3. Mostrar banner de éxito temporal
      setSuccessToast(true)
      setTimeout(() => setSuccessToast(false), 5000)
    } catch {
      setErrorMsg('Error de conexión. Intenta de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  // Vista de carrito completamente vacío (sin pedidos previos ni pendientes)
  if (items.length === 0 && confirmedOrders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-zinc-500 h-full">
        <span className="text-5xl mb-3">🛒</span>
        <p className="text-sm font-medium">El carrito de la mesa está vacío</p>
        <p className="text-xs mt-1 text-zinc-600">Agrega productos del menú colaborativamente</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full justify-between space-y-3">
      {/* Toast de Éxito al Enviar Orden */}
      {successToast && (
        <div className="bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 p-3 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300 flex-shrink-0">
          <span className="text-2xl">✨</span>
          <div className="flex-1 text-xs">
            <p className="font-bold text-white">¡Ronda enviada a cocina!</p>
            <p className="text-emerald-400/90 mt-0.5">
              Tu pedido está en preparación. Puedes seguir agregando más platillos cuando desees.
            </p>
          </div>
          <button
            onClick={() => setSuccessToast(false)}
            className="text-emerald-400 hover:text-white text-xs px-1.5 py-0.5 rounded cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Segmented Control Global vs Individual */}
      <div
        className="p-1 rounded-xl flex gap-1 border flex-shrink-0"
        style={{
          backgroundColor: 'color-mix(in srgb, var(--brand-surface) 70%, var(--brand-bg) 30%)',
          borderColor: 'color-mix(in srgb, var(--brand-surface) 60%, var(--brand-text) 15%)',
        }}
      >
        <button
          onClick={() => setViewMode('global')}
          className="flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer"
          style={viewMode === 'global' ? {
            backgroundColor: 'var(--brand-primary)',
            color: '#ffffff',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          } : {
            color: 'var(--brand-muted)',
          }}
        >
          <span>🌐</span>
          <span>Mesa Completa</span>
        </button>

        <button
          onClick={() => setViewMode('individual')}
          className="flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer"
          style={viewMode === 'individual' ? {
            backgroundColor: 'var(--brand-primary)',
            color: '#ffffff',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          } : {
            color: 'var(--brand-muted)',
          }}
        >
          <span>👤</span>
          <span>Por Comensal ({breakdown.length})</span>
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-0.5 scrollbar-none">
        {/* Vista Global de Mesa */}
        {viewMode === 'global' && (
          <div className="space-y-4">
            {/* SECCIÓN 1: Items en Borrador (Ronda Actual, Editables) */}
            {items.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3
                    className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"
                    style={{ color: 'var(--brand-primary)' }}
                  >
                    <span>🛒</span>
                    <span>Por Enviar (Ronda Actual)</span>
                    <span
                      className="px-1.5 py-0.5 rounded text-[10px]"
                      style={{
                        backgroundColor: 'color-mix(in srgb, var(--brand-primary) 18%, transparent)',
                        color: 'var(--brand-primary)',
                      }}
                    >
                      {draftCount}
                    </span>
                  </h3>
                  <span className="text-[10px] font-medium" style={{ color: 'var(--brand-muted)' }}>
                    Editable antes de enviar
                  </span>
                </div>
                <div className="space-y-2">
                  {items.map((item) => (
                    <GlobalCartItemRow
                      key={item.cartItemId}
                      item={item}
                      currency={currency}
                      currentUserAlias={userAlias}
                      onRemove={(uName) => handleLocalRemove(item.cartItemId, uName)}
                      onQuantityChange={(q, uName) => handleLocalUpdateQuantity(item.cartItemId, q, uName)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* SECCIÓN 2: Pedidos Confirmados (En Cocina, Solo Lectura) */}
            {confirmedOrders.length > 0 && (
              <div className="space-y-2.5 pt-1">
                <div className="flex items-center justify-between border-t border-zinc-800/80 pt-3">
                  <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <span>🍳</span>
                    <span>Pedidos en Cocina</span>
                    <span className="bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded text-[10px]">
                      {confirmedCount} {confirmedCount === 1 ? 'platillo' : 'platillos'}
                    </span>
                  </h3>
                  <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                    <span>🔒</span>
                    <span>Solo lectura</span>
                  </span>
                </div>
                <div className="space-y-3">
                  {confirmedOrders.map((order, orderIdx) => (
                    <div key={order.orderId} className="space-y-2">
                      {confirmedOrders.length > 1 && (
                        <div className="flex items-center gap-2 text-[11px] font-bold text-zinc-400 px-1">
                          <span className="w-2 h-2 rounded-full bg-emerald-400" />
                          <span>
                            Ronda {orderIdx + 1} • {new Date(order.createdAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      )}
                      <div className="space-y-2">
                        {order.items.map((item) => (
                          <ConfirmedOrderItemRow
                            key={item.id}
                            item={item}
                            orderStatus={order.status}
                            currency={currency}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Vista Individual por Comensal */}
        {viewMode === 'individual' && (
          <div className="space-y-4">
            {breakdown.map((userGroup) => {
              const isCurrentUser = userGroup.userName === userAlias
              return (
                <div
                  key={userGroup.userName}
                  className="rounded-2xl p-3.5 border transition-all"
                  style={isCurrentUser ? {
                    backgroundColor: 'color-mix(in srgb, var(--brand-primary) 10%, transparent)',
                    borderColor: 'color-mix(in srgb, var(--brand-primary) 35%, transparent)',
                  } : {
                    backgroundColor: 'color-mix(in srgb, var(--brand-surface) 70%, var(--brand-bg) 30%)',
                    borderColor: 'color-mix(in srgb, var(--brand-surface) 60%, var(--brand-text) 15%)',
                  }}
                >
                  <div
                    className="flex items-center justify-between border-b pb-2 mb-2.5"
                    style={{
                      borderColor: 'color-mix(in srgb, var(--brand-surface) 60%, var(--brand-text) 15%)',
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-6 h-6 rounded-full text-xs font-black flex items-center justify-center border"
                        style={{
                          backgroundColor: 'color-mix(in srgb, var(--brand-primary) 18%, transparent)',
                          borderColor: 'color-mix(in srgb, var(--brand-primary) 35%, transparent)',
                          color: 'var(--brand-primary)',
                        }}
                      >
                        {userGroup.userName.charAt(0).toUpperCase()}
                      </span>
                      <div>
                        <h4
                          className="text-xs font-black flex items-center gap-1"
                          style={{ color: 'var(--brand-text)' }}
                        >
                          {userGroup.userName}
                          {isCurrentUser && (
                            <span
                              className="text-[9px] px-1.5 py-0.2 rounded font-bold"
                              style={{
                                backgroundColor: 'color-mix(in srgb, var(--brand-primary) 20%, transparent)',
                                color: 'var(--brand-primary)',
                              }}
                            >
                              Tú
                            </span>
                          )}
                        </h4>
                        <p className="text-[10px]" style={{ color: 'var(--brand-muted)' }}>
                          {userGroup.itemsCount} {userGroup.itemsCount === 1 ? 'platillo' : 'platillos'}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-extrabold" style={{ color: 'var(--brand-primary)' }}>
                      {formatPrice(userGroup.totalAmount)}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {userGroup.items.map((line) => (
                      <div
                        key={line.cartItemId}
                        className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-lg"
                        style={{
                          backgroundColor: 'color-mix(in srgb, var(--brand-surface) 60%, var(--brand-bg) 40%)',
                        }}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-bold" style={{ color: 'var(--brand-primary)' }}>
                            {line.quantity}x
                          </span>
                          <span className="truncate" style={{ color: 'var(--brand-text)' }}>
                            {line.name}
                          </span>
                          {line.isConfirmed ? (
                            <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-medium flex items-center gap-0.5 shrink-0">
                              <span>🔒</span> Confirmado
                            </span>
                          ) : (
                            <span
                              className="text-[9px] px-1.5 py-0.5 rounded font-medium shrink-0"
                              style={{
                                backgroundColor: 'color-mix(in srgb, var(--brand-primary) 18%, transparent)',
                                color: 'var(--brand-primary)',
                              }}
                            >
                              ⏳ Por enviar
                            </span>
                          )}
                        </div>
                        <span className="font-semibold shrink-0 ml-2" style={{ color: 'var(--brand-muted)' }}>
                          {formatPrice(line.total)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Footer con totales y botón de acción */}
      <div
        className="border-t pt-3 space-y-3 flex-shrink-0"
        style={{
          backgroundColor: 'var(--brand-surface)',
          borderColor: 'color-mix(in srgb, var(--brand-surface) 60%, var(--brand-text) 15%)',
        }}
      >
        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-xl flex items-center gap-2">
            <span>⚠️</span>
            <p className="flex-1 leading-snug">{errorMsg}</p>
          </div>
        )}

        {/* Desglose de totales */}
        <div className="space-y-1">
          {items.length > 0 && confirmedOrders.length > 0 && (
            <div className="flex items-center justify-between text-xs" style={{ color: 'var(--brand-muted)' }}>
              <span>Ronda actual por enviar: {formatPrice(draftAmount)}</span>
              <span>Ya en cocina: {formatPrice(confirmedAmount)}</span>
            </div>
          )}

          <div className="flex items-center justify-between text-sm">
            <span className="font-medium" style={{ color: 'var(--brand-muted)' }}>
              {items.length > 0
                ? `Total Acumulado Mesa (${grandCount} ${grandCount !== 1 ? 'items' : 'item'})`
                : `Total Confirmado Mesa (${confirmedCount} ${confirmedCount !== 1 ? 'items' : 'item'})`}
            </span>
            <span
              className="font-black text-lg"
              style={{ color: 'var(--brand-primary)' }}
            >
              {formatPrice(grandAmount)}
            </span>
          </div>
        </div>

        {/* Botón Principal */}
        {items.length > 0 ? (
          <>
            <button
              onClick={handleSubmitOrder}
              disabled={submitting}
              className="w-full py-3.5 font-bold transition-all duration-200 active:scale-95 shadow-lg flex items-center justify-center gap-2 cursor-pointer"
              style={submitting ? {
                backgroundColor: 'color-mix(in srgb, var(--brand-surface) 70%, var(--brand-bg) 30%)',
                color: 'var(--brand-muted)',
                borderRadius: 'calc(var(--brand-radius) * 0.7)',
                cursor: 'not-allowed',
              } : {
                backgroundColor: 'var(--brand-primary)',
                color: '#ffffff',
                borderRadius: 'calc(var(--brand-radius) * 0.7)',
              }}
            >
              {submitting ? (
                <>
                  <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Enviando a cocina...</span>
                </>
              ) : (
                <span>
                  {confirmedOrders.length > 0
                    ? `Enviar Pedido Adicional (${draftCount}) → ${formatPrice(draftAmount)}`
                    : `Enviar Pedido a Cocina (${draftCount}) → ${formatPrice(draftAmount)}`}
                </span>
              )}
            </button>

            <button
              onClick={handleLocalClear}
              disabled={submitting}
              className="w-full py-1 text-xs text-zinc-500 hover:text-red-400 transition-colors disabled:opacity-50 cursor-pointer"
            >
              Descartar borrador actual
            </button>
          </>
        ) : (
          <button
            onClick={onClose}
            className="w-full py-3.5 font-bold transition-all duration-200 active:scale-95 shadow-lg flex items-center justify-center gap-2 cursor-pointer"
            style={{
              backgroundColor: 'var(--brand-primary)',
              color: '#ffffff',
              borderRadius: 'calc(var(--brand-radius) * 0.7)',
            }}
          >
            <span>➕ Agregar más productos al pedido</span>
          </button>
        )}
      </div>
    </div>
  )
}

// ============================================================
// Confirmed Cart Item Row (Solo lectura - En Cocina)
// ============================================================

function ConfirmedOrderItemRow({
  item,
  orderStatus,
  currency,
}: {
  item: ConfirmedOrderItemPayload
  orderStatus: string
  currency: string
}) {
  const formatPrice = (amount: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency }).format(amount)

  const statusBadges: Record<string, { label: string; color: string }> = {
    RECEIVED: { label: 'Recibido', color: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
    PREPARING: { label: 'En preparación', color: 'bg-blue-500/15 text-blue-300 border-blue-500/30' },
    IN_PREPARATION: { label: 'En preparación', color: 'bg-blue-500/15 text-blue-300 border-blue-500/30' },
    READY: { label: 'Listo', color: 'bg-purple-500/15 text-purple-300 border-purple-500/30' },
    DELIVERED: { label: 'Servido', color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
    CANCELLED: { label: 'Cancelado', color: 'bg-red-500/15 text-red-300 border-red-500/30' },
  }
  const badge = statusBadges[orderStatus] ?? statusBadges.RECEIVED

  return (
    <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-xl p-3 space-y-2 opacity-95">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-extrabold text-sm text-zinc-200">
              {item.quantity}x {item.name}
            </span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${badge.color}`}>
              {badge.label}
            </span>
          </div>

          {/* Modificadores */}
          {item.modifiers && item.modifiers.length > 0 && (
            <p className="text-[11px] text-zinc-400 mt-1">
              + {item.modifiers.join(', ')}
            </p>
          )}

          {/* Notas */}
          {item.notes && (
            <p
              className="text-[11px] italic mt-0.5"
              style={{ color: 'var(--brand-accent)' }}
            >
              &ldquo;{item.notes}&rdquo;
            </p>
          )}

          {/* Quién lo ordenó */}
          {item.orderedByNames && item.orderedByNames.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {item.orderedByNames.map((name) => (
                <span
                  key={name}
                  className="text-[10px] px-1.5 py-0.5 rounded-md font-medium"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--brand-surface) 90%, var(--brand-bg) 10%)',
                    color: 'var(--brand-muted)',
                  }}
                >
                  👤 {name}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Precio solo lectura */}
        <div className="text-right shrink-0">
          <span className="font-bold text-sm" style={{ color: 'var(--brand-text)' }}>
            {formatPrice(item.subtotal)}
          </span>
          <div className="text-[10px] mt-0.5 flex items-center justify-end gap-1" style={{ color: 'var(--brand-muted)' }}>
            <span>🔒</span>
            <span>En cocina</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Global Cart Item Row
// ============================================================

function GlobalCartItemRow({
  item,
  currency,
  currentUserAlias,
  onRemove,
  onQuantityChange,
}: {
  item: CartItem
  currency: string
  currentUserAlias: string
  onRemove: (userName?: string) => void
  onQuantityChange: (q: number, userName?: string) => void
}) {
  const formatPrice = (amount: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency }).format(amount)

  const userEntry = item.orderedBy.find((u) => u.userName === currentUserAlias)
  const currentUserQty = userEntry ? userEntry.quantity : 0

  return (
    <div
      className="rounded-xl p-3.5 space-y-2 border"
      style={{
        backgroundColor: 'color-mix(in srgb, var(--brand-surface) 75%, var(--brand-bg) 25%)',
        borderColor: 'color-mix(in srgb, var(--brand-surface) 60%, var(--brand-text) 15%)',
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1 min-w-0">
          <p className="font-bold text-sm leading-tight" style={{ color: 'var(--brand-text)' }}>
            {item.name}
          </p>

          {/* Chips con los nombres de quienes pidieron este platillo */}
          <div className="flex flex-wrap gap-1 pt-0.5">
            {item.orderedBy.map((u) => (
              <span
                key={u.userName}
                className="text-[10px] font-bold px-2 py-0.5 rounded-md border"
                style={u.userName === currentUserAlias ? {
                  backgroundColor: 'color-mix(in srgb, var(--brand-primary) 18%, transparent)',
                  color: 'var(--brand-primary)',
                  borderColor: 'color-mix(in srgb, var(--brand-primary) 35%, transparent)',
                } : {
                  backgroundColor: 'color-mix(in srgb, var(--brand-surface) 90%, var(--brand-bg) 10%)',
                  color: 'var(--brand-muted)',
                  borderColor: 'color-mix(in srgb, var(--brand-surface) 60%, var(--brand-text) 15%)',
                }}
              >
                👤 {u.userName} ({u.quantity}x)
              </span>
            ))}
          </div>
        </div>

        <button
          onClick={() => onRemove()}
          className="text-zinc-500 hover:text-red-400 text-xs transition-colors p-1 cursor-pointer"
          title="Eliminar producto completo del carrito de mesa"
        >
          ✕
        </button>
      </div>

      {/* Modificadores seleccionados */}
      {item.selectedModifiers.length > 0 && (
        <div className="space-y-0.5 pt-1">
          {item.selectedModifiers.map((mod) => (
            <p key={mod.optionId} className="text-[11px]" style={{ color: 'var(--brand-muted)' }}>
              + {mod.name}
              {mod.extraPrice > 0 && (
                <span style={{ color: 'var(--brand-primary)' }}> (+{formatPrice(mod.extraPrice)})</span>
              )}
            </p>
          ))}
        </div>
      )}

      {/* Ingredientes removidos */}
      {item.removedIngredientIds.length > 0 && (
        <p className="text-[11px] text-red-400/80 italic">Sin algunos ingredientes</p>
      )}

      {/* Notas */}
      {item.notes && (
        <p className="text-[11px] italic" style={{ color: 'var(--brand-muted)' }}>
          &ldquo;{item.notes}&rdquo;
        </p>
      )}

      {/* Controles de cantidad y precio */}
      <div
        className="flex items-center justify-between pt-2 border-t"
        style={{
          borderColor: 'color-mix(in srgb, var(--brand-surface) 60%, var(--brand-text) 15%)',
        }}
      >
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--brand-muted)' }}>
            Tú ({currentUserAlias}):
          </span>
          <button
            onClick={() => onQuantityChange(currentUserQty - 1, currentUserAlias)}
            disabled={currentUserQty <= 0}
            className="w-6 h-6 rounded-lg disabled:opacity-30 text-xs flex items-center justify-center transition-colors font-bold cursor-pointer"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--brand-surface) 80%, var(--brand-text) 10%)',
              color: 'var(--brand-text)',
            }}
          >
            −
          </button>
          <span
            className="text-xs font-black w-4 text-center"
            style={{ color: 'var(--brand-primary)' }}
          >
            {currentUserQty}
          </span>
          <button
            onClick={() => onQuantityChange(currentUserQty + 1, currentUserAlias)}
            className="w-6 h-6 rounded-lg text-xs flex items-center justify-center transition-colors font-bold cursor-pointer"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--brand-surface) 80%, var(--brand-text) 10%)',
              color: 'var(--brand-text)',
            }}
          >
            +
          </button>
        </div>

        <div className="text-right">
          <span className="text-[10px] block" style={{ color: 'var(--brand-muted)' }}>Total Ítem</span>
          <span className="font-black text-sm" style={{ color: 'var(--brand-primary)' }}>
            {formatPrice(item.unitCalculatedPrice * item.quantity)}
          </span>
        </div>
      </div>
    </div>
  )
}
