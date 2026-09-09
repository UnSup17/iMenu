import { prisma } from '@/lib/prisma'
import { invalidateTableSession } from '@/lib/redis'
import { getSocketServer } from '@/lib/socket-server'
import { WsServerEvent } from '@/types/websocket-events'
import { z } from 'zod'

const CloseSessionSchema = z.object({
  sessionToken: z.string().min(10),
  restaurantId: z.string().optional(),
  foodCourtId: z.string().optional(),
  forceClose: z.boolean().optional(),
})

/**
 * Cierra una sesión de mesa activa (restaurante individual o plaza gastronómica).
 * Invalida en Redis, verifica pagos si corresponde y actualiza status en DB.
 */
export async function closeTableSession(
  input: z.infer<typeof CloseSessionSchema>,
): Promise<{ success: boolean; message?: string }> {
  const parsed = CloseSessionSchema.parse(input)

  // Invalidar en Redis inmediatamente
  await invalidateTableSession(parsed.sessionToken)

  // Actualizar en DB
  const session = await prisma.tableSession.findFirst({
    where: { sessionToken: parsed.sessionToken, status: 'ACTIVE' },
    include: { table: true },
  })

  if (!session) return { success: false, message: 'Sesión no encontrada o ya cerrada.' }

  // Validación de permisos por tipo de sede
  if (session.table.restaurantId) {
    if (parsed.restaurantId && session.table.restaurantId !== parsed.restaurantId) {
      throw new Error('UNAUTHORIZED: No tienes permiso para cerrar esta sesión.')
    }
  } else if (session.table.foodCourtId) {
    if (parsed.foodCourtId && session.table.foodCourtId !== parsed.foodCourtId) {
      throw new Error('UNAUTHORIZED: No tienes permiso para cerrar esta sesión de plaza.')
    }

    // Verificar si la mesa tiene cobros pendientes en algún restaurante de la plaza
    if (!parsed.forceClose) {
      const pendingCount = await prisma.foodCourtTablePayment.count({
        where: {
          sessionId: session.id,
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

  await prisma.tableSession.update({
    where: { id: session.id },
    data: { status: 'CLOSED', closedAt: new Date() },
  })

  // Marcar mesa como disponible nuevamente
  await prisma.table.update({
    where: { id: session.tableId },
    data: { status: 'AVAILABLE' },
  })

  // Notificar a todos los dispositivos conectados a la mesa que la sesión terminó
  const io = getSocketServer()
  if (io) {
    const tableRoom = session.table.foodCourtId
      ? `food_court:${session.table.foodCourtId}:table:${session.tableId}`
      : `restaurant:${session.table.restaurantId}:table:${session.tableId}`
    io.to(tableRoom).emit(WsServerEvent.SESSION_TERMINATED, {
      tableId: session.tableId,
      reason: 'Sesión finalizada por el personal.',
    })
  }

  return { success: true }
}
