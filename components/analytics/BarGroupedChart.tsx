'use client'

import { useState } from 'react'
import { HourlySalesData, DayOfWeekSalesData } from '@/lib/analytics/engine'

interface BarGroupedChartProps {
  hourlyData: HourlySalesData[]
  dayOfWeekData: DayOfWeekSalesData[]
}

export function BarGroupedChart({ hourlyData, dayOfWeekData }: BarGroupedChartProps) {
  const [viewMode, setViewMode] = useState<'HOURLY' | 'DAY_OF_WEEK'>('HOURLY')
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  const isHourly = viewMode === 'HOURLY'
  const items = isHourly
    ? hourlyData.map((h) => ({
        label: h.hourLabel,
        subLabel: `${h.hour}:00`,
        value: h.totalSales,
        count: h.invoicesCount,
      }))
    : dayOfWeekData.map((d) => ({
        label: d.dayName.slice(0, 3),
        subLabel: d.dayName,
        value: d.totalSales,
        count: d.invoicesCount,
      }))

  const maxValue = Math.max(...items.map((i) => i.value), 1)
  const peakItem = items.reduce((max, cur) => (cur.value > max.value ? cur : max), items[0] || { label: '', value: 0, subLabel: '' })

  const svgWidth = 800
  const svgHeight = 220
  const paddingLeft = 50
  const paddingRight = 20
  const paddingTop = 20
  const paddingBottom = 35

  const chartWidth = svgWidth - paddingLeft - paddingRight
  const chartHeight = svgHeight - paddingTop - paddingBottom
  const barWidth = Math.max(6, Math.min(32, (chartWidth / items.length) * 0.65))
  const stepX = chartWidth / items.length

  const yTicks = [0, 0.5, 1].map((pct) => ({
    val: Math.round(maxValue * pct),
    y: paddingTop + chartHeight - pct * chartHeight,
  }))

  const activeItem = hoveredIndex !== null ? items[hoveredIndex] : null

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <span>⏰</span> Análisis de Picos y Afluencia
          </h3>
          <p className="text-xs text-zinc-400">
            {isHourly
              ? 'Volumen de facturación por hora del día para planificar turnos'
              : 'Distribución de ingresos por día de la semana para compras e inventario'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-zinc-950 p-1 rounded-xl border border-zinc-800 flex items-center gap-1">
            <button
              onClick={() => {
                setViewMode('HOURLY')
                setHoveredIndex(null)
              }}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                isHourly ? 'bg-amber-500 text-zinc-950 font-bold' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Horas (0-23h)
            </button>
            <button
              onClick={() => {
                setViewMode('DAY_OF_WEEK')
                setHoveredIndex(null)
              }}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                !isHourly ? 'bg-amber-500 text-zinc-950 font-bold' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Días de Semana
            </button>
          </div>

          <div className="hidden sm:flex bg-zinc-950 px-3 py-1.5 rounded-lg border border-zinc-800 text-xs items-center gap-1.5">
            <span className="text-zinc-500">Pico:</span>
            <span className="font-bold text-emerald-400 font-mono">
              {peakItem?.subLabel || peakItem?.label} (${peakItem?.value.toLocaleString('es-CO')})
            </span>
          </div>
        </div>
      </div>

      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto select-none"
          onMouseLeave={() => setHoveredIndex(null)}
        >
          <defs>
            <linearGradient id="barAmberGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="1" />
              <stop offset="100%" stopColor="#d97706" stopOpacity="0.4" />
            </linearGradient>
            <linearGradient id="barPeakGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="1" />
              <stop offset="100%" stopColor="#059669" stopOpacity="0.5" />
            </linearGradient>
          </defs>

          {/* Gridlines */}
          {yTicks.map((tick, idx) => (
            <g key={idx}>
              <line
                x1={paddingLeft}
                y1={tick.y}
                x2={svgWidth - paddingRight}
                y2={tick.y}
                stroke="#27272a"
                strokeDasharray="4 4"
                strokeWidth={1}
              />
              <text
                x={paddingLeft - 8}
                y={tick.y + 3}
                fill="#71717a"
                fontSize="10"
                textAnchor="end"
                className="font-mono"
              >
                ${(tick.val >= 1000000 ? `${(tick.val / 1000000).toFixed(1)}M` : tick.val >= 1000 ? `${Math.round(tick.val / 1000)}k` : tick.val)}
              </text>
            </g>
          ))}

          {/* Barras */}
          {items.map((item, idx) => {
            const barHeight = (item.value / maxValue) * chartHeight
            const x = paddingLeft + idx * stepX + (stepX - barWidth) / 2
            const y = paddingTop + chartHeight - barHeight
            const isPeak = item.value === maxValue && maxValue > 0
            const isHovered = hoveredIndex === idx

            return (
              <g key={idx} className="cursor-pointer" onMouseEnter={() => setHoveredIndex(idx)}>
                {/* Hit area amplia */}
                <rect
                  x={paddingLeft + idx * stepX}
                  y={paddingTop}
                  width={stepX}
                  height={chartHeight + 10}
                  fill="transparent"
                />

                {/* Barra */}
                <rect
                  x={x}
                  y={item.value > 0 ? y : paddingTop + chartHeight - 2}
                  width={barWidth}
                  height={item.value > 0 ? barHeight : 2}
                  rx={3}
                  ry={3}
                  fill={isPeak ? 'url(#barPeakGrad)' : 'url(#barAmberGrad)'}
                  opacity={isHovered ? 1 : hoveredIndex !== null ? 0.45 : 0.85}
                  className="transition-all duration-200"
                />

                {/* Etiqueta X */}
                {(isHourly ? idx % 2 === 0 : true) && (
                  <text
                    x={x + barWidth / 2}
                    y={svgHeight - 12}
                    fill={isPeak ? '#10b981' : isHovered ? '#ffffff' : '#a1a1aa'}
                    fontSize={isHourly ? '9' : '10'}
                    fontWeight={isPeak || isHovered ? 'bold' : 'normal'}
                    textAnchor="middle"
                  >
                    {item.label}
                  </text>
                )}
              </g>
            )
          })}
        </svg>

        {/* Tooltip flotante */}
        {activeItem && hoveredIndex !== null && (
          <div
            className="absolute z-20 pointer-events-none -translate-x-1/2 -translate-y-full mb-3 bg-zinc-950/95 border border-zinc-700 rounded-xl p-2.5 shadow-2xl text-xs space-y-1"
            style={{
              left: `${((paddingLeft + hoveredIndex * stepX + stepX / 2) / svgWidth) * 100}%`,
              top: `${((paddingTop + chartHeight - (activeItem.value / maxValue) * chartHeight) / svgHeight) * 100}%`,
            }}
          >
            <p className="font-bold text-white flex items-center gap-1.5 border-b border-zinc-800 pb-1">
              <span>⏱️</span> {activeItem.subLabel}
            </p>
            <div className="flex justify-between gap-4 text-zinc-300">
              <span>Ventas:</span>
              <span className="font-mono font-bold text-amber-400">
                ${activeItem.value.toLocaleString('es-CO')}
              </span>
            </div>
            <div className="flex justify-between gap-4 text-zinc-400 text-[11px]">
              <span>Facturas:</span>
              <span className="font-mono text-zinc-200 font-semibold">{activeItem.count}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
