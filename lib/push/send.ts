import { getWebPush } from './vapid'
import { redis } from '@/lib/redis'

export interface PushSubscriptionData {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

// In-memory fallback map of tableId -> Set of subscriptions (serialized JSON)
const memorySubscriptions = new Map<string, Set<string>>()

const TABLE_PUSH_KEY = (tableId: string) => `imenu:push:table:${tableId}`

/**
 * Guarda la suscripción Push de un comensal para su mesa
 */
export async function saveTablePushSubscription(
  tableId: string,
  subscription: PushSubscriptionData
): Promise<void> {
  const serialized = JSON.stringify(subscription)

  // 1. Guardar en memoria local
  if (!memorySubscriptions.has(tableId)) {
    memorySubscriptions.set(tableId, new Set())
  }
  memorySubscriptions.get(tableId)!.add(serialized)

  // 2. Guardar en Redis si está disponible
  try {
    if (process.env.UPSTASH_REDIS_REST_URL && !process.env.UPSTASH_REDIS_REST_URL.includes('example')) {
      await redis.sadd(TABLE_PUSH_KEY(tableId), serialized)
      // Expirar en 4 horas (tiempo máximo de una comida)
      await redis.expire(TABLE_PUSH_KEY(tableId), 14400)
    }
  } catch (err) {
    console.warn('[Push] Error guardando suscripción en Redis:', err)
  }
}

/**
 * Envía una notificación Web Push a todos los comensales sentados en una mesa
 */
export async function notifyTableOrderReady(
  tableId: string,
  orderNumber: string,
  restaurantName: string,
  targetUrl?: string
): Promise<number> {
  const wp = getWebPush()
  const subscriptions = new Set<string>()

  // 1. Obtener de memoria local
  const memSubs = memorySubscriptions.get(tableId)
  if (memSubs) {
    memSubs.forEach((s) => subscriptions.add(s))
  }

  // 2. Obtener de Redis
  try {
    if (process.env.UPSTASH_REDIS_REST_URL && !process.env.UPSTASH_REDIS_REST_URL.includes('example')) {
      const redisSubs = await redis.smembers(TABLE_PUSH_KEY(tableId))
      if (Array.isArray(redisSubs)) {
        redisSubs.forEach((s) => subscriptions.add(typeof s === 'string' ? s : JSON.stringify(s)))
      }
    }
  } catch (err) {
    console.warn('[Push] Error leyendo suscripciones de Redis:', err)
  }

  if (subscriptions.size === 0) {
    return 0
  }

  const payload = JSON.stringify({
    title: `🔔 ¡Tu pedido #${orderNumber} está listo!`,
    body: `Tu orden de ${restaurantName} ya ha salido de cocina y va en camino a tu mesa. ¡Buen provecho!`,
    icon: '/favicon.ico',
    url: targetUrl || '/',
  })

  let sentCount = 0

  for (const subStr of subscriptions) {
    try {
      const sub = JSON.parse(subStr) as PushSubscriptionData
      await wp.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: sub.keys,
        },
        payload
      )
      sentCount++
    } catch (err: any) {
      // Si la suscripción expiró o fue rechazada (410 Gone / 404 Not Found), remover
      if (err.statusCode === 410 || err.statusCode === 404) {
        if (memSubs) memSubs.delete(subStr)
        try {
          if (process.env.UPSTASH_REDIS_REST_URL) {
            await redis.srem(TABLE_PUSH_KEY(tableId), subStr)
          }
        } catch {}
      } else {
        console.warn('[Push] Error al enviar notificación individual:', err.message || err)
      }
    }
  }

  return sentCount
}
