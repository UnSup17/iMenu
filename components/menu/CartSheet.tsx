'use client'

import { useCartStore, type CartItem } from '@/store/cart-store'

interface CartSheetProps {
  restaurantId: string
  tableId: string
  sessionToken: string
  currency?: string
}

export function CartSheet({ restaurantId, tableId, sessionToken, currency = 'MXN' }: CartSheetProps) {
  const { items, removeItem, updateQuantity, clearCart, getTotalAmount, getTotalItemsCount } =
    useCartStore()

  const totalAmount = getTotalAmount()
  const totalItems = getTotalItemsCount()

  const formatPrice = (amount: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency }).format(amount)

  async function handleSubmitOrder() {
    if (items.length === 0) return

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
        alert(`Error al enviar pedido: ${data.error}`)
        return
      }

      clearCart()
      alert('✅ ¡Pedido enviado! Te avisaremos cuando esté listo.')
    } catch {
      alert('Error de conexión. Intenta de nuevo.')
    }
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
        <span className="text-5xl mb-3">🛒</span>
        <p className="text-sm font-medium">Tu carrito está vacío</p>
        <p className="text-xs mt-1 text-zinc-600">Agrega productos del menú</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Items */}
      <div className="flex-1 overflow-y-auto space-y-3 pb-4">
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
      <div className="border-t border-zinc-800 pt-4 space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-zinc-400">{totalItems} producto{totalItems !== 1 ? 's' : ''}</span>
          <span className="font-bold text-white text-lg">{formatPrice(totalAmount)}</span>
        </div>

        <button
          onClick={handleSubmitOrder}
          className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-white font-bold rounded-xl
                     transition-all duration-200 active:scale-95 shadow-lg shadow-amber-500/30"
        >
          Enviar Pedido → {formatPrice(totalAmount)}
        </button>

        <button
          onClick={clearCart}
          className="w-full py-2 text-xs text-zinc-500 hover:text-red-400 transition-colors"
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
    <div className="bg-zinc-800/60 rounded-xl p-3 space-y-1.5">
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold text-sm text-white leading-tight">{item.name}</p>
        <button
          onClick={onRemove}
          className="text-zinc-500 hover:text-red-400 text-xs transition-colors flex-shrink-0"
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
      <div className="flex items-center justify-between mt-2">
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
