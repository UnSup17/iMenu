/**
 * Socket.IO Server — Custom Server para desarrollo local.
 *
 * Importante: Next.js en Vercel no soporta WebSockets de larga duración.
 * Este servidor es para DESARROLLO LOCAL y para deploys en Railway/Render/VPS.
 *
 * Para producción en Vercel: migrar a polling SSE o usar Ably/Pusher como alternativa.
 */

import { Server as HttpServer } from 'http'
import { Server as SocketIOServer, Socket } from 'socket.io'
import {
  WsClientEvent,
  WsStaffEvent,
  WsServerEvent,
  type ClientToServerEvents,
  type StaffToServerEvents,
  type ServerToClientEvents,
  type JoinTableSessionPayload,
  type CallWaiterPayload,
  type WaiterAcknowledgedPayload,
  type OrderStatusChangedPayload,
} from '@/types/websocket-events'
import { getTableSession } from '@/lib/redis'

type IOServer = SocketIOServer<
  ClientToServerEvents & StaffToServerEvents,
  ServerToClientEvents
>

// Persistir el singleton en globalThis para que sobreviva re-imports de módulo
// dentro del mismo proceso Node.js (custom server + API routes comparten el mismo pid).
declare global {
  // eslint-disable-next-line no-var
  var __socketIO: IOServer | undefined
}

function getIO(): IOServer | null {
  return globalThis.__socketIO ?? null
}

function setIO(server: IOServer): void {
  globalThis.__socketIO = server
}

/**
 * Inicializa el servidor Socket.IO adjunto al servidor HTTP de Next.js.
 * Se llama una sola vez desde el custom server (server.ts).
 */
export function initSocketServer(httpServer: HttpServer): IOServer {
  const existing = getIO()
  if (existing) return existing

  const io = new SocketIOServer(httpServer, {
    path: '/api/socketio',
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
      credentials: false,
    },
    transports: ['websocket', 'polling'],
  })
  setIO(io)

  console.log('[Socket.IO] Servidor iniciado en /api/socketio')

  io.on('connection', (socket: Socket) => {
    console.log(`[Socket.IO] Cliente conectado: ${socket.id}`)

    // --------------------------------------------------------
    // Comensal: Unirse a sala de mesa validando sesión
    // --------------------------------------------------------
    socket.on(WsClientEvent.JOIN_TABLE_SESSION, async (data: JoinTableSessionPayload, callback) => {
      try {
        const session = await getTableSession(data.sessionToken)

        if (!session || session.tableId !== data.tableId || session.restaurantId !== data.restaurantId) {
          callback({ success: false, error: 'Sesión inválida o expirada.' })
          return
        }

        const tableRoom = `restaurant:${data.restaurantId}:table:${data.tableId}`
        await socket.join(tableRoom)
        console.log(`[Socket.IO] Comensal unido a sala: ${tableRoom}`)
        callback({ success: true })
      } catch (err) {
        console.error('[Socket.IO] Error en JOIN_TABLE_SESSION:', err)
        callback({ success: false, error: 'Error interno del servidor.' })
      }
    })

    // --------------------------------------------------------
    // Comensal: Llamar al mesero
    // --------------------------------------------------------
    socket.on(WsClientEvent.CALL_WAITER, async (data: CallWaiterPayload, callback) => {
      try {
        const session = await getTableSession(data.sessionToken)

        if (!session || session.tableId !== data.tableId) {
          callback({ success: false, message: 'Sesión inválida.' })
          return
        }

        const staffRoom = `restaurant:${data.restaurantId}:staff`
        io?.to(staffRoom).emit(WsServerEvent.ALERT_WAITER, data)

        console.log(
          `[Socket.IO] Alerta mesero → Mesa ${data.tableNumber} | Tipo: ${data.alertType}`,
        )
        callback({ success: true })
      } catch (err) {
        console.error('[Socket.IO] Error en CALL_WAITER:', err)
        callback({ success: false, message: 'Error al enviar alerta.' })
      }
    })

    // --------------------------------------------------------
    // Staff: Unirse a sala del restaurante
    // --------------------------------------------------------
    socket.on(WsStaffEvent.JOIN_STAFF_ROOM, (data: { restaurantId: string; staffToken: string }) => {
      // TODO: Validar staffToken (JWT) antes de unir
      const staffRoom = `restaurant:${data.restaurantId}:staff`
      socket.join(staffRoom)
      console.log(`[Socket.IO] Staff unido a sala: ${staffRoom}`)
    })

    // --------------------------------------------------------
    // Staff: Mesero confirmó que va en camino
    // --------------------------------------------------------
    socket.on(WsStaffEvent.WAITER_ACKNOWLEDGED, (data: WaiterAcknowledgedPayload) => {
      const tableRoom = `restaurant:${data.restaurantId}:table:${data.tableId}`
      io?.to(tableRoom).emit(WsServerEvent.WAITER_STATUS_CHANGED, data)
      console.log(`[Socket.IO] Mesero ${data.waiterName} confirmó mesa ${data.tableId}`)
    })

    // --------------------------------------------------------
    // Staff/KDS: Actualizar estado de orden
    // --------------------------------------------------------
    socket.on(WsStaffEvent.UPDATE_ORDER_STATUS, (data: OrderStatusChangedPayload) => {
      const tableRoom = `table:${data.tableId}`
      io?.to(tableRoom).emit(WsServerEvent.ORDER_STATUS_UPDATED, data)
      console.log(`[Socket.IO] Orden ${data.orderId} → ${data.newStatus}`)
    })

    socket.on('disconnect', (reason) => {
      console.log(`[Socket.IO] Cliente desconectado: ${socket.id} (${reason})`)
    })
  })

  return io
}

/**
 * Obtiene la instancia del servidor Socket.IO (debe haberse inicializado antes).
 */
export function getSocketServer(): IOServer | null {
  return getIO()
}

/**
 * Emite un evento de nueva orden a la sala del staff del restaurante.
 * Llamado desde el API route de órdenes tras persistir en DB.
 */
export function emitNewOrder(
  restaurantId: string,
  payload: Parameters<ServerToClientEvents[WsServerEvent.ORDER_RECEIVED]>[0],
): void {
  const io = getIO()
  if (!io) {
    console.warn('[Socket.IO] emitNewOrder: servidor Socket.IO no disponible en este contexto.')
    return
  }
  const staffRoom = `restaurant:${restaurantId}:staff`
  io.to(staffRoom).emit(WsServerEvent.ORDER_RECEIVED, payload)
  console.log(`[Socket.IO] emitNewOrder → ${staffRoom}`)
}
