'use client'

import { useState } from 'react'

export interface EnrichedTable {
  id: string
  restaurantId?: string | null
  foodCourtId?: string | null
  tableNumber: number
  zone: string | null
  status: 'AVAILABLE' | 'ACTIVE_QR_SESSION' | 'TRADITIONAL_SERVICE' | 'MAINTENANCE' | string
  capacity: number
  posX: number
  posY: number
  width: number
  height: number
  shape: 'square' | 'round' | 'rectangle' | string
  activeSession?: {
    id: string
    sessionToken: string
    createdAt: string
    status: string
  } | null
  elapsedMinutes?: number | null
  nextReservation?: {
    id: string
    customerName: string
    customerPhone: string
    partySize: number
    reservationDate: string
    status: string
  } | null
}

interface FloorPlanVisualizerProps {
  tables: EnrichedTable[]
  onSelectTable?: (table: EnrichedTable) => void
  onOpenSession?: (table: EnrichedTable) => void
}

export function FloorPlanVisualizer({
  tables,
  onSelectTable,
  onOpenSession,
}: FloorPlanVisualizerProps) {
  const [hoveredTable, setHoveredTable] = useState<EnrichedTable | null>(null)
  const [filterZone, setFilterZone] = useState<string>('ALL')

  // Obtener lista única de zonas
  const zones = Array.from(new Set(tables.map((t) => t.zone || 'General'))).sort()

  const filteredTables =
    filterZone === 'ALL'
      ? tables
      : tables.filter((t) => (t.zone || 'General') === filterZone)

  // Encontrar límites para escalar canvas (mínimo 900x550)
  const maxX = Math.max(900, ...tables.map((t) => (t.posX || 0) + (t.width || 80) + 60))
  const maxY = Math.max(550, ...tables.map((t) => (t.posY || 0) + (t.height || 80) + 60))

  return (
    <div className="space-y-4">
      {/* Controles de filtro y leyenda */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-zinc-900/90 border border-zinc-800 p-3.5 rounded-2xl">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-zinc-400">Filtrar Zona:</span>
          <button
            onClick={() => setFilterZone('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              filterZone === 'ALL'
                ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20'
                : 'bg-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            Todas ({tables.length})
          </button>
          {zones.map((zone) => {
            const count = tables.filter((t) => (t.zone || 'General') === zone).length
            return (
              <button
                key={zone}
                onClick={() => setFilterZone(zone)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  filterZone === zone
                    ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20'
                    : 'bg-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                {zone} ({count})
              </button>
            )
          })}
        </div>

        {/* Leyenda cromática */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
            <span className="text-zinc-300 font-medium">Disponible</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-amber-500 animate-pulse shadow-sm shadow-amber-500/50" />
            <span className="text-zinc-300 font-medium">En servicio QR</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50" />
            <span className="text-zinc-300 font-medium">Tradicional</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-purple-500 shadow-sm shadow-purple-500/50" />
            <span className="text-zinc-300 font-medium">Reserva próxima</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-500 shadow-sm shadow-red-500/50" />
            <span className="text-zinc-300 font-medium">Mantenimiento</span>
          </div>
        </div>
      </div>

      {/* SVG Canvas interactivo del Plano */}
      <div className="relative w-full bg-zinc-950 border border-zinc-800/80 rounded-3xl overflow-hidden shadow-2xl">
        {/* Rejilla de fondo decorativa */}
        <div
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(circle, #52525b 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />

        <div className="overflow-auto max-h-[680px] p-4">
          <svg
            viewBox={`0 0 ${maxX} ${maxY}`}
            className="w-full min-w-[850px] transition-all"
            style={{ height: `${maxY}px` }}
          >
            {/* Defs para gradientes y sombras */}
            <defs>
              <filter id="shadow-table" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="4" stdDeviation="6" floodOpacity="0.5" />
              </filter>
              <linearGradient id="wood-table" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#27272a" />
                <stop offset="100%" stopColor="#18181b" />
              </linearGradient>
            </defs>

            {filteredTables.map((table) => {
              const posX = table.posX || 40
              const posY = table.posY || 40
              const w = table.width || 80
              const h = table.height || 80
              const shape = table.shape || 'square'
              const cap = table.capacity || 4

              const isOccupied = table.status === 'ACTIVE_QR_SESSION'
              const isTraditional = table.status === 'TRADITIONAL_SERVICE'
              const isMaintenance = table.status === 'MAINTENANCE'
              const hasUpcomingReservation = Boolean(table.nextReservation)

              // Tiempos y alertas de rotación
              const elapsed = table.elapsedMinutes ?? null
              const isOvertime = elapsed !== null && elapsed >= 90
              const isMediumTime = elapsed !== null && elapsed >= 45 && elapsed < 90

              // Colores de borde y acento
              let strokeColor = '#10b981' // emerald
              let fillColor = 'rgba(16, 185, 129, 0.12)'
              let badgeColor = '#34d399'

              if (isMaintenance) {
                strokeColor = '#ef4444'
                fillColor = 'rgba(239, 68, 68, 0.15)'
                badgeColor = '#f87171'
              } else if (isOccupied) {
                if (isOvertime) {
                  strokeColor = '#f43f5e' // Rose / Red alert
                  fillColor = 'rgba(244, 63, 94, 0.22)'
                  badgeColor = '#fb7185'
                } else if (isMediumTime) {
                  strokeColor = '#f59e0b' // Amber
                  fillColor = 'rgba(245, 158, 11, 0.2)'
                  badgeColor = '#fbbf24'
                } else {
                  strokeColor = '#eab308' // Yellow
                  fillColor = 'rgba(234, 179, 8, 0.16)'
                  badgeColor = '#fde047'
                }
              } else if (isTraditional) {
                strokeColor = '#3b82f6'
                fillColor = 'rgba(59, 130, 246, 0.18)'
                badgeColor = '#60a5fa'
              } else if (hasUpcomingReservation) {
                strokeColor = '#a855f7'
                fillColor = 'rgba(168, 85, 247, 0.18)'
                badgeColor = '#c084fc'
              }

              // Dibujar sillas perimetrales
              const chairs = []
              const chairRadius = 6
              const chairColor = '#52525b'

              if (shape === 'round') {
                const radius = w / 2
                const cx = posX + radius
                const cy = posY + radius
                for (let i = 0; i < cap; i++) {
                  const angle = (i * 2 * Math.PI) / cap - Math.PI / 2
                  const dist = radius + 11
                  const chX = cx + dist * Math.cos(angle)
                  const chY = cy + dist * Math.sin(angle)
                  chairs.push(
                    <circle
                      key={`ch-${table.id}-${i}`}
                      cx={chX}
                      cy={chY}
                      r={chairRadius}
                      fill={chairColor}
                      stroke="#27272a"
                      strokeWidth="1.5"
                    />
                  )
                }
              } else {
                // Cuadrada o rectangular: distribuir sillas a los costados
                const sideCount = Math.max(1, Math.floor(cap / 2))
                for (let i = 0; i < sideCount; i++) {
                  const stepX = w / (sideCount + 1)
                  // Arriba y abajo
                  chairs.push(
                    <rect
                      key={`ch-t-${table.id}-${i}`}
                      x={posX + stepX * (i + 1) - 6}
                      y={posY - 10}
                      width={12}
                      height={6}
                      rx={2}
                      fill={chairColor}
                    />
                  )
                  chairs.push(
                    <rect
                      key={`ch-b-${table.id}-${i}`}
                      x={posX + stepX * (i + 1) - 6}
                      y={posY + h + 4}
                      width={12}
                      height={6}
                      rx={2}
                      fill={chairColor}
                    />
                  )
                }
              }

              return (
                <g
                  key={table.id}
                  className="cursor-pointer transition-transform duration-150 hover:scale-[1.02] origin-center"
                  onClick={() => onSelectTable?.(table)}
                  onMouseEnter={() => setHoveredTable(table)}
                  onMouseLeave={() => setHoveredTable(null)}
                >
                  {/* Sillas */}
                  {chairs}

                  {/* Mesa principal según forma */}
                  {shape === 'round' ? (
                    <circle
                      cx={posX + w / 2}
                      cy={posY + h / 2}
                      r={w / 2}
                      fill={fillColor}
                      stroke={strokeColor}
                      strokeWidth={isOvertime ? '3.5' : '2.5'}
                      filter="url(#shadow-table)"
                    />
                  ) : (
                    <rect
                      x={posX}
                      y={posY}
                      width={w}
                      height={h}
                      rx={shape === 'rectangle' ? 14 : 12}
                      fill={fillColor}
                      stroke={strokeColor}
                      strokeWidth={isOvertime ? '3.5' : '2.5'}
                      filter="url(#shadow-table)"
                    />
                  )}

                  {/* Número de mesa */}
                  <text
                    x={posX + w / 2}
                    y={posY + h / 2 - (isOccupied || hasUpcomingReservation ? 6 : 0)}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="font-black text-white text-sm select-none"
                    fill="#ffffff"
                    style={{ fontSize: shape === 'rectangle' ? '15px' : '14px' }}
                  >
                    Mesa {table.tableNumber}
                  </text>

                  {/* Capacidad y Zona */}
                  <text
                    x={posX + w / 2}
                    y={posY + h / 2 + 13}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="text-[10px] font-semibold text-zinc-400 select-none"
                    fill="#a1a1aa"
                  >
                    👤 {cap}
                  </text>

                  {/* Tiempo en mesa si está ocupada */}
                  {isOccupied && elapsed !== null && (
                    <g transform={`translate(${posX + w / 2 - 28}, ${posY + h - 6})`}>
                      <rect
                        width={56}
                        height={18}
                        rx={9}
                        fill={isOvertime ? '#e11d48' : '#27272a'}
                        stroke={strokeColor}
                        strokeWidth="1"
                      />
                      <text
                        x={28}
                        y={10}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="#ffffff"
                        className="text-[10px] font-bold"
                        style={{ fontSize: '9px' }}
                      >
                        ⏱️ {elapsed}m
                      </text>
                    </g>
                  )}

                  {/* Indicador de reserva próxima si aplica */}
                  {!isOccupied && hasUpcomingReservation && (
                    <g transform={`translate(${posX + w / 2 - 24}, ${posY + h - 6})`}>
                      <rect
                        width={48}
                        height={16}
                        rx={8}
                        fill="#581c87"
                        stroke="#c084fc"
                        strokeWidth="1"
                      />
                      <text
                        x={24}
                        y={9}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="#f3e8ff"
                        className="text-[9px] font-bold"
                        style={{ fontSize: '8.5px' }}
                      >
                        📅 Reserva
                      </text>
                    </g>
                  )}
                </g>
              )
            })}
          </svg>
        </div>

        {/* Tooltip flotante al pasar sobre mesa */}
        {hoveredTable && (
          <div className="absolute bottom-4 left-4 z-20 bg-zinc-900/95 border border-zinc-700/80 backdrop-blur-md rounded-2xl p-4 text-xs space-y-2 shadow-2xl max-w-xs animate-in fade-in">
            <div className="flex items-center justify-between gap-3">
              <span className="font-extrabold text-white text-sm">
                Mesa {hoveredTable.tableNumber}
              </span>
              <span className="text-zinc-400 font-medium">
                {hoveredTable.zone || 'General'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-zinc-300 pt-1 border-t border-zinc-800">
              <div>
                <span className="text-zinc-500 block text-[10px]">Capacidad:</span>
                <span className="font-semibold">👤 {hoveredTable.capacity} personas</span>
              </div>
              <div>
                <span className="text-zinc-500 block text-[10px]">Forma:</span>
                <span className="capitalize font-semibold">{hoveredTable.shape}</span>
              </div>
            </div>

            {hoveredTable.elapsedMinutes !== null && hoveredTable.elapsedMinutes !== undefined && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-2 text-amber-300 font-medium flex items-center justify-between">
                <span>Tiempo ocupada:</span>
                <span className="font-bold">⏱️ {hoveredTable.elapsedMinutes} min</span>
              </div>
            )}

            {hoveredTable.nextReservation && (
              <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-2 text-purple-200">
                <span className="font-bold block text-[11px]">
                  📅 Reserva: {hoveredTable.nextReservation.customerName}
                </span>
                <span className="text-[10px] text-purple-300">
                  {hoveredTable.nextReservation.partySize} personas •{' '}
                  {new Date(hoveredTable.nextReservation.reservationDate).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
