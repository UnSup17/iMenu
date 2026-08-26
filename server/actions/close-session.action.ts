import { prisma } from '@/lib/prisma'
import { invalidateTableSession } from '@/lib/redis'
import { z } from 'zod'

const CloseSessionSchema = z.object({
  sessionToken: z.string().min(10),
  restaurantId: z.string().min(1),
})

/**
 * Cierra una sesión de mesa activa.
 * Invalida en Redis y actualiza status en DB.
 */
export async function closeTableSession(
  input: z.infer<typeof CloseSessionSchema>,
): Promise<{ success: boolean }> {
  const parsed = CloseSessionSchema.parse(input)

  // Invalidar en Redis inmediatamente
  await invalidateTableSession(parsed.sessionToken)

  // Actualizar en DB
  const session = await prisma.tableSession.findFirst({
    where: { sessionToken: parsed.sessionToken, status: 'ACTIVE' },
    include: { table: true },
  })

  if (!session) return { success: false }

  if (session.table.restaurantId !== parsed.restaurantId) {
    throw new Error('UNAUTHORIZED: No tienes permiso para cerrar esta sesión.')
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

  return { success: true }
}
