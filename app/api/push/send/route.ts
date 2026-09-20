import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { notifyTableOrderReady } from '@/lib/push/send'
import { z } from 'zod'

const PushSendSchema = z.object({
  tableId: z.string().min(1, 'El tableId es requerido'),
  orderNumber: z.string().min(1, 'El número de orden es requerido'),
  restaurantName: z.string().min(1, 'El nombre del restaurante es requerido'),
  foodCourtName: z.string().optional(),
  targetUrl: z.string().optional(),
  customTitle: z.string().optional(),
  customBody: z.string().optional(),
})

/**
 * POST /api/push/send
 * Dispara una notificación Web Push a los clientes suscritos en una mesa.
 * Utilizado para avisar cuando una comanda está lista en pedidos multi-restaurante de plazas o KDS.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await req.json()
    const data = PushSendSchema.parse(body)

    const sentCount = await notifyTableOrderReady(
      data.tableId,
      data.orderNumber,
      data.restaurantName,
      {
        foodCourtName: data.foodCourtName,
        targetUrl: data.targetUrl,
        customTitle: data.customTitle,
        customBody: data.customBody,
      }
    )

    return NextResponse.json({
      success: true,
      deliveredToDevices: sentCount,
      message:
        sentCount > 0
          ? `Notificación enviada a ${sentCount} dispositivo(s)`
          : 'No se encontraron dispositivos suscritos activos para esta mesa',
    })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || 'Datos inválidos' }, { status: 400 })
    }
    console.error('[API /api/push/send Error]:', error)
    return NextResponse.json(
      { error: error.message || 'Error al despachar notificación Web Push' },
      { status: 500 }
    )
  }
}
