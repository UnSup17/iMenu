'use client'

import React, { useState, useEffect, useRef } from 'react'
import { io, type Socket } from 'socket.io-client'
import {
  WsClientEvent,
  WsServerEvent,
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
}

type CallStatus = 'IDLE' | 'CALLING' | 'WAITING_ACK' | 'ON_THE_WAY'

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
}: CallWaiterButtonProps) {
  const [status, setStatus] = useState<CallStatus>('IDLE')
  const [cooldown, setCooldown] = useState<number>(0)
  const [acknowledgedInfo, setAcknowledgedInfo] = useState<WaiterAcknowledgedPayload | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

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

  const handleCallWaiter = () => {
    if (cooldown > 0 || status === 'CALLING') return

    setStatus('CALLING')
    const socket = getSocket()

    socket.emit(
      WsClientEvent.CALL_WAITER,
      {
        restaurantId,
        tableId,
        tableNumber,
        sessionToken,
        alertType: 'HELP_REQUESTED',
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

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={handleCallWaiter}
        disabled={isDisabled}
        aria-label="Llamar al mesero"
        className={`
          relative w-full py-3 px-6 rounded-xl font-semibold text-sm
          transition-all duration-200 flex items-center justify-center gap-2
          shadow-lg active:scale-95
          ${
            status === 'ON_THE_WAY'
              ? 'bg-emerald-500 text-white shadow-emerald-500/30 cursor-default'
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
          {status === 'WAITING_ACK' && '🔔 Ayuda solicitada...'}
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
  )
}
