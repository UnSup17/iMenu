'use client'

import { useState } from 'react'
import { CategoryForm, type CategoryFormData } from './CategoryForm'
import { ProductForm, type ProductFormData } from './ProductForm'
import { BulkImportExportModal } from './BulkImportExportModal'
import { getAllergenById } from '@/lib/constants/allergens'

interface Product {
  id: string
  name: string
  description: string | null
  basePrice: number
  isAvailable: boolean
  imageUrl: string | null
  orderIndex?: number
  allergens?: string | string[] | null
  scheduledPrice?: number | null
  scheduledPriceDays?: string | number[] | null
  scheduledPriceStart?: string | null
  scheduledPriceEnd?: string | null
  scheduledPriceLabel?: string | null
}

interface Category {
  id: string
  name: string
  orderIndex: number
  isActive: boolean
  isSpecialOffer: boolean
  offerLabel: string | null
  offerStartDate: string | null
  offerEndDate: string | null
  offerActiveDays: string | null
  offerStartTime: string | null
  offerEndTime: string | null
  products: Product[]
}

interface Props {
  initialCategories: Category[]
}

type Modal =
  | { type: 'new-category' }
  | { type: 'edit-category'; category: Category }
  | { type: 'new-product'; categoryId: string; categoryName: string }
  | { type: 'edit-product'; product: Product; categoryId: string; categoryName: string }
  | null

function parseDays(raw: string | null): number[] | null {
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function formatDateRange(cat: Category): string {
  const parts: string[] = []
  if (cat.offerStartDate || cat.offerEndDate) {
    const fmt = (d: string | null) =>
      d ? new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }) : '…'
    parts.push(`${fmt(cat.offerStartDate)} – ${fmt(cat.offerEndDate)}`)
  }
  if (cat.offerStartTime || cat.offerEndTime) {
    parts.push(`${cat.offerStartTime ?? '00:00'} – ${cat.offerEndTime ?? '23:59'}`)
  }
  return parts.join(' | ') || 'Sin restricción de tiempo'
}

function parseAllergensList(allergensRaw: string | string[] | null | undefined): string[] {
  if (!allergensRaw) return []
  if (Array.isArray(allergensRaw)) return allergensRaw
  try {
    const parsed = JSON.parse(allergensRaw)
    if (Array.isArray(parsed)) return parsed
  } catch {}
  return allergensRaw.split(',').map((s) => s.trim()).filter(Boolean)
}

export function MenuManager({ initialCategories }: Props) {
  const [categories, setCategories] = useState<Category[]>(initialCategories)
  const [modal, setModal] = useState<Modal>(null)
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(initialCategories[0]?.id ?? null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Drag & drop state para categorías
  const [draggedCatIndex, setDraggedCatIndex] = useState<number | null>(null)
  // Drag & drop state para productos
  const [draggedProduct, setDraggedProduct] = useState<{ catId: string; index: number } | null>(null)

  function showMessage(type: 'success' | 'error', text: string) {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 4000)
  }

  // ── Sincronizar reorden en Backend ──────────────────────────────────────────

  async function persistCategoryReorder(newCats: Category[]) {
    try {
      const payload = {
        categories: newCats.map((cat, idx) => ({ id: cat.id, orderIndex: idx })),
      }
      await fetch('/api/menu/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    } catch (err) {
      console.error('Error al persistir reorden de categorías:', err)
    }
  }

  async function persistProductReorder(catId: string, newProducts: Product[]) {
    try {
      const payload = {
        products: newProducts.map((p, idx) => ({ id: p.id, orderIndex: idx, categoryId: catId })),
      }
      await fetch('/api/menu/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    } catch (err) {
      console.error('Error al persistir reorden de productos:', err)
    }
  }

  // ── Mover Categorías ───────────────────────────────────────────────────────

  function moveCategory(index: number, direction: 'up' | 'down') {
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= categories.length) return

    const newCats = [...categories]
    const temp = newCats[index]
    newCats[index] = newCats[targetIndex]
    newCats[targetIndex] = temp

    setCategories(newCats)
    persistCategoryReorder(newCats)
    showMessage('success', 'Orden de categorías actualizado')
  }

  function handleCategoryDrop(dropIndex: number) {
    if (draggedCatIndex === null || draggedCatIndex === dropIndex) return
    const newCats = [...categories]
    const [removed] = newCats.splice(draggedCatIndex, 1)
    newCats.splice(dropIndex, 0, removed)
    setCategories(newCats)
    setDraggedCatIndex(null)
    persistCategoryReorder(newCats)
    showMessage('success', 'Orden de categorías actualizado')
  }

  // ── Mover Productos ────────────────────────────────────────────────────────

  function moveProduct(catId: string, prodIndex: number, direction: 'up' | 'down') {
    const cat = categories.find((c) => c.id === catId)
    if (!cat) return
    const targetIndex = direction === 'up' ? prodIndex - 1 : prodIndex + 1
    if (targetIndex < 0 || targetIndex >= cat.products.length) return

    const newProducts = [...cat.products]
    const temp = newProducts[prodIndex]
    newProducts[prodIndex] = newProducts[targetIndex]
    newProducts[targetIndex] = temp

    setCategories((prev) =>
      prev.map((c) => (c.id === catId ? { ...c, products: newProducts } : c))
    )
    persistProductReorder(catId, newProducts)
    showMessage('success', 'Orden de productos actualizado')
  }

  function handleProductDrop(catId: string, dropIndex: number) {
    if (!draggedProduct || draggedProduct.catId !== catId || draggedProduct.index === dropIndex) return
    const cat = categories.find((c) => c.id === catId)
    if (!cat) return

    const newProducts = [...cat.products]
    const [removed] = newProducts.splice(draggedProduct.index, 1)
    newProducts.splice(dropIndex, 0, removed)

    setCategories((prev) =>
      prev.map((c) => (c.id === catId ? { ...c, products: newProducts } : c))
    )
    setDraggedProduct(null)
    persistProductReorder(catId, newProducts)
    showMessage('success', 'Orden de productos actualizado')
  }

  // ── Category CRUD ────────────────────────────────────────────────────────────

  async function handleSaveCategory(data: CategoryFormData) {
    const isEdit = !!data.id
    const url = isEdit ? `/api/menu/categories/${data.id}` : '/api/menu/categories'
    const method = isEdit ? 'PUT' : 'POST'

    const body = {
      name: data.name,
      orderIndex: data.orderIndex ?? categories.length,
      isActive: data.isActive,
      isSpecialOffer: data.isSpecialOffer,
      offerLabel: data.offerLabel,
      offerStartDate: data.offerStartDate,
      offerEndDate: data.offerEndDate,
      offerActiveDays: data.offerActiveDays !== null ? JSON.stringify(data.offerActiveDays) : null,
      offerStartTime: data.offerStartTime,
      offerEndTime: data.offerEndTime,
    }

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const json = await res.json()
    if (!res.ok) throw new Error(json.error ?? 'Error al guardar')

    const saved: Category = {
      ...json.category,
      products: isEdit ? categories.find((c) => c.id === data.id)?.products ?? [] : [],
    }

    setCategories((prev) =>
      isEdit ? prev.map((c) => (c.id === saved.id ? saved : c)) : [...prev, saved]
    )
    setModal(null)
    showMessage('success', isEdit ? 'Categoría actualizada' : 'Categoría creada')
  }

  async function handleDeleteCategory(id: string) {
    if (!confirm('¿Eliminar esta categoría y todos sus productos?')) return
    setDeleting(id)
    try {
      const res = await fetch(`/api/menu/categories/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setCategories((prev) => prev.filter((c) => c.id !== id))
      showMessage('success', 'Categoría eliminada')
    } catch {
      showMessage('error', 'Error al eliminar la categoría')
    } finally {
      setDeleting(null)
    }
  }

  // ── Product CRUD ─────────────────────────────────────────────────────────────

  async function handleSaveProduct(data: ProductFormData) {
    const isEdit = !!data.id
    const url = isEdit ? `/api/menu/products/${data.id}` : '/api/menu/products'
    const method = isEdit ? 'PUT' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    const json = await res.json()
    if (!res.ok) throw new Error(json.error ?? 'Error al guardar')

    const saved: Product = json.product

    setCategories((prev) =>
      prev.map((cat) => {
        if (cat.id !== data.categoryId) return cat
        return {
          ...cat,
          products: isEdit
            ? cat.products.map((p) => (p.id === saved.id ? saved : p))
            : [...cat.products, saved],
        }
      })
    )
    setModal(null)
    showMessage('success', isEdit ? 'Producto actualizado' : 'Producto creado')
  }

  async function handleDeleteProduct(productId: string, categoryId: string) {
    if (!confirm('¿Eliminar este producto?')) return
    setDeleting(productId)
    try {
      const res = await fetch(`/api/menu/products/${productId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setCategories((prev) =>
        prev.map((cat) =>
          cat.id !== categoryId
            ? cat
            : { ...cat, products: cat.products.filter((p) => p.id !== productId) }
        )
      )
      showMessage('success', 'Producto eliminado')
    } catch {
      showMessage('error', 'Error al eliminar el producto')
    } finally {
      setDeleting(null)
    }
  }

  // Refrescar al importar CSV
  async function refreshCategories() {
    try {
      const res = await fetch('/api/menu/categories')
      if (res.ok) {
        const json = await res.json()
        if (json.categories) setCategories(json.categories)
      }
    } catch (err) {
      console.error('Error refrescando catálogo:', err)
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  const regular = categories.filter((c) => !c.isSpecialOffer)
  const special = categories.filter((c) => c.isSpecialOffer)

  return (
    <div className="space-y-8">
      {/* Toast Notification */}
      {message && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-2xl text-sm font-medium border transition-all animate-in slide-in-from-bottom-4 ${
            message.type === 'success'
              ? 'bg-emerald-950 border-emerald-800 text-emerald-300'
              : 'bg-red-950 border-red-800 text-red-300'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <span>🍽️</span> Gestor de Menú & Catálogo
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Administra categorías, arrastra para reordenar, configura alérgenos y precios dinámicos
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            id="bulk-import-export-btn"
            onClick={() => setShowBulkModal(true)}
            className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 font-semibold text-sm transition-colors flex items-center gap-2 shadow-sm"
          >
            <span>📂</span> Carga Masiva / CSV
          </button>
          <button
            id="new-category-btn"
            onClick={() => setModal({ type: 'new-category' })}
            className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-sm transition-colors shadow-sm shadow-amber-500/20 flex items-center gap-1.5"
          >
            <span>+</span> Nueva Categoría
          </button>
        </div>
      </div>

      {/* Section: Ofertas Especiales */}
      {special.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-amber-400 uppercase tracking-widest mb-3 flex items-center gap-2">
            <span>✨</span> Ofertas Especiales / Menús Temporales
          </h2>
          <div className="space-y-3">
            {special.map((cat, idx) => (
              <CategoryCard
                key={cat.id}
                index={idx}
                totalCategories={special.length}
                category={cat}
                expanded={expanded === cat.id}
                onToggle={() => setExpanded(expanded === cat.id ? null : cat.id)}
                onEdit={() => setModal({ type: 'edit-category', category: cat })}
                onDelete={() => handleDeleteCategory(cat.id)}
                onAddProduct={() =>
                  setModal({ type: 'new-product', categoryId: cat.id, categoryName: cat.name })
                }
                onEditProduct={(p) =>
                  setModal({
                    type: 'edit-product',
                    product: p,
                    categoryId: cat.id,
                    categoryName: cat.name,
                  })
                }
                onDeleteProduct={(pid) => handleDeleteProduct(pid, cat.id)}
                onMoveCategory={moveCategory}
                onDragStartCategory={() => setDraggedCatIndex(idx)}
                onDragOverCategory={(e) => e.preventDefault()}
                onDropCategory={() => handleCategoryDrop(idx)}
                onMoveProduct={(prodIdx, dir) => moveProduct(cat.id, prodIdx, dir)}
                onDragStartProduct={(prodIdx) =>
                  setDraggedProduct({ catId: cat.id, index: prodIdx })
                }
                onDropProduct={(prodIdx) => handleProductDrop(cat.id, prodIdx)}
                deleting={deleting}
              />
            ))}
          </div>
        </section>
      )}

      {/* Section: Categorías Regulares */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
            <span>📋</span> Categorías del Menú Regular ({regular.length})
          </h2>
          <span className="text-[11px] text-zinc-500">
            💡 Arrastra el icono ⠿ o usa las flechas para reordenar
          </span>
        </div>

        {regular.length === 0 ? (
          <div className="text-center py-16 rounded-xl border border-dashed border-zinc-800 text-zinc-600 bg-zinc-950/30">
            <p className="text-4xl mb-3">🍽️</p>
            <p className="font-medium text-zinc-300">No hay categorías en el menú</p>
            <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
              Crea tu primera categoría manualmente o usa la carga masiva CSV para importar tu
              catálogo en segundos.
            </p>
            <div className="flex justify-center gap-3 mt-4">
              <button
                onClick={() => setModal({ type: 'new-category' })}
                className="px-4 py-2 rounded-lg bg-amber-500 text-zinc-950 text-xs font-bold"
              >
                + Crear Categoría
              </button>
              <button
                onClick={() => setShowBulkModal(true)}
                className="px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300 text-xs font-semibold border border-zinc-700"
              >
                📂 Carga Masiva CSV
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {regular.map((cat, idx) => (
              <CategoryCard
                key={cat.id}
                index={idx}
                totalCategories={regular.length}
                category={cat}
                expanded={expanded === cat.id}
                onToggle={() => setExpanded(expanded === cat.id ? null : cat.id)}
                onEdit={() => setModal({ type: 'edit-category', category: cat })}
                onDelete={() => handleDeleteCategory(cat.id)}
                onAddProduct={() =>
                  setModal({ type: 'new-product', categoryId: cat.id, categoryName: cat.name })
                }
                onEditProduct={(p) =>
                  setModal({
                    type: 'edit-product',
                    product: p,
                    categoryId: cat.id,
                    categoryName: cat.name,
                  })
                }
                onDeleteProduct={(pid) => handleDeleteProduct(pid, cat.id)}
                onMoveCategory={moveCategory}
                onDragStartCategory={() => setDraggedCatIndex(idx)}
                onDragOverCategory={(e) => e.preventDefault()}
                onDropCategory={() => handleCategoryDrop(idx)}
                onMoveProduct={(prodIdx, dir) => moveProduct(cat.id, prodIdx, dir)}
                onDragStartProduct={(prodIdx) =>
                  setDraggedProduct({ catId: cat.id, index: prodIdx })
                }
                onDropProduct={(prodIdx) => handleProductDrop(cat.id, prodIdx)}
                deleting={deleting}
              />
            ))}
          </div>
        )}
      </section>

      {/* Modal de Categoría / Producto */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
              <h2 className="text-base font-bold text-white">
                {modal.type === 'new-category' && '+ Nueva Categoría'}
                {modal.type === 'edit-category' && `✏️ Editar Categoría: ${modal.category.name}`}
                {modal.type === 'new-product' && `+ Nuevo Plato en "${modal.categoryName}"`}
                {modal.type === 'edit-product' && `✏️ Editar Plato: ${modal.product.name}`}
              </h2>
              <button
                onClick={() => setModal(null)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800"
              >
                ✕
              </button>
            </div>
            <div className="p-6">
              {(modal.type === 'new-category' || modal.type === 'edit-category') && (
                <CategoryForm
                  initial={
                    modal.type === 'edit-category'
                      ? {
                          id: modal.category.id,
                          name: modal.category.name,
                          orderIndex: modal.category.orderIndex,
                          isActive: modal.category.isActive,
                          isSpecialOffer: modal.category.isSpecialOffer,
                          offerLabel: modal.category.offerLabel,
                          offerStartDate: modal.category.offerStartDate,
                          offerEndDate: modal.category.offerEndDate,
                          offerActiveDays: parseDays(modal.category.offerActiveDays),
                          offerStartTime: modal.category.offerStartTime,
                          offerEndTime: modal.category.offerEndTime,
                        }
                      : undefined
                  }
                  onSave={handleSaveCategory}
                  onCancel={() => setModal(null)}
                />
              )}
              {(modal.type === 'new-product' || modal.type === 'edit-product') && (
                <ProductForm
                  categoryId={modal.categoryId}
                  categoryName={modal.categoryName}
                  initial={
                    modal.type === 'edit-product'
                      ? { ...modal.product, categoryId: modal.categoryId }
                      : undefined
                  }
                  onSave={handleSaveProduct}
                  onCancel={() => setModal(null)}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Carga Masiva / CSV */}
      {showBulkModal && (
        <BulkImportExportModal
          onClose={() => setShowBulkModal(false)}
          onImportSuccess={refreshCategories}
        />
      )}
    </div>
  )
}

// ── CategoryCard ─────────────────────────────────────────────────────────────

interface CardProps {
  index: number
  totalCategories: number
  category: Category
  expanded: boolean
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
  onAddProduct: () => void
  onEditProduct: (p: Product) => void
  onDeleteProduct: (id: string) => void
  onMoveCategory: (index: number, direction: 'up' | 'down') => void
  onDragStartCategory: () => void
  onDragOverCategory: (e: React.DragEvent) => void
  onDropCategory: () => void
  onMoveProduct: (index: number, direction: 'up' | 'down') => void
  onDragStartProduct: (index: number) => void
  onDropProduct: (index: number) => void
  deleting: string | null
}

function CategoryCard({
  index,
  totalCategories,
  category: cat,
  expanded,
  onToggle,
  onEdit,
  onDelete,
  onAddProduct,
  onEditProduct,
  onDeleteProduct,
  onMoveCategory,
  onDragStartCategory,
  onDragOverCategory,
  onDropCategory,
  onMoveProduct,
  onDragStartProduct,
  onDropProduct,
  deleting,
}: CardProps) {
  const isSpecial = cat.isSpecialOffer
  const borderClass = isSpecial
    ? 'border-amber-500/30 bg-amber-500/5'
    : 'border-zinc-800 bg-zinc-900/60'

  return (
    <div
      draggable
      onDragStart={onDragStartCategory}
      onDragOver={onDragOverCategory}
      onDrop={onDropCategory}
      className={`rounded-xl border ${borderClass} overflow-hidden transition-all shadow-sm group/cat`}
    >
      {/* Header de categoría */}
      <div className="flex items-center gap-3 px-4 py-3 bg-zinc-900/40">
        {/* Drag Handle & Reorder buttons */}
        <div className="flex items-center gap-1 shrink-0 text-zinc-500">
          <span
            title="Arrastra para reordenar categoría"
            className="cursor-grab active:cursor-grabbing text-zinc-500 hover:text-amber-400 p-1 font-mono text-base select-none"
          >
            ⠿
          </span>
          <div className="flex flex-col -space-y-1">
            <button
              type="button"
              disabled={index === 0}
              onClick={() => onMoveCategory(index, 'up')}
              className="text-[10px] hover:text-amber-400 disabled:opacity-20 transition-colors"
              title="Subir categoría"
            >
              ▲
            </button>
            <button
              type="button"
              disabled={index === totalCategories - 1}
              onClick={() => onMoveCategory(index, 'down')}
              className="text-[10px] hover:text-amber-400 disabled:opacity-20 transition-colors"
              title="Bajar categoría"
            >
              ▼
            </button>
          </div>
        </div>

        <button
          id={`toggle-cat-${cat.id}`}
          onClick={onToggle}
          className="flex-1 flex items-center gap-3 text-left"
        >
          <span
            className={`text-xs text-zinc-400 transition-transform ${
              expanded ? 'rotate-90 text-amber-400' : ''
            }`}
          >
            ▶
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-white text-sm">{cat.name}</span>
              {cat.offerLabel && (
                <span className="text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30">
                  {cat.offerLabel}
                </span>
              )}
              {!cat.isActive && (
                <span className="text-xs bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded-full">
                  Inactiva
                </span>
              )}
            </div>
            {isSpecial && (
              <p className="text-[11px] text-amber-500 mt-0.5">
                ⏰ {formatDateRange(cat)}
              </p>
            )}
          </div>
          <span className="text-xs text-zinc-500 ml-2 shrink-0 bg-zinc-800/60 px-2 py-0.5 rounded-full">
            {cat.products.length} platos
          </span>
        </button>

        <div className="flex items-center gap-1 ml-2">
          <button
            id={`edit-cat-${cat.id}`}
            onClick={onEdit}
            title="Editar categoría"
            className="text-xs text-zinc-400 hover:text-amber-400 font-medium p-1.5 rounded hover:bg-zinc-800 transition-colors"
          >
            ✏️
          </button>
          <button
            id={`delete-cat-${cat.id}`}
            onClick={onDelete}
            disabled={deleting === cat.id}
            title="Eliminar categoría"
            className="text-xs text-zinc-500 hover:text-red-400 p-1.5 rounded hover:bg-zinc-800 transition-colors disabled:opacity-50"
          >
            🗑️
          </button>
        </div>
      </div>

      {/* Products list */}
      {expanded && (
        <div className="border-t border-zinc-800/80 px-4 py-3 space-y-2 bg-zinc-950/40">
          {cat.products.length === 0 ? (
            <p className="text-xs text-zinc-500 py-3 text-center">
              No hay productos en esta categoría.{' '}
              <button onClick={onAddProduct} className="text-amber-400 hover:underline font-semibold">
                + Agregar el primero
              </button>
            </p>
          ) : (
            cat.products.map((p, pIdx) => {
              const allergensList = parseAllergensList(p.allergens)

              return (
                <div
                  key={p.id}
                  draggable
                  onDragStart={(e) => {
                    e.stopPropagation()
                    onDragStartProduct(pIdx)
                  }}
                  onDragOver={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                  }}
                  onDrop={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    onDropProduct(pIdx)
                  }}
                  className="flex items-center gap-3 py-2 px-3 rounded-xl bg-zinc-900 border border-zinc-800/80 group hover:border-zinc-700 transition-all shadow-sm"
                >
                  {/* Handle & Arrow reorder */}
                  <div className="flex items-center gap-1 text-zinc-600 group-hover:text-zinc-400">
                    <span
                      title="Arrastra para reordenar producto"
                      className="cursor-grab active:cursor-grabbing font-mono text-xs select-none"
                    >
                      ⠿
                    </span>
                    <div className="flex flex-col -space-y-1">
                      <button
                        type="button"
                        disabled={pIdx === 0}
                        onClick={() => onMoveProduct(pIdx, 'up')}
                        className="text-[9px] hover:text-amber-400 disabled:opacity-20"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        disabled={pIdx === cat.products.length - 1}
                        onClick={() => onMoveProduct(pIdx, 'down')}
                        className="text-[9px] hover:text-amber-400 disabled:opacity-20"
                      >
                        ▼
                      </button>
                    </div>
                  </div>

                  {/* Thumbnail */}
                  {p.imageUrl ? (
                    <img
                      src={p.imageUrl}
                      alt={p.name}
                      className="w-10 h-10 rounded-lg object-cover border border-zinc-800 shrink-0 bg-zinc-950"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center text-sm shrink-0">
                      🍽️
                    </div>
                  )}

                  {/* Detalle Producto */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-white truncate">{p.name}</p>
                      {!p.isAvailable && (
                        <span className="text-[10px] bg-red-950 border border-red-800 text-red-400 px-1.5 py-0.5 rounded font-medium">
                          Agotado
                        </span>
                      )}
                      {p.scheduledPrice && (
                        <span className="text-[10px] bg-amber-500/15 border border-amber-500/30 text-amber-300 px-1.5 py-0.5 rounded font-bold">
                          {p.scheduledPriceLabel || 'Promo'}: ${p.scheduledPrice.toLocaleString('es-CO')}
                        </span>
                      )}
                    </div>
                    {p.description && (
                      <p className="text-xs text-zinc-400 truncate mt-0.5">{p.description}</p>
                    )}

                    {/* Alérgenos badges */}
                    {allergensList.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {allergensList.map((aId) => {
                          const al = getAllergenById(aId)
                          return (
                            <span
                              key={aId}
                              title={al ? al.name : aId}
                              className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.2 rounded bg-zinc-800/80 border border-zinc-700 text-zinc-300"
                            >
                              <span>{al?.icon || '⚠️'}</span>
                              <span className="text-[9px]">{al ? al.name.split('/')[0] : aId}</span>
                            </span>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* Precio */}
                  <div className="text-right shrink-0">
                    <span className="text-sm font-mono font-bold text-emerald-400 block">
                      ${p.basePrice.toLocaleString('es-CO')}
                    </span>
                    {p.scheduledPrice && (
                      <span className="text-[11px] font-mono text-zinc-500 line-through block">
                        ${p.basePrice.toLocaleString('es-CO')}
                      </span>
                    )}
                  </div>

                  {/* Acciones */}
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      id={`edit-prod-${p.id}`}
                      onClick={() => onEditProduct(p)}
                      title="Editar plato"
                      className="text-xs text-zinc-400 hover:text-amber-400 px-2 py-1 rounded hover:bg-zinc-800 transition-colors"
                    >
                      ✏️
                    </button>
                    <button
                      id={`delete-prod-${p.id}`}
                      onClick={() => onDeleteProduct(p.id)}
                      disabled={deleting === p.id}
                      title="Eliminar plato"
                      className="text-xs text-zinc-500 hover:text-red-400 px-2 py-1 rounded hover:bg-zinc-800 transition-colors disabled:opacity-50"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              )
            })
          )}

          <button
            id={`add-product-${cat.id}`}
            onClick={onAddProduct}
            className="w-full mt-2 py-2.5 text-xs font-semibold text-zinc-400 hover:text-amber-400 border border-dashed border-zinc-800 hover:border-amber-500/40 rounded-xl transition-all flex items-center justify-center gap-1.5 bg-zinc-900/30"
          >
            <span>+</span> Agregar plato a {cat.name}
          </button>
        </div>
      )}
    </div>
  )
}
