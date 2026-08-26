// ============================================================
// Contratos de eventos WebSocket para iMenu
// Shared entre cliente (comensal/staff) y servidor
// ============================================================

export enum SocketChannel {
  RESTAURANT_ZONE = 'restaurant:%s:zone:%s',
  RESTAURANT_KDS = 'restaurant:%s:kds',
  TABLE_ROOM = 'restaurant:%s:table:%s',
}

// Eventos que el comensal emite al servidor
export enum WsClientEvent {
  CALL_WAITER = 'call_waiter',
  ORDER_SUBMITTED = 'order_submitted',
  JOIN_TABLE_SESSION = 'join_table_session',
}

// Eventos que el staff emite al servidor
export enum WsStaffEvent {
  WAITER_ACKNOWLEDGED = 'waiter_acknowledged',
  UPDATE_ORDER_STATUS = 'update_order_status',
  JOIN_STAFF_ROOM = 'join_staff_room',
}

// Eventos que el servidor emite a los clientes
export enum WsServerEvent {
  ALERT_WAITER = 'alert_waiter',
  ORDER_RECEIVED = 'order_received',
  WAITER_STATUS_CHANGED = 'waiter_status_changed',
  ORDER_STATUS_UPDATED = 'order_status_updated',
  SESSION_TERMINATED = 'session_terminated',
  ERROR = 'ws_error',
}

// ============================================================
// Payload Types
// ============================================================

export type AlertType = 'HELP_REQUESTED' | 'BILL_REQUESTED' | 'SPILL_CLEANUP'

export interface JoinTableSessionPayload {
  restaurantId: string
  tableId: string
  sessionToken: string
}

export interface JoinStaffRoomPayload {
  restaurantId: string
  staffToken: string // JWT del staff autenticado
}

export interface CallWaiterPayload {
  restaurantId: string
  tableId: string
  tableNumber: number
  sessionToken: string
  alertType: AlertType
  timestamp: string // ISO 8601
}

export interface WaiterAcknowledgedPayload {
  restaurantId: string
  tableId: string
  waiterId: string
  waiterName: string
  estimatedMinutes?: number
  timestamp: string
}

export interface OrderNotificationPayload {
  orderId: string
  restaurantId: string
  tableId: string
  tableNumber: number
  totalAmount: number
  itemsCount: number
  createdAt: string
}

export interface OrderStatusChangedPayload {
  orderId: string
  tableId: string
  newStatus: 'PREPARING' | 'READY' | 'DELIVERED' | 'CANCELLED'
  updatedAt: string
}

export interface WsErrorPayload {
  code: string
  message: string
}

// ============================================================
// Socket.IO Event Map Interfaces (tipado del servidor)
// ============================================================

export interface ClientToServerEvents {
  [WsClientEvent.JOIN_TABLE_SESSION]: (
    data: JoinTableSessionPayload,
    callback: (ack: { success: boolean; error?: string }) => void,
  ) => void
  [WsClientEvent.CALL_WAITER]: (
    data: CallWaiterPayload,
    callback: (ack: { success: boolean; message?: string }) => void,
  ) => void
}

export interface StaffToServerEvents {
  [WsStaffEvent.JOIN_STAFF_ROOM]: (data: JoinStaffRoomPayload) => void
  [WsStaffEvent.WAITER_ACKNOWLEDGED]: (data: WaiterAcknowledgedPayload) => void
  [WsStaffEvent.UPDATE_ORDER_STATUS]: (data: OrderStatusChangedPayload) => void
}

export interface ServerToClientEvents {
  [WsServerEvent.ALERT_WAITER]: (data: CallWaiterPayload) => void
  [WsServerEvent.ORDER_RECEIVED]: (data: OrderNotificationPayload) => void
  [WsServerEvent.WAITER_STATUS_CHANGED]: (data: WaiterAcknowledgedPayload) => void
  [WsServerEvent.ORDER_STATUS_UPDATED]: (data: OrderStatusChangedPayload) => void
  [WsServerEvent.SESSION_TERMINATED]: (data: { tableId: string; reason: string }) => void
  [WsServerEvent.ERROR]: (data: WsErrorPayload) => void
}
