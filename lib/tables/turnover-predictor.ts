/**
 * lib/tables/turnover-predictor.ts
 * Motor heurístico de predicción de desocupación y rotación de mesas.
 *
 * Evalúa el tiempo transcurrido de la sesión activa y el ciclo de vida
 * de los pedidos (tiempo desde la última entrega en cocina) para proyectar
 * con alta precisión cuándo quedará libre una mesa.
 */

export type TurnoverStage =
  | 'FREE'
  | 'ORDERING'
  | 'WAITING_FOOD'
  | 'DINING'
  | 'SOBREMESA'
  | 'BILL_PENDING'
  | 'OVERDUE'

export interface TableTurnoverPrediction {
  stage: TurnoverStage
  stageLabel: string
  stageIcon: string
  estimatedMinutesRemaining: number
  predictedFreeAt: string | null
  confidence: number // 0 a 100%
  badgeColor: string
  details: string
}

export interface PredictorOrderInput {
  id?: string
  status: string // RECEIVED, PREPARING, READY, DELIVERED, CANCELLED
  createdAt: Date | string
  deliveredAt?: Date | string | null
}

export interface PredictorTableInput {
  status: string // AVAILABLE, ACTIVE_QR_SESSION, TRADITIONAL_SERVICE, MAINTENANCE
  capacity?: number
  activeSession?: {
    createdAt: Date | string
  } | null
  recentOrders?: PredictorOrderInput[]
}

/**
 * Calcula la predicción de desocupación para una mesa individual.
 */
export function predictTableTurnover(table: PredictorTableInput): TableTurnoverPrediction {
  const now = Date.now()

  // 1. Mesa Libre
  if (table.status === 'AVAILABLE') {
    return {
      stage: 'FREE',
      stageLabel: 'Mesa Disponible',
      stageIcon: '🟢',
      estimatedMinutesRemaining: 0,
      predictedFreeAt: null,
      confidence: 100,
      badgeColor: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
      details: 'Mesa lista para recibir comensales de inmediato',
    }
  }

  // 2. Mesa en Mantenimiento
  if (table.status === 'MAINTENANCE') {
    return {
      stage: 'OVERDUE',
      stageLabel: 'En Mantenimiento',
      stageIcon: '🛠️',
      estimatedMinutesRemaining: 0,
      predictedFreeAt: null,
      confidence: 100,
      badgeColor: 'bg-zinc-800 border-zinc-700 text-zinc-400',
      details: 'Mesa temporalmente inhabilitada por mantenimiento',
    }
  }

  // 3. Mesa Ocupada (ACTIVE_QR_SESSION o TRADITIONAL_SERVICE)
  const sessionStart = table.activeSession
    ? new Date(table.activeSession.createdAt).getTime()
    : now
  const elapsedMinutes = Math.max(0, Math.floor((now - sessionStart) / 60000))

  // Tiempo estimado de sobremesa según número de comensales
  const capacity = table.capacity || 4
  const baseExpectedDuration = capacity <= 2 ? 45 : capacity <= 4 ? 65 : 85

  const validOrders = (table.recentOrders || []).filter(
    (o) => o.status !== 'CANCELLED'
  )

  // Buscar el pedido entregado más recientemente
  const deliveredOrders = validOrders
    .filter((o) => o.status === 'DELIVERED' && o.deliveredAt)
    .sort(
      (a, b) =>
        new Date(b.deliveredAt!).getTime() - new Date(a.deliveredAt!).getTime()
    )

  let stage: TurnoverStage = 'ORDERING'
  let stageLabel = 'Viendo Menú'
  let stageIcon = '📋'
  let estimatedMinutesRemaining = Math.max(30, baseExpectedDuration - elapsedMinutes)
  let confidence = 70
  let badgeColor = 'bg-zinc-800 border-zinc-700 text-zinc-300'
  let details = `Comensales explorando la carta (${elapsedMinutes} min en mesa)`

  if (deliveredOrders.length > 0) {
    const latestDelivered = deliveredOrders[0]
    const minSinceDelivery = Math.max(
      0,
      Math.floor((now - new Date(latestDelivered.deliveredAt!).getTime()) / 60000)
    )

    if (minSinceDelivery < 20) {
      stage = 'DINING'
      stageIcon = '🍽️'
      const rem = Math.max(10, 30 - minSinceDelivery)
      stageLabel = `Comiendo (~${rem}m)`
      estimatedMinutesRemaining = rem
      confidence = 85
      badgeColor = 'bg-blue-500/10 border-blue-500/20 text-blue-400'
      details = `Platillos principales servidos hace ${minSinceDelivery} min`
    } else if (minSinceDelivery < 40) {
      stage = 'SOBREMESA'
      stageIcon = '☕'
      const rem = Math.max(5, 45 - minSinceDelivery)
      stageLabel = `Sobremesa (~${rem}m)`
      estimatedMinutesRemaining = rem
      confidence = 90
      badgeColor = 'bg-purple-500/10 border-purple-500/20 text-purple-300'
      details = `Sobremesa activa (postres, cafés o conversación)`
    } else {
      stage = 'BILL_PENDING'
      stageIcon = '💳'
      stageLabel = 'Por desocupar (~5m)'
      estimatedMinutesRemaining = 5
      confidence = 95
      badgeColor = 'bg-amber-500/10 border-amber-500/20 text-amber-300 font-bold'
      details = `Comida finalizada (${minSinceDelivery} min desde entrega), lista para cuenta`
    }
  } else {
    // No hay pedidos entregados aún: revisar si hay pedidos en preparación
    const pendingOrders = validOrders.filter((o) =>
      ['RECEIVED', 'PREPARING', 'READY'].includes(o.status)
    )

    if (pendingOrders.length > 0) {
      stage = 'WAITING_FOOD'
      stageIcon = '🍳'
      const rem = Math.max(20, 50 - elapsedMinutes)
      stageLabel = `En cocina (~${rem}m)`
      estimatedMinutesRemaining = rem
      confidence = 75
      badgeColor = 'bg-orange-500/10 border-orange-500/20 text-orange-400'
      details = `Orden en preparación en cocina (${pendingOrders.length} pedido activo)`
    }
  }

  // Verificar si la mesa ha excedido ampliamente el tiempo promedio
  if (elapsedMinutes >= baseExpectedDuration + 15 && stage !== 'BILL_PENDING') {
    stage = 'OVERDUE'
    stageIcon = '⚠️'
    stageLabel = 'Sobremesa Larga (~5m)'
    estimatedMinutesRemaining = 5
    confidence = 85
    badgeColor = 'bg-red-500/15 border-red-500/30 text-red-400 animate-pulse font-bold'
    details = `Tiempo en mesa excedido (${elapsedMinutes} min, promedio de mesa: ${baseExpectedDuration} min)`
  }

  const predictedFreeAt = new Date(
    now + estimatedMinutesRemaining * 60000
  ).toISOString()

  return {
    stage,
    stageLabel,
    stageIcon,
    estimatedMinutesRemaining,
    predictedFreeAt,
    confidence,
    badgeColor,
    details,
  }
}
