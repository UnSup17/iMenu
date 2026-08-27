import { prisma } from '@/lib/prisma'
import { storeTableSession, type RedisSessionData } from '@/lib/redis'
import { randomUUID } from 'crypto'
import { headers } from 'next/headers'
import QRCode from 'qrcode'
import { z } from 'zod'

const CreateSessionSchema = z.object({
  restaurantId: z.string().min(1),
  tableId: z.string().min(1),
  ttlSeconds: z.number().int().positive().default(7200),
})

export type CreateSessionInput = z.infer<typeof CreateSessionSchema>

export interface CreateSessionResult {
  sessionToken: string
  sessionId: string
  tableNumber: number
  expiresAt: Date
  menuUrl: string
  qrCodeDataUrl: string // base64 PNG del código QR
}

/**
 * Crea una nueva sesión efímera para una mesa.
 * Persiste en DB (fuente de verdad) y en Redis (validación rápida).
 * Genera el QR con la URL del menú del comensal.
 */
export async function createTableSession(
  input: CreateSessionInput,
): Promise<CreateSessionResult> {
  const parsed = CreateSessionSchema.parse(input)

  // Verificar que la mesa pertenece al restaurante
  const table = await prisma.table.findFirst({
    where: { id: parsed.tableId, restaurantId: parsed.restaurantId },
    include: { restaurant: true },
  })

  if (!table) throw new Error('TABLE_NOT_FOUND: Mesa no encontrada o no pertenece al restaurante.')

  // Cerrar sesiones activas previas en esta mesa
  await prisma.tableSession.updateMany({
    where: { tableId: parsed.tableId, status: 'ACTIVE' },
    data: { status: 'CLOSED', closedAt: new Date() },
  })

  const sessionToken = randomUUID()
  const expiresAt = new Date(Date.now() + parsed.ttlSeconds * 1000)

  // Persistir en DB
  const session = await prisma.tableSession.create({
    data: {
      tableId: parsed.tableId,
      sessionToken,
      status: 'ACTIVE',
      expiresAt,
    },
  })

  // Actualizar estado de la mesa
  await prisma.table.update({
    where: { id: parsed.tableId },
    data: { status: 'ACTIVE_QR_SESSION' },
  })

  // Almacenar en Redis para validación rápida
  const redisData: RedisSessionData = {
    sessionId: session.id,
    tableId: parsed.tableId,
    restaurantId: parsed.restaurantId,
    tableNumber: table.tableNumber,
    expiresAt: expiresAt.toISOString(),
  }
  await storeTableSession(sessionToken, redisData, parsed.ttlSeconds)

  // Generar URL del menú y QR
  let baseUrl = ''
  try {
    const headersList = await headers()
    const host = headersList.get('host')
    let proto = headersList.get('x-forwarded-proto') || 'http'
    if (proto.includes(',')) {
      proto = proto.split(',')[0].trim()
    }
    if (host) {
      baseUrl = `${proto}://${host}`
    }
  } catch {
    // Fuera de contexto de request (ej. scripts o compilación estática)
  }

  if (!baseUrl) {
    baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  }

  const menuUrl = `${baseUrl}/menu/${table.restaurant.slug}/${parsed.tableId}?token=${sessionToken}`
  const qrCodeDataUrl = await QRCode.toDataURL(menuUrl, {
    width: 400,
    margin: 2, 
    color: { dark: '#1a1a1a', light: '#ffffff' },
  })

  return {
    sessionToken,
    sessionId: session.id,
    tableNumber: table.tableNumber,
    expiresAt,
    menuUrl,
    qrCodeDataUrl,
  }
}
