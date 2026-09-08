'use client'

import { useState } from 'react'
import Link from 'next/link'

interface InventoryItemOption {
  id: string
  name: string
  unit: string
  currentStock: number
}

interface ProductItem {
  id: string
  name: string
  price: number
  recipeItems: Array<{
    id: string
    inventoryItemId: string
    quantity: number
    inventoryItem: {
      name: string
      unit: string
    }
  }>
}

interface RecipeEditorProps {
  products: ProductItem[]
  inventoryItems: InventoryItemOption[]
}

export function RecipeEditor({ products: initialProducts, inventoryItems }: RecipeEditorProps) {
  const [products, setProducts] = useState(initialProducts)
  const [selectedProductId, setSelectedProductId] = useState<string>(
    initialProducts[0]?.id ?? '',
  )
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const selectedProduct = products.find((p) => p.id === selectedProductId)

  // Local draft state for recipe items of selected product
  const [recipeDraft, setRecipeDraft] = useState<
    Array<{ inventoryItemId: string; quantity: number }>
  >(
    selectedProduct
      ? selectedProduct.recipeItems.map((ri) => ({
          inventoryItemId: ri.inventoryItemId,
          quantity: ri.quantity,
        }))
      : [],
  )

  function handleSelectProduct(id: string) {
    setSelectedProductId(id)
    setMessage(null)
    const p = products.find((prod) => prod.id === id)
    if (p) {
      setRecipeDraft(
        p.recipeItems.map((ri) => ({
          inventoryItemId: ri.inventoryItemId,
          quantity: ri.quantity,
        })),
      )
    }
  }

  function handleAddIngredient() {
    if (inventoryItems.length === 0) return
    const unused = inventoryItems.find(
      (item) => !recipeDraft.some((rd) => rd.inventoryItemId === item.id),
    )
    const nextItemId = unused ? unused.id : inventoryItems[0].id
    setRecipeDraft([...recipeDraft, { inventoryItemId: nextItemId, quantity: 1 }])
  }

  function handleRemoveIngredient(index: number) {
    setRecipeDraft(recipeDraft.filter((_, i) => i !== index))
  }

  function handleChangeItem(index: number, inventoryItemId: string) {
    const updated = [...recipeDraft]
    updated[index].inventoryItemId = inventoryItemId
    setRecipeDraft(updated)
  }

  function handleChangeQuantity(index: number, quantity: number) {
    const updated = [...recipeDraft]
    updated[index].quantity = quantity
    setRecipeDraft(updated)
  }

  async function handleSaveRecipe() {
    if (!selectedProductId) return
    setSaving(true)
    setMessage(null)

    try {
      const validItems = recipeDraft.filter((r) => r.quantity > 0)

      const res = await fetch(`/api/inventory/recipes/${selectedProductId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: validItems,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Error al guardar receta')
      }

      // Update local products state
      setProducts((prev) =>
        prev.map((p) => {
          if (p.id !== selectedProductId) return p
          return {
            ...p,
            recipeItems: validItems.map((item) => {
              const inv = inventoryItems.find((i) => i.id === item.inventoryItemId)
              return {
                id: `${p.id}-${item.inventoryItemId}`,
                inventoryItemId: item.inventoryItemId,
                quantity: item.quantity,
                inventoryItem: {
                  name: inv?.name ?? '',
                  unit: inv?.unit ?? '',
                },
              }
            }),
          }
        }),
      )

      setMessage({ type: 'success', text: 'Receta actualizada exitosamente' })
    } catch (err: unknown) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Error al guardar',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      {/* Product list column */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 h-[600px] flex flex-col">
        <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
          Seleccionar Producto ({products.length})
        </h2>
        <div className="flex-1 overflow-y-auto space-y-1 pr-1">
          {products.map((p) => {
            const isSelected = p.id === selectedProductId
            const recipeCount = p.recipeItems.length

            return (
              <button
                key={p.id}
                onClick={() => handleSelectProduct(p.id)}
                className={`w-full text-left p-3 rounded-lg border text-sm transition-colors flex items-center justify-between ${
                  isSelected
                    ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                    : 'border-transparent text-zinc-300 hover:bg-zinc-800'
                }`}
              >
                <div>
                  <p className="font-medium">{p.name}</p>
                  <p className="text-xs text-zinc-500">${p.price.toLocaleString('es-CO')}</p>
                </div>
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-full ${
                    recipeCount > 0
                      ? 'bg-zinc-800 text-zinc-400 font-mono'
                      : 'bg-zinc-800/40 text-zinc-600'
                  }`}
                >
                  {recipeCount} ing.
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Recipe editor column */}
      <div className="md:col-span-2 bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex flex-col justify-between">
        {selectedProduct ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <div>
                <h2 className="text-xl font-bold text-white">{selectedProduct.name}</h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Edita los ingredientes requeridos por cada porción vendida
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddIngredient}
                disabled={inventoryItems.length === 0}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-amber-400 font-medium text-xs rounded-lg transition-colors"
              >
                + Agregar Ingrediente
              </button>
            </div>

            {inventoryItems.length === 0 && (
              <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-3">
                <span className="text-xl">⚠️</span>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-amber-400">No hay insumos creados en el inventario</h3>
                  <p className="text-xs text-zinc-300 mt-1">
                    Para asignar los ingredientes de esta receta, primero debes registrar las materias primas (ej. carne, pan, queso, salsas) en la sección de Existencias.
                  </p>
                  <Link
                    href="/dashboard/inventory/new"
                    className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs rounded-lg transition-colors shadow-sm"
                  >
                    + Registrar Insumos en Existencias
                  </Link>
                </div>
              </div>
            )}

            {message && (
              <div
                className={`p-3 rounded-lg text-xs font-medium ${
                  message.type === 'success'
                    ? 'bg-emerald-950/60 border border-emerald-900 text-emerald-300'
                    : 'bg-red-950/60 border border-red-900 text-red-300'
                }`}
              >
                {message.text}
              </div>
            )}

            {recipeDraft.length === 0 ? (
              <div className="text-center py-12 text-zinc-600">
                <p className="text-3xl mb-2">🥗</p>
                <p className="text-sm text-zinc-400 font-medium">Sin ingredientes asignados</p>
                <p className="text-xs mt-1">Este producto no descuenta stock al ser vendido.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                {recipeDraft.map((draft, index) => {
                  const itemInfo = inventoryItems.find((i) => i.id === draft.inventoryItemId)

                  return (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-3 bg-zinc-950 border border-zinc-800/80 rounded-lg text-sm"
                    >
                      <div className="flex-1">
                        <label className="block text-[10px] text-zinc-500 uppercase mb-1">
                          Ingrediente
                        </label>
                        <select
                          value={draft.inventoryItemId}
                          onChange={(e) => handleChangeItem(index, e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-amber-500"
                        >
                          {inventoryItems.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name} ({item.unit}) — Stock: {item.currentStock.toFixed(2)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="w-32">
                        <label className="block text-[10px] text-zinc-500 uppercase mb-1">
                          Cantidad ({itemInfo?.unit ?? 'unidad'})
                        </label>
                        <input
                          type="number"
                          step="0.001"
                          min="0.001"
                          value={draft.quantity}
                          onChange={(e) => handleChangeQuantity(index, parseFloat(e.target.value) || 0)}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-amber-500"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveIngredient(index)}
                        className="mt-4 p-1 text-zinc-600 hover:text-red-400 transition-colors"
                        title="Eliminar de la receta"
                      >
                        ✕
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-20 text-zinc-600">
            <p>Selecciona un producto de la izquierda para editar su receta</p>
          </div>
        )}

        {selectedProduct && (
          <div className="pt-4 border-t border-zinc-800 flex justify-end">
            <button
              type="button"
              onClick={handleSaveRecipe}
              disabled={saving}
              className="px-6 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-semibold text-sm rounded-lg transition-colors"
            >
              {saving ? 'Guardando...' : '💾 Guardar Receta'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
