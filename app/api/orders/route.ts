import { NextRequest, NextResponse } from 'next/server'
import { createOrderTransaction } from '@/server/actions/create-order.action'
import { emitNewOrder } from '@/lib/socket-server'

/**
 * POST /api/orders
 * Crea un nuevo pedido, valida la sesión y emite el evento WebSocket al staff.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const result = await createOrderTransaction(body)

    // Emitir evento en tiempo real al staff del restaurante
    emitNewOrder(body.restaurantId, {
      orderId: result.orderId,
      restaurantId: body.restaurantId,
      tableId: body.tableId,
      tableNumber: result.tableNumber,
      totalAmount: result.totalAmount,
      itemsCount: result.itemsCount,
      createdAt: new Date().toISOString(),
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido'

    // Errores de negocio conocidos
    const businessErrors = [
      'UNAUTHORIZED_OR_EXPIRED_SESSION',
      'INVALID_PRODUCT',
      'MISSING_REQUIRED_MODIFIER',
      'EXCEEDED_MODIFIER_LIMIT',
      'OPTION_UNAVAILABLE',
      'INVALID_INGREDIENT',
    ]

    const isBusinessError = businessErrors.some((code) => message.startsWith(code))

    if (isBusinessError) {
      return NextResponse.json({ error: message }, { status: 422 })
    }

    // Error de validación Zod
    if (message.includes('ZodError') || error?.constructor?.name === 'ZodError') {
      return NextResponse.json({ error: 'Payload inválido.', details: message }, { status: 400 })
    }

    console.error('[POST /api/orders] Error inesperado:', error)
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 })
  }
}
