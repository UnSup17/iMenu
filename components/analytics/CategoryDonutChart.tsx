'use client'

import { useState } from 'react'
import { CategoryDistributionItem } from '@/lib/analytics/engine'

interface CategoryDonutChartProps {
  data: CategoryDistributionItem[]
}

export function CategoryDonutChart({ data }: CategoryDonutChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-zinc-500 bg-zinc-950/40 rounded-xl border border-zinc-800/80 p-6">
        <span className="text-3xl mb-2">🍩</span>
        <p className="text-xs">No hay categorías registradas en este período.</p>
      </div>
    )
  }

  const totalRevenue = data.reduce((sum, item) => sum + item.totalRevenue, 0)
  const radius = 70
  const strokeWidth = 24
  const circumference = 2 * Math.PI * radius

  // Calcular offsets acumulados
  let accumulatedPercent = 0
  const slices = data.map((item) => {
    const strokeDasharray = `${(item.percentage / 100) * circumference} ${circumference}`
    const strokeDashoffset = -((accumulatedPercent / 100) * circumference)
    accumulatedPercent += item.percentage
    return {
      ...item,
      strokeDasharray,
      strokeDashoffset,
    }
  })

  const activeCategory = hoveredIdx !== null ? data[hoveredIdx] : null

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
      <div className="border-b border-zinc-800/80 pb-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <span>🍩</span> Distribución de Ventas por Categoría
        </h3>
        <p className="text-xs text-zinc-400">Participación porcentual y volumen de facturación por sección del menú</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
        {/* Donut SVG */}
        <div className="relative flex items-center justify-center">
          <svg
            viewBox="0 0 200 200"
            className="w-48 h-48 sm:w-56 sm:h-56 -rotate-90 transform select-none"
            onMouseLeave={() => setHoveredIdx(null)}
          >
            {/* Background ring */}
            <circle
              cx="100"
              cy="100"
              r={radius}
              fill="transparent"
              stroke="#27272a"
              strokeWidth={strokeWidth}
            />

            {/* Slices */}
            {slices.map((slice, idx) => (
              <circle
                key={idx}
                cx="100"
                cy="100"
                r={radius}
                fill="transparent"
                stroke={slice.color}
                strokeWidth={hoveredIdx === idx ? strokeWidth + 4 : strokeWidth}
                strokeDasharray={slice.strokeDasharray}
                strokeDashoffset={slice.strokeDashoffset}
                className="cursor-pointer transition-all duration-200"
                onMouseEnter={() => setHoveredIdx(idx)}
              />
            ))}
          </svg>

          {/* Center Content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none p-4">
            {activeCategory ? (
              <>
                <span className="text-[11px] text-zinc-400 font-semibold truncate max-w-[120px]">
                  {activeCategory.categoryName}
                </span>
                <span className="text-base font-bold text-white font-mono">
                  {activeCategory.percentage}%
                </span>
                <span className="text-[10px] text-amber-400 font-mono font-medium">
                  ${activeCategory.totalRevenue.toLocaleString('es-CO')}
                </span>
              </>
            ) : (
              <>
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">
                  Total Mix
                </span>
                <span className="text-sm font-bold text-white font-mono">
                  ${totalRevenue.toLocaleString('es-CO')}
                </span>
                <span className="text-[10px] text-zinc-400">
                  {data.length} Categorías
                </span>
              </>
            )}
          </div>
        </div>

        {/* Legend / Breakdown List */}
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {data.map((item, idx) => (
            <div
              key={idx}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              className={`p-2 rounded-xl border text-xs transition-all cursor-pointer flex items-center justify-between ${
                hoveredIdx === idx
                  ? 'bg-zinc-800/90 border-amber-500/50 shadow-md shadow-amber-500/5'
                  : 'bg-zinc-950/60 border-zinc-800/80 hover:bg-zinc-800/50'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                  style={{ backgroundColor: item.color }}
                />
                <div className="truncate">
                  <p className="font-semibold text-white truncate">{item.categoryName}</p>
                  <p className="text-[10px] text-zinc-400 font-mono">
                    {item.quantitySold} unidades vendidas
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0 pl-2">
                <p className="font-mono font-bold text-zinc-200">
                  ${item.totalRevenue.toLocaleString('es-CO')}
                </p>
                <span className="text-[11px] font-bold text-amber-400 font-mono">
                  {item.percentage}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
