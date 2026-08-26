/**
 * Cliente Redis para iMenu.
 *
 * - En producción (Vercel): usa @upstash/redis con HTTP REST (serverless-safe).
 * - En desarrollo local: puede usar ioredis directo al contenedor Docker,
 *   o bien Upstash Redis directamente si se configuran las variables.
 *
 * Para cambiar entre modos, ajusta las variables de entorno en .env.local.
 */

import { Redis } from '@upstash/redis'

// Cliente Upstash (funciona en Edge, Serverless y Node.js)
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

// ============================================================
// Helpers de sesión de mesa
// ============================================================

const SESSION_PREFIX = 'imenu:session:'
const TABLE_SESSION_PREFIX = 'imenu:table:'

export const sessionKeys = {
  byToken: (token: string) => `${SESSION_PREFIX}${token}`,
  byTable: (tableId: string) => `${TABLE_SESSION_PREFIX}${tableId}:active_session`,
}

export interface RedisSessionData {
  sessionId: string
  tableId: string
  restaurantId: string
  tableNumber: number
  expiresAt: string
}

/**
 * Almacena una sesión de mesa en Redis con TTL.
 */
export async function storeTableSession(
  token: string,
  data: RedisSessionData,
  ttlSeconds: number = 7200,
): Promise<void> {
  await redis.set(sessionKeys.byToken(token), JSON.stringify(data), {
    ex: ttlSeconds,
  })
  await redis.set(sessionKeys.byTable(data.tableId), token, {
    ex: ttlSeconds,
  })
}

/**
 * Obtiene una sesión de mesa desde Redis.
 * Retorna null si no existe o expiró.
 */
export async function getTableSession(token: string): Promise<RedisSessionData | null> {
  const raw = await redis.get<string>(sessionKeys.byToken(token))
  if (!raw) return null
  try {
    return typeof raw === 'string' ? JSON.parse(raw) : raw as RedisSessionData
  } catch {
    return null
  }
}

/**
 * Invalida una sesión de mesa (elimina de Redis).
 */
export async function invalidateTableSession(token: string): Promise<void> {
  const data = await getTableSession(token)
  if (data) {
    await redis.del(sessionKeys.byToken(token))
    await redis.del(sessionKeys.byTable(data.tableId))
  }
}

// ============================================================
// Pub/Sub helpers (para Socket.IO adapter en producción)
// ============================================================

export const pubsubChannels = {
  restaurantOrders: (restaurantId: string) => `imenu:restaurant:${restaurantId}:orders`,
  restaurantAlerts: (restaurantId: string) => `imenu:restaurant:${restaurantId}:alerts`,
  tableEvents: (tableId: string) => `imenu:table:${tableId}:events`,
}
