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
  UPDATE_SHARED_CART = 'update_shared_cart',
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
  SHARED_CART_UPDATED = 'shared_cart_updated',
  TABLE_PARTICIPANTS_UPDATED = 'table_participants_updated',
  TABLE_ORDERS_UPDATED = 'table_orders_updated',
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
  userName?: string
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

export interface SharedCartItemPayload {
  cartItemId: string
  productId: string
  name: string
  basePrice: number
  unitCalculatedPrice: number
  quantity: number
  selectedModifiers: Array<{
    groupId: string
    groupName: string
    optionId: string
    name: string
    extraPrice: number
  }>
  removedIngredientIds: string[]
  notes?: string
  orderedBy: Array<{
    userName: string
    quantity: number
  }>
}

export interface UpdateSharedCartPayload {
  restaurantId: string
  tableId: string
  sessionToken: string
  updatedBy: string
  items: SharedCartItemPayload[]
}

export interface TableParticipantsPayload {
  tableId: string
  participants: Array<{
    socketId: string
    userName: string
  }>
}

export interface ConfirmedOrderItemPayload {
  id: string
  name: string
  quantity: number
  unitPrice: number
  subtotal: number
  modifiers: string[]
  orderedByNames: string[]
  notes?: string
}

export interface ConfirmedOrderPayload {
  orderId: string
  orderNumber?: number
  status: 'RECEIVED' | 'PREPARING' | 'READY' | 'DELIVERED' | 'CANCELLED'
  totalAmount: number
  itemsCount: number
  createdAt: string
  items: ConfirmedOrderItemPayload[]
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
    callback: (ack: {
      success: boolean
      error?: string
      cart?: SharedCartItemPayload[]
      participants?: Array<{ socketId: string; userName: string }>
      confirmedOrders?: ConfirmedOrderPayload[]
    }) => void,
  ) => void
  [WsClientEvent.CALL_WAITER]: (
    data: CallWaiterPayload,
    callback: (ack: { success: boolean; message?: string }) => void,
  ) => void
  [WsClientEvent.UPDATE_SHARED_CART]: (
    data: UpdateSharedCartPayload,
    callback?: (ack: { success: boolean; error?: string }) => void,
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
  [WsServerEvent.SHARED_CART_UPDATED]: (data: { items: SharedCartItemPayload[]; updatedBy: string }) => void
  [WsServerEvent.TABLE_PARTICIPANTS_UPDATED]: (data: TableParticipantsPayload) => void
  [WsServerEvent.TABLE_ORDERS_UPDATED]: (data: ConfirmedOrderPayload) => void
  [WsServerEvent.ERROR]: (data: WsErrorPayload) => void
}

