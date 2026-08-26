import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

// ============================================================
// Types
// ============================================================

export interface CartModifierOption {
  groupId: string
  groupName: string
  optionId: string
  name: string
  extraPrice: number
}

export interface CartItem {
  cartItemId: string // Hash único: productId + modificadores + remociones + notas
  productId: string
  name: string
  basePrice: number
  unitCalculatedPrice: number // basePrice + sum(modificadores)
  quantity: number
  selectedModifiers: CartModifierOption[]
  removedIngredientIds: string[]
  notes?: string
}

interface CartState {
  items: CartItem[]
  // Actions
  addItem: (item: Omit<CartItem, 'cartItemId' | 'unitCalculatedPrice'>) => void
  removeItem: (cartItemId: string) => void
  updateQuantity: (cartItemId: string, quantity: number) => void
  clearCart: () => void
  // Computed
  getTotalAmount: () => number
  getTotalItemsCount: () => number
}

// ============================================================
// Hash determinista por combinación única de configuración
// Permite que el mismo producto con distinta config ocupe slots separados
// ============================================================

function generateCartItemId(
  productId: string,
  modifiers: CartModifierOption[],
  removedIngredientIds: string[],
  notes?: string,
): string {
  const sortedModifiers = [...modifiers]
    .map((m) => m.optionId)
    .sort()
    .join(',')
  const sortedRemoved = [...removedIngredientIds].sort().join(',')
  const normalizedNotes = notes?.trim() || ''
  return `${productId}_[${sortedModifiers}]_[${sortedRemoved}]_[${normalizedNotes}]`
}

// ============================================================
// Store
// ============================================================

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (newItem) => {
        const unitCalculatedPrice =
          newItem.basePrice +
          newItem.selectedModifiers.reduce((sum, mod) => sum + mod.extraPrice, 0)

        const cartItemId = generateCartItemId(
          newItem.productId,
          newItem.selectedModifiers,
          newItem.removedIngredientIds,
          newItem.notes,
        )

        set((state) => {
          const existingIndex = state.items.findIndex((i) => i.cartItemId === cartItemId)

          if (existingIndex > -1) {
            // Misma configuración → sumar cantidad
            const updated = [...state.items]
            updated[existingIndex] = {
              ...updated[existingIndex],
              quantity: updated[existingIndex].quantity + newItem.quantity,
            }
            return { items: updated }
          }

          return {
            items: [...state.items, { ...newItem, cartItemId, unitCalculatedPrice }],
          }
        })
      },

      removeItem: (cartItemId) => {
        set((state) => ({
          items: state.items.filter((i) => i.cartItemId !== cartItemId),
        }))
      },

      updateQuantity: (cartItemId, quantity) => {
        set((state) => {
          if (quantity <= 0) {
            return { items: state.items.filter((i) => i.cartItemId !== cartItemId) }
          }
          return {
            items: state.items.map((i) =>
              i.cartItemId === cartItemId ? { ...i, quantity } : i,
            ),
          }
        })
      },

      clearCart: () => set({ items: [] }),

      getTotalAmount: () => {
        return get().items.reduce(
          (sum, item) => sum + item.unitCalculatedPrice * item.quantity,
          0,
        )
      },

      getTotalItemsCount: () => {
        return get().items.reduce((sum, item) => sum + item.quantity, 0)
      },
    }),
    {
      name: 'imenu-guest-cart',
      storage: createJSONStorage(() => sessionStorage), // Efímero por pestaña/sesión
    },
  ),
)
