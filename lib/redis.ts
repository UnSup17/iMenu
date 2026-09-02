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
import { prisma } from '@/lib/prisma'

// ============================================================
// Configuración de Redis y Circuit Breaker
// ============================================================

const hasRedisCredentials = Boolean(
  process.env.UPSTASH_REDIS_REST_URL &&
    process.env.UPSTASH_REDIS_REST_TOKEN &&
    !process.env.UPSTASH_REDIS_REST_URL.includes('example'),
)

// Cliente Upstash (funciona en Edge, Serverless y Node.js)
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || 'https://placeholder.upstash.io',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || 'placeholder',
  retry: {
    retries: 0, // Fallar rápido sin bloquear la solicitud durante varios segundos
  },
})

let isRedisCircuitOpen = false
let nextRedisRetryTime = 0
let lastWarnTime = 0

function canUseRedis(): boolean {
  if (!hasRedisCredentials) return false
  if (isRedisCircuitOpen && Date.now() < nextRedisRetryTime) {
    return false
  }
  return true
}

function handleRedisSuccess(): void {
  if (isRedisCircuitOpen) {
    console.log('[Redis] Conexión con Upstash Redis restablecida.')
    isRedisCircuitOpen = false
  }
}

function handleRedisError(context: string, err: unknown): void {
  isRedisCircuitOpen = true
  nextRedisRetryTime = Date.now() + 60_000 // Pausar intentos a Upstash por 60s
  const now = Date.now()
  if (now - lastWarnTime > 30_000) {
    console.warn(
      `[Redis] No disponible al ${context} (${err instanceof Error ? err.message : err}). Usando caché en memoria y Base de Datos (DB) como respaldo.`,
    )
    lastWarnTime = now
  }
}

// ============================================================
// Caché local en memoria (Fallback instantáneo)
// ============================================================

interface CacheEntry {
  value: string
  expiresAt: number
}

const memoryStore = new Map<string, CacheEntry>()

function memoryGet(key: string): string | null {
  const entry = memoryStore.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    memoryStore.delete(key)
    return null
  }
  return entry.value
}

function memorySet(key: string, value: string, ttlSeconds: number): void {
  memoryStore.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000,
  })
}

function memoryDel(key: string): void {
  memoryStore.delete(key)
}

// ============================================================
// Helpers de sesión de mesa
// ============================================================

const SESSION_PREFIX = 'imenu:session:'
const TABLE_SESSION_PREFIX = 'imenu:table:'

export const sessionKeys = {
  byToken: (token: string) => `${SESSION_PREFIX}${token}`,
  byTable: (tableId: string) => `${TABLE_SESSION_PREFIX}${tableId}:active_session`,
  cartByTable: (tableId: string) => `${TABLE_SESSION_PREFIX}${tableId}:shared_cart`,
}

export interface RedisSessionData {
  sessionId: string
  tableId: string
  restaurantId: string
  tableNumber: number
  expiresAt: string
}

/**
 * Almacena el carrito compartido de una mesa en caché local y Redis.
 */
export async function storeSharedTableCart<T>(tableId: string, cartData: T[], ttlSeconds = 7200): Promise<void> {
  const json = JSON.stringify(cartData)
  memorySet(sessionKeys.cartByTable(tableId), json, ttlSeconds)

  if (canUseRedis()) {
    try {
      await redis.set(sessionKeys.cartByTable(tableId), json, { ex: ttlSeconds })
      handleRedisSuccess()
    } catch (err) {
      handleRedisError('guardar carrito compartido', err)
    }
  }
}

/**
 * Obtiene el carrito compartido de una mesa desde memoria local o Redis.
 */
export async function getSharedTableCart<T>(tableId: string): Promise<T[] | null> {
  const memRaw = memoryGet(sessionKeys.cartByTable(tableId))
  if (memRaw) {
    try {
      return typeof memRaw === 'string' ? JSON.parse(memRaw) : (memRaw as T[])
    } catch {
      // Ignorar error de parsing
    }
  }

  if (canUseRedis()) {
    try {
      const raw = await redis.get<string>(sessionKeys.cartByTable(tableId))
      if (raw) {
        handleRedisSuccess()
        return typeof raw === 'string' ? JSON.parse(raw) : (raw as T[])
      }
    } catch (err) {
      handleRedisError('obtener carrito compartido', err)
    }
  }

  return null
}

/**
 * Almacena una sesión de mesa en memoria local y Redis con TTL.
 */
export async function storeTableSession(
  token: string,
  data: RedisSessionData,
  ttlSeconds: number = 7200,
): Promise<void> {
  const json = JSON.stringify(data)
  memorySet(sessionKeys.byToken(token), json, ttlSeconds)
  memorySet(sessionKeys.byTable(data.tableId), token, ttlSeconds)

  if (canUseRedis()) {
    try {
      await redis.set(sessionKeys.byToken(token), json, {
        ex: ttlSeconds,
      })
      await redis.set(sessionKeys.byTable(data.tableId), token, {
        ex: ttlSeconds,
      })
      handleRedisSuccess()
    } catch (err) {
      handleRedisError('guardar sesión de mesa', err)
    }
  }
}

/**
 * Obtiene una sesión de mesa.
 * Busca primero en memoria (0ms), luego en Redis (rápido), y si no existe o Redis falla,
 * consulta la base de datos MySQL (fuente de verdad).
 */
export async function getTableSession(token: string): Promise<RedisSessionData | null> {
  // 1. Memoria local
  const memRaw = memoryGet(sessionKeys.byToken(token))
  if (memRaw) {
    try {
      return typeof memRaw === 'string' ? JSON.parse(memRaw) : (memRaw as RedisSessionData)
    } catch {
      // Ignorar error de parsing
    }
  }

  // 2. Redis si está disponible
  if (canUseRedis()) {
    try {
      const raw = await redis.get<string>(sessionKeys.byToken(token))
      if (raw) {
        handleRedisSuccess()
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : (raw as RedisSessionData)
        const remainingTtl = Math.max(
          Math.floor((new Date(parsed.expiresAt).getTime() - Date.now()) / 1000),
          60,
        )
        memorySet(sessionKeys.byToken(token), JSON.stringify(parsed), remainingTtl)
        return parsed
      }
    } catch (err) {
      handleRedisError('consultar sesión de mesa', err)
    }
  }

  // 3. Fallback a la Base de Datos (MySQL) — Fuente de verdad
  try {
    const dbSession = await prisma.tableSession.findFirst({
      where: {
        sessionToken: token,
        status: 'ACTIVE',
        expiresAt: { gt: new Date() },
      },
      include: {
        table: true,
      },
    })

    if (dbSession) {
      const sessionData: RedisSessionData = {
        sessionId: dbSession.id,
        tableId: dbSession.tableId,
        restaurantId: dbSession.table.restaurantId,
        tableNumber: dbSession.table.tableNumber,
        expiresAt: dbSession.expiresAt.toISOString(),
      }

      const remainingTtl = Math.max(
        Math.floor((dbSession.expiresAt.getTime() - Date.now()) / 1000),
        60,
      )
      memorySet(sessionKeys.byToken(token), JSON.stringify(sessionData), remainingTtl)
      memorySet(sessionKeys.byTable(dbSession.tableId), token, remainingTtl)

      return sessionData
    }
  } catch (dbErr) {
    console.error('[DB Fallback] Error al consultar sesión de mesa:', dbErr)
  }

  return null
}

/**
 * Invalida una sesión de mesa (elimina de memoria y Redis).
 */
export async function invalidateTableSession(token: string): Promise<void> {
  const data = await getTableSession(token)
  memoryDel(sessionKeys.byToken(token))
  if (data) {
    memoryDel(sessionKeys.byTable(data.tableId))
  }

  if (canUseRedis()) {
    try {
      await redis.del(sessionKeys.byToken(token))
      if (data) {
        await redis.del(sessionKeys.byTable(data.tableId))
      }
      handleRedisSuccess()
    } catch (err) {
      handleRedisError('invalidar sesión de mesa', err)
    }
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

