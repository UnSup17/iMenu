'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { type EnrichedTable } from './FloorPlanVisualizer'

interface FloorPlanEditorProps {
  restaurantId: string
  tables: EnrichedTable[]
  onSaved?: (updatedTables: EnrichedTable[]) => void
  onCancel?: () => void
}

export function FloorPlanEditor({
  restaurantId,
  tables: initialTables,
  onSaved,
  onCancel,
}: FloorPlanEditorProps) {
  const [tables, setTables] = useState<EnrichedTable[]>(() =>
    initialTables.map((t, idx) => {
      // Si la mesa no tiene posición asignada (0,0), asignarle una inicial ordenada
      const posX = t.posX || (idx % 5) * 140 + 40
      const posY = t.posY || Math.floor(idx / 5) * 130 + 40
      return {
        ...t,
        posX,
        posY,
        width: t.width || 80,
        height: t.height || 80,
        shape: t.shape || 'square',
        capacity: t.capacity || 4,
        zone: t.zone || 'Salón Principal',
      }
    })
  )

  const [selectedId, setSelectedId] = useState<string | null>(tables[0]?.id ?? null)
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; isError?: boolean } | null>(null)

  // Dragging state
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const dragOffsetRef = useRef<{ offsetX: number; offsetY: number }>({ offsetX: 0, offsetY: 0 })
  const svgRef = useRef<SVGSVGElement>(null)

  const selectedTable = tables.find((t) => t.id === selectedId) || null

  // Snap to grid helper
  const snap = (val: number, gridSize = 10) => Math.round(val / gridSize) * gridSize

  const handleMouseDown = (e: React.MouseEvent, table: EnrichedTable) => {
    setSelectedId(table.id)
    setDraggingId(table.id)

    if (!svgRef.current) return
    const rect = svgRef.current.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    dragOffsetRef.current = {
      offsetX: mouseX - table.posX,
      offsetY: mouseY - table.posY,
    }
  }

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!draggingId || !svgRef.current) return

      const rect = svgRef.current.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top

      const newX = Math.max(10, snap(mouseX - dragOffsetRef.current.offsetX))
      const newY = Math.max(10, snap(mouseY - dragOffsetRef.current.offsetY))

      setTables((prev) =>
        prev.map((t) => (t.id === draggingId ? { ...t, posX: newX, posY: newY } : t))
      )
      setHasChanges(true)
    },
    [draggingId]
  )

  const handleMouseUp = useCallback(() => {
    setDraggingId(null)
  }, [])

  // Auto organizar mesas en una cuadrícula ordenada
  const handleAutoArrange = () => {
    const arranged = tables.map((t, idx) => {
      const col = idx % 5
      const row = Math.floor(idx / 5)
      return {
        ...t,
        posX: col * 150 + 50,
        posY: row * 140 + 50,
      }
    })
    setTables(arranged)
    setHasChanges(true)
  }

  // Guardar plano completo vía API
  const handleSaveLayout = async () => {
    setIsSaving(true)
    setFeedbackMsg(null)

    try {
      const payload = {
        restaurantId,
        tables: tables.map((t) => ({
          id: t.id,
          posX: t.posX,
          posY: t.posY,
          width: t.width,
          height: t.height,
          shape: t.shape,
          zone: t.zone,
          capacity: t.capacity,
        })),
      }

      const res = await fetch('/api/tables/layout', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Error al guardar plano')
      }

      setFeedbackMsg({ text: '¡Plano guardado exitosamente!' })
      setHasChanges(false)
      onSaved?.(tables)

      setTimeout(() => setFeedbackMsg(null), 4000)
    } catch (err: any) {
      setFeedbackMsg({ text: err?.message || 'Error al guardar', isError: true })
    } finally {
      setIsSaving(false)
    }
  }

  // Dimensiones del lienzo
  const maxX = Math.max(950, ...tables.map((t) => t.posX + t.width + 100))
  const maxY = Math.max(620, ...tables.map((t) => t.posY + t.height + 100))

  return (
    <div className="space-y-4">
      {/* Barra de herramientas superior */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-zinc-900 border border-zinc-800 p-4 rounded-2xl shadow-lg">
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-white flex items-center gap-2">
            <span>✏️</span>
            <span>Editor de Plano de Salón</span>
          </span>
          {hasChanges && (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30 animate-pulse">
              ● Cambios sin guardar
            </span>
          )}
          {feedbackMsg && (
            <span
              className={`px-3 py-1 rounded-xl text-xs font-bold ${
                feedbackMsg.isError
                  ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
              }`}
            >
              {feedbackMsg.text}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleAutoArrange}
            className="px-3 py-2 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors cursor-pointer"
            title="Ordenar todas las mesas en cuadrícula"
          >
            📐 Auto-organizar
          </button>

          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-400 transition-colors cursor-pointer"
            >
              Cerrar editor
            </button>
          )}

          <button
            type="button"
            onClick={handleSaveLayout}
            disabled={isSaving || !hasChanges}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-black shadow-lg transition-all cursor-pointer ${
              hasChanges
                ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-amber-500/20 active:scale-98'
                : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
            }`}
          >
            {isSaving ? (
              <>
                <span className="animate-spin">⟳</span> Guardando...
              </>
            ) : (
              <>
                <span>💾</span> Guardar Plano
              </>
            )}
          </button>
        </div>
      </div>

      {/* Grid del editor con Canvas y Panel de Propiedades */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Lienzo interactivo Drag and Drop */}
        <div className="lg:col-span-3 bg-zinc-950 border border-zinc-800 rounded-3xl p-3 overflow-hidden shadow-2xl relative">
          <p className="text-[11px] text-zinc-500 mb-2 px-2">
            💡 <strong>Instrucciones:</strong> Haz clic y arrastra cualquier mesa para posicionarla en el salón. Selecciona una mesa para cambiar su forma, capacidad o zona en el panel derecho.
          </p>

          <div className="overflow-auto max-h-[640px] border border-zinc-800/60 rounded-2xl bg-zinc-950/80">
            <svg
              ref={svgRef}
              viewBox={`0 0 ${maxX} ${maxY}`}
              className="w-full min-w-[850px] select-none"
              style={{ height: `${maxY}px` }}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              {/* Patrón de Rejilla */}
              <defs>
                <pattern
                  id="grid-pattern"
                  width="20"
                  height="20"
                  patternUnits="userSpaceOnUse"
                >
                  <circle cx="2" cy="2" r="1.2" fill="#3f3f46" opacity="0.4" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid-pattern)" />

              {/* Mesas arrastrables */}
              {tables.map((table) => {
                const isSelected = table.id === selectedId
                const isDragging = table.id === draggingId
                const shape = table.shape || 'square'
                const cap = table.capacity || 4
                const w = table.width || 80
                const h = table.height || 80

                return (
                  <g
                    key={table.id}
                    transform={`translate(${table.posX}, ${table.posY})`}
                    className="cursor-move"
                    onMouseDown={(e) => handleMouseDown(e, table)}
                  >
                    {/* Sombra de selección */}
                    {isSelected && (
                      <rect
                        x="-6"
                        y="-6"
                        width={w + 12}
                        height={h + 12}
                        rx={shape === 'round' ? (w + 12) / 2 : 16}
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth="2"
                        strokeDasharray="4 4"
                      />
                    )}

                    {/* Mesa */}
                    {shape === 'round' ? (
                      <circle
                        cx={w / 2}
                        cy={h / 2}
                        r={w / 2}
                        fill={isDragging ? '#27272a' : isSelected ? '#3f3f46' : '#18181b'}
                        stroke={isSelected ? '#f59e0b' : '#52525b'}
                        strokeWidth={isSelected ? '3' : '2'}
                      />
                    ) : (
                      <rect
                        width={w}
                        height={h}
                        rx={shape === 'rectangle' ? 14 : 12}
                        fill={isDragging ? '#27272a' : isSelected ? '#3f3f46' : '#18181b'}
                        stroke={isSelected ? '#f59e0b' : '#52525b'}
                        strokeWidth={isSelected ? '3' : '2'}
                      />
                    )}

                    {/* Texto mesa */}
                    <text
                      x={w / 2}
                      y={h / 2 - 4}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="#ffffff"
                      className="font-black text-xs pointer-events-none"
                    >
                      Mesa {table.tableNumber}
                    </text>
                    <text
                      x={w / 2}
                      y={h / 2 + 12}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="#a1a1aa"
                      className="font-semibold text-[10px] pointer-events-none"
                    >
                      👤 {cap}
                    </text>
                  </g>
                )
              })}
            </svg>
          </div>
        </div>

        {/* Panel lateral de Inspector de Propiedades */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 space-y-5 h-fit shadow-xl">
          <div className="border-b border-zinc-800 pb-3">
            <h3 className="font-bold text-white text-sm">Propiedades de Mesa</h3>
            <p className="text-xs text-zinc-500">
              {selectedTable ? `Configuración de Mesa ${selectedTable.tableNumber}` : 'Selecciona una mesa'}
            </p>
          </div>

          {selectedTable ? (
            <div className="space-y-4 text-xs">
              {/* Forma */}
              <div className="space-y-2">
                <label className="font-bold text-zinc-300 block">Forma de Mesa</label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setTables((prev) =>
                        prev.map((t) =>
                          t.id === selectedTable.id
                            ? { ...t, shape: 'square', width: 80, height: 80 }
                            : t
                        )
                      )
                      setHasChanges(true)
                    }}
                    className={`py-2 px-1 rounded-xl font-bold flex flex-col items-center gap-1 border transition-colors cursor-pointer ${
                      selectedTable.shape === 'square'
                        ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                        : 'bg-zinc-800/80 border-zinc-700/60 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <span className="text-base">🟦</span>
                    <span className="text-[10px]">Cuadrada</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setTables((prev) =>
                        prev.map((t) =>
                          t.id === selectedTable.id
                            ? { ...t, shape: 'round', width: 80, height: 80 }
                            : t
                        )
                      )
                      setHasChanges(true)
                    }}
                    className={`py-2 px-1 rounded-xl font-bold flex flex-col items-center gap-1 border transition-colors cursor-pointer ${
                      selectedTable.shape === 'round'
                        ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                        : 'bg-zinc-800/80 border-zinc-700/60 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <span className="text-base">🔵</span>
                    <span className="text-[10px]">Redonda</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setTables((prev) =>
                        prev.map((t) =>
                          t.id === selectedTable.id
                            ? { ...t, shape: 'rectangle', width: 120, height: 75 }
                            : t
                        )
                      )
                      setHasChanges(true)
                    }}
                    className={`py-2 px-1 rounded-xl font-bold flex flex-col items-center gap-1 border transition-colors cursor-pointer ${
                      selectedTable.shape === 'rectangle'
                        ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                        : 'bg-zinc-800/80 border-zinc-700/60 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <span className="text-base">🟨</span>
                    <span className="text-[10px]">Rectangular</span>
                  </button>
                </div>
              </div>

              {/* Capacidad */}
              <div className="space-y-2">
                <label className="font-bold text-zinc-300 flex items-center justify-between">
                  <span>Capacidad (personas)</span>
                  <span className="text-amber-400 font-extrabold">{selectedTable.capacity} pers.</span>
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const newCap = Math.max(1, selectedTable.capacity - 1)
                      setTables((prev) =>
                        prev.map((t) => (t.id === selectedTable.id ? { ...t, capacity: newCap } : t))
                      )
                      setHasChanges(true)
                    }}
                    className="w-9 h-9 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-black flex items-center justify-center cursor-pointer"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={selectedTable.capacity}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 1
                      setTables((prev) =>
                        prev.map((t) => (t.id === selectedTable.id ? { ...t, capacity: val } : t))
                      )
                      setHasChanges(true)
                    }}
                    className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl py-1.5 text-center font-bold text-white focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const newCap = Math.min(30, selectedTable.capacity + 1)
                      setTables((prev) =>
                        prev.map((t) => (t.id === selectedTable.id ? { ...t, capacity: newCap } : t))
                      )
                      setHasChanges(true)
                    }}
                    className="w-9 h-9 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-black flex items-center justify-center cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Zona */}
              <div className="space-y-2">
                <label className="font-bold text-zinc-300 block">Zona / Ambiente</label>
                <input
                  type="text"
                  value={selectedTable.zone || ''}
                  placeholder="Ej: Salón Principal, Terraza, Balcón"
                  onChange={(e) => {
                    const z = e.target.value
                    setTables((prev) =>
                      prev.map((t) => (t.id === selectedTable.id ? { ...t, zone: z } : t))
                    )
                    setHasChanges(true)
                  }}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 font-medium"
                />
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {['Salón Principal', 'Terraza', 'Barra', 'VIP'].map((quickZone) => (
                    <button
                      key={quickZone}
                      type="button"
                      onClick={() => {
                        setTables((prev) =>
                          prev.map((t) =>
                            t.id === selectedTable.id ? { ...t, zone: quickZone } : t
                          )
                        )
                        setHasChanges(true)
                      }}
                      className="text-[10px] px-2 py-0.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                    >
                      {quickZone}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dimensiones (Ancho / Alto) */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800">
                <div>
                  <label className="text-[10px] text-zinc-500 block mb-1">Ancho (px)</label>
                  <input
                    type="number"
                    min="40"
                    max="250"
                    value={selectedTable.width}
                    onChange={(e) => {
                      const w = parseInt(e.target.value) || 80
                      setTables((prev) =>
                        prev.map((t) => (t.id === selectedTable.id ? { ...t, width: w } : t))
                      )
                      setHasChanges(true)
                    }}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-1.5 text-center font-bold text-white text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500 block mb-1">Alto (px)</label>
                  <input
                    type="number"
                    min="40"
                    max="250"
                    value={selectedTable.height}
                    onChange={(e) => {
                      const h = parseInt(e.target.value) || 80
                      setTables((prev) =>
                        prev.map((t) => (t.id === selectedTable.id ? { ...t, height: h } : t))
                      )
                      setHasChanges(true)
                    }}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-1.5 text-center font-bold text-white text-xs"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-zinc-500 text-xs">
              Toca una mesa en el plano para editar sus propiedades.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
