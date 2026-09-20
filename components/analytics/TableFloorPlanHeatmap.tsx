'use client'

import { useState } from 'react'
import { TablePerformanceItem } from '@/lib/analytics/engine'

interface TableFloorPlanHeatmapProps {
  tables: TablePerformanceItem[]
}

export function TableFloorPlanHeatmap({ tables }: TableFloorPlanHeatmapProps) {
  const [hoveredTable, setHoveredTable] = useState<TablePerformanceItem | null>(null)
  const [filterZone, setFilterZone] = useState<string>('ALL')

  if (!tables || tables.length === 0) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-zinc-500 bg-zinc-950/40 rounded-xl border border-zinc-800/80 p-6">
        <span className="text-3xl mb-2">🗺️</span>
        <p className="text-xs">No hay mesas configuradas para generar el mapa térmico.</p>
      </div>
    )
  }

  const zones = Array.from(new Set(tables.map((t) => t.zone || 'Salón Principal'))).sort()
  const filteredTables = filterZone === 'ALL' ? tables : tables.filter((t) => (t.zone || 'Salón Principal') === filterZone)

  const maxX = Math.max(860, ...tables.map((t) => (t.posX || 0) + (t.width || 80) + 60))
  const maxY = Math.max(500, ...tables.map((t) => (t.posY || 0) + (t.height || 80) + 60))

  const totalTableSales = tables.reduce((s, t) => s + t.totalSales, 0)
  const starTable = tables.reduce((max, t) => (t.totalSales > max.totalSales ? t : max), tables[0])

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <span>🔥</span> Heatmap de Salón: Facturación & Rotación
          </h3>
          <p className="text-xs text-zinc-400">
            Identifica qué mesas generan más ingresos y optimiza la distribución espacial del salón
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-zinc-500">Zona:</span>
          <button
            onClick={() => setFilterZone('ALL')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition ${
              filterZone === 'ALL'
                ? 'bg-amber-500 text-zinc-950 font-bold'
                : 'bg-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            Todas ({tables.length})
          </button>
          {zones.map((z) => (
            <button
              key={z}
              onClick={() => setFilterZone(z)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition ${
                filterZone === z
                  ? 'bg-amber-500 text-zinc-950 font-bold'
                  : 'bg-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              {z}
            </button>
          ))}
        </div>
      </div>

      {/* KPI banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs">
          <span className="text-zinc-500 block">Mesa Estrella (Mayor Facturación):</span>
          <p className="text-base font-bold text-rose-400 font-mono mt-0.5">
            Mesa {starTable?.tableNumber} ({starTable?.zone})
          </p>
          <span className="text-[10px] text-zinc-400 font-mono">
            ${starTable?.totalSales.toLocaleString('es-CO')} ({starTable?.invoicesCount} cuentas)
          </span>
        </div>
        <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs">
          <span className="text-zinc-500 block">Total Facturado en Mesas:</span>
          <p className="text-base font-bold text-amber-400 font-mono mt-0.5">
            ${totalTableSales.toLocaleString('es-CO')}
          </p>
          <span className="text-[10px] text-zinc-400">
            Promedio: ${Math.round(totalTableSales / Math.max(1, tables.length)).toLocaleString('es-CO')} por mesa
          </span>
        </div>
        <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs flex flex-col justify-between">
          <span className="text-zinc-500 block">Escala Térmica de Intensidad:</span>
          <div className="flex items-center gap-1.5 mt-2">
            <span className="text-[10px] text-emerald-400 font-bold">Baja</span>
            <div className="flex-1 h-2 rounded-full bg-gradient-to-r from-emerald-500 via-amber-500 via-orange-500 to-rose-500" />
            <span className="text-[10px] text-rose-400 font-bold">Estrella</span>
          </div>
        </div>
      </div>

      {/* Canvas SVG del Salón */}
      <div className="relative w-full bg-zinc-950 border border-zinc-800/90 rounded-2xl p-4 overflow-x-auto">
        <svg
          viewBox={`0 0 ${maxX} ${maxY}`}
          className="w-full min-w-[750px] h-auto select-none"
          onMouseLeave={() => setHoveredTable(null)}
        >
          <defs>
            {/* Patrón de cuadrícula tenue */}
            <pattern id="heatmapGrid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#18181b" strokeWidth="1" />
            </pattern>
          </defs>

          {/* Fondo cuadrícula */}
          <rect width={maxX} height={maxY} fill="url(#heatmapGrid)" />

          {/* Mesas */}
          {filteredTables.map((t) => {
            const intensity = t.intensity // 0.0 a 1.0
            const colors = getHeatmapColors(intensity)
            const isHovered = hoveredTable?.tableId === t.tableId
            const isRound = t.shape === 'round'

            const posX = t.posX || 50
            const posY = t.posY || 50
            const width = t.width || 80
            const height = t.height || 80

            return (
              <g
                key={t.tableId}
                className="cursor-pointer transition-all duration-200"
                onMouseEnter={() => setHoveredTable(t)}
              >
                {/* Halo de resplandor térmico */}
                {intensity > 0.4 && (
                  <ellipse
                    cx={posX + width / 2}
                    cy={posY + height / 2}
                    rx={width / 2 + 16 * intensity}
                    ry={height / 2 + 16 * intensity}
                    fill={colors.glow}
                    opacity={isHovered ? 0.8 : 0.45}
                  />
                )}

                {/* Forma de la mesa */}
                {isRound ? (
                  <circle
                    cx={posX + width / 2}
                    cy={posY + height / 2}
                    r={width / 2}
                    fill={colors.fill}
                    stroke={isHovered ? '#ffffff' : colors.stroke}
                    strokeWidth={isHovered ? 3 : 2}
                    className="transition-all duration-200"
                  />
                ) : (
                  <rect
                    x={posX}
                    y={posY}
                    width={width}
                    height={height}
                    rx={t.shape === 'rectangle' ? 8 : 12}
                    fill={colors.fill}
                    stroke={isHovered ? '#ffffff' : colors.stroke}
                    strokeWidth={isHovered ? 3 : 2}
                    className="transition-all duration-200"
                  />
                )}

                {/* Número de mesa */}
                <text
                  x={posX + width / 2}
                  y={posY + height / 2 - 4}
                  fill="#ffffff"
                  fontSize="13"
                  fontWeight="bold"
                  textAnchor="middle"
                  className="pointer-events-none drop-shadow"
                >
                  Mesa {t.tableNumber}
                </text>

                {/* Monto facturado abreviado */}
                <text
                  x={posX + width / 2}
                  y={posY + height / 2 + 12}
                  fill="#fef08a"
                  fontSize="10"
                  fontWeight="600"
                  fontFamily="monospace"
                  textAnchor="middle"
                  className="pointer-events-none drop-shadow"
                >
                  ${(t.totalSales >= 1000000 ? `${(t.totalSales / 1000000).toFixed(1)}M` : t.totalSales >= 1000 ? `${Math.round(t.totalSales / 1000)}k` : t.totalSales)}
                </text>
              </g>
            )
          })}
        </svg>

        {/* Tooltip flotante interactivo */}
        {hoveredTable && (
          <div
            className="absolute z-30 pointer-events-none bg-zinc-950/95 border border-amber-500/50 rounded-2xl p-3.5 shadow-2xl text-xs space-y-2 min-w-[200px]"
            style={{
              left: `${Math.min(maxX - 220, Math.max(20, (hoveredTable.posX || 50) + (hoveredTable.width || 80) / 2)) + 10}px`,
              top: `${Math.max(20, (hoveredTable.posY || 50) - 20)}px`,
            }}
          >
            <div className="flex items-center justify-between border-b border-zinc-800 pb-1.5">
              <span className="font-bold text-white text-sm">Mesa {hoveredTable.tableNumber}</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                {hoveredTable.zone}
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between gap-4 text-zinc-400">
                <span>Ventas Totales:</span>
                <span className="font-mono font-bold text-amber-400">
                  ${hoveredTable.totalSales.toLocaleString('es-CO')}
                </span>
              </div>
              <div className="flex justify-between gap-4 text-zinc-400">
                <span>Rotaciones (Cuentas):</span>
                <span className="font-mono text-zinc-200 font-semibold">{hoveredTable.invoicesCount} veces</span>
              </div>
              <div className="flex justify-between gap-4 text-zinc-400">
                <span>Ticket Promedio:</span>
                <span className="font-mono text-emerald-400 font-semibold">
                  ${hoveredTable.averageTicket.toLocaleString('es-CO')}
                </span>
              </div>
              <div className="flex justify-between gap-4 text-zinc-500 text-[10px] pt-1 border-t border-zinc-800/80">
                <span>Intensidad Térmica:</span>
                <span className="font-bold font-mono text-zinc-300">
                  {Math.round(hoveredTable.intensity * 100)}%
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function getHeatmapColors(intensity: number) {
  if (intensity >= 0.75) {
    return {
      fill: '#9f1239', // Rose 800
      stroke: '#f43f5e', // Rose 500
      glow: '#f43f5e',
    }
  }
  if (intensity >= 0.5) {
    return {
      fill: '#9a3412', // Orange 800
      stroke: '#f97316', // Orange 500
      glow: '#f97316',
    }
  }
  if (intensity >= 0.25) {
    return {
      fill: '#854d0e', // Amber 800
      stroke: '#f59e0b', // Amber 500
      glow: '#f59e0b',
    }
  }
  return {
    fill: '#064e3b', // Emerald 900
    stroke: '#10b981', // Emerald 500
    glow: '#10b981',
  }
}
