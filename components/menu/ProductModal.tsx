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

export interface ProductAdditionOption {
  id: string
  name: string
  description?: string | null
  price: number
  isOutOfStock?: boolean
}

export interface ProductModalData {
  id: string
  name: string
  restaurantId?: string
  restaurantName?: string
  description?: string | null
  basePrice: number
  imageUrl?: string | null
  modifierGroups: ModifierGroup[]
  ingredients: Ingredient[]
  additions?: ProductAdditionOption[]
}

interface ProductModalProps {
  product: ProductModalData
  restaurantId?: string
  restaurantName?: string
  currency?: string
  stockIssue?: { productId: string; ingredientName: string; reason?: string }
  recommendationInfo?: { fromUserName: string; note?: string } | null
  onOpenRecommend?: () => void
  onClose: () => void
  onAdded?: () => void
}

export function ProductModal({
  product,
  restaurantId,
  restaurantName,
  currency = 'MXN',
  stockIssue,
  recommendationInfo,
  onOpenRecommend,
  onClose,
  onAdded,
}: ProductModalProps) {
  const addItem = useCartStore((s) => s.addItem)
  const isOutOfStock = Boolean(stockIssue)

  // Estado local de selecciones
  const [singleSelects, setSingleSelects] = useState<Record<string, string>>({}) // groupId → optionId
  const [addons, setAddons] = useState<Set<string>>(new Set()) // Set de optionId
  const [selectedAdditions, setSelectedAdditions] = useState<Record<string, number>>({}) // additionId → quantity
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

    // Sumar adiciones extras seleccionadas
    if (product.additions) {
      for (const [additionId, qty] of Object.entries(selectedAdditions)) {
        if (qty > 0) {
          const add = product.additions.find((a) => a.id === additionId)
          if (add) price += add.price * qty
        }
      }
    }

    return price
  })()

  function handleAdditionQuantityChange(additionId: string, delta: number) {
    setSelectedAdditions((prev) => {
      const current = prev[additionId] || 0
      const next = Math.max(0, Math.min(10, current + delta))
      if (next === 0) {
        const copy = { ...prev }
        delete copy[additionId]
        return copy
      }
      return { ...prev, [additionId]: next }
    })
  }

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

    // Construir adiciones seleccionadas
    const additionsList = Object.entries(selectedAdditions)
      .filter(([_, qty]) => qty > 0)
      .map(([additionId, qty]) => {
        const add = product.additions?.find((a) => a.id === additionId)
        return {
          additionId,
          name: add?.name || 'Adición',
          price: add?.price || 0,
          quantity: qty,
        }
      })

    addItem({
      productId: product.id,
      name: product.name,
      restaurantId: restaurantId || product.restaurantId,
      restaurantName: restaurantName || product.restaurantName,
      basePrice: product.basePrice,
      quantity,
      selectedModifiers,
      selectedAdditions: additionsList,
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
        className="relative w-full sm:max-w-md max-h-[90dvh] shadow-2xl flex flex-col overflow-hidden border"
        style={{
          backgroundColor: 'var(--brand-surface)',
          borderColor: 'color-mix(in srgb, var(--brand-surface) 60%, var(--brand-text) 15%)',
          borderRadius: 'var(--brand-radius)',
        }}
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
            <div
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(to top, var(--brand-surface) 0%, transparent 100%)',
              }}
              aria-hidden="true"
            />
          </div>
        )}

        {/* Banner de Recomendación si el platillo fue sugerido */}
        {recommendationInfo && (
          <div
            className="mx-5 mt-4 p-3 rounded-2xl border flex items-start gap-3 animate-in fade-in slide-in-from-top-2"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--brand-primary, #f59e0b) 15%, transparent)',
              borderColor: 'color-mix(in srgb, var(--brand-primary, #f59e0b) 35%, transparent)',
              boxShadow: '0 0 20px -4px color-mix(in srgb, var(--brand-primary, #f59e0b) 25%, transparent)',
            }}
          >
            <span className="text-xl shrink-0 animate-bounce">⭐</span>
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm font-bold text-[var(--brand-primary)]">
                {recommendationInfo.fromUserName} recomienda este platillo
              </p>
              {recommendationInfo.note && (
                <p className="text-xs text-zinc-300 mt-0.5 italic">
                  "{recommendationInfo.note}"
                </p>
              )}
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex-shrink-0 px-5 pt-5 pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <h2
                id="product-modal-title"
                className="text-xl font-bold leading-tight"
                style={{
                  color: 'var(--brand-text)',
                  fontFamily: 'var(--brand-font-heading)',
                }}
              >
                {product.name}
              </h2>
              {product.description && (
                <p
                  id="product-modal-desc"
                  className="text-sm mt-1.5 leading-relaxed"
                  style={{ color: 'var(--brand-muted)' }}
                >
                  {product.description}
                </p>
              )}
            </div>
            {/* Acciones de cabecera: Recomendar + Cerrar */}
            <div className="flex items-center gap-2 shrink-0">
              {onOpenRecommend && (
                <button
                  type="button"
                  onClick={onOpenRecommend}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all active:scale-95 shadow-sm hover:brightness-110 cursor-pointer"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--brand-primary, #f59e0b) 15%, transparent)',
                    borderColor: 'color-mix(in srgb, var(--brand-primary, #f59e0b) 35%, transparent)',
                    color: 'var(--brand-primary, #f59e0b)',
                  }}
                  title="Recomendar este platillo a la mesa"
                  aria-label="Recomendar platillo a la mesa"
                >
                  <span className="text-base leading-none">💡</span>
                  <span className="inline">Recomendar</span>
                </button>
              )}
              <button
                ref={closeButtonRef}
                onClick={onClose}
                className="w-10 h-10 rounded-xl border flex items-center justify-center text-lg transition-colors focus-visible:outline-none cursor-pointer"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--brand-surface) 80%, var(--brand-bg) 20%)',
                  borderColor: 'color-mix(in srgb, var(--brand-surface) 60%, var(--brand-text) 15%)',
                  color: 'var(--brand-text)',
                }}
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>
          </div>
        </div>

        {/* Body scrollable */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-6">

          {/* Grupos de modificadores */}
          {product.modifierGroups.map((group) => (
            <fieldset key={group.id} className="border-0 p-0 m-0">
              <legend className="flex items-center gap-2 mb-3 w-full">
                <span
                  className="text-base font-semibold"
                  style={{
                    color: 'var(--brand-text)',
                    fontFamily: 'var(--brand-font-heading)',
                  }}
                >
                  {group.name}
                </span>
                {group.isRequired && (
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded-full border"
                    style={{
                      backgroundColor: 'color-mix(in srgb, var(--brand-primary) 18%, transparent)',
                      color: 'var(--brand-primary)',
                      borderColor: 'color-mix(in srgb, var(--brand-primary) 40%, transparent)',
                    }}
                  >
                    Requerido
                  </span>
                )}
                {group.type === 'ADDON' && group.maxSelect > 1 && (
                  <span className="text-sm" style={{ color: 'var(--brand-muted)' }}>
                    máx. {group.maxSelect}
                  </span>
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
                      className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-150 min-h-[52px] border-2 focus-visible:outline-none cursor-pointer"
                      style={isSelected ? {
                        backgroundColor: 'color-mix(in srgb, var(--brand-primary) 15%, transparent)',
                        borderColor: 'var(--brand-primary)',
                        color: 'var(--brand-text)',
                      } : {
                        backgroundColor: 'color-mix(in srgb, var(--brand-surface) 70%, var(--brand-bg) 30%)',
                        borderColor: 'color-mix(in srgb, var(--brand-surface) 60%, var(--brand-text) 12%)',
                        color: 'var(--brand-text)',
                      }}
                    >
                      <span className="flex items-center gap-3">
                        {/* Indicador visual radio/checkbox */}
                        <span
                          className={`w-5 h-5 flex-shrink-0 rounded-${group.type === 'SINGLE_SELECT' ? 'full' : 'md'}
                                      border-2 transition-colors flex items-center justify-center`}
                          style={isSelected ? {
                            backgroundColor: 'var(--brand-primary)',
                            borderColor: 'var(--brand-primary)',
                          } : {
                            borderColor: 'var(--brand-muted)',
                          }}
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
                        <span
                          className="font-semibold text-sm ml-2 shrink-0"
                          style={{ color: 'var(--brand-accent)' }}
                        >
                          +{formatPrice(option.extraPrice)}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </fieldset>
          ))}

          {/* Adiciones & Extras transversales */}
          {product.additions && product.additions.length > 0 && (
            <fieldset className="border-0 p-0 m-0">
              <legend
                className="text-base font-semibold mb-3 flex items-center justify-between w-full"
                style={{
                  color: 'var(--brand-text)',
                  fontFamily: 'var(--brand-font-heading)',
                }}
              >
                <span>✨ Adiciones & Extras</span>
                <span className="text-xs font-normal" style={{ color: 'var(--brand-muted)' }}>
                  Opcional
                </span>
              </legend>

              <div className="space-y-2">
                {product.additions.map((addition) => {
                  const count = selectedAdditions[addition.id] || 0
                  const isSelected = count > 0

                  return (
                    <div
                      key={addition.id}
                      className="flex items-center justify-between p-3 rounded-2xl border transition-all"
                      style={{
                        backgroundColor: isSelected
                          ? 'color-mix(in srgb, var(--brand-primary) 12%, var(--brand-surface))'
                          : 'color-mix(in srgb, var(--brand-surface) 60%, transparent)',
                        borderColor: isSelected
                          ? 'var(--brand-primary)'
                          : 'color-mix(in srgb, var(--brand-surface) 60%, var(--brand-text) 15%)',
                      }}
                    >
                      <div className="flex-1 min-w-0 pr-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white">
                            {addition.name}
                          </span>
                          {addition.isOutOfStock && (
                            <span className="text-[10px] font-black bg-red-950/80 text-red-400 border border-red-800 px-1.5 py-0.5 rounded">
                              Agotado
                            </span>
                          )}
                        </div>
                        {addition.description && (
                          <p className="text-xs text-zinc-400 mt-0.5 truncate">
                            {addition.description}
                          </p>
                        )}
                        <span
                          className="text-xs font-extrabold mt-1 inline-block"
                          style={{ color: 'var(--brand-primary)' }}
                        >
                          +{formatPrice(addition.price)}
                        </span>
                      </div>

                      {/* Contador o Estado */}
                      {addition.isOutOfStock ? (
                        <span className="text-xs text-zinc-500 font-semibold italic">
                          Agotado
                        </span>
                      ) : (
                        <div className="flex items-center gap-2">
                          {isSelected ? (
                            <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-700/80 rounded-xl p-1 shadow-sm">
                              <button
                                type="button"
                                onClick={() => handleAdditionQuantityChange(addition.id, -1)}
                                className="w-7 h-7 flex items-center justify-center text-sm font-black rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                                aria-label={`Restar ${addition.name}`}
                              >
                                -
                              </button>
                              <span className="font-bold text-sm text-white px-1 min-w-[1.25rem] text-center">
                                {count}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleAdditionQuantityChange(addition.id, 1)}
                                className="w-7 h-7 flex items-center justify-center text-sm font-black rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                                aria-label={`Sumar ${addition.name}`}
                              >
                                +
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleAdditionQuantityChange(addition.id, 1)}
                              className="px-3.5 py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer shadow-sm"
                              style={{
                                backgroundColor: 'color-mix(in srgb, var(--brand-primary) 15%, transparent)',
                                borderColor: 'color-mix(in srgb, var(--brand-primary) 40%, transparent)',
                                color: 'var(--brand-primary)',
                              }}
                            >
                              + Agregar
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </fieldset>
          )}

          {/* Ingredientes removibles */}
          {product.ingredients.filter((ing) => ing.isRemovable).length > 0 && (
            <fieldset className="border-0 p-0 m-0">
              <legend
                className="text-base font-semibold mb-3"
                style={{
                  color: 'var(--brand-text)',
                  fontFamily: 'var(--brand-font-heading)',
                }}
              >
                ¿Qué quieres quitar?
              </legend>
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
                        className="px-4 py-2 rounded-full text-sm font-medium transition-all min-h-[44px] border-2 focus-visible:outline-none cursor-pointer"
                        style={isRemoved ? {
                          backgroundColor: 'rgba(239, 68, 68, 0.2)',
                          borderColor: 'rgba(239, 68, 68, 0.6)',
                          color: '#fca5a5',
                          textDecoration: 'line-through',
                        } : {
                          backgroundColor: 'color-mix(in srgb, var(--brand-surface) 70%, var(--brand-bg) 30%)',
                          borderColor: 'color-mix(in srgb, var(--brand-surface) 60%, var(--brand-text) 15%)',
                          color: 'var(--brand-text)',
                        }}
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
            <label
              htmlFor="product-notes"
              className="block text-base font-semibold mb-2.5"
              style={{
                color: 'var(--brand-text)',
                fontFamily: 'var(--brand-font-heading)',
              }}
            >
              Notas especiales
            </label>
            <textarea
              id="product-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: Poco picante, sin sal..."
              maxLength={250}
              rows={2}
              className="w-full border-2 rounded-xl px-4 py-3 text-base resize-none focus:outline-none transition-colors"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--brand-surface) 70%, var(--brand-bg) 30%)',
                borderColor: 'color-mix(in srgb, var(--brand-surface) 60%, var(--brand-text) 15%)',
                color: 'var(--brand-text)',
              }}
            />
          </div>
        </div>

        {/* Footer fijo */}
        <div
          className="flex-shrink-0 px-5 py-4 border-t space-y-3"
          style={{
            backgroundColor: 'var(--brand-surface)',
            borderColor: 'color-mix(in srgb, var(--brand-surface) 60%, var(--brand-text) 15%)',
          }}
        >
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
              <span className="text-base font-medium" style={{ color: 'var(--brand-muted)' }}>
                Cantidad
              </span>
              <div className="flex items-center gap-3" role="group" aria-label="Selector de cantidad">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  aria-label={`Reducir cantidad, actualmente ${quantity}`}
                  className="w-11 h-11 rounded-full border flex items-center justify-center transition-colors text-2xl font-light focus-visible:outline-none cursor-pointer"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--brand-surface) 70%, var(--brand-bg) 30%)',
                    borderColor: 'color-mix(in srgb, var(--brand-surface) 60%, var(--brand-text) 15%)',
                    color: 'var(--brand-text)',
                  }}
                >
                  −
                </button>
                <span
                  className="font-bold text-xl w-8 text-center"
                  style={{ color: 'var(--brand-text)' }}
                  aria-live="polite"
                  aria-atomic="true"
                >
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity((q) => Math.min(50, q + 1))}
                  aria-label={`Aumentar cantidad, actualmente ${quantity}`}
                  className="w-11 h-11 rounded-full border flex items-center justify-center transition-colors text-2xl font-light focus-visible:outline-none cursor-pointer"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--brand-surface) 70%, var(--brand-bg) 30%)',
                    borderColor: 'color-mix(in srgb, var(--brand-surface) 60%, var(--brand-text) 15%)',
                    color: 'var(--brand-text)',
                  }}
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
            className="w-full py-4 text-base font-bold transition-all duration-200 flex items-center justify-between px-5 min-h-[56px] focus-visible:outline-none shadow-lg active:scale-95 cursor-pointer"
            style={isOutOfStock ? {
              backgroundColor: 'color-mix(in srgb, var(--brand-surface) 60%, transparent)',
              color: 'var(--brand-muted)',
              borderRadius: 'calc(var(--brand-radius) * 0.7)',
              cursor: 'not-allowed',
            } : {
              backgroundColor: 'var(--brand-primary)',
              color: '#ffffff',
              borderRadius: 'calc(var(--brand-radius) * 0.7)',
            }}
          >
            <span>{isOutOfStock ? 'No disponible (Agotado)' : 'Agregar al carrito'}</span>
            <span className="font-extrabold text-lg">{formatPrice(calculatedUnitPrice * quantity)}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
