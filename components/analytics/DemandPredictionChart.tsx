'use client'

import { useState } from 'react'
import { DemandPredictionItem } from '@/lib/analytics/engine'

interface DemandPredictionChartProps {
  data: DemandPredictionItem[]
}

export function DemandPredictionChart({ data }: DemandPredictionChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-zinc-500 bg-zinc-950/40 rounded-xl border border-zinc-800/80 p-6">
        <span className="text-3xl mb-2">🔮</span>
        <p className="text-xs">No hay suficiente historial para proyectar demanda.</p>
      </div>
    )
  }

  const totalProjectedRev = data.reduce((s, d) => s + d.projectedRevenue, 0)
  const totalProjectedGuests = data.reduce((s, d) => s + d.projectedGuests, 0)
  const peakDay = data.reduce((max, d) => (d.projectedRevenue > max.projectedRevenue ? d : max), data[0])

  const width = 800
  const height = 240
  const paddingLeft = 60
  const paddingRight = 30
  const paddingTop = 20
  const paddingBottom = 40

  const chartWidth = width - paddingLeft - paddingRight
  const chartHeight = height - paddingTop - paddingBottom

  const maxVal = Math.max(...data.map((d) => d.maxConfidence), 1)

  const points = data.map((d, idx) => {
    const x = paddingLeft + (idx / (data.length - 1)) * chartWidth
    const y = paddingTop + chartHeight - (d.projectedRevenue / maxVal) * chartHeight
    const yMin = paddingTop + chartHeight - (d.minConfidence / maxVal) * chartHeight
    const yMax = paddingTop + chartHeight - (d.maxConfidence / maxVal) * chartHeight
    return { x, y, yMin, yMax, ...d }
  })

  // Línea proyectada
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')

  // Banda de confianza (polígono superior y vuelta inferior)
  const upperPath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.yMax}`).join(' ')
  const lowerPath = points.slice().reverse().map((p) => `L ${p.x} ${p.yMin}`).join(' ')
  const bandPath = `${upperPath} ${lowerPath} Z`

  const activePoint = hoveredIdx !== null ? points[hoveredIdx] : null

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <span>🔮</span> Predicción de Demanda Inteligente (Próximos 7 Días)
          </h3>
          <p className="text-xs text-zinc-400">
            Algoritmo de regresión con ajuste estacional de día de semana e intervalos de confianza
          </p>
        </div>

        <span className="text-[10px] px-2.5 py-1 rounded-full font-bold bg-cyan-950 text-cyan-300 border border-cyan-800 self-start sm:self-auto">
          ✨ Modelo Predictivo Activo
        </span>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs">
          <span className="text-zinc-500 block">Ingresos Proyectados (7 Días):</span>
          <p className="text-lg font-bold text-cyan-400 font-mono mt-0.5">
            ${totalProjectedRev.toLocaleString('es-CO')}
          </p>
          <span className="text-[10px] text-zinc-400">
            Promedio diario: ${Math.round(totalProjectedRev / 7).toLocaleString('es-CO')}
          </span>
        </div>

        <div className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs">
          <span className="text-zinc-500 block">Comensales Estimados:</span>
          <p className="text-lg font-bold text-emerald-400 font-mono mt-0.5">
            ~{totalProjectedGuests.toLocaleString('es-CO')} personas
          </p>
          <span className="text-[10px] text-zinc-400">Para planificación de compras de insumos</span>
        </div>

        <div className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs">
          <span className="text-zinc-500 block">Día Pico Previsto:</span>
          <p className="text-lg font-bold text-amber-400 font-mono mt-0.5">
            {peakDay.dayName} ({peakDay.date})
          </p>
          <span className="text-[10px] text-zinc-400 font-mono">
            ${peakDay.projectedRevenue.toLocaleString('es-CO')} (~{peakDay.projectedGuests} comensales)
          </span>
        </div>
      </div>

      {/* Gráfico SVG de Proyección */}
      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto select-none"
          onMouseLeave={() => setHoveredIdx(null)}
        >
          <defs>
            <linearGradient id="cyanBandGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.05" />
            </linearGradient>
          </defs>

          {/* Gridlines */}
          {[0, 0.5, 1].map((pct, idx) => {
            const y = paddingTop + chartHeight - pct * chartHeight
            const val = Math.round(maxVal * pct)
            return (
              <g key={idx}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={width - paddingRight}
                  y2={y}
                  stroke="#27272a"
                  strokeDasharray="4 4"
                />
                <text
                  x={paddingLeft - 8}
                  y={y + 3}
                  fill="#71717a"
                  fontSize="10"
                  textAnchor="end"
                  className="font-mono"
                >
                  ${(val >= 1000000 ? `${(val / 1000000).toFixed(1)}M` : val >= 1000 ? `${Math.round(val / 1000)}k` : val)}
                </text>
              </g>
            )
          })}

          {/* Banda de confianza */}
          <path d={bandPath} fill="url(#cyanBandGradient)" />

          {/* Línea punteada de proyección */}
          <path
            d={linePath}
            fill="none"
            stroke="#06b6d4"
            strokeWidth="3"
            strokeDasharray="6 6"
            strokeLinecap="round"
          />

          {/* Eje X */}
          {points.map((p, idx) => (
            <text
              key={idx}
              x={p.x}
              y={height - 12}
              fill={hoveredIdx === idx ? '#06b6d4' : '#a1a1aa'}
              fontSize="10"
              fontWeight={hoveredIdx === idx ? 'bold' : 'normal'}
              textAnchor="middle"
            >
              {p.dayName.slice(0, 3)} {p.date.slice(8)}
            </text>
          ))}

          {/* Puntos de interacción */}
          {points.map((p, idx) => (
            <g key={idx} className="cursor-pointer" onMouseEnter={() => setHoveredIdx(idx)}>
              <circle cx={p.x} cy={p.y} r="16" fill="transparent" />
              <circle
                cx={p.x}
                cy={p.y}
                r={hoveredIdx === idx ? 7 : 5}
                fill="#06b6d4"
                stroke="#09090b"
                strokeWidth="2.5"
                className="transition-all"
              />
            </g>
          ))}
        </svg>

        {/* Tooltip flotante */}
        {activePoint && (
          <div
            className="absolute z-20 pointer-events-none -translate-x-1/2 -translate-y-full mb-3 bg-zinc-950/95 border border-cyan-500/50 rounded-xl p-3 shadow-2xl text-xs space-y-1.5"
            style={{
              left: `${(activePoint.x / width) * 100}%`,
              top: `${(activePoint.y / height) * 100}%`,
            }}
          >
            <p className="font-bold text-white flex items-center gap-1.5 border-b border-zinc-800 pb-1">
              <span>📅</span> {activePoint.dayName} ({activePoint.date})
            </p>
            <div className="flex justify-between gap-4 text-zinc-300">
              <span>Ingreso Previsto:</span>
              <span className="font-mono font-bold text-cyan-400">
                ${activePoint.projectedRevenue.toLocaleString('es-CO')}
              </span>
            </div>
            <div className="flex justify-between gap-4 text-zinc-400 text-[11px]">
              <span>Rango Confianza (±12%):</span>
              <span className="font-mono text-zinc-300">
                ${(activePoint.minConfidence / 1000).toFixed(0)}k - ${(activePoint.maxConfidence / 1000).toFixed(0)}k
              </span>
            </div>
            <div className="flex justify-between gap-4 text-zinc-400 text-[11px]">
              <span>Comensales Estimados:</span>
              <span className="font-mono text-emerald-400 font-semibold">
                ~{activePoint.projectedGuests} personas
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Tabla detallada de la proyección */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="border-b border-zinc-800 text-zinc-500 uppercase text-[10px]">
              <th className="py-2 px-3">Fecha & Día</th>
              <th className="py-2 px-3 text-right">Ingreso Proyectado</th>
              <th className="py-2 px-3 text-right">Intervalo (Min - Max)</th>
              <th className="py-2 px-3 text-right">Comensales</th>
              <th className="py-2 px-3 text-right">Comandas</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60 font-mono">
            {data.map((d, i) => (
              <tr key={i} className="hover:bg-zinc-800/30 transition">
                <td className="py-2 px-3 font-sans font-medium text-white flex items-center gap-1.5">
                  <span className="text-cyan-400">•</span>
                  <span>{d.dayName}, {d.date}</span>
                </td>
                <td className="py-2 px-3 text-right font-bold text-cyan-400">
                  ${d.projectedRevenue.toLocaleString('es-CO')}
                </td>
                <td className="py-2 px-3 text-right text-zinc-400 text-[11px]">
                  ${d.minConfidence.toLocaleString('es-CO')} - ${d.maxConfidence.toLocaleString('es-CO')}
                </td>
                <td className="py-2 px-3 text-right text-emerald-400">~{d.projectedGuests}</td>
                <td className="py-2 px-3 text-right text-zinc-300">{d.projectedOrders}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
