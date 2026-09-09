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
  type SharedCartItemPayload,
  type UpdateSharedCartPayload,
  type ConfirmedOrderPayload,
  type InventoryUpdatedPayload,
  type ProductUnavailablePayload,
  type ProductAvailablePayload,
  type FoodCourtPaymentUpdatedPayload,
} from '@/types/websocket-events'
import { getTableSession, getSharedTableCart, storeSharedTableCart } from '@/lib/redis'
import { prisma } from '@/lib/prisma'

type IOServer = SocketIOServer<
  ClientToServerEvents & StaffToServerEvents,
  ServerToClientEvents
>

// Mapeo en memoria de participantes activos por mesa: tableId -> Map<socketId, userName>
const activeParticipantsMap = new Map<string, Map<string, string>>()

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

    let joinedTableId: string | null = null

    // --------------------------------------------------------
    // Comensal: Unirse a sala de mesa validando sesión
    // --------------------------------------------------------
    socket.on(WsClientEvent.JOIN_TABLE_SESSION, async (data: JoinTableSessionPayload, callback) => {
      try {
        let session = await getTableSession(data.sessionToken)

        if (!session) {
          const dbSession = await prisma.tableSession.findFirst({
            where: {
              sessionToken: data.sessionToken,
              tableId: data.tableId,
              status: 'ACTIVE',
              expiresAt: { gt: new Date() },
            },
            include: { table: true },
          })
          if (dbSession) {
            session = {
              sessionId: dbSession.id,
              tableId: dbSession.tableId,
              restaurantId: dbSession.table.restaurantId,
              foodCourtId: dbSession.table.foodCourtId,
              venueType: dbSession.table.foodCourtId ? 'food_court' : 'single',
              tableNumber: dbSession.table.tableNumber,
              expiresAt: dbSession.expiresAt.toISOString(),
            }
          }
        }

        const isFoodCourt = session?.venueType === 'food_court'
        const isRestaurantMatch = Boolean(session?.restaurantId && session.restaurantId === data.restaurantId)
        const isFoodCourtMatch = Boolean(isFoodCourt && (session?.foodCourtId === data.foodCourtId || !data.foodCourtId))

        if (!session || session.tableId !== data.tableId || (!isRestaurantMatch && !isFoodCourtMatch)) {
          callback({ success: false, error: 'Sesión inválida o expirada.' })
          return
        }

        joinedTableId = data.tableId
        const tableRoom = isFoodCourt && session.foodCourtId
          ? `food_court:${session.foodCourtId}:table:${data.tableId}`
          : `restaurant:${data.restaurantId}:table:${data.tableId}`
        await socket.join(tableRoom)

        if (isFoodCourt && session.foodCourtId) {
          await socket.join(`food_court:${session.foodCourtId}`)
        }

        // Guardar participante activo
        if (!activeParticipantsMap.has(data.tableId)) {
          activeParticipantsMap.set(data.tableId, new Map())
        }
        const userMap = activeParticipantsMap.get(data.tableId)!
        userMap.set(socket.id, data.userName || 'Comensal')

        const participantsList = Array.from(userMap.entries()).map(([sId, name]) => ({
          socketId: sId,
          userName: name,
        }))

        // Emitir actualización de participantes a la sala
        io.to(tableRoom).emit(WsServerEvent.TABLE_PARTICIPANTS_UPDATED, {
          tableId: data.tableId,
          participants: participantsList,
        })

        // Obtener carrito guardado en Redis/memoria para esta mesa
        const savedCart = await getSharedTableCart<SharedCartItemPayload>(data.tableId)

        // Obtener órdenes ya confirmadas para esta sesión de mesa
        let confirmedOrders: ConfirmedOrderPayload[] = []
        try {
          const dbOrders = await prisma.order.findMany({
            where: {
              sessionId: session.sessionId,
              tableId: data.tableId,
            },
            orderBy: { createdAt: 'asc' },
            include: {
              items: {
                include: {
                  product: true,
                  modifiers: {
                    include: { modifierOption: true },
                  },
                },
              },
            },
          })

          confirmedOrders = dbOrders.map((o) => ({
            orderId: o.id,
            status: o.status,
            totalAmount: o.totalAmount.toNumber(),
            itemsCount: o.items.reduce((acc, i) => acc + i.quantity, 0),
            createdAt: o.createdAt.toISOString(),
            items: o.items.map((i) => {
              const orderedByMatch = i.itemNotes?.match(/^\[Para:\s*([^\]]+)\]/)
              const orderedByNames = orderedByMatch
                ? orderedByMatch[1].split(',').map((n) => n.trim())
                : []
              const cleanNotes = i.itemNotes?.replace(/^\[Para:\s*[^\]]+\]\s*/, '').trim()

              return {
                id: i.id,
                name: i.product.name,
                quantity: i.quantity,
                unitPrice: i.unitPrice.toNumber(),
                subtotal: i.subtotal.toNumber(),
                modifiers: i.modifiers.map((m) => m.modifierOption.name),
                orderedByNames,
                notes: cleanNotes || undefined,
              }
            }),
          }))
        } catch (dbErr) {
          console.error('[Socket.IO] Error al obtener órdenes de mesa:', dbErr)
        }

        console.log(`[Socket.IO] Comensal "${data.userName || 'Invitado'}" unido a sala: ${tableRoom}`)
        callback({
          success: true,
          cart: savedCart ?? undefined,
          participants: participantsList,
          confirmedOrders,
        })
      } catch (err) {
        console.error('[Socket.IO] Error en JOIN_TABLE_SESSION:', err)
        callback({ success: false, error: 'Error interno del servidor.' })
      }
    })

    // --------------------------------------------------------
    // Comensal: Actualizar Carrito Compartido
    // --------------------------------------------------------
    socket.on(WsClientEvent.UPDATE_SHARED_CART, async (data: UpdateSharedCartPayload, callback) => {
      try {
        const session = await getTableSession(data.sessionToken)
        if (!session || session.tableId !== data.tableId) {
          if (callback) callback({ success: false, error: 'Sesión inválida.' })
          return
        }

        const tableRoom = session.foodCourtId
          ? `food_court:${session.foodCourtId}:table:${data.tableId}`
          : `restaurant:${data.restaurantId}:table:${data.tableId}`

        // Guardar nuevo estado del carrito en Redis
        await storeSharedTableCart(data.tableId, data.items)

        // Transmitir a todos los clientes de la mesa (sala principal)
        socket.to(tableRoom).emit(WsServerEvent.SHARED_CART_UPDATED, {
          items: data.items,
          updatedBy: data.updatedBy,
        })

        // Si es plaza, asegurar emisión también a la sala del restaurante específico
        if (session.foodCourtId && data.restaurantId) {
          socket.to(`restaurant:${data.restaurantId}:table:${data.tableId}`).emit(WsServerEvent.SHARED_CART_UPDATED, {
            items: data.items,
            updatedBy: data.updatedBy,
          })
        }

        console.log(`[Socket.IO] Carrito mesa ${data.tableId} actualizado por ${data.updatedBy}`)
        if (callback) callback({ success: true })
      } catch (err) {
        console.error('[Socket.IO] Error en UPDATE_SHARED_CART:', err)
        if (callback) callback({ success: false, error: 'Error interno del servidor.' })
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

        if (session.foodCourtId) {
          // Notificar tanto al personal de la plaza como al restaurante seleccionado
          io?.to(`food_court:${session.foodCourtId}`).emit(WsServerEvent.ALERT_WAITER, data)
          io?.to(`restaurant:${data.restaurantId}:staff`).emit(WsServerEvent.ALERT_WAITER, data)
        } else {
          const staffRoom = `restaurant:${data.restaurantId}:staff`
          io?.to(staffRoom).emit(WsServerEvent.ALERT_WAITER, data)
        }

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
    // Staff: Unirse a sala del restaurante o de la plaza
    // --------------------------------------------------------
    socket.on(WsStaffEvent.JOIN_STAFF_ROOM, (data: { restaurantId?: string; foodCourtId?: string; staffToken: string }) => {
      // TODO: Validar staffToken (JWT) antes de unir
      if (data.restaurantId) {
        const staffRoom = `restaurant:${data.restaurantId}:staff`
        socket.join(staffRoom)
        console.log(`[Socket.IO] Staff unido a sala: ${staffRoom}`)
      }
      if (data.foodCourtId) {
        const foodCourtRoom = `food_court:${data.foodCourtId}`
        socket.join(foodCourtRoom)
        console.log(`[Socket.IO] Staff unido a plaza gastronómica: ${foodCourtRoom}`)
      }
    })

    // --------------------------------------------------------
    // Staff: Mesero confirmó que va en camino
    // --------------------------------------------------------
    socket.on(WsStaffEvent.WAITER_ACKNOWLEDGED, (data: WaiterAcknowledgedPayload) => {
      if (data.foodCourtId) {
        io?.to(`food_court:${data.foodCourtId}:table:${data.tableId}`).emit(WsServerEvent.WAITER_STATUS_CHANGED, data)
      }
      if (data.restaurantId) {
        const tableRoom = `restaurant:${data.restaurantId}:table:${data.tableId}`
        io?.to(tableRoom).emit(WsServerEvent.WAITER_STATUS_CHANGED, data)
      }
      console.log(`[Socket.IO] Mesero ${data.waiterName} confirmó mesa ${data.tableId}`)
    })

    // --------------------------------------------------------
    // Staff/KDS: Actualizar estado de orden
    // --------------------------------------------------------
    socket.on(WsStaffEvent.UPDATE_ORDER_STATUS, async (data: OrderStatusChangedPayload) => {
      const tableRoom = `restaurant:${data.restaurantId ?? ''}:table:${data.tableId}`
      io?.to(tableRoom).emit(WsServerEvent.ORDER_STATUS_UPDATED, data)
      console.log(`[Socket.IO] Orden ${data.orderId} → ${data.newStatus}`)

      try {
        // Persistir cambio de estado en DB
        const order = await prisma.order.update({
          where: { id: data.orderId },
          data: { status: data.newStatus },
          select: { restaurantId: true, id: true },
        })

        // Si la orden se cancela → restaurar stock de ingredientes
        if (data.newStatus === 'CANCELLED') {
          const { restoreStockForOrder } = await import('@/lib/inventory/stock-manager')
          const { emitInventoryUpdate: emitInvUpdate, emitProductAvailable: emitProdAvailable } = await import('@/lib/socket-server')
          const result = await restoreStockForOrder(order.id, order.restaurantId, 'system')

          if (result.restoredItems && result.restoredItems.length > 0) {
            const items = await prisma.inventoryItem.findMany({
              where: { id: { in: result.restoredItems } },
            })
            for (const item of items) {
              emitInvUpdate(order.restaurantId, {
                restaurantId: order.restaurantId,
                inventoryItemId: item.id,
                inventoryItemName: item.name,
                currentStock: item.currentStock.toNumber(),
                minStock: item.minStock.toNumber(),
                isLow: item.currentStock.toNumber() <= item.minStock.toNumber(),
                isEmpty: item.currentStock.toNumber() <= 0,
              })
            }

            // Emitir disponibilidad recuperada para cada inventoryItem restaurado
            if (result.resolvedStockIssues && result.resolvedStockIssues.length > 0) {
              const issues = await prisma.productStockIssue.findMany({
                where: { inventoryItemId: { in: result.resolvedStockIssues } },
              })
              for (const issue of issues) {
                emitProdAvailable(order.restaurantId, {
                  restaurantId: order.restaurantId,
                  productId: issue.productId,
                  inventoryItemId: issue.inventoryItemId,
                })
              }
            }
          }
        }
      } catch (err) {
        console.error('[Socket.IO] Error al actualizar estado de orden en DB:', err)
      }
    })


    socket.on('disconnect', (reason) => {
      console.log(`[Socket.IO] Cliente desconectado: ${socket.id} (${reason})`)

      if (joinedTableId && activeParticipantsMap.has(joinedTableId)) {
        const userMap = activeParticipantsMap.get(joinedTableId)!
        userMap.delete(socket.id)
        if (userMap.size === 0) {
          activeParticipantsMap.delete(joinedTableId)
        } else {
          const participantsList = Array.from(userMap.entries()).map(([sId, name]) => ({
            socketId: sId,
            userName: name,
          }))
          // Notificar desconexión a los comensales restantes
          io.emit(WsServerEvent.TABLE_PARTICIPANTS_UPDATED, {
            tableId: joinedTableId,
            participants: participantsList,
          })
        }
      }
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

/**
 * Emite una orden confirmada a la sala de la mesa correspondiente.
 */
export function emitOrderConfirmedToTable(
  restaurantId: string,
  tableId: string,
  order: ConfirmedOrderPayload,
  foodCourtId?: string | null,
): void {
  const io = getIO()
  if (!io) {
    console.warn('[Socket.IO] emitOrderConfirmedToTable: servidor Socket.IO no disponible.')
    return
  }
  const tableRoom = `restaurant:${restaurantId}:table:${tableId}`
  io.to(tableRoom).emit(WsServerEvent.TABLE_ORDERS_UPDATED, order)
  if (foodCourtId) {
    io.to(`food_court:${foodCourtId}:table:${tableId}`).emit(WsServerEvent.TABLE_ORDERS_UPDATED, order)
  }
  console.log(`[Socket.IO] emitOrderConfirmedToTable → ${tableRoom} (Orden ${order.orderId})`)
}

/**
 * Emite actualización de estado de pago de un restaurante en una plaza gastronómica.
 */
export function emitFoodCourtPaymentUpdated(
  foodCourtId: string,
  tableId: string,
  payload: FoodCourtPaymentUpdatedPayload,
): void {
  const io = getIO()
  if (!io) return
  io.to(`food_court:${foodCourtId}`).emit(WsServerEvent.FOOD_COURT_PAYMENT_UPDATED, payload)
  io.to(`food_court:${foodCourtId}:table:${tableId}`).emit(WsServerEvent.FOOD_COURT_PAYMENT_UPDATED, payload)
  console.log(`[Socket.IO] emitFoodCourtPaymentUpdated → food_court:${foodCourtId} (rest: ${payload.restaurantId}, status: ${payload.status})`)
}

/**
 * Emite un evento de inventario actualizado a la sala del staff.
 * Llamado desde stock-manager tras cada movimiento.
 */
export function emitInventoryUpdate(
  restaurantId: string,
  payload: InventoryUpdatedPayload,
): void {
  const io = getIO()
  if (!io) return
  const staffRoom = `restaurant:${restaurantId}:staff`
  io.to(staffRoom).emit(WsServerEvent.INVENTORY_UPDATED, payload)
  console.log(`[Socket.IO] inventario:${payload.inventoryItemId} stock=${payload.currentStock}`)
}

/**
 * Emite un evento de producto sin stock a toda la sala del restaurante
 * (staff + mesas activas). El menú del cliente lo recibe y deshabilita el item.
 */
export function emitProductUnavailable(
  restaurantId: string,
  payload: ProductUnavailablePayload,
): void {
  const io = getIO()
  if (!io) return
  // Emitir a todas las salas del restaurante (staff + mesas)
  io.emit(WsServerEvent.PRODUCT_UNAVAILABLE, payload)
  console.log(`[Socket.IO] producto sin stock: ${payload.productId} (${payload.reason})`)
}

/**
 * Emite un evento de producto disponible nuevamente.
 * El menú del cliente lo recibe y reactiva el botón de agregar.
 */
export function emitProductAvailable(
  restaurantId: string,
  payload: ProductAvailablePayload,
): void {
  const io = getIO()
  if (!io) return
  io.emit(WsServerEvent.PRODUCT_AVAILABLE, payload)
  console.log(`[Socket.IO] producto disponible nuevamente: ${payload.productId}`)
}
