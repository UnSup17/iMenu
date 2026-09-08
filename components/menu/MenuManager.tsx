'use client'

import { useState } from 'react'
import { CategoryForm, type CategoryFormData } from './CategoryForm'
import { ProductForm, type ProductFormData } from './ProductForm'

interface Product {
  id: string
  name: string
  description: string | null
  basePrice: number
  isAvailable: boolean
  imageUrl: string | null
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
  | { type: 'new-product'; categoryId: string }
  | { type: 'edit-product'; product: Product; categoryId: string }
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

export function MenuManager({ initialCategories }: Props) {
  const [categories, setCategories] = useState<Category[]>(initialCategories)
  const [modal, setModal] = useState<Modal>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // ── Helpers ─────────────────────────────────────────────────────────────────

  function showMessage(type: 'success' | 'error', text: string) {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 4000)
  }

  // ── Category CRUD ────────────────────────────────────────────────────────────

  async function handleSaveCategory(data: CategoryFormData) {
    const isEdit = !!data.id
    const url = isEdit ? `/api/menu/categories/${data.id}` : '/api/menu/categories'
    const method = isEdit ? 'PUT' : 'POST'

    const body = {
      name: data.name,
      orderIndex: data.orderIndex,
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

    const saved: Category = { ...json.category, products: isEdit ? (categories.find((c) => c.id === data.id)?.products ?? []) : [] }

    setCategories((prev) =>
      isEdit ? prev.map((c) => (c.id === saved.id ? saved : c)) : [...prev, saved],
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
      }),
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
          cat.id !== categoryId ? cat : { ...cat, products: cat.products.filter((p) => p.id !== productId) },
        ),
      )
      showMessage('success', 'Producto eliminado')
    } catch {
      showMessage('error', 'Error al eliminar el producto')
    } finally {
      setDeleting(null)
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  const regular = categories.filter((c) => !c.isSpecialOffer)
  const special = categories.filter((c) => c.isSpecialOffer)

  return (
    <div className="space-y-8">
      {/* Toast */}
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

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">🍽️ Gestor de Menú</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Administra categorías, productos y ofertas especiales temporales
          </p>
        </div>
        <button
          id="new-category-btn"
          onClick={() => setModal({ type: 'new-category' })}
          className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-sm transition-colors shadow-sm shadow-amber-500/20"
        >
          + Nueva Categoría
        </button>
      </div>

      {/* Section: Ofertas Especiales */}
      {special.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-amber-400 uppercase tracking-widest mb-3 flex items-center gap-2">
            <span>✨</span> Ofertas Especiales / Menús Temporales
          </h2>
          <div className="space-y-3">
            {special.map((cat) => (
              <CategoryCard
                key={cat.id}
                category={cat}
                expanded={expanded === cat.id}
                onToggle={() => setExpanded(expanded === cat.id ? null : cat.id)}
                onEdit={() => setModal({ type: 'edit-category', category: cat })}
                onDelete={() => handleDeleteCategory(cat.id)}
                onAddProduct={() => setModal({ type: 'new-product', categoryId: cat.id })}
                onEditProduct={(p) => setModal({ type: 'edit-product', product: p, categoryId: cat.id })}
                onDeleteProduct={(pid) => handleDeleteProduct(pid, cat.id)}
                deleting={deleting}
              />
            ))}
          </div>
        </section>
      )}

      {/* Section: Categorías Regulares */}
      <section>
        <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3">
          Categorías del Menú Regular
        </h2>
        {regular.length === 0 ? (
          <div className="text-center py-16 rounded-xl border border-dashed border-zinc-800 text-zinc-600">
            <p className="text-4xl mb-3">🍽️</p>
            <p className="font-medium text-zinc-400">No hay categorías aún</p>
            <p className="text-sm mt-1">Crea tu primera categoría para comenzar a armar el menú</p>
          </div>
        ) : (
          <div className="space-y-3">
            {regular.map((cat) => (
              <CategoryCard
                key={cat.id}
                category={cat}
                expanded={expanded === cat.id}
                onToggle={() => setExpanded(expanded === cat.id ? null : cat.id)}
                onEdit={() => setModal({ type: 'edit-category', category: cat })}
                onDelete={() => handleDeleteCategory(cat.id)}
                onAddProduct={() => setModal({ type: 'new-product', categoryId: cat.id })}
                onEditProduct={(p) => setModal({ type: 'edit-product', product: p, categoryId: cat.id })}
                onDeleteProduct={(pid) => handleDeleteProduct(pid, cat.id)}
                deleting={deleting}
              />
            ))}
          </div>
        )}
      </section>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-zinc-800">
              <h2 className="text-lg font-bold text-white">
                {modal.type === 'new-category' && '+ Nueva Categoría'}
                {modal.type === 'edit-category' && `✏️ Editar: ${modal.category.name}`}
                {modal.type === 'new-product' && '+ Nuevo Producto'}
                {modal.type === 'edit-product' && `✏️ Editar: ${modal.product.name}`}
              </h2>
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
                  categoryId={modal.type === 'new-product' ? modal.categoryId : modal.categoryId}
                  initial={modal.type === 'edit-product' ? { ...modal.product, categoryId: modal.categoryId } : undefined}
                  onSave={handleSaveProduct}
                  onCancel={() => setModal(null)}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── CategoryCard ─────────────────────────────────────────────────────────────

interface CardProps {
  category: Category
  expanded: boolean
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
  onAddProduct: () => void
  onEditProduct: (p: Product) => void
  onDeleteProduct: (id: string) => void
  deleting: string | null
}

function CategoryCard({
  category: cat,
  expanded,
  onToggle,
  onEdit,
  onDelete,
  onAddProduct,
  onEditProduct,
  onDeleteProduct,
  deleting,
}: CardProps) {
  const isSpecial = cat.isSpecialOffer
  const borderClass = isSpecial
    ? 'border-amber-500/30 bg-amber-500/5'
    : 'border-zinc-800 bg-zinc-900/60'

  return (
    <div className={`rounded-xl border ${borderClass} overflow-hidden`}>
      {/* Header de categoría */}
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          id={`toggle-cat-${cat.id}`}
          onClick={onToggle}
          className="flex-1 flex items-center gap-3 text-left"
        >
          <span className={`text-xs transition-transform ${expanded ? 'rotate-90' : ''}`}>▶</span>
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
              <p className="text-[11px] text-amber-600 mt-0.5">
                ⏰ {formatDateRange(cat)}
              </p>
            )}
          </div>
          <span className="text-xs text-zinc-600 ml-2 shrink-0">
            {cat.products.length} productos
          </span>
        </button>

        <div className="flex items-center gap-2 ml-2">
          <button
            id={`edit-cat-${cat.id}`}
            onClick={onEdit}
            className="text-xs text-zinc-400 hover:text-amber-400 font-medium px-2 py-1 rounded hover:bg-zinc-800 transition-colors"
          >
            ✏️
          </button>
          <button
            id={`delete-cat-${cat.id}`}
            onClick={onDelete}
            disabled={deleting === cat.id}
            className="text-xs text-zinc-600 hover:text-red-400 px-2 py-1 rounded hover:bg-zinc-800 transition-colors disabled:opacity-50"
          >
            🗑️
          </button>
        </div>
      </div>

      {/* Products list */}
      {expanded && (
        <div className="border-t border-zinc-800/60 px-4 py-3 space-y-2">
          {cat.products.length === 0 ? (
            <p className="text-xs text-zinc-600 py-2 text-center">
              Sin productos aún.{' '}
              <button onClick={onAddProduct} className="text-amber-500 hover:underline">
                Agregar el primero
              </button>
            </p>
          ) : (
            cat.products.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-3 py-2 px-3 rounded-lg bg-zinc-950 border border-zinc-800/60 group"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{p.name}</p>
                  {p.description && (
                    <p className="text-xs text-zinc-500 truncate">{p.description}</p>
                  )}
                </div>
                <span className="text-sm font-mono text-emerald-400 shrink-0">
                  ${p.basePrice.toLocaleString('es-CO')}
                </span>
                {!p.isAvailable && (
                  <span className="text-[10px] bg-zinc-800 text-zinc-500 px-1.5 py-0.5 rounded shrink-0">
                    No disp.
                  </span>
                )}
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    id={`edit-prod-${p.id}`}
                    onClick={() => onEditProduct(p)}
                    className="text-xs text-zinc-400 hover:text-amber-400 px-2 py-1 rounded hover:bg-zinc-800 transition-colors"
                  >
                    ✏️
                  </button>
                  <button
                    id={`delete-prod-${p.id}`}
                    onClick={() => onDeleteProduct(p.id)}
                    disabled={deleting === p.id}
                    className="text-xs text-zinc-600 hover:text-red-400 px-2 py-1 rounded hover:bg-zinc-800 transition-colors disabled:opacity-50"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))
          )}

          <button
            id={`add-product-${cat.id}`}
            onClick={onAddProduct}
            className="w-full mt-1 py-2 text-xs text-zinc-500 hover:text-amber-400 border border-dashed border-zinc-800 hover:border-amber-500/40 rounded-lg transition-colors"
          >
            + Agregar producto
          </button>
        </div>
      )}
    </div>
  )
}


