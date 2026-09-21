/**
 * lib/audit.ts
 * Módulo de Auditoría de Seguridad y Registro de Accesos (Audit Log - Fase 9)
 */

import { prisma } from '@/lib/prisma'

export type AuditEventType =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'LOGOUT'
  | '2FA_ENABLED'
  | '2FA_FAILED'
  | 'PLAN_UPGRADE'
  | 'PLAN_DOWNGRADE'
  | 'BRANCHES_DEACTIVATED'
  | 'REFERRAL_REDEEMED'

export interface RecordAuditLogParams {
  userId?: string | null
  userEmail?: string | null
  restaurantId?: string | null
  organizationId?: string | null
  event: AuditEventType | string
  ip?: string | null
  userAgent?: string | null
  details?: Record<string, any> | string | null
}

/**
 * Extrae IP y User-Agent del contexto HTTP de Next.js si están disponibles.
 */
export async function getClientNetworkInfo(): Promise<{ ip: string | null; userAgent: string | null }> {
  try {
    const { headers } = await import('next/headers')
    const headerStore = await headers()
    const forwarded = headerStore.get('x-forwarded-for')
    const realIp = headerStore.get('x-real-ip')
    const cfConnectingIp = headerStore.get('cf-connecting-ip')
    const ip = cfConnectingIp || realIp || (forwarded ? forwarded.split(',')[0].trim() : null) || null
    const userAgent = headerStore.get('user-agent') || null
    return { ip, userAgent }
  } catch {
    return { ip: null, userAgent: null }
  }
}

/**
 * Registra un evento en el log de auditoría con resiliencia ante errores.
 */
export async function recordAuditLog(params: RecordAuditLogParams) {
  try {
    let { ip, userAgent } = params
    if (!ip || !userAgent) {
      const net = await getClientNetworkInfo()
      if (!ip) ip = net.ip
      if (!userAgent) userAgent = net.userAgent
    }

    const detailsStr =
      params.details && typeof params.details === 'object'
        ? JSON.stringify(params.details)
        : params.details || null

    return await prisma.auditLog.create({
      data: {
        userId: params.userId || null,
        userEmail: params.userEmail || null,
        restaurantId: params.restaurantId || null,
        organizationId: params.organizationId || null,
        event: params.event,
        ip: ip || null,
        userAgent: userAgent ? userAgent.substring(0, 500) : null,
        details: detailsStr,
      },
    })
  } catch (err) {
    console.error('[AuditLog] Error al registrar evento de auditoría:', err)
    return null
  }
}

/**
 * Obtiene los registros de auditoría más recientes filtrados por organización, restaurante o usuario.
 */
export async function getRecentAuditLogs(filter: {
  organizationId?: string | null
  restaurantId?: string | null
  userId?: string | null
  limit?: number
}) {
  const { organizationId, restaurantId, userId, limit = 50 } = filter

  const where: any = {}
  if (organizationId) where.organizationId = organizationId
  if (restaurantId) where.restaurantId = restaurantId
  if (userId) where.userId = userId

  return prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: Math.min(limit, 100),
    include: {
      user: {
        select: { id: true, name: true, email: true, role: true },
      },
    },
  })
}
