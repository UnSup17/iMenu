'use client'

import { useState } from 'react'
import { useCartStore } from '@/store/cart-store'
import type { CartModifierOption } from '@/store/cart-store'

// ============================================================
// Types (derivados de lo que retorna Prisma en la page)
// ============================================================

interface ModifierOption {
  id: string
  name: string
  extraPrice: number
  isAvailable: boolean
}

interface ModifierGroup {
  id: string
  name: string
  type: 'SINGLE_SELECT' | 'ADDON'
  isRequired: boolean
  minSelect: number
  maxSelect: number
  options: ModifierOption[]
}

interface Ingredient {
  id: string
  name: string
  isRemovable: boolean
}

export interface ProductModalData {
  id: string
  name: string
  description?: string | null
  basePrice: number
  imageUrl?: string | null
  modifierGroups: ModifierGroup[]
  ingredients: Ingredient[]
}

interface ProductModalProps {
  product: ProductModalData
  currency?: string
  onClose: () => void
}

export function ProductModal({ product, currency = 'MXN', onClose }: ProductModalProps) {
  const addItem = useCartStore((s) => s.addItem)

  // Estado local de selecciones
  const [singleSelects, setSingleSelects] = useState<Record<string, string>>({}) // groupId → optionId
  const [addons, setAddons] = useState<Set<string>>(new Set()) // Set de optionId
  const [removedIngredients, setRemovedIngredients] = useState<Set<string>>(new Set())
  const [notes, setNotes] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [error, setError] = useState<string | null>(null)

  const formatPrice = (amount: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency }).format(amount)

  // Calcular precio dinámico
  const calculatedUnitPrice = (() => {
    let price = product.basePrice
    for (const group of product.modifierGroups) {
      if (group.type === 'SINGLE_SELECT') {
        const selectedId = singleSelects[group.id]
        if (selectedId) {
          const opt = group.options.find((o) => o.id === selectedId)
          if (opt) price += opt.extraPrice
        }
      } else {
        for (const optId of addons) {
          const opt = group.options.find((o) => o.id === optId)
          if (opt) price += opt.extraPrice
        }
      }
    }
    return price
  })()

  function handleSingleSelect(groupId: string, optionId: string) {
    setSingleSelects((prev) => ({ ...prev, [groupId]: optionId }))
    setError(null)
  }

  function handleAddonToggle(optionId: string, maxSelect: number) {
    setAddons((prev) => {
      const next = new Set(prev)
      if (next.has(optionId)) {
        next.delete(optionId)
      } else if (next.size < maxSelect) {
        next.add(optionId)
      }
      return next
    })
  }

  function handleIngredientToggle(ingredientId: string) {
    setRemovedIngredients((prev) => {
      const next = new Set(prev)
      if (next.has(ingredientId)) next.delete(ingredientId)
      else next.add(ingredientId)
      return next
    })
  }

  function handleAddToCart() {
    // Validar grupos requeridos
    for (const group of product.modifierGroups) {
      if (group.isRequired && group.type === 'SINGLE_SELECT') {
        if (!singleSelects[group.id]) {
          setError(`Debes seleccionar una opción en "${group.name}"`)
          return
        }
      }
    }

    // Construir modificadores seleccionados
    const selectedModifiers: CartModifierOption[] = []

    for (const group of product.modifierGroups) {
      if (group.type === 'SINGLE_SELECT') {
        const optId = singleSelects[group.id]
        if (optId) {
          const opt = group.options.find((o) => o.id === optId)!
          selectedModifiers.push({
            groupId: group.id,
            groupName: group.name,
            optionId: opt.id,
            name: opt.name,
            extraPrice: opt.extraPrice,
          })
        }
      } else {
        for (const optId of addons) {
          const opt = group.options.find((o) => o.id === optId)
          if (opt) {
            selectedModifiers.push({
              groupId: group.id,
              groupName: group.name,
              optionId: opt.id,
              name: opt.name,
              extraPrice: opt.extraPrice,
            })
          }
        }
      }
    }

    addItem({
      productId: product.id,
      name: product.name,
      basePrice: product.basePrice,
      quantity,
      selectedModifiers,
      removedIngredientIds: Array.from(removedIngredients),
      notes: notes.trim() || undefined,
    })

    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Configurar ${product.name}`}
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full sm:max-w-md max-h-[90dvh] bg-zinc-900 rounded-t-2xl sm:rounded-2xl
                      border border-zinc-700/50 shadow-2xl flex flex-col overflow-hidden">

        {/* Imagen del producto */}
        {product.imageUrl && (
          <div className="relative h-40 sm:h-48 flex-shrink-0 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent" />
          </div>
        )}

        {/* Header */}
        <div className="flex-shrink-0 px-5 pt-4 pb-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-white leading-tight">{product.name}</h2>
              {product.description && (
                <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">{product.description}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400
                         transition-colors"
              aria-label="Cerrar"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Body scrollable */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-5">

          {/* Grupos de modificadores */}
          {product.modifierGroups.map((group) => (
            <section key={group.id}>
              <div className="flex items-center gap-2 mb-2.5">
                <h3 className="text-sm font-semibold text-white">{group.name}</h3>
                {group.isRequired && (
                  <span className="text-[10px] font-bold bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full">
                    Requerido
                  </span>
                )}
                {group.type === 'ADDON' && group.maxSelect > 1 && (
                  <span className="text-[10px] text-zinc-500">máx. {group.maxSelect}</span>
                )}
              </div>

              <div className="space-y-1.5">
                {group.options.filter((o) => o.isAvailable).map((option) => {
                  const isSelected =
                    group.type === 'SINGLE_SELECT'
                      ? singleSelects[group.id] === option.id
                      : addons.has(option.id)

                  return (
                    <button
                      key={option.id}
                      onClick={() =>
                        group.type === 'SINGLE_SELECT'
                          ? handleSingleSelect(group.id, option.id)
                          : handleAddonToggle(option.id, group.maxSelect)
                      }
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg
                                  text-sm transition-all duration-150
                                  ${
                                    isSelected
                                      ? 'bg-amber-500/20 border border-amber-500/50 text-white'
                                      : 'bg-zinc-800/60 border border-zinc-700/40 text-zinc-300 hover:bg-zinc-800'
                                  }`}
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className={`w-4 h-4 flex-shrink-0 rounded-${group.type === 'SINGLE_SELECT' ? 'full' : 'md'}
                                      border-2 transition-colors flex items-center justify-center
                                      ${isSelected ? 'border-amber-500 bg-amber-500' : 'border-zinc-600'}`}
                        >
                          {isSelected && (
                            <span className="text-[8px] text-white font-bold">
                              {group.type === 'SINGLE_SELECT' ? '●' : '✓'}
                            </span>
                          )}
                        </span>
                        {option.name}
                      </span>
                      {option.extraPrice > 0 && (
                        <span className="text-amber-400 font-medium text-xs">
                          +{formatPrice(option.extraPrice)}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </section>
          ))}

          {/* Ingredientes removibles */}
          {product.ingredients.filter((ing) => ing.isRemovable).length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-white mb-2.5">¿Qué quieres quitar?</h3>
              <div className="flex flex-wrap gap-2">
                {product.ingredients
                  .filter((ing) => ing.isRemovable)
                  .map((ing) => {
                    const isRemoved = removedIngredients.has(ing.id)
                    return (
                      <button
                        key={ing.id}
                        onClick={() => handleIngredientToggle(ing.id)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all
                                    ${
                                      isRemoved
                                        ? 'bg-red-500/20 border border-red-500/50 text-red-400 line-through'
                                        : 'bg-zinc-800 border border-zinc-700 text-zinc-300 hover:border-zinc-500'
                                    }`}
                      >
                        Sin {ing.name}
                      </button>
                    )
                  })}
              </div>
            </section>
          )}

          {/* Notas especiales */}
          <section>
            <h3 className="text-sm font-semibold text-white mb-2">Notas especiales</h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: Poco picante, sin sal..."
              maxLength={250}
              rows={2}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2
                         text-sm text-zinc-200 placeholder:text-zinc-600 resize-none
                         focus:outline-none focus:border-amber-500/50 transition-colors"
            />
          </section>
        </div>

        {/* Footer fijo */}
        <div className="flex-shrink-0 px-5 py-4 border-t border-zinc-800 space-y-3 bg-zinc-900">
          {error && (
            <p className="text-xs text-red-400 text-center bg-red-500/10 rounded-lg py-2 px-3">
              {error}
            </p>
          )}

          {/* Cantidad */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-400">Cantidad</span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white
                           flex items-center justify-center transition-colors text-lg"
              >
                −
              </button>
              <span className="font-bold text-white w-5 text-center">{quantity}</span>
              <button
                onClick={() => setQuantity((q) => Math.min(50, q + 1))}
                className="w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white
                           flex items-center justify-center transition-colors text-lg"
              >
                +
              </button>
            </div>
          </div>

          {/* Botón agregar */}
          <button
            onClick={handleAddToCart}
            className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-white font-bold
                       rounded-xl transition-all duration-200 active:scale-95
                       shadow-lg shadow-amber-500/30 flex items-center justify-between px-4"
          >
            <span>Agregar al carrito</span>
            <span>{formatPrice(calculatedUnitPrice * quantity)}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
