'use client'

import { useState } from 'react'
import { useCartStore } from '@/store/cart-store'
import { ProductModal, type ProductModalData } from './ProductModal'
import { CartSheet } from './CartSheet'
import { CallWaiterButton } from '@/components/waiter/CallWaiterButton'
import { PdfMenuView } from './PdfMenuView'

// ============================================================
// Types
// ============================================================

interface Category {
  id: string
  name: string
  products: ProductModalData[]
}

interface PdfHotspot {
  id: string
  page: number
  x: number
  y: number
  width: number
  height: number
  product: ProductModalData
}

interface MenuPageProps {
  restaurantId: string
  restaurantName: string
  tableId: string
  tableNumber: number
  sessionToken: string
  currency: string
  categories: Category[]
  pdfUrl?: string | null
  pdfHotspots?: PdfHotspot[]
}

type ViewMode = 'list' | 'pdf'

// ============================================================
// Menu Page
// ============================================================

export function MenuPage({
  restaurantId,
  restaurantName,
  tableId,
  tableNumber,
  sessionToken,
  currency,
  categories,
  pdfUrl,
  pdfHotspots = [],
}: MenuPageProps) {
  const hasPdf = Boolean(pdfUrl)

  const [selectedProduct, setSelectedProduct] = useState<ProductModalData | null>(null)
  const [activeCategory, setActiveCategory] = useState<string>(categories[0]?.id ?? '')
  const [cartOpen, setCartOpen] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>(hasPdf ? 'pdf' : 'list')

  const totalItems = useCartStore((s) => s.getTotalItemsCount())

  return (
    <div className="min-h-dvh bg-zinc-950 text-white">

      {/* ── Header ── */}
      <header className="sticky top-0 z-40 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800/60">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-base font-bold text-white leading-tight">{restaurantName}</h1>
            <p className="text-xs text-zinc-400">Mesa {tableNumber}</p>
          </div>

          {/* Cart FAB */}
          <button
            onClick={() => setCartOpen(true)}
            className="relative flex items-center gap-2 bg-amber-500 hover:bg-amber-400
                       text-white font-semibold px-4 py-2 rounded-xl transition-all
                       shadow-lg shadow-amber-500/30 active:scale-95 text-sm"
            aria-label="Ver carrito"
          >
            🛒
            {totalItems > 0 && (
              <span className="bg-white text-amber-600 font-bold text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center leading-none">
                {totalItems}
              </span>
            )}
          </button>
        </div>

        {/* Toggle PDF / Lista — solo si hay PDF configurado */}
        {hasPdf && (
          <div className="max-w-2xl mx-auto px-4 pb-3 flex gap-2">
            <button
              onClick={() => setViewMode('pdf')}
              className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold
                          transition-all duration-150
                          ${viewMode === 'pdf'
                            ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30'
                            : 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700'
                          }`}
              aria-pressed={viewMode === 'pdf'}
            >
              📋 Ver Menú PDF
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold
                          transition-all duration-150
                          ${viewMode === 'list'
                            ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30'
                            : 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700'
                          }`}
              aria-pressed={viewMode === 'list'}
            >
              📂 Ver por Categorías
            </button>
          </div>
        )}

        {/* Category Tabs — solo en modo lista */}
        {viewMode === 'list' && (
          <div className="max-w-2xl mx-auto overflow-x-auto scrollbar-none">
            <div className="flex gap-1 px-4 pb-3">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold
                              transition-all duration-150
                              ${
                                activeCategory === cat.id
                                  ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30'
                                  : 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700'
                              }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* ── Vista PDF ── */}
      {viewMode === 'pdf' && pdfUrl && (
        <main className="max-w-2xl mx-auto px-2 py-4">
          <PdfMenuView
            pdfUrl={pdfUrl}
            hotspots={pdfHotspots}
            onSelectProduct={setSelectedProduct}
          />
        </main>
      )}

      {/* ── Vista Lista por categorías ── */}
      {viewMode === 'list' && (
        <main className="max-w-2xl mx-auto px-4 py-4 space-y-6">
          {categories
            .filter((cat) => !activeCategory || cat.id === activeCategory)
            .map((cat) => (
              <section key={cat.id}>
                <h2 className="text-base font-bold text-white mb-3 flex items-center gap-2">
                  <span className="w-1 h-4 bg-amber-500 rounded-full" />
                  {cat.name}
                </h2>

                <div className="grid grid-cols-1 gap-3">
                  {cat.products.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      currency={currency}
                      onSelect={() => setSelectedProduct(product)}
                    />
                  ))}
                </div>
              </section>
            ))}
        </main>
      )}

      {/* ── Call Waiter (fixed bottom) ── */}
      <div className="fixed bottom-4 left-0 right-0 z-30 px-4 max-w-2xl mx-auto">
        <CallWaiterButton
          restaurantId={restaurantId}
          tableId={tableId}
          tableNumber={tableNumber}
          sessionToken={sessionToken}
        />
      </div>

      {/* Padding para el botón fijo */}
      <div className="h-20" />

      {/* ── Product Modal (compartido entre vista lista y PDF) ── */}
      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          currency={currency}
          onClose={() => setSelectedProduct(null)}
        />
      )}

      {/* ── Cart Drawer ── */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setCartOpen(false)} />
          <div className="relative w-full max-w-sm bg-zinc-900 border-l border-zinc-800 h-full
                          flex flex-col shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 flex-shrink-0">
              <h2 className="font-bold text-white text-base">Tu Pedido</h2>
              <button
                onClick={() => setCartOpen(false)}
                className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              <CartSheet
                restaurantId={restaurantId}
                tableId={tableId}
                sessionToken={sessionToken}
                currency={currency}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================
// Product Card
// ============================================================

function ProductCard({
  product,
  currency,
  onSelect,
}: {
  product: ProductModalData
  currency: string
  onSelect: () => void
}) {
  const formatPrice = (amount: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency }).format(amount)

  const hasModifiers =
    product.modifierGroups.length > 0 || product.ingredients.some((i) => i.isRemovable)

  return (
    <button
      onClick={onSelect}
      className="w-full text-left bg-zinc-900 hover:bg-zinc-800/80 border border-zinc-800/60
                 hover:border-amber-500/30 rounded-xl overflow-hidden transition-all duration-200
                 active:scale-[0.99] group"
    >
      <div className="flex items-stretch gap-0">
        {/* Image */}
        {product.imageUrl ? (
          <div className="w-28 h-28 flex-shrink-0 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>
        ) : (
          <div className="w-28 h-28 flex-shrink-0 bg-zinc-800 flex items-center justify-center">
            <span className="text-3xl">🍽️</span>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
          <div>
            <p className="font-semibold text-white text-sm leading-tight">{product.name}</p>
            {product.description && (
              <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed line-clamp-2">
                {product.description}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between mt-2">
            <span className="font-bold text-amber-400 text-sm">
              {formatPrice(product.basePrice)}
            </span>

            <span className="flex items-center gap-1">
              {hasModifiers && (
                <span className="text-[10px] text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded-full">
                  Personalizable
                </span>
              )}
              <span className="text-amber-500 group-hover:translate-x-0.5 transition-transform text-sm">
                →
              </span>
            </span>
          </div>
        </div>
      </div>
    </button>
  )
}
