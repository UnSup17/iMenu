import { prisma } from '@/lib/prisma'
import { invalidateTableSession } from '@/lib/redis'
import { getSocketServer } from '@/lib/socket-server'
import { WsServerEvent } from '@/types/websocket-events'
import { z } from 'zod'

const CloseSessionSchema = z
  .object({
    tableId: z.string().optional(),
    sessionToken: z.string().optional(),
    restaurantId: z.string().optional(),
    foodCourtId: z.string().optional(),
    forceClose: z.boolean().optional(),
  })
  .refine((data) => Boolean(data.sessionToken || data.tableId), {
    message: 'Se requiere sessionToken o tableId para cerrar la sesión y liberar la mesa.',
  })

/**
 * Cierra una sesión de mesa activa (restaurante individual o plaza gastronómica)
 * y asegura que la mesa quede en estado AVAILABLE.
 * Invalida en Redis, verifica pagos si corresponde y actualiza status en DB.
 */
export async function closeTableSession(
  input: z.infer<typeof CloseSessionSchema>,
): Promise<{ success: boolean; message?: string }> {
  const parsed = CloseSessionSchema.parse(input)

  // 1. Si tenemos sessionToken, intentar buscar por token primero
  let session = parsed.sessionToken
    ? await prisma.tableSession.findFirst({
        where: { sessionToken: parsed.sessionToken },
        include: { table: true },
      })
    : null

  const targetTableId = parsed.tableId || session?.tableId

  if (!targetTableId) {
    return { success: false, message: 'No se pudo identificar la mesa para liberar.' }
  }

  const table = await prisma.table.findUnique({
    where: { id: targetTableId },
    include: {
      sessions: {
        where: { status: 'ACTIVE' },
      },
    },
  })

  if (!table) {
    return { success: false, message: 'Mesa no encontrada.' }
  }

  // Validación de permisos por tipo de sede
  if (table.restaurantId) {
    if (parsed.restaurantId && table.restaurantId !== parsed.restaurantId) {
      throw new Error('UNAUTHORIZED: No tienes permiso para cerrar esta sesión.')
    }
  } else if (table.foodCourtId) {
    if (parsed.foodCourtId && table.foodCourtId !== parsed.foodCourtId) {
      throw new Error('UNAUTHORIZED: No tienes permiso para cerrar esta sesión de plaza.')
    }

    // Verificar si la mesa tiene cobros pendientes en algún restaurante de la plaza
    if (!parsed.forceClose && table.sessions.length > 0) {
      const activeSessionIds = table.sessions.map((s) => s.id)
      const pendingCount = await prisma.foodCourtTablePayment.count({
        where: {
          sessionId: { in: activeSessionIds },
          status: 'PENDING',
        },
      })
      if (pendingCount > 0) {
        throw new Error(
          `PENDING_PAYMENTS: La mesa tiene ${pendingCount} restaurante(s) con pagos pendientes. Registra o concilia los cobros antes de liberar la mesa.`,
        )
      }
    }
  }

  // Invalidar en Redis todas las sesiones activas asociadas a la mesa
  for (const s of table.sessions) {
    try {
      await invalidateTableSession(s.sessionToken)
    } catch (err) {
      console.warn('[closeTableSession] Error al invalidar sesión en Redis:', err)
    }
  }
  if (parsed.sessionToken) {
    try {
      await invalidateTableSession(parsed.sessionToken)
    } catch {}
  }

  // Cerrar todas las sesiones activas en base de datos
  await prisma.tableSession.updateMany({
    where: { tableId: table.id, status: 'ACTIVE' },
    data: { status: 'CLOSED', closedAt: new Date() },
  })

  // Marcar mesa como disponible (AVAILABLE) sin importar su estado previo
  await prisma.table.update({
    where: { id: table.id },
    data: { status: 'AVAILABLE' },
  })

  // Notificar a todos los dispositivos conectados a la mesa que la sesión terminó
  try {
    const io = getSocketServer()
    if (io) {
      const tableRoom = table.foodCourtId
        ? `food_court:${table.foodCourtId}:table:${table.id}`
        : `restaurant:${table.restaurantId}:table:${table.id}`
      io.to(tableRoom).emit(WsServerEvent.SESSION_TERMINATED, {
        tableId: table.id,
        reason: 'Sesión finalizada por el personal.',
      })
      ;(io as any).emit('table:status_changed', {
        tableId: table.id,
        status: 'AVAILABLE',
        restaurantId: table.restaurantId,
      })
    }
  } catch (socketErr) {
    console.warn('[closeTableSession] Error al emitir eventos Socket.IO:', socketErr)
  }

  return { success: true, message: 'Mesa liberada y cerrada exitosamente.' }
}
