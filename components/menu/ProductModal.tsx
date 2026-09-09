'use client'

import { useState, useEffect, useRef } from 'react'
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
  stockIssue?: { productId: string; ingredientName: string; reason?: string }
  onClose: () => void
  onAdded?: () => void
}

export function ProductModal({ product, currency = 'MXN', stockIssue, onClose, onAdded }: ProductModalProps) {
  const addItem = useCartStore((s) => s.addItem)
  const isOutOfStock = Boolean(stockIssue)

  // Estado local de selecciones
  const [singleSelects, setSingleSelects] = useState<Record<string, string>>({}) // groupId → optionId
  const [addons, setAddons] = useState<Set<string>>(new Set()) // Set de optionId
  const [removedIngredients, setRemovedIngredients] = useState<Set<string>>(new Set())
  const [notes, setNotes] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [error, setError] = useState<string | null>(null)

  // Ref para trap de foco — primer elemento focusable
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const addButtonRef = useRef<HTMLButtonElement>(null)

  // Al montar, enfocar el botón de cierre (primer elemento focusable del dialog)
  useEffect(() => {
    closeButtonRef.current?.focus()
  }, [])

  // Trap de foco: Escape cierra el modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // Bloquear scroll del body mientras el modal está abierto
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

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

    if (onAdded) onAdded()
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-modal-title"
      aria-describedby={product.description ? 'product-modal-desc' : undefined}
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel del modal */}
      <div
        className="relative w-full sm:max-w-md max-h-[90dvh] bg-zinc-900 rounded-t-2xl sm:rounded-2xl
                    border border-zinc-700 shadow-2xl flex flex-col overflow-hidden"
      >

        {/* Imagen del producto */}
        {product.imageUrl && (
          <div className="relative h-44 sm:h-52 flex-shrink-0 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent" aria-hidden="true" />
          </div>
        )}

        {/* Header */}
        <div className="flex-shrink-0 px-5 pt-5 pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <h2
                id="product-modal-title"
                className="text-xl font-bold text-white leading-tight"
              >
                {product.name}
              </h2>
              {product.description && (
                <p
                  id="product-modal-desc"
                  className="text-sm text-zinc-300 mt-1.5 leading-relaxed"
                >
                  {product.description}
                </p>
              )}
            </div>
            {/* Botón cerrar — mínimo 44×44px */}
            <button
              ref={closeButtonRef}
              onClick={onClose}
              className="flex-shrink-0 w-11 h-11 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200
                         flex items-center justify-center text-lg transition-colors
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              aria-label="Cerrar"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Body scrollable */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-6">

          {/* Grupos de modificadores */}
          {product.modifierGroups.map((group) => (
            <fieldset key={group.id} className="border-0 p-0 m-0">
              <legend className="flex items-center gap-2 mb-3 w-full">
                <span className="text-base font-semibold text-white">{group.name}</span>
                {group.isRequired && (
                  <span className="text-xs font-bold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30">
                    Requerido
                  </span>
                )}
                {group.type === 'ADDON' && group.maxSelect > 1 && (
                  <span className="text-sm text-zinc-400">máx. {group.maxSelect}</span>
                )}
              </legend>

              <div className="space-y-2" role={group.type === 'SINGLE_SELECT' ? 'radiogroup' : 'group'} aria-label={group.name}>
                {group.options.filter((o) => o.isAvailable).map((option) => {
                  const isSelected =
                    group.type === 'SINGLE_SELECT'
                      ? singleSelects[group.id] === option.id
                      : addons.has(option.id)

                  return (
                    <button
                      key={option.id}
                      role={group.type === 'SINGLE_SELECT' ? 'radio' : 'checkbox'}
                      aria-checked={isSelected}
                      onClick={() =>
                        group.type === 'SINGLE_SELECT'
                          ? handleSingleSelect(group.id, option.id)
                          : handleAddonToggle(option.id, group.maxSelect)
                      }
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl
                                  text-sm font-medium transition-all duration-150 min-h-[52px]
                                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500
                                  ${isSelected
                                    ? 'bg-amber-500/20 border-2 border-amber-500/60 text-white'
                                    : 'bg-zinc-800 border-2 border-transparent text-zinc-200 hover:bg-zinc-700 hover:border-zinc-600'
                                  }`}
                    >
                      <span className="flex items-center gap-3">
                        {/* Indicador visual radio/checkbox */}
                        <span
                          className={`w-5 h-5 flex-shrink-0 rounded-${group.type === 'SINGLE_SELECT' ? 'full' : 'md'}
                                      border-2 transition-colors flex items-center justify-center
                                      ${isSelected ? 'border-amber-500 bg-amber-500' : 'border-zinc-500'}`}
                          aria-hidden="true"
                        >
                          {isSelected && (
                            <span className="text-[9px] text-white font-bold">
                              {group.type === 'SINGLE_SELECT' ? '●' : '✓'}
                            </span>
                          )}
                        </span>
                        {option.name}
                      </span>
                      {option.extraPrice > 0 && (
                        <span className="text-amber-300 font-semibold text-sm ml-2 shrink-0">
                          +{formatPrice(option.extraPrice)}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </fieldset>
          ))}

          {/* Ingredientes removibles */}
          {product.ingredients.filter((ing) => ing.isRemovable).length > 0 && (
            <fieldset className="border-0 p-0 m-0">
              <legend className="text-base font-semibold text-white mb-3">¿Qué quieres quitar?</legend>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Ingredientes removibles">
                {product.ingredients
                  .filter((ing) => ing.isRemovable)
                  .map((ing) => {
                    const isRemoved = removedIngredients.has(ing.id)
                    return (
                      <button
                        key={ing.id}
                        role="checkbox"
                        aria-checked={isRemoved}
                        onClick={() => handleIngredientToggle(ing.id)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all min-h-[44px]
                                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500
                                    ${isRemoved
                                      ? 'bg-red-500/20 border-2 border-red-500/60 text-red-300 line-through'
                                      : 'bg-zinc-800 border-2 border-zinc-700 text-zinc-200 hover:bg-zinc-700'
                                    }`}
                      >
                        {isRemoved ? '✕ ' : ''}Sin {ing.name}
                      </button>
                    )
                  })}
              </div>
            </fieldset>
          )}

          {/* Notas especiales */}
          <div>
            <label htmlFor="product-notes" className="block text-base font-semibold text-white mb-2.5">
              Notas especiales
            </label>
            <textarea
              id="product-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: Poco picante, sin sal..."
              maxLength={250}
              rows={2}
              className="w-full bg-zinc-800 border-2 border-zinc-700 rounded-xl px-4 py-3
                         text-base text-zinc-100 placeholder:text-zinc-500 resize-none
                         focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>
        </div>

        {/* Footer fijo */}
        <div className="flex-shrink-0 px-5 py-4 border-t border-zinc-800 space-y-3 bg-zinc-900">
          {/* Aviso de stock agotado */}
          {stockIssue && (
            <div
              className="p-3 bg-red-950/70 border border-red-700 rounded-xl text-sm text-red-300 flex items-center gap-2"
              role="alert"
            >
              <span aria-hidden="true">⚠️</span>
              <span>{stockIssue.reason ?? `No disponible: sin stock de ${stockIssue.ingredientName}`}</span>
            </div>
          )}

          {/* Error de validación — aria-live para lectores de pantalla */}
          {error && (
            <p
              role="alert"
              aria-live="assertive"
              className="text-sm text-red-300 text-center bg-red-500/10 border border-red-800 rounded-xl py-2.5 px-3"
            >
              {error}
            </p>
          )}

          {/* Selector de cantidad — touch targets ≥44px */}
          {!isOutOfStock && (
            <div className="flex items-center justify-between">
              <span className="text-base text-zinc-300 font-medium">Cantidad</span>
              <div className="flex items-center gap-3" role="group" aria-label="Selector de cantidad">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  aria-label={`Reducir cantidad, actualmente ${quantity}`}
                  className="w-11 h-11 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white
                             flex items-center justify-center transition-colors text-2xl font-light
                             border border-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                >
                  −
                </button>
                <span
                  className="font-bold text-white text-xl w-8 text-center"
                  aria-live="polite"
                  aria-atomic="true"
                >
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity((q) => Math.min(50, q + 1))}
                  aria-label={`Aumentar cantidad, actualmente ${quantity}`}
                  className="w-11 h-11 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white
                             flex items-center justify-center transition-colors text-2xl font-light
                             border border-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                >
                  +
                </button>
              </div>
            </div>
          )}

          {/* Botón agregar — tamaño generoso, contraste alto */}
          <button
            ref={addButtonRef}
            onClick={handleAddToCart}
            disabled={isOutOfStock}
            aria-disabled={isOutOfStock}
            className={`w-full py-4 text-base text-white font-bold rounded-2xl transition-all duration-200
                       flex items-center justify-between px-5 min-h-[56px]
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900
                       ${isOutOfStock
                         ? 'bg-zinc-800 border border-zinc-700 text-zinc-500 cursor-not-allowed'
                         : 'bg-amber-500 hover:bg-amber-400 active:scale-95 shadow-lg shadow-amber-500/30 cursor-pointer'
                       }`}
          >
            <span>{isOutOfStock ? 'No disponible (Agotado)' : 'Agregar al carrito'}</span>
            <span className="font-extrabold text-lg">{formatPrice(calculatedUnitPrice * quantity)}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
