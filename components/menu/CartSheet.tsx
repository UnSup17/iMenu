'use client'

import { useState } from 'react'
import { useCartStore, type CartItem } from '@/store/cart-store'

interface CartSheetProps {
  restaurantId: string
  tableId: string
  sessionToken: string
  currency?: string
  onClose?: () => void
}

export function CartSheet({
  restaurantId,
  tableId,
  sessionToken,
  currency = 'MXN',
  onClose,
}: CartSheetProps) {
  const { items, removeItem, updateQuantity, clearCart, getTotalAmount, getTotalItemsCount } =
    useCartStore()

  const [isSuccess, setIsSuccess] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const totalAmount = getTotalAmount()
  const totalItems = getTotalItemsCount()

  const formatPrice = (amount: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency }).format(amount)

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

      clearCart()
      setIsSuccess(true)
    } catch {
      setErrorMsg('Error de conexión. Intenta de nuevo.')
      setSubmitting(false)
    }
  }

  // Vista de pedido enviado con éxito
  if (isSuccess) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center h-full">
        <div className="relative mb-6 flex items-center justify-center">
          <div className="absolute inset-0 bg-emerald-500/10 rounded-full animate-ping opacity-75" />
          <div className="relative w-20 h-20 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full flex items-center justify-center text-4xl shadow-lg shadow-emerald-500/5">
            ✨
          </div>
        </div>

        <h2 className="text-xl font-black text-white leading-tight">¡Pedido Recibido!</h2>
        <p className="text-xs font-bold uppercase tracking-wider mt-1 text-emerald-400 animate-pulse">
          Cocina ya está trabajando
        </p>
        
        <p className="text-sm text-zinc-400 mt-4 px-3 leading-relaxed">
          Tu orden ha sido enviada con éxito. Te avisaremos en cuanto tu comida esté lista para ser servida en tu mesa.
        </p>

        {/* Decoración del tiempo estimado */}
        <div className="mt-8 p-4 bg-zinc-800/40 border border-zinc-850 rounded-2xl w-full flex items-center gap-3">
          <span className="text-2xl">🍳</span>
          <div className="text-left">
            <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wide">Tiempo Estimado</h4>
            <p className="text-[11px] text-zinc-500 mt-0.5">La preparación suele demorar entre 10 y 20 minutos.</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-auto py-3.5 bg-zinc-905 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 hover:text-white font-bold rounded-xl transition-all duration-200 active:scale-98 shadow-sm flex items-center justify-center gap-2"
        >
          Volver al Menú
        </button>
      </div>
    )
  }

  // Vista de carrito vacío
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-zinc-500 h-full">
        <span className="text-5xl mb-3">🛒</span>
        <p className="text-sm font-medium">Tu carrito está vacío</p>
        <p className="text-xs mt-1 text-zinc-600">Agrega productos del menú</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full justify-between">
      {/* Items */}
      <div className="flex-1 overflow-y-auto space-y-3 pb-4 scrollbar-none">
        {items.map((item) => (
          <CartItemRow
            key={item.cartItemId}
            item={item}
            currency={currency}
            onRemove={() => removeItem(item.cartItemId)}
            onQuantityChange={(q) => updateQuantity(item.cartItemId, q)}
          />
        ))}
      </div>

      {/* Footer con total y botón */}
      <div className="border-t border-zinc-800 pt-4 space-y-3 bg-zinc-900">
        
        {/* Error Banner */}
        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-xl flex items-center gap-2">
            <span>⚠️</span>
            <p className="flex-1 leading-snug">{errorMsg}</p>
          </div>
        )}

        <div className="flex items-center justify-between text-sm">
          <span className="text-zinc-400">{totalItems} producto{totalItems !== 1 ? 's' : ''}</span>
          <span className="font-bold text-white text-lg">{formatPrice(totalAmount)}</span>
        </div>

        <button
          onClick={handleSubmitOrder}
          disabled={submitting}
          className={`w-full py-3.5 font-bold rounded-xl transition-all duration-200 active:scale-95 shadow-lg flex items-center justify-center gap-2
            ${submitting 
              ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed shadow-none' 
              : 'bg-amber-500 hover:bg-amber-400 text-white shadow-amber-500/30'
            }`}
        >
          {submitting ? (
            <>
              <span className="h-4 w-4 border-2 border-zinc-500 border-t-transparent rounded-full animate-spin" />
              <span>Enviando pedido...</span>
            </>
          ) : (
            <span>Enviar Pedido → {formatPrice(totalAmount)}</span>
          )}
        </button>

        <button
          onClick={clearCart}
          disabled={submitting}
          className="w-full py-2 text-xs text-zinc-500 hover:text-red-400 transition-colors disabled:opacity-50 disabled:hover:text-zinc-500"
        >
          Limpiar carrito
        </button>
      </div>
    </div>
  )
}

// ============================================================
// Cart Item Row
// ============================================================

function CartItemRow({
  item,
  currency,
  onRemove,
  onQuantityChange,
}: {
  item: CartItem
  currency: string
  onRemove: () => void
  onQuantityChange: (q: number) => void
}) {
  const formatPrice = (amount: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency }).format(amount)

  return (
    <div className="bg-zinc-800/60 rounded-xl p-3.5 space-y-1.5 border border-zinc-800/20">
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold text-sm text-white leading-tight">{item.name}</p>
        <button
          onClick={onRemove}
          className="text-zinc-500 hover:text-red-400 text-xs transition-colors flex-shrink-0 p-0.5"
          aria-label="Eliminar del carrito"
        >
          ✕
        </button>
      </div>

      {/* Modificadores seleccionados */}
      {item.selectedModifiers.length > 0 && (
        <div className="space-y-0.5">
          {item.selectedModifiers.map((mod) => (
            <p key={mod.optionId} className="text-xs text-zinc-400">
              + {mod.name}
              {mod.extraPrice > 0 && (
                <span className="text-amber-400"> (+{formatPrice(mod.extraPrice)})</span>
              )}
            </p>
          ))}
        </div>
      )}

      {/* Ingredientes removidos */}
      {item.removedIngredientIds.length > 0 && (
        <p className="text-xs text-red-400/70 italic">Sin algunos ingredientes</p>
      )}

      {/* Notas */}
      {item.notes && (
        <p className="text-xs text-zinc-500 italic">&ldquo;{item.notes}&rdquo;</p>
      )}

      {/* Controles de cantidad y precio */}
      <div className="flex items-center justify-between mt-2.5">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onQuantityChange(item.quantity - 1)}
            className="w-6 h-6 rounded-full bg-zinc-700 hover:bg-zinc-600 text-white text-xs
                       flex items-center justify-center transition-colors"
          >
            −
          </button>
          <span className="text-sm font-bold text-white w-4 text-center">{item.quantity}</span>
          <button
            onClick={() => onQuantityChange(item.quantity + 1)}
            className="w-6 h-6 rounded-full bg-zinc-700 hover:bg-zinc-600 text-white text-xs
                       flex items-center justify-center transition-colors"
          >
            +
          </button>
        </div>

        <span className="font-bold text-amber-400 text-sm">
          {formatPrice(item.unitCalculatedPrice * item.quantity)}
        </span>
      </div>
    </div>
  )
}
