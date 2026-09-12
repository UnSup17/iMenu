'use client'

import { useState } from 'react'
import { FloorPlanVisualizer, type EnrichedTable } from '@/components/tables/FloorPlanVisualizer'
import { FloorPlanEditor } from '@/components/tables/FloorPlanEditor'
import { ReservationsTab } from '@/components/tables/ReservationsTab'

interface SessionResult {
  menuUrl: string
  qrCodeDataUrl: string
  expiresAt: string
  tableNumber: number
}

interface TablesGridProps {
  restaurantId: string
  tables: EnrichedTable[]
  totalCapacity: number
  occupiedCapacity: number
  occupancyPercent: number
  overtimeCount: number
}

const statusLabel: Record<string, { label: string; color: string; dot: string }> = {
  AVAILABLE: {
    label: 'Disponible',
    color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    dot: 'bg-emerald-400',
  },
  ACTIVE_QR_SESSION: {
    label: 'En servicio (QR)',
    color: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    dot: 'bg-amber-400 animate-pulse',
  },
  TRADITIONAL_SERVICE: {
    label: 'Servicio tradicional',
    color: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    dot: 'bg-blue-400',
  },
  MAINTENANCE: {
    label: 'Mantenimiento',
    color: 'bg-red-500/10 text-red-400 border-red-500/20',
    dot: 'bg-red-400',
  },
}

export function TablesGrid({
  restaurantId,
  tables: initialTables,
  totalCapacity,
  occupiedCapacity,
  occupancyPercent,
  overtimeCount,
}: TablesGridProps) {
  const [tables, setTables] = useState<EnrichedTable[]>(initialTables)
  const [viewMode, setViewMode] = useState<'plan' | 'editor' | 'grid' | 'reservations'>('plan')
  const [selectedTable, setSelectedTable] = useState<EnrichedTable | null>(null)

  // QR Modal
  const [session, setSession] = useState<SessionResult | null>(null)
  const [showQr, setShowQr] = useState(false)
  const [loadingSession, setLoadingSession] = useState(false)
  const [sessionError, setSessionError] = useState<string | null>(null)
  const [closingTableId, setClosingTableId] = useState<string | null>(null)
  const [confirmRelease, setConfirmRelease] = useState(false)

  // Iniciar sesión QR
  const handleOpenSession = async (table: EnrichedTable) => {
    setLoadingSession(true)
    setSessionError(null)
    try {
      const res = await fetch(`/api/tables/${table.id}/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurantId }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Error al crear sesión')
      }
      const data: SessionResult = await res.json()
      setSession(data)
      setShowQr(true)

      // Actualizar estado local
      setTables((prev) =>
        prev.map((t) =>
          t.id === table.id
            ? {
                ...t,
                status: 'ACTIVE_QR_SESSION',
                elapsedMinutes: 0,
                activeSession: {
                  id: 'temp',
                  sessionToken: data.menuUrl.split('token=')[1] || '',
                  createdAt: new Date().toISOString(),
                  status: 'ACTIVE',
                },
              }
            : t
        )
      )
    } catch (e: any) {
      setSessionError(e.message)
    } finally {
      setLoadingSession(false)
    }
  }

  // Cerrar sesión y liberar mesa (sin window.confirm bloqueante)
  const executeCloseSession = async (table: EnrichedTable) => {
    setClosingTableId(table.id)
    try {
      const res = await fetch(`/api/tables/${table.id}/session`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantId,
          sessionToken: table.activeSession?.sessionToken,
          forceClose: true,
        }),
      })
      const data = await res.json()
      if (!res.ok || data.success === false) {
        throw new Error(data.error || data.message || 'Error al cerrar sesión')
      }

      setTables((prev) =>
        prev.map((t) =>
          t.id === table.id
            ? { ...t, status: 'AVAILABLE', activeSession: null, elapsedMinutes: null }
            : t
        )
      )
      setConfirmRelease(false)
      if (selectedTable?.id === table.id) {
        setSelectedTable(null)
      }
    } catch (e: any) {
      alert(e.message || 'Error al liberar la mesa')
    } finally {
      setClosingTableId(null)
    }
  }

  const copyUrl = () => {
    if (session?.menuUrl) {
      navigator.clipboard.writeText(session.menuUrl)
    }
  }

  // Agrupado por zona para la vista cuadrícula
  const byZone = tables.reduce<Record<string, EnrichedTable[]>>((acc, table) => {
    const zone = table.zone ?? 'General'
    if (!acc[zone]) acc[zone] = []
    acc[zone].push(table)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      {/* KPI Banner de Rotación, Ocupación y Tiempos */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-base">🪑</span>
            <span className="text-xs text-zinc-400 font-semibold">Ocupación en Vivo</span>
          </div>
          <p className="text-2xl font-black text-white">
            {occupancyPercent}%
            <span className="text-xs font-normal text-zinc-500 ml-2">
              ({occupiedCapacity}/{totalCapacity} asientos)
            </span>
          </p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <span className="text-xs text-zinc-400 font-semibold">Mesas Disponibles</span>
          </div>
          <p className="text-2xl font-bold text-emerald-400">
            {tables.filter((t) => t.status === 'AVAILABLE').length}
          </p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-xs text-zinc-400 font-semibold">En Servicio Activo</span>
          </div>
          <p className="text-2xl font-bold text-amber-400">
            {tables.filter((t) => t.status === 'ACTIVE_QR_SESSION' || t.status === 'TRADITIONAL_SERVICE').length}
          </p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-base">⚠️</span>
            <span className="text-xs text-zinc-400 font-semibold">Sobretiempo (&gt;90m)</span>
          </div>
          <p
            className={`text-2xl font-bold ${
              overtimeCount > 0 ? 'text-red-400 animate-pulse' : 'text-zinc-500'
            }`}
          >
            {overtimeCount} {overtimeCount === 1 ? 'mesa' : 'mesas'}
          </p>
        </div>
      </div>

      {/* Selector de Vistas Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-zinc-900/70 border border-zinc-800 p-2 rounded-2xl">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            onClick={() => setViewMode('plan')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'plan'
                ? 'bg-amber-500 text-zinc-950 shadow-lg shadow-amber-500/20 font-black'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <span>🗺️</span>
            <span>Plano del Salón (SVG en vivo)</span>
          </button>

          <button
            onClick={() => setViewMode('editor')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'editor'
                ? 'bg-amber-500 text-zinc-950 shadow-lg shadow-amber-500/20 font-black'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <span>✏️</span>
            <span>Editor Drag & Drop</span>
          </button>

          <button
            onClick={() => setViewMode('grid')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'grid'
                ? 'bg-amber-500 text-zinc-950 shadow-lg shadow-amber-500/20 font-black'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <span>📊</span>
            <span>Vista Cuadrícula</span>
          </button>

          <button
            onClick={() => setViewMode('reservations')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'reservations'
                ? 'bg-amber-500 text-zinc-950 shadow-lg shadow-amber-500/20 font-black'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <span>📅</span>
            <span>Reservaciones</span>
          </button>
        </div>

        <span className="text-xs text-zinc-500 hidden sm:inline px-3">
          {tables.length} mesas configuradas
        </span>
      </div>

      {/* Vistas */}
      {viewMode === 'plan' && (
        <FloorPlanVisualizer
          tables={tables}
          onSelectTable={(table) => setSelectedTable(table)}
          onOpenSession={(table) => handleOpenSession(table)}
        />
      )}

      {viewMode === 'editor' && (
        <FloorPlanEditor
          restaurantId={restaurantId}
          tables={tables}
          onSaved={(updated) => {
            setTables(updated)
            setViewMode('plan')
          }}
          onCancel={() => setViewMode('plan')}
        />
      )}

      {viewMode === 'reservations' && (
        <ReservationsTab
          restaurantId={restaurantId}
          tables={tables}
          onReservationSeated={(tableId) => {
            setTables((prev) =>
              prev.map((t) =>
                t.id === tableId ? { ...t, status: 'ACTIVE_QR_SESSION', elapsedMinutes: 0 } : t
              )
            )
          }}
        />
      )}

      {viewMode === 'grid' && (
        <div className="space-y-6">
          {Object.entries(byZone).map(([zone, zoneTables]) => (
            <section key={zone}>
              <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                <span className="w-1 h-4 bg-amber-500 rounded-full" />
                {zone}
                <span className="text-zinc-600 font-normal normal-case tracking-normal">
                  ({zoneTables.length} mesas)
                </span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {zoneTables.map((table) => {
                  const s = statusLabel[table.status] ?? statusLabel.AVAILABLE
                  const isOccupied = table.status === 'ACTIVE_QR_SESSION'
                  const elapsed = table.elapsedMinutes ?? null
                  const isOvertime = elapsed !== null && elapsed >= 90

                  return (
                    <div
                      key={table.id}
                      onClick={() => setSelectedTable(table)}
                      className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-2xl p-4 transition-all space-y-3 cursor-pointer hover:shadow-xl"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-bold text-white text-lg leading-tight">
                            Mesa {table.tableNumber}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-zinc-500">{table.zone || 'General'}</span>
                            <span className="text-[10px] text-zinc-400 bg-zinc-800 px-1.5 py-0.5 rounded-md font-semibold">
                              👤 {table.capacity} pers
                            </span>
                          </div>
                        </div>
                        <span
                          className={`inline-flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-full border ${s.color}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                          {s.label}
                        </span>
                      </div>

                      {/* Tiempo en mesa */}
                      {isOccupied && elapsed !== null && (
                        <div
                          className={`flex items-center justify-between text-xs px-3 py-1.5 rounded-xl border font-bold ${
                            isOvertime
                              ? 'bg-red-500/15 border-red-500/30 text-red-400 animate-pulse'
                              : elapsed >= 45
                              ? 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                              : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                          }`}
                        >
                          <span>Tiempo en mesa:</span>
                          <span>
                            ⏱️ {elapsed} min {isOvertime && '⚠️'}
                          </span>
                        </div>
                      )}

                      {/* Próxima reserva si existe */}
                      {table.nextReservation && (
                        <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl px-3 py-1.5 text-[11px] text-purple-300 font-medium flex items-center justify-between">
                          <span>📅 {table.nextReservation.customerName}</span>
                          <span className="font-bold">
                            {new Date(table.nextReservation.reservationDate).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      )}

                      {/* Botones de acción rápida */}
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleOpenSession(table)
                          }}
                          disabled={loadingSession}
                          className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 px-3 py-2 rounded-xl transition-all disabled:opacity-50 cursor-pointer"
                        >
                          {isOccupied ? '🔄 Ver QR' : '📱 Iniciar QR'}
                        </button>
                        {isOccupied && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              executeCloseSession(table)
                            }}
                            disabled={closingTableId === table.id}
                            title="Liberar mesa ahora"
                            className="px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20 text-xs font-bold transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1"
                          >
                            {closingTableId === table.id ? (
                              <div className="w-3.5 h-3.5 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />
                            ) : (
                              <span>🔓 Liberar</span>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Drawer / Modal de Control Rápido de Mesa Seleccionada */}
      {selectedTable && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in"
          onClick={() => setSelectedTable(null)}
        >
          <div
            className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 max-w-sm w-full space-y-5 shadow-2xl text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-zinc-800 pb-3">
              <div>
                <h3 className="font-extrabold text-xl">Mesa {selectedTable.tableNumber}</h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Zona: {selectedTable.zone || 'General'} • Forma: {selectedTable.shape}
                </p>
              </div>
              <button
                onClick={() => setSelectedTable(null)}
                className="text-zinc-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs bg-zinc-950 p-3 rounded-2xl border border-zinc-800/80">
              <div>
                <span className="text-zinc-500 block text-[10px]">Capacidad:</span>
                <span className="font-bold text-white">👤 {selectedTable.capacity} comensales</span>
              </div>
              <div>
                <span className="text-zinc-500 block text-[10px]">Estado actual:</span>
                <span className="font-bold text-amber-400">
                  {statusLabel[selectedTable.status]?.label || selectedTable.status}
                </span>
              </div>
              {selectedTable.elapsedMinutes !== null && selectedTable.elapsedMinutes !== undefined && (
                <div className="col-span-2 pt-2 border-t border-zinc-800/80 flex items-center justify-between">
                  <span className="text-zinc-500 text-[10px]">Tiempo ocupada:</span>
                  <span className="font-extrabold text-amber-300">
                    ⏱️ {selectedTable.elapsedMinutes} minutos
                  </span>
                </div>
              )}
            </div>

            {selectedTable.nextReservation && (
              <div className="bg-purple-500/10 border border-purple-500/20 rounded-2xl p-3 text-xs space-y-1">
                <span className="font-extrabold text-purple-300 block">
                  📅 Reservación para esta mesa:
                </span>
                <p className="text-white font-medium">
                  {selectedTable.nextReservation.customerName} ({selectedTable.nextReservation.partySize} pers.)
                </p>
                <p className="text-[10px] text-purple-400">
                  Hora:{' '}
                  {new Date(selectedTable.nextReservation.reservationDate).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            )}

            {/* Acciones */}
            <div className="space-y-2 pt-1">
              <button
                onClick={() => handleOpenSession(selectedTable)}
                disabled={loadingSession}
                className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs shadow-lg shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {selectedTable.status === 'ACTIVE_QR_SESSION'
                  ? '🔄 Generar / Ver QR'
                  : '📱 Iniciar Sesión QR'}
              </button>

              {selectedTable.status !== 'AVAILABLE' && (
                confirmRelease ? (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-3 space-y-2">
                    <p className="text-xs text-red-300 font-medium text-center">
                      ¿Cerrar sesión y liberar la Mesa {selectedTable.tableNumber}?
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setConfirmRelease(false)}
                        className="flex-1 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={() => executeCloseSession(selectedTable)}
                        disabled={closingTableId === selectedTable.id}
                        className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg shadow-red-600/30 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {closingTableId === selectedTable.id ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>Liberando...</span>
                          </>
                        ) : (
                          <span>Sí, Liberar Mesa</span>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmRelease(true)}
                    className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 border border-zinc-700 font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>🔓 Liberar y Cerrar Mesa</span>
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* QR Modal */}
      {showQr && session && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in"
          onClick={() => setShowQr(false)}
        >
          <div
            className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-white">Mesa {session.tableNumber}</h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Expira:{' '}
                  {new Date(session.expiresAt).toLocaleTimeString('es-MX', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
              <button
                onClick={() => setShowQr(false)}
                className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* QR Code */}
            <div className="flex justify-center bg-white rounded-2xl p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={session.qrCodeDataUrl} alt="QR Code" className="w-48 h-48" />
            </div>

            {/* Menu URL */}
            <div className="bg-zinc-800 rounded-xl p-3 space-y-1">
              <p className="text-[10px] text-zinc-400 font-semibold uppercase">URL del menú:</p>
              <p className="text-xs text-zinc-300 break-all font-mono leading-relaxed">
                {session.menuUrl}
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={copyUrl}
                className="flex-1 flex items-center justify-center gap-2 text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-4 py-2.5 rounded-xl transition-all cursor-pointer"
              >
                📋 Copiar URL
              </button>
              <a
                href={session.menuUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-zinc-950 px-4 py-2.5 rounded-xl transition-all"
              >
                🔗 Abrir menú
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
