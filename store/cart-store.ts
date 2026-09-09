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

export interface CartAdditionOption {
  additionId: string
  name: string
  price: number
  quantity: number
}

export interface CartItemOrderedBy {
  userName: string
  quantity: number
}

export interface CartItem {
  cartItemId: string // Hash único: productId + modificadores + adiciones + remociones + notas
  productId: string
  name: string
  basePrice: number
  unitCalculatedPrice: number // basePrice + sum(modificadores) + sum(adiciones)
  quantity: number
  selectedModifiers: CartModifierOption[]
  selectedAdditions?: CartAdditionOption[]
  removedIngredientIds: string[]
  notes?: string
  orderedBy: CartItemOrderedBy[]
}

import { type ConfirmedOrderPayload } from '@/types/websocket-events'

export interface IndividualUserBreakdownItem {
  cartItemId: string
  name: string
  quantity: number
  unitCalculatedPrice: number
  total: number
  selectedModifiers?: CartModifierOption[]
  selectedAdditions?: CartAdditionOption[]
  modifierNames?: string[]
  notes?: string
  isConfirmed: boolean
  orderId?: string
}

export interface IndividualUserBreakdown {
  userName: string
  totalAmount: number
  itemsCount: number
  items: IndividualUserBreakdownItem[]
}

interface CartState {
  userAlias: string
  items: CartItem[] // Items en borrador (ronda actual, editables)
  confirmedOrders: ConfirmedOrderPayload[] // Pedidos confirmados en cocina (solo lectura)
  
  // Actions
  setUserAlias: (alias: string) => void
  addItem: (
    item: Omit<CartItem, 'cartItemId' | 'unitCalculatedPrice' | 'orderedBy'> & {
      userName?: string
    },
  ) => void
  removeItem: (cartItemId: string, targetUserName?: string) => void
  updateQuantity: (cartItemId: string, quantity: number, targetUserName?: string) => void
  setSharedItems: (items: CartItem[]) => void
  setConfirmedOrders: (orders: ConfirmedOrderPayload[]) => void
  addConfirmedOrder: (order: ConfirmedOrderPayload) => void
  clearCart: () => void
  
  // Computed
  getTotalAmount: () => number // Total de la ronda en borrador
  getTotalItemsCount: () => number // Cantidad de items en borrador
  getConfirmedTotalAmount: () => number // Total acumulado de órdenes confirmadas
  getConfirmedItemsCount: () => number // Total de items confirmados
  getGrandTotalAmount: () => number // Total global de la mesa (confirmado + borrador)
  getGrandItemsCount: () => number // Total global de items (confirmado + borrador)
  getBreakdownByUser: () => IndividualUserBreakdown[]
  getOrderedByForProduct: (productId: string) => string[]
}

// ============================================================
// Hash determinista por combinación única de configuración
// ============================================================

function generateCartItemId(
  productId: string,
  modifiers: CartModifierOption[],
  removedIngredientIds: string[],
  additions: CartAdditionOption[] = [],
  notes?: string,
): string {
  const sortedModifiers = [...modifiers]
    .map((m) => m.optionId)
    .sort()
    .join(',')
  const sortedAdditions = [...additions]
    .map((a) => `${a.additionId}:${a.quantity}`)
    .sort()
    .join(',')
  const sortedRemoved = [...removedIngredientIds].sort().join(',')
  const normalizedNotes = notes?.trim() || ''
  return `${productId}_[${sortedModifiers}]_[${sortedAdditions}]_[${sortedRemoved}]_[${normalizedNotes}]`
}

// ============================================================
// Store
// ============================================================

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      userAlias: '',
      items: [],
      confirmedOrders: [],

      setUserAlias: (alias) => set({ userAlias: alias }),

      addItem: (newItem) => {
        const activeUserName = newItem.userName || get().userAlias || 'Comensal'
        const modifiersExtra = (newItem.selectedModifiers || []).reduce(
          (sum, mod) => sum + mod.extraPrice,
          0,
        )
        const additionsExtra = (newItem.selectedAdditions || []).reduce(
          (sum, add) => sum + add.price * add.quantity,
          0,
        )
        const unitCalculatedPrice = newItem.basePrice + modifiersExtra + additionsExtra

        const cartItemId = generateCartItemId(
          newItem.productId,
          newItem.selectedModifiers || [],
          newItem.removedIngredientIds || [],
          newItem.selectedAdditions || [],
          newItem.notes,
        )

        set((state) => {
          const existingIndex = state.items.findIndex((i) => i.cartItemId === cartItemId)

          if (existingIndex > -1) {
            const updated = [...state.items]
            const existingItem = updated[existingIndex]
            const updatedOrderedBy = [...existingItem.orderedBy]

            const userIndex = updatedOrderedBy.findIndex((u) => u.userName === activeUserName)
            if (userIndex > -1) {
              updatedOrderedBy[userIndex] = {
                ...updatedOrderedBy[userIndex],
                quantity: updatedOrderedBy[userIndex].quantity + newItem.quantity,
              }
            } else {
              updatedOrderedBy.push({ userName: activeUserName, quantity: newItem.quantity })
            }

            updated[existingIndex] = {
              ...existingItem,
              quantity: existingItem.quantity + newItem.quantity,
              orderedBy: updatedOrderedBy,
            }
            return { items: updated }
          }

          return {
            items: [
              ...state.items,
              {
                ...newItem,
                cartItemId,
                unitCalculatedPrice,
                orderedBy: [{ userName: activeUserName, quantity: newItem.quantity }],
              },
            ],
          }
        })
      },

      removeItem: (cartItemId, targetUserName) => {
        set((state) => {
          if (!targetUserName) {
            return { items: state.items.filter((i) => i.cartItemId !== cartItemId) }
          }

          const updated = state.items
            .map((item) => {
              if (item.cartItemId !== cartItemId) return item
              const newOrderedBy = item.orderedBy.filter((u) => u.userName !== targetUserName)
              const newTotalQty = newOrderedBy.reduce((sum, u) => sum + u.quantity, 0)
              if (newTotalQty <= 0) return null
              return { ...item, quantity: newTotalQty, orderedBy: newOrderedBy }
            })
            .filter((i): i is CartItem => i !== null)

          return { items: updated }
        })
      },

      updateQuantity: (cartItemId, quantity, targetUserName) => {
        const currentAlias = targetUserName || get().userAlias || 'Comensal'

        set((state) => {
          const itemIndex = state.items.findIndex((i) => i.cartItemId === cartItemId)
          if (itemIndex === -1) return state

          const item = state.items[itemIndex]
          const userEntry = item.orderedBy.find((u) => u.userName === currentAlias)
          const currentItemUserQty = userEntry ? userEntry.quantity : 0
          const delta = quantity - currentItemUserQty

          const newTotalQty = item.quantity + delta
          if (newTotalQty <= 0) {
            return { items: state.items.filter((i) => i.cartItemId !== cartItemId) }
          }

          let newOrderedBy: CartItemOrderedBy[]
          if (quantity <= 0) {
            newOrderedBy = item.orderedBy.filter((u) => u.userName !== currentAlias)
          } else {
            if (userEntry) {
              newOrderedBy = item.orderedBy.map((u) =>
                u.userName === currentAlias ? { ...u, quantity } : u,
              )
            } else {
              newOrderedBy = [...item.orderedBy, { userName: currentAlias, quantity }]
            }
          }

          const updatedItems = [...state.items]
          updatedItems[itemIndex] = {
            ...item,
            quantity: newTotalQty,
            orderedBy: newOrderedBy,
          }
          return { items: updatedItems }
        })
      },

      setSharedItems: (newItems) => set({ items: newItems }),

      setConfirmedOrders: (newOrders) => set({ confirmedOrders: newOrders }),

      addConfirmedOrder: (newOrder) =>
        set((state) => {
          if (state.confirmedOrders.some((o) => o.orderId === newOrder.orderId)) {
            return state
          }
          return { confirmedOrders: [...state.confirmedOrders, newOrder] }
        }),

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

      getConfirmedTotalAmount: () => {
        return get().confirmedOrders.reduce((sum, order) => sum + order.totalAmount, 0)
      },

      getConfirmedItemsCount: () => {
        return get().confirmedOrders.reduce((sum, order) => sum + order.itemsCount, 0)
      },

      getGrandTotalAmount: () => {
        return get().getTotalAmount() + get().getConfirmedTotalAmount()
      },

      getGrandItemsCount: () => {
        return get().getTotalItemsCount() + get().getConfirmedItemsCount()
      },

      getBreakdownByUser: () => {
        const map = new Map<string, IndividualUserBreakdown>()

        const ensureUser = (name: string) => {
          if (!map.has(name)) {
            map.set(name, {
              userName: name,
              totalAmount: 0,
              itemsCount: 0,
              items: [],
            })
          }
          return map.get(name)!
        }

        // 1. Items confirmados en órdenes previas (solo lectura)
        for (const order of get().confirmedOrders) {
          for (const item of order.items) {
            const targets = item.orderedByNames.length > 0 ? item.orderedByNames : ['Mesa']
            const qtyPerPerson = Math.max(1, Math.floor(item.quantity / targets.length))
            const pricePerPerson = item.subtotal / targets.length

            for (const targetName of targets) {
              const userBreakdown = ensureUser(targetName)
              userBreakdown.totalAmount += pricePerPerson
              userBreakdown.itemsCount += qtyPerPerson
              userBreakdown.items.push({
                cartItemId: `${order.orderId}_${item.id}`,
                name: item.name,
                quantity: qtyPerPerson,
                unitCalculatedPrice: item.unitPrice,
                total: pricePerPerson,
                modifierNames: item.modifiers,
                notes: item.notes,
                isConfirmed: true,
                orderId: order.orderId,
              })
            }
          }
        }

        // 2. Items en borrador (ronda actual, editables)
        for (const item of get().items) {
          for (const orderEntry of item.orderedBy) {
            const name = orderEntry.userName || 'Comensal'
            const userBreakdown = ensureUser(name)
            const lineTotal = item.unitCalculatedPrice * orderEntry.quantity

            userBreakdown.totalAmount += lineTotal
            userBreakdown.itemsCount += orderEntry.quantity
            userBreakdown.items.push({
              cartItemId: item.cartItemId,
              name: item.name,
              quantity: orderEntry.quantity,
              unitCalculatedPrice: item.unitCalculatedPrice,
              total: lineTotal,
              selectedModifiers: item.selectedModifiers,
              selectedAdditions: item.selectedAdditions,
              notes: item.notes,
              isConfirmed: false,
            })
          }
        }

        return Array.from(map.values())
      },

      getOrderedByForProduct: (productId: string) => {
        const matchingItems = get().items.filter((i) => i.productId === productId)
        const namesSet = new Set<string>()

        for (const item of matchingItems) {
          for (const u of item.orderedBy) {
            if (u.quantity > 0) namesSet.add(u.userName)
          }
        }

        return Array.from(namesSet)
      },
    }),
    {
      name: 'imenu-guest-cart',
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
)
