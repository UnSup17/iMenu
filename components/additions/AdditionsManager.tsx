'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

export interface SerializedAddition {
  id: string
  name: string
  description: string | null
  price: number
  isAvailable: boolean
  imageUrl: string | null
  inventoryItemId: string | null
  inventoryQuantity: number | null
  recipeProductId: string | null
  inventoryItem?: {
    id: string
    name: string
    unit: string
    currentStock: number
  } | null
  recipeProduct?: {
    id: string
    name: string
  } | null
  categories: Array<{
    categoryId: string
    category: { id: string; name: string }
  }>
  products: Array<{
    productId: string
    product: { id: string; name: string; categoryId: string }
  }>
}

export interface CategoryOption {
  id: string
  name: string
  products: Array<{ id: string; name: string }>
}

export interface InventoryItemOption {
  id: string
  name: string
  unit: string
  currentStock: number
  costPerUnit: number
}

export interface RecipeProductOption {
  id: string
  name: string
  categoryName?: string
}

interface AdditionsManagerProps {
  initialAdditions: SerializedAddition[]
  categories: CategoryOption[]
  inventoryItems: InventoryItemOption[]
  recipeProducts: RecipeProductOption[]
  currency?: string
}

export function AdditionsManager({
  initialAdditions,
  categories,
  inventoryItems,
  recipeProducts,
  currency = 'COP',
}: AdditionsManagerProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [additions, setAdditions] = useState<SerializedAddition[]>(initialAdditions)
  const [searchTerm, setSearchTerm] = useState('')
  const [originFilter, setOriginFilter] = useState<'ALL' | 'INGREDIENT' | 'RECIPE' | 'MANUAL'>('ALL')
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL')

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingAddition, setEditingAddition] = useState<SerializedAddition | null>(null)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Form State
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState<number | ''>('')
  const [isAvailable, setIsAvailable] = useState(true)
  const [originType, setOriginType] = useState<'INGREDIENT' | 'RECIPE' | 'MANUAL'>('INGREDIENT')
  const [selectedInventoryItemId, setSelectedInventoryItemId] = useState<string>('')
  const [inventoryQuantity, setInventoryQuantity] = useState<number | ''>('')
  const [selectedRecipeProductId, setSelectedRecipeProductId] = useState<string>('')
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([])
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([])

  // Search filter for product assignment inside modal
  const [productAssignmentSearch, setProductAssignmentSearch] = useState('')

  // Pre-load from query parameters if arriving from Inventory or Recipe modules
  useEffect(() => {
    const fromIng = searchParams.get('createFromIngredient')
    const fromRec = searchParams.get('createFromRecipe')

    if (fromIng) {
      const ing = inventoryItems.find((i) => i.id === fromIng)
      if (ing) {
        openCreateModal({
          name: `Extra ${ing.name}`,
          originType: 'INGREDIENT',
          inventoryItemId: ing.id,
          inventoryQuantity: 1,
        })
      }
    } else if (fromRec) {
      const rec = recipeProducts.find((r) => r.id === fromRec)
      if (rec) {
        openCreateModal({
          name: `Porción de ${rec.name}`,
          originType: 'RECIPE',
          recipeProductId: rec.id,
        })
      }
    }
  }, [searchParams, inventoryItems, recipeProducts])

  const formatPrice = (amount: number) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount)

  function openCreateModal(defaults?: {
    name?: string
    originType?: 'INGREDIENT' | 'RECIPE' | 'MANUAL'
    inventoryItemId?: string
    inventoryQuantity?: number
    recipeProductId?: string
  }) {
    setEditingAddition(null)
    setName(defaults?.name || '')
    setDescription('')
    setPrice('')
    setIsAvailable(true)
    setOriginType(defaults?.originType || (inventoryItems.length > 0 ? 'INGREDIENT' : 'MANUAL'))
    setSelectedInventoryItemId(defaults?.inventoryItemId || inventoryItems[0]?.id || '')
    setInventoryQuantity(defaults?.inventoryQuantity || 1)
    setSelectedRecipeProductId(defaults?.recipeProductId || recipeProducts[0]?.id || '')
    setSelectedCategoryIds([])
    setSelectedProductIds([])
    setError(null)
    setIsModalOpen(true)
  }

  function openEditModal(addition: SerializedAddition) {
    setEditingAddition(addition)
    setName(addition.name)
    setDescription(addition.description || '')
    setPrice(addition.price)
    setIsAvailable(addition.isAvailable)

    if (addition.inventoryItemId) {
      setOriginType('INGREDIENT')
      setSelectedInventoryItemId(addition.inventoryItemId)
      setInventoryQuantity(addition.inventoryQuantity ?? 1)
    } else if (addition.recipeProductId) {
      setOriginType('RECIPE')
      setSelectedRecipeProductId(addition.recipeProductId)
      setInventoryQuantity('')
    } else {
      setOriginType('MANUAL')
      setSelectedInventoryItemId('')
      setInventoryQuantity('')
    }

    setSelectedCategoryIds(addition.categories.map((c) => c.categoryId))
    setSelectedProductIds(addition.products.map((p) => p.productId))
    setError(null)
    setIsModalOpen(true)
  }

  function toggleCategory(categoryId: string) {
    setSelectedCategoryIds((prev) =>
      prev.includes(categoryId) ? prev.filter((id) => id !== categoryId) : [...prev, categoryId],
    )
  }

  function toggleProduct(productId: string) {
    setSelectedProductIds((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId],
    )
  }

  async function handleSaveAddition() {
    if (!name.trim()) {
      setError('Debes ingresar un nombre para la adición')
      return
    }
    if (price === '' || isNaN(Number(price)) || Number(price) < 0) {
      setError('Ingresa un precio válido (mayor o igual a 0)')
      return
    }

    if (originType === 'INGREDIENT') {
      if (!selectedInventoryItemId) {
        setError('Selecciona el ingrediente de inventario a descontar')
        return
      }
      if (!inventoryQuantity || Number(inventoryQuantity) <= 0) {
        setError('Ingresa una cantidad a descontar por porción válida')
        return
      }
    }

    if (originType === 'RECIPE' && !selectedRecipeProductId) {
      setError('Selecciona la receta a descontar')
      return
    }

    if (selectedCategoryIds.length === 0 && selectedProductIds.length === 0) {
      setError('Asocia la adición al menos a una categoría o a un plato específico')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        price: Number(price),
        isAvailable,
        inventoryItemId: originType === 'INGREDIENT' ? selectedInventoryItemId : null,
        inventoryQuantity: originType === 'INGREDIENT' ? Number(inventoryQuantity) : null,
        recipeProductId: originType === 'RECIPE' ? selectedRecipeProductId : null,
        categoryIds: selectedCategoryIds,
        productIds: selectedProductIds,
      }

      if (editingAddition) {
        const res = await fetch(`/api/additions/${editingAddition.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Error al actualizar adición')

        setAdditions((prev) =>
          prev.map((a) => (a.id === editingAddition.id ? serializeAddition(data.addition) : a)),
        )
      } else {
        const res = await fetch('/api/additions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Error al crear adición')

        setAdditions((prev) => [serializeAddition(data.addition), ...prev])
      }

      setIsModalOpen(false)
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleAvailability(addition: SerializedAddition) {
    const nextStatus = !addition.isAvailable
    setAdditions((prev) =>
      prev.map((a) => (a.id === addition.id ? { ...a, isAvailable: nextStatus } : a)),
    )

    try {
      const res = await fetch(`/api/additions/${addition.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAvailable: nextStatus }),
      })
      if (!res.ok) {
        // Rollback
        setAdditions((prev) =>
          prev.map((a) => (a.id === addition.id ? { ...a, isAvailable: addition.isAvailable } : a)),
        )
      }
    } catch {
      setAdditions((prev) =>
        prev.map((a) => (a.id === addition.id ? { ...a, isAvailable: addition.isAvailable } : a)),
      )
    }
  }

  async function handleDeleteAddition(id: string) {
    if (!confirm('¿Estás seguro de eliminar esta adición?')) return

    setDeletingId(id)
    try {
      const res = await fetch(`/api/additions/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        alert(data.error || 'Error al eliminar')
        return
      }
      setAdditions((prev) => prev.filter((a) => a.id !== id))
    } catch (e: any) {
      alert(e.message)
    } finally {
      setDeletingId(null)
    }
  }

  // Filtered Additions
  const filteredAdditions = useMemo(() => {
    return additions.filter((a) => {
      // Search
      if (searchTerm) {
        const s = searchTerm.toLowerCase()
        const matchesName = a.name.toLowerCase().includes(s)
        const matchesIng = a.inventoryItem?.name.toLowerCase().includes(s)
        const matchesRec = a.recipeProduct?.name.toLowerCase().includes(s)
        if (!matchesName && !matchesIng && !matchesRec) return false
      }

      // Origin
      if (originFilter === 'INGREDIENT' && !a.inventoryItemId) return false
      if (originFilter === 'RECIPE' && !a.recipeProductId) return false
      if (originFilter === 'MANUAL' && (a.inventoryItemId || a.recipeProductId)) return false

      // Category
      if (categoryFilter !== 'ALL') {
        const hasCategory = a.categories.some((c) => c.categoryId === categoryFilter)
        const hasProductInCategory = a.products.some((p) => {
          const cat = categories.find((c) => c.id === categoryFilter)
          return cat?.products.some((prod) => prod.id === p.productId)
        })
        if (!hasCategory && !hasProductInCategory) return false
      }

      return true
    })
  }, [additions, searchTerm, originFilter, categoryFilter, categories])

  // Helper serializer
  function serializeAddition(raw: any): SerializedAddition {
    return {
      ...raw,
      price: typeof raw.price === 'number' ? raw.price : Number(raw.price),
      inventoryQuantity:
        raw.inventoryQuantity !== null && raw.inventoryQuantity !== undefined
          ? Number(raw.inventoryQuantity)
          : null,
      inventoryItem: raw.inventoryItem
        ? {
            ...raw.inventoryItem,
            currentStock: Number(raw.inventoryItem.currentStock),
          }
        : null,
    }
  }

  // Selected inventory item details for modal
  const activeInventoryItem = inventoryItems.find((i) => i.id === selectedInventoryItemId)

  return (
    <div className="space-y-8">
      {/* Header & Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6 border-zinc-800">
        <div>
          <h1
            className="text-2xl sm:text-3xl font-black tracking-tight"
            style={{ fontFamily: 'var(--brand-font-heading, inherit)' }}
          >
            ➕ Adiciones & Extras
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Configura ingredientes y recetas que los comensales pueden sumar a sus platos con descuento automático de inventario.
          </p>
        </div>

        <button
          type="button"
          onClick={() => openCreateModal()}
          className="px-4 py-2.5 rounded-xl font-bold text-sm shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
          style={{
            backgroundColor: 'var(--brand-primary, #f59e0b)',
            color: '#000000',
            borderRadius: 'var(--brand-radius, 0.75rem)',
          }}
        >
          <span>+</span>
          <span>Nueva Adición</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4">
          <p className="text-xs uppercase tracking-wider text-zinc-500 font-bold">Total Adiciones</p>
          <p className="text-2xl font-black mt-1 text-white">{additions.length}</p>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4">
          <p className="text-xs uppercase tracking-wider text-zinc-500 font-bold">Con Ingrediente</p>
          <p className="text-2xl font-black mt-1 text-amber-400">
            {additions.filter((a) => a.inventoryItemId).length}
          </p>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4">
          <p className="text-xs uppercase tracking-wider text-zinc-500 font-bold">Con Receta</p>
          <p className="text-2xl font-black mt-1 text-blue-400">
            {additions.filter((a) => a.recipeProductId).length}
          </p>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4">
          <p className="text-xs uppercase tracking-wider text-zinc-500 font-bold">Disponibles</p>
          <p className="text-2xl font-black mt-1 text-emerald-400">
            {additions.filter((a) => a.isAvailable).length}
          </p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500">🔍</span>
          <input
            type="text"
            placeholder="Buscar por nombre, ingrediente o receta..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Origin filter */}
          <div className="flex bg-zinc-900 border border-zinc-800 rounded-xl p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setOriginFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                originFilter === 'ALL' ? 'bg-zinc-800 text-white font-bold' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Todos los orígenes
            </button>
            <button
              type="button"
              onClick={() => setOriginFilter('INGREDIENT')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                originFilter === 'INGREDIENT' ? 'bg-amber-500/20 text-amber-300 font-bold' : 'text-zinc-400 hover:text-white'
              }`}
            >
              📦 Ingredientes
            </button>
            <button
              type="button"
              onClick={() => setOriginFilter('RECIPE')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                originFilter === 'RECIPE' ? 'bg-blue-500/20 text-blue-300 font-bold' : 'text-zinc-400 hover:text-white'
              }`}
            >
              🍳 Recetas
            </button>
          </div>

          {/* Category filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-semibold text-zinc-300 focus:outline-none focus:border-amber-500"
          >
            <option value="ALL">Todas las categorías</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Additions Grid / List */}
      {filteredAdditions.length === 0 ? (
        <div className="text-center py-20 bg-zinc-900/30 border border-zinc-800/60 rounded-2xl">
          <span className="text-5xl mb-4 block">➕</span>
          <p className="text-lg font-bold text-white">No se encontraron adiciones</p>
          <p className="text-sm text-zinc-400 mt-1 max-w-md mx-auto">
            {searchTerm || originFilter !== 'ALL' || categoryFilter !== 'ALL'
              ? 'No hay adiciones que coincidan con los filtros seleccionados.'
              : 'Empieza creando tu primera adición (ej. Tocineta, Queso extra, Carne troceada).'}
          </p>
          <button
            type="button"
            onClick={() => openCreateModal()}
            className="mt-6 px-5 py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm rounded-xl transition-all cursor-pointer"
          >
            + Crear Primera Adición
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAdditions.map((addition) => {
            const hasStockIssue =
              addition.inventoryItem && addition.inventoryItem.currentStock <= 0

            return (
              <div
                key={addition.id}
                className={`bg-zinc-900/70 border rounded-2xl p-5 flex flex-col justify-between transition-all hover:border-zinc-700 ${
                  !addition.isAvailable ? 'opacity-60 border-zinc-800/40' : 'border-zinc-800'
                }`}
              >
                <div>
                  {/* Top row: Name, price, switch */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3
                          className="font-bold text-base text-white truncate"
                          style={{ fontFamily: 'var(--brand-font-heading, inherit)' }}
                        >
                          {addition.name}
                        </h3>
                        {hasStockIssue && (
                          <span className="bg-red-950/80 text-red-400 border border-red-800/80 px-2 py-0.5 rounded text-[10px] font-black">
                            ⚠️ Sin stock
                          </span>
                        )}
                      </div>
                      {addition.description && (
                        <p className="text-xs text-zinc-400 mt-1 line-clamp-2">
                          {addition.description}
                        </p>
                      )}
                    </div>

                    {/* Price Tag */}
                    <div className="text-right shrink-0">
                      <span className="text-base font-extrabold text-amber-400">
                        {formatPrice(addition.price)}
                      </span>
                    </div>
                  </div>

                  {/* Origin Badge */}
                  <div className="mt-3.5 pt-3 border-t border-zinc-800/80 space-y-2 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="text-zinc-500 font-bold uppercase tracking-wider text-[10px]">
                        Origen:
                      </span>
                      {addition.inventoryItem ? (
                        <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-md font-medium">
                          📦 {addition.inventoryItem.name} ({addition.inventoryQuantity} {addition.inventoryItem.unit})
                        </span>
                      ) : addition.recipeProduct ? (
                        <span className="inline-flex items-center gap-1 bg-blue-500/10 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-md font-medium">
                          🍳 Receta: {addition.recipeProduct.name}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-md font-medium">
                          🏷️ Manual / Sin inventario
                        </span>
                      )}
                    </div>

                    {/* Scope Badges */}
                    <div className="flex items-start gap-1.5 flex-wrap">
                      <span className="text-zinc-500 font-bold uppercase tracking-wider text-[10px] mt-0.5">
                        Disponible en:
                      </span>
                      {addition.categories.map((c) => (
                        <span
                          key={c.categoryId}
                          className="bg-zinc-800 text-zinc-300 border border-zinc-700/60 px-2 py-0.5 rounded text-[11px] font-semibold"
                        >
                          🏷️ {c.category.name}
                        </span>
                      ))}
                      {addition.products.map((p) => (
                        <span
                          key={p.productId}
                          className="bg-emerald-950/40 text-emerald-300 border border-emerald-800/60 px-2 py-0.5 rounded text-[11px] font-semibold"
                        >
                          🍽️ {p.product.name}
                        </span>
                      ))}
                      {addition.categories.length === 0 && addition.products.length === 0 && (
                        <span className="text-amber-500 font-medium text-[11px]">
                          ⚠️ No asignada a categorías ni platos
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="mt-5 pt-3 border-t border-zinc-800/80 flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-zinc-400 select-none">
                    <input
                      type="checkbox"
                      checked={addition.isAvailable}
                      onChange={() => handleToggleAvailability(addition)}
                      className="rounded bg-zinc-800 border-zinc-700 text-amber-500 focus:ring-0 w-4 h-4 cursor-pointer"
                    />
                    <span>{addition.isAvailable ? 'Activa' : 'Pausada'}</span>
                  </label>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openEditModal(addition)}
                      className="px-2.5 py-1 text-xs font-bold text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors cursor-pointer"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      disabled={deletingId === addition.id}
                      onClick={() => handleDeleteAddition(addition.id)}
                      className="px-2.5 py-1 text-xs font-bold text-red-400 hover:text-red-300 bg-red-950/30 hover:bg-red-950/60 border border-red-900/40 rounded-lg transition-colors cursor-pointer"
                    >
                      {deletingId === addition.id ? '...' : 'Eliminar'}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ============================================================ */}
      {/* Create / Edit Modal */}
      {/* ============================================================ */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto"
        >
          <div
            className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl my-8 flex flex-col max-h-[90vh]"
            style={{
              backgroundColor: 'var(--brand-surface, #18181b)',
              borderColor: 'color-mix(in srgb, var(--brand-surface) 70%, var(--brand-text) 15%)',
            }}
          >
            {/* Modal Header */}
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between shrink-0">
              <div>
                <h2
                  className="text-xl font-black text-white"
                  style={{ fontFamily: 'var(--brand-font-heading, inherit)' }}
                >
                  {editingAddition ? '✏️ Editar Adición' : '➕ Nueva Adición'}
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Define el precio, de dónde se descuenta el stock y a qué platos aplica.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              {error && (
                <div className="bg-red-950/60 border border-red-800 text-red-300 text-xs p-3 rounded-xl font-medium">
                  {error}
                </div>
              )}

              {/* Nombre y Precio */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                    Nombre comercial *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej. Tocineta Crujiente, Carne Troceada, Extra Queso"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                    Precio extra ({currency}) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={price}
                    onChange={(e) => setPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="Ej. 4000"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                  Descripción (Opcional)
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ej. 100g de tocineta ahumada dorada en parrilla"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Selector de Origen de Inventario */}
              <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4 space-y-4">
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300">
                  📦 Origen y Descuento de Inventario
                </label>

                <div className="grid grid-cols-3 gap-2 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setOriginType('INGREDIENT')}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col items-center gap-1 ${
                      originType === 'INGREDIENT'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <span>📦 Ingrediente</span>
                    <span className="text-[10px] font-normal opacity-80">Materia prima</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setOriginType('RECIPE')}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col items-center gap-1 ${
                      originType === 'RECIPE'
                        ? 'bg-blue-500/20 border-blue-500 text-blue-300'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <span>🍳 Receta</span>
                    <span className="text-[10px] font-normal opacity-80">Preparación / plato</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setOriginType('MANUAL')}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col items-center gap-1 ${
                      originType === 'MANUAL'
                        ? 'bg-zinc-700 border-zinc-500 text-white'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <span>🏷️ Manual</span>
                    <span className="text-[10px] font-normal opacity-80">Sin inventario</span>
                  </button>
                </div>

                {/* Sub-configuración según origen */}
                {originType === 'INGREDIENT' && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-zinc-800">
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                        Ingrediente de inventario
                      </label>
                      <select
                        value={selectedInventoryItemId}
                        onChange={(e) => setSelectedInventoryItemId(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                      >
                        {inventoryItems.map((ing) => (
                          <option key={ing.id} value={ing.id}>
                            {ing.name} ({ing.unit}) — Stock: {ing.currentStock.toFixed(2)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                        Cantidad por porción ({activeInventoryItem?.unit || 'unid'})
                      </label>
                      <input
                        type="number"
                        step="0.001"
                        min="0.001"
                        value={inventoryQuantity}
                        onChange={(e) =>
                          setInventoryQuantity(
                            e.target.value === '' ? '' : Number(e.target.value),
                          )
                        }
                        placeholder="Ej. 0.050"
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                )}

                {originType === 'RECIPE' && (
                  <div className="pt-2 border-t border-zinc-800">
                    <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                      Receta registrada
                    </label>
                    <select
                      value={selectedRecipeProductId}
                      onChange={(e) => setSelectedRecipeProductId(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    >
                      {recipeProducts.map((rec) => (
                        <option key={rec.id} value={rec.id}>
                          {rec.name}
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-zinc-500 mt-1">
                      Al vender esta adición, se descontarán automáticamente los ingredientes de la receta de este plato.
                    </p>
                  </div>
                )}
              </div>

              {/* Selector de Alcance (Categorías y Productos) */}
              <div className="space-y-4">
                <div className="border-b border-zinc-800 pb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                    🎯 Alcance de la Adición
                  </h4>
                  <p className="text-[11px] text-zinc-500">
                    Puedes asociarla a categorías enteras y/o a productos específicos individuales.
                  </p>
                </div>

                {/* 1. Categorías */}
                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-2">
                    Aplica a categorías completas:
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((cat) => {
                      const isChecked = selectedCategoryIds.includes(cat.id)
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => toggleCategory(cat.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                            isChecked
                              ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-sm'
                              : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                          }`}
                        >
                          <span>{isChecked ? '✓' : '+'}</span>
                          <span>{cat.name}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* 2. Productos específicos */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between gap-2">
                    <label className="block text-xs font-bold text-zinc-400">
                      O disponible solo para platos específicos:
                    </label>
                    <input
                      type="text"
                      placeholder="Filtrar platos..."
                      value={productAssignmentSearch}
                      onChange={(e) => setProductAssignmentSearch(e.target.value)}
                      className="bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1 text-xs text-white placeholder-zinc-500 w-48"
                    />
                  </div>

                  <div className="max-h-48 overflow-y-auto bg-zinc-900/50 border border-zinc-800 rounded-xl p-3 divide-y divide-zinc-800/60">
                    {categories.map((cat) => {
                      const matchingProducts = cat.products.filter((p) =>
                        p.name.toLowerCase().includes(productAssignmentSearch.toLowerCase()),
                      )
                      if (matchingProducts.length === 0) return null

                      return (
                        <div key={cat.id} className="py-2 first:pt-0 last:pb-0">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
                            {cat.name}
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            {matchingProducts.map((p) => {
                              const isSelected = selectedProductIds.includes(p.id)
                              const isCoveredByCategory = selectedCategoryIds.includes(cat.id)

                              return (
                                <label
                                  key={p.id}
                                  className={`flex items-center gap-2 p-1.5 rounded-lg text-xs cursor-pointer select-none transition-colors ${
                                    isCoveredByCategory
                                      ? 'bg-zinc-800/40 opacity-70'
                                      : isSelected
                                      ? 'bg-amber-500/10 text-amber-300 font-semibold'
                                      : 'hover:bg-zinc-800/50 text-zinc-300'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    disabled={isCoveredByCategory}
                                    checked={isSelected || isCoveredByCategory}
                                    onChange={() => toggleProduct(p.id)}
                                    className="rounded bg-zinc-800 border-zinc-700 text-amber-500 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                                  />
                                  <span className="truncate">{p.name}</span>
                                  {isCoveredByCategory && (
                                    <span className="text-[9px] text-zinc-500">(por cat.)</span>
                                  )}
                                </label>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-zinc-800 bg-zinc-900/40 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-zinc-400 hover:text-white cursor-pointer transition-colors"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={handleSaveAddition}
                className="px-6 py-2.5 rounded-xl font-bold text-sm bg-amber-500 hover:bg-amber-400 text-black shadow-lg transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {saving ? 'Guardando...' : editingAddition ? 'Guardar Cambios' : 'Crear Adición'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
