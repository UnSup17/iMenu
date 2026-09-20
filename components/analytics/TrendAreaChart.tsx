'use client'

import { useState } from 'react'
import { SalesTrendPoint } from '@/lib/analytics/engine'

interface TrendAreaChartProps {
  data: SalesTrendPoint[]
}

export function TrendAreaChart({ data }: TrendAreaChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-zinc-500 bg-zinc-950/40 rounded-xl border border-zinc-800/80 p-6">
        <span className="text-3xl mb-2">📉</span>
        <p className="text-xs">No hay datos de ventas registradas en el período seleccionado.</p>
      </div>
    )
  }

  const width = 800
  const height = 260
  const paddingLeft = 60
  const paddingRight = 20
  const paddingTop = 20
  const paddingBottom = 40

  const chartWidth = width - paddingLeft - paddingRight
  const chartHeight = height - paddingTop - paddingBottom

  const maxRevenue = Math.max(...data.map((d) => d.revenue), 1)
  const totalPeriodRevenue = data.reduce((sum, d) => sum + d.revenue, 0)
  const avgDailyRevenue = Math.round(totalPeriodRevenue / data.length)

  // Coordenadas de los puntos
  const points = data.map((d, index) => {
    const x = paddingLeft + (data.length > 1 ? (index / (data.length - 1)) * chartWidth : chartWidth / 2)
    const y = paddingTop + chartHeight - (d.revenue / maxRevenue) * chartHeight
    return { x, y, ...d }
  })

  // Generar curva Bézier suave
  let linePath = `M ${points[0].x} ${points[0].y}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i]
    const p1 = points[i + 1]
    const cpX = (p0.x + p1.x) / 2
    linePath += ` C ${cpX} ${p0.y}, ${cpX} ${p1.y}, ${p1.x} ${p1.y}`
  }

  // Generar área cerrada para el gradiente
  const firstX = points[0].x
  const lastX = points[points.length - 1].x
  const bottomY = paddingTop + chartHeight
  const areaPath = `${linePath} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`

  // 4 líneas de referencia horizontales
  const yTicks = [0, 0.33, 0.66, 1].map((pct) => ({
    val: Math.round(maxRevenue * pct),
    y: paddingTop + chartHeight - pct * chartHeight,
  }))

  const activePoint = hoveredIndex !== null ? points[hoveredIndex] : null

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800/80 pb-3">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <span>📈</span> Tendencia de Ventas Diarias
          </h3>
          <p className="text-xs text-zinc-400">Evolución de ingresos y facturación diaria en el período</p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <div className="bg-zinc-950 px-3 py-1.5 rounded-lg border border-zinc-800">
            <span className="text-zinc-500 mr-1">Promedio Diario:</span>
            <span className="font-mono text-amber-400 font-bold">
              ${avgDailyRevenue.toLocaleString('es-CO')}
            </span>
          </div>
          <div className="bg-zinc-950 px-3 py-1.5 rounded-lg border border-zinc-800">
            <span className="text-zinc-500 mr-1">Día Pico:</span>
            <span className="font-mono text-emerald-400 font-bold">
              ${maxRevenue.toLocaleString('es-CO')}
            </span>
          </div>
        </div>
      </div>

      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto select-none"
          onMouseLeave={() => setHoveredIndex(null)}
        >
          <defs>
            <linearGradient id="amberTrendGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.45" />
              <stop offset="60%" stopColor="#f59e0b" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
            </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#f59e0b" floodOpacity="0.4" />
            </filter>
          </defs>

          {/* Gridlines horizontales */}
          {yTicks.map((tick, idx) => (
            <g key={idx}>
              <line
                x1={paddingLeft}
                y1={tick.y}
                x2={width - paddingRight}
                y2={tick.y}
                stroke="#27272a"
                strokeDasharray={idx === 0 ? '0' : '4 4'}
                strokeWidth={idx === 0 ? 1.5 : 1}
              />
              <text
                x={paddingLeft - 10}
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

          {/* Área degradada */}
          <path d={areaPath} fill="url(#amberTrendGradient)" />

          {/* Línea curva principal */}
          <path
            d={linePath}
            fill="none"
            stroke="#f59e0b"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#glow)"
          />

          {/* Eje X Etiquetas */}
          {points.map((p, idx) => {
            // Mostrar etiquetas espaciadas si hay muchos puntos
            const step = Math.max(1, Math.floor(points.length / 8))
            if (idx % step !== 0 && idx !== points.length - 1) return null
            return (
              <text
                key={idx}
                x={p.x}
                y={height - 12}
                fill="#a1a1aa"
                fontSize="10"
                textAnchor="middle"
                className="font-medium"
              >
                {p.dayLabel}
              </text>
            )
          })}

          {/* Puntos y zonas interactivas de hover */}
          {points.map((p, idx) => (
            <g key={idx}>
              {/* Círculo invisible amplio para capturar hover fácilmente */}
              <circle
                cx={p.x}
                cy={p.y}
                r={16}
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIndex(idx)}
              />

              {/* Punto visible cuando está activo */}
              {hoveredIndex === idx && (
                <>
                  <line
                    x1={p.x}
                    y1={paddingTop}
                    x2={p.x}
                    y2={bottomY}
                    stroke="#f59e0b"
                    strokeWidth="1.5"
                    strokeDasharray="2 2"
                  />
                  <circle cx={p.x} cy={p.y} r="6" fill="#f59e0b" stroke="#09090b" strokeWidth="2.5" />
                </>
              )}
            </g>
          ))}
        </svg>

        {/* Tooltip flotante interactivo */}
        {activePoint && (
          <div
            className="absolute z-20 pointer-events-none -translate-x-1/2 -translate-y-full mb-3 bg-zinc-950/95 border border-amber-500/40 rounded-xl p-2.5 shadow-2xl shadow-black text-xs space-y-1 transition-all"
            style={{
              left: `${(activePoint.x / width) * 100}%`,
              top: `${(activePoint.y / height) * 100}%`,
            }}
          >
            <p className="font-bold text-white flex items-center gap-1.5 border-b border-zinc-800 pb-1">
              <span>📅</span> {activePoint.dayLabel} ({activePoint.date})
            </p>
            <div className="flex justify-between gap-4 text-zinc-300">
              <span>Ventas:</span>
              <span className="font-mono font-bold text-amber-400">
                ${activePoint.revenue.toLocaleString('es-CO')}
              </span>
            </div>
            <div className="flex justify-between gap-4 text-zinc-400 text-[11px]">
              <span>Facturas / Cuentas:</span>
              <span className="font-mono text-zinc-200 font-semibold">{activePoint.invoicesCount}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
