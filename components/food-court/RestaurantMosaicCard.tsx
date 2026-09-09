'use client'

import React from 'react'

export interface RestaurantMosaicData {
  id: string
  name: string
  slug: string
  logoUrl?: string | null
  description?: string | null
  cuisineType?: string | null
  orderIndex: number
  totalOrdersCount: number
  totalAmount: number
  paymentStatus: 'NONE' | 'PENDING' | 'PAID' | 'VOIDED'
  paidAt?: string | null
}

interface RestaurantMosaicCardProps {
  restaurant: RestaurantMosaicData
  currency: string
  onClick: () => void
  isHighContrast?: boolean
}

export function RestaurantMosaicCard({
  restaurant,
  currency,
  onClick,
  isHighContrast = false,
}: RestaurantMosaicCardProps) {
  const formatPrice = (amount: number) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: currency || 'COP',
      maximumFractionDigits: 0,
    }).format(amount)

  const isPaid = restaurant.paymentStatus === 'PAID'
  const hasOrders = restaurant.totalOrdersCount > 0

  return (
    <button
      id={`restaurant-card-${restaurant.slug}`}
      onClick={onClick}
      aria-label={`Ver menú de ${restaurant.name}. ${
        hasOrders
          ? `${restaurant.totalOrdersCount} productos ordenados. Total: ${formatPrice(restaurant.totalAmount)}.`
          : 'Sin pedidos activos.'
      } ${isPaid ? 'Cuenta pagada.' : ''}`}
      className={`group relative w-full text-left rounded-2xl p-5 transition-all duration-300 transform active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-amber-500/50 flex flex-col justify-between overflow-hidden shadow-lg ${
        isHighContrast
          ? 'bg-black border-2 border-amber-400 text-white shadow-amber-950/40'
          : 'bg-zinc-900/90 border border-zinc-800/80 hover:border-amber-500/40 hover:bg-zinc-800/70 hover:shadow-amber-500/5'
      }`}
    >
      {/* Background subtle gradient */}
      <div
        className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        aria-hidden="true"
      />

      {/* Top row: Logo/Initial + Badges */}
      <div className="flex items-start justify-between gap-3 w-full mb-3">
        <div className="flex items-center gap-3">
          {restaurant.logoUrl ? (
            <div className="w-14 h-14 rounded-xl overflow-hidden border border-zinc-700 bg-zinc-800 shrink-0 shadow-inner">
              <img
                src={restaurant.logoUrl}
                alt={`Logo de ${restaurant.name}`}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>
          ) : (
            <div
              className={`w-14 h-14 rounded-xl flex items-center justify-center font-black text-2xl shrink-0 shadow-md ${
                isHighContrast
                  ? 'bg-amber-400 text-black font-extrabold'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/40 group-hover:bg-amber-500/30'
              }`}
            >
              {restaurant.name.charAt(0).toUpperCase()}
            </div>
          )}

          <div>
            <h3
              className={`font-black text-lg sm:text-xl tracking-tight leading-snug line-clamp-1 ${
                isHighContrast ? 'text-amber-300 font-extrabold' : 'text-white group-hover:text-amber-400 transition-colors'
              }`}
            >
              {restaurant.name}
            </h3>
            {restaurant.cuisineType && (
              <span
                className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-md mt-1 ${
                  isHighContrast
                    ? 'bg-zinc-800 text-amber-200 border border-amber-400/50'
                    : 'bg-zinc-800/80 text-zinc-400 border border-zinc-700/50'
                }`}
              >
                {restaurant.cuisineType}
              </span>
            )}
          </div>
        </div>

        {/* Status badges */}
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          {isPaid ? (
            <span
              className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-in fade-in"
              title="Cuenta pagada a este restaurante"
            >
              <svg
                className="w-3.5 h-3.5 text-emerald-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={3}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              PAGADO
            </span>
          ) : hasOrders ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              {restaurant.totalOrdersCount} {restaurant.totalOrdersCount === 1 ? 'pedido' : 'pedidos'}
            </span>
          ) : null}
        </div>
      </div>

      {/* Description */}
      {restaurant.description && (
        <p className="text-xs text-zinc-400 line-clamp-2 mb-4 leading-relaxed">
          {restaurant.description}
        </p>
      )}

      {/* Footer info: Total amount if ordered & Action */}
      <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between w-full mt-auto">
        {hasOrders ? (
          <div>
            <span className="text-[11px] text-zinc-400 uppercase tracking-wider block font-semibold">
              Consumo
            </span>
            <span
              className={`text-sm font-bold ${
                isHighContrast ? 'text-white' : 'text-amber-400'
              }`}
            >
              {formatPrice(restaurant.totalAmount)}
            </span>
          </div>
        ) : (
          <span className="text-xs text-zinc-400 italic">Explorar menú</span>
        )}

        <div className="flex items-center gap-1 text-xs font-bold text-amber-400 group-hover:translate-x-0.5 transition-transform">
          <span>Abrir menú</span>
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </button>
  )
}
