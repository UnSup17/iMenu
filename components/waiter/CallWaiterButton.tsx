import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { io, type Socket } from 'socket.io-client'
import {
  WsClientEvent,
  WsServerEvent,
  type AlertType,
  type WaiterAcknowledgedPayload,
  type ClientToServerEvents,
  type ServerToClientEvents,
} from '@/types/websocket-events'

interface CallWaiterButtonProps {
  restaurantId: string
  tableId: string
  tableNumber: number
  sessionToken: string
  cooldownSeconds?: number
  variant?: 'full' | 'compact'
}

type CallStatus = 'IDLE' | 'CALLING' | 'WAITING_ACK' | 'ON_THE_WAY'

interface AlertOption {
  type: AlertType
  icon: string
  title: string
  subtitle: string
  badgeLabel: string
  iconBg: string
  borderHover: string
}

const ALERT_OPTIONS: AlertOption[] = [
  {
    type: 'HELP_REQUESTED',
    icon: '🙋',
    title: 'Solicitar Asistencia',
    subtitle: 'Dudas con el menú, ordenar algo más o atención del mesero.',
    badgeLabel: 'Asistencia solicitada',
    iconBg: 'bg-amber-500/15 border-amber-500/30 text-amber-300',
    borderHover: 'hover:border-amber-500/50',
  },
  {
    type: 'BILL_REQUESTED',
    icon: '💳',
    title: 'Pedir la Cuenta',
    subtitle: 'Solicitar el total de la mesa para pagar en efectivo o tarjeta.',
    badgeLabel: 'Cuenta solicitada',
    iconBg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300',
    borderHover: 'hover:border-emerald-500/50',
  },
  {
    type: 'SPILL_CLEANUP',
    icon: '🧹',
    title: 'Limpieza de Mesa',
    subtitle: 'Se derramó algo, retirar platos vacíos o limpiar la mesa.',
    badgeLabel: 'Limpieza solicitada',
    iconBg: 'bg-blue-500/15 border-blue-500/30 text-blue-300',
    borderHover: 'hover:border-blue-500/50',
  },
]

let globalSocket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null

function getSocket(): Socket<ServerToClientEvents, ClientToServerEvents> {
  if (!globalSocket) {
    const socketUrl =
      process.env.NEXT_PUBLIC_SOCKET_URL ||
      (typeof window !== 'undefined' ? window.location.origin : '')

    globalSocket = io(socketUrl, {
      path: '/api/socketio',
      transports: ['websocket', 'polling'],
    })
  }
  return globalSocket
}

export function CallWaiterButton({
  restaurantId,
  tableId,
  tableNumber,
  sessionToken,
  cooldownSeconds = 60,
  variant = 'full',
}: CallWaiterButtonProps) {
  const [status, setStatus] = useState<CallStatus>('IDLE')
  const [cooldown, setCooldown] = useState<number>(0)
  const [acknowledgedInfo, setAcknowledgedInfo] = useState<WaiterAcknowledgedPayload | null>(null)
  const [activeAlertType, setActiveAlertType] = useState<AlertType>('HELP_REQUESTED')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const socket = getSocket()

    // Unirse a la sala de la mesa
    socket.emit(WsClientEvent.JOIN_TABLE_SESSION, { restaurantId, tableId, sessionToken }, (ack) => {
      if (!ack.success) console.warn('[WS] No se pudo unir a la sala de mesa:', ack.error)
    })

    // Escuchar confirmación del mesero
    const handleWaiterAck = (data: WaiterAcknowledgedPayload) => {
      if (data.tableId === tableId) {
        setStatus('ON_THE_WAY')
        setAcknowledgedInfo(data)
      }
    }

    socket.on(WsServerEvent.WAITER_STATUS_CHANGED, handleWaiterAck)

    return () => {
      socket.off(WsServerEvent.WAITER_STATUS_CHANGED, handleWaiterAck)
    }
  }, [restaurantId, tableId, sessionToken])

  // Cerrar modal con tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isModalOpen) {
        setIsModalOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isModalOpen])

  // Cuenta regresiva del cooldown
  useEffect(() => {
    if (cooldown <= 0) return

    intervalRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [cooldown])

  const handleOpenModal = () => {
    if (cooldown > 0 || status === 'CALLING') return
    setIsModalOpen(true)
  }

  const handleSendAlert = (type: AlertType) => {
    setIsModalOpen(false)
    setActiveAlertType(type)
    setStatus('CALLING')

    const socket = getSocket()

    socket.emit(
      WsClientEvent.CALL_WAITER,
      {
        restaurantId,
        tableId,
        tableNumber,
        sessionToken,
        alertType: type,
        timestamp: new Date().toISOString(),
      },
      (ack) => {
        if (ack.success) {
          setStatus('WAITING_ACK')
          setCooldown(cooldownSeconds)
        } else {
          setStatus('IDLE')
          console.error('[WS] Error al llamar mesero:', ack.message)
        }
      },
    )
  }

  const isDisabled = cooldown > 0 || status === 'CALLING'
  const activeOption = ALERT_OPTIONS.find((opt) => opt.type === activeAlertType) ?? ALERT_OPTIONS[0]

  // Icono del botón según el estado
  const getButtonIcon = () => {
    if (status === 'CALLING') {
      return <span className="h-5 w-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
    }
    if (status === 'WAITING_ACK') {
      return <span className="animate-bounce inline-block text-xl">{activeOption.icon}</span>
    }
    if (status === 'ON_THE_WAY') {
      return '🏃‍♂️'
    }
    return '🛎️'
  }

  return (
    <>
      {variant === 'compact' ? (
        <div className="relative flex flex-col items-center">
          {/* Tooltip con info de mesero en camino */}
          {status === 'ON_THE_WAY' && acknowledgedInfo && (
            <div className="absolute bottom-16 bg-zinc-900 border border-emerald-500/30 text-emerald-400 text-xs py-1.5 px-3 rounded-xl shadow-lg whitespace-nowrap animate-bounce flex items-center gap-1 z-20">
              <span>✨ {acknowledgedInfo.waiterName} en camino</span>
              {acknowledgedInfo.estimatedMinutes ? (
                <span className="text-[10px] text-zinc-400">({acknowledgedInfo.estimatedMinutes}m)</span>
              ) : (
                ''
              )}
            </div>
          )}

          {/* Tooltip de solicitud enviada en espera */}
          {status === 'WAITING_ACK' && (
            <div className="absolute bottom-16 bg-zinc-900 border border-amber-500/30 text-amber-300 text-xs py-1.5 px-3 rounded-xl shadow-lg whitespace-nowrap animate-pulse flex items-center gap-1.5 z-20">
              <span>{activeOption.icon}</span>
              <span>{activeOption.badgeLabel}</span>
            </div>
          )}

          <button
            onClick={handleOpenModal}
            disabled={isDisabled}
            aria-label="Llamar al mesero"
            className="relative w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-200 shadow-lg active:scale-95 text-xl border focus-visible:outline-none cursor-pointer"
            style={status === 'ON_THE_WAY' ? {
              backgroundColor: '#10b981',
              color: '#ffffff',
            } : status === 'WAITING_ACK' ? {
              backgroundColor: 'color-mix(in srgb, var(--brand-primary) 20%, transparent)',
              borderColor: 'color-mix(in srgb, var(--brand-primary) 40%, transparent)',
              color: '#ffffff',
            } : isDisabled ? {
              backgroundColor: 'color-mix(in srgb, var(--brand-surface) 60%, transparent)',
              color: 'var(--brand-muted)',
              cursor: 'not-allowed',
            } : {
              backgroundColor: 'var(--brand-surface)',
              borderColor: 'color-mix(in srgb, var(--brand-surface) 60%, var(--brand-text) 15%)',
              color: 'var(--brand-text)',
            }}
          >
            {getButtonIcon()}

            {/* Cooldown overlay */}
            {cooldown > 0 && status !== 'ON_THE_WAY' && (
              <span className="absolute inset-0 flex items-center justify-center bg-black/70 rounded-2xl text-xs font-bold text-zinc-300">
                {cooldown}s
              </span>
            )}
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 w-full">
          <button
              onClick={handleOpenModal}
              disabled={isDisabled}
              aria-label="Llamar al mesero"
              className={`
              relative w-full py-3 px-6 rounded-xl font-semibold text-sm
              transition-all duration-200 flex items-center justify-center gap-2
              shadow-lg active:scale-95
              ${status === 'ON_THE_WAY'
                  ? 'bg-emerald-500 text-white shadow-emerald-500/30 cursor-default'
              : status === 'WAITING_ACK'
                ? 'bg-amber-600 text-white shadow-amber-600/30 cursor-default'
                    : isDisabled
                      ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed shadow-none'
                      : 'bg-amber-500 hover:bg-amber-400 text-white shadow-amber-500/40 cursor-pointer'
                }
            `}
            >
              {status === 'CALLING' && (
                <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}

              <span>
                {status === 'IDLE' && '🛎️ Llamar al Mesero'}
                {status === 'CALLING' && 'Enviando...'}
                {status === 'WAITING_ACK' && `${activeOption.icon} ${activeOption.badgeLabel}...`}
                {status === 'ON_THE_WAY' && '✅ ¡Mesero en camino!'}
                {cooldown > 0 && status !== 'ON_THE_WAY' && ` (${cooldown}s)`}
              </span>
            </button>

            {status === 'ON_THE_WAY' && acknowledgedInfo && (
              <p className="text-xs text-emerald-400 font-medium animate-pulse text-center">
                {acknowledgedInfo.waiterName} viene en camino a tu mesa
                {acknowledgedInfo.estimatedMinutes ? ` (~${acknowledgedInfo.estimatedMinutes} min)` : ''}.
              </p>
            )}
          </div>
      )}

      {/* ── Modal de Selección de Asistencia (Portal) ── */}
      {mounted && isModalOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={() => setIsModalOpen(false)}
          />

          {/* Contenedor del Modal */}
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="waiter-modal-title"
            className="relative w-full max-w-md border p-5 sm:p-6 shadow-2xl space-y-4 animate-in fade-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200 z-10"
            style={{
              backgroundColor: 'var(--brand-surface)',
              borderColor: 'color-mix(in srgb, var(--brand-surface) 60%, var(--brand-text) 15%)',
              borderRadius: 'var(--brand-radius)',
            }}
          >
            {/* Grabber bar móvil */}
            <div className="w-12 h-1 bg-zinc-700 rounded-full mx-auto sm:hidden -mt-1 mb-2" />

            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-2xl border flex items-center justify-center text-xl"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--brand-primary) 15%, transparent)',
                    borderColor: 'color-mix(in srgb, var(--brand-primary) 35%, transparent)',
                    color: 'var(--brand-primary)',
                  }}
                >
                  🛎️
                </div>
                <div>
                  <h3
                    id="waiter-modal-title"
                    className="text-base font-bold leading-tight"
                    style={{
                      color: 'var(--brand-text)',
                      fontFamily: 'var(--brand-font-heading)',
                    }}
                  >
                    ¿Cómo podemos ayudarte?
                  </h3>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--brand-muted)' }}>
                    Mesa {tableNumber} • Notificaremos a tu mesero
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                aria-label="Cerrar ventana"
                className="w-8 h-8 rounded-full border flex items-center justify-center text-sm transition-colors cursor-pointer"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--brand-surface) 80%, var(--brand-bg) 20%)',
                  borderColor: 'color-mix(in srgb, var(--brand-surface) 60%, var(--brand-text) 15%)',
                  color: 'var(--brand-muted)',
                }}
              >
                ✕
              </button>
            </div>

            {/* Opciones */}
            <div className="space-y-2.5 pt-1">
              {ALERT_OPTIONS.map((opt) => (
                <button
                  key={opt.type}
                  onClick={() => handleSendAlert(opt.type)}
                  className="w-full flex items-center gap-3.5 p-3.5 rounded-2xl border transition-all text-left active:scale-[0.98] group cursor-pointer"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--brand-surface) 70%, var(--brand-bg) 30%)',
                    borderColor: 'color-mix(in srgb, var(--brand-surface) 60%, var(--brand-text) 12%)',
                  }}
                >
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center text-2xl border ${opt.iconBg} shrink-0 transition-transform group-hover:scale-105`}
                  >
                    {opt.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4
                        className="font-semibold text-sm transition-colors"
                        style={{ color: 'var(--brand-text)' }}
                      >
                        {opt.title}
                      </h4>
                      <span className="text-xs group-hover:translate-x-1 transition-transform" style={{ color: 'var(--brand-muted)' }}>
                        →
                      </span>
                    </div>
                    <p className="text-xs mt-0.5 leading-snug" style={{ color: 'var(--brand-muted)' }}>
                      {opt.subtitle}
                    </p>
                  </div>
                </button>
              ))}
            </div>

            {/* Footer */}
            <p className="text-[11px] text-zinc-500 text-center pt-1">
              El personal del restaurante recibirá la alerta de inmediato en su pantalla.
            </p>
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}

