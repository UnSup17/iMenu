'use client'

import React, { useRef, useEffect } from 'react'
import { MenuPage } from '@/components/menu/MenuPage'

interface FoodCourtMenuViewerProps {
  foodCourtSlug: string
  foodCourtName: string
  tableId: string
  tableNumber: number
  sessionToken: string
  restaurant: {
    id: string
    name: string
    slug: string
    currency: string
    categories: any[]
    pdfUrl?: string | null
    pdfHotspots?: any[]
    initialStockIssues?: any[]
  }
  onBackToMosaic: () => void
  onNavigateRestaurant?: (direction: 'next' | 'prev') => void
  hasPrevRestaurant?: boolean
  hasNextRestaurant?: boolean
}

export function FoodCourtMenuViewer({
  foodCourtSlug,
  foodCourtName,
  tableId,
  tableNumber,
  sessionToken,
  restaurant,
  onBackToMosaic,
  onNavigateRestaurant,
  hasPrevRestaurant = false,
  hasNextRestaurant = false,
}: FoodCourtMenuViewerProps) {
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)

  // Manejo de gestos táctiles de swipe horizontal
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return

    const diffX = e.changedTouches[0].clientX - touchStartX.current
    const diffY = e.changedTouches[0].clientY - touchStartY.current

    // Solo si el desplazamiento horizontal es significativo y mayor que el vertical
    if (Math.abs(diffX) > 80 && Math.abs(diffX) > Math.abs(diffY) * 1.5) {
      if (diffX < 0 && hasNextRestaurant && onNavigateRestaurant) {
        // Swipe izquierda -> Siguiente restaurante
        onNavigateRestaurant('next')
      } else if (diffX > 0 && hasPrevRestaurant && onNavigateRestaurant) {
        // Swipe derecha -> Anterior restaurante
        onNavigateRestaurant('prev')
      }
    }

    touchStartX.current = null
    touchStartY.current = null
  }

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="relative min-h-dvh"
    >
      <MenuPage
        restaurantId={restaurant.id}
        restaurantName={restaurant.name}
        tableId={tableId}
        tableNumber={tableNumber}
        sessionToken={sessionToken}
        currency={restaurant.currency}
        categories={restaurant.categories}
        pdfUrl={restaurant.pdfUrl}
        pdfHotspots={restaurant.pdfHotspots}
        initialStockIssues={restaurant.initialStockIssues}
        foodCourtSlug={foodCourtSlug}
        foodCourtName={foodCourtName}
        onBackToMosaic={onBackToMosaic}
        onNavigateRestaurant={onNavigateRestaurant}
        hasPrevRestaurant={hasPrevRestaurant}
        hasNextRestaurant={hasNextRestaurant}
      />
    </div>
  )
}
