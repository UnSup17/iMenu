import { NextRequest, NextResponse } from 'next/server'
import { createOrderTransaction } from '@/server/actions/create-order.action'
import {
  emitNewOrder,
  emitOrderConfirmedToTable,
  emitInventoryUpdate,
  emitProductUnavailable,
} from '@/lib/socket-server'
import { getTableSession, storeSharedTableCart } from '@/lib/redis'
import { prisma } from '@/lib/prisma'
import { deductStockForOrder } from '@/lib/inventory/stock-manager'
import { type ConfirmedOrderPayload } from '@/types/websocket-events'

/**
 * GET /api/orders?tableId=xxx&sessionToken=xxx
 * Obtiene todas las órdenes confirmadas de una mesa en la sesión activa.
 */
export async function GET(request: NextRequest) {
  try {
    const tableId = request.nextUrl.searchParams.get('tableId')
    const sessionToken = request.nextUrl.searchParams.get('sessionToken')

    if (!tableId || !sessionToken) {
      return NextResponse.json({ error: 'tableId y sessionToken requeridos' }, { status: 400 })
    }

    const session = await getTableSession(sessionToken)
    if (!session || session.tableId !== tableId) {
      return NextResponse.json({ error: 'Sesión inválida o expirada' }, { status: 401 })
    }

    const dbOrders = await prisma.order.findMany({
      where: {
        sessionId: session.sessionId,
        tableId,
      },
      orderBy: { createdAt: 'asc' },
      include: {
        items: {
          include: {
            product: true,
            modifiers: {
              include: { modifierOption: true },
            },
          },
        },
      },
    })

    const orders: ConfirmedOrderPayload[] = dbOrders.map((o) => ({
      orderId: o.id,
      status: o.status,
      totalAmount: o.totalAmount.toNumber(),
      itemsCount: o.items.reduce((acc, i) => acc + i.quantity, 0),
      createdAt: o.createdAt.toISOString(),
      items: o.items.map((i) => {
        const orderedByMatch = i.itemNotes?.match(/^\[Para:\s*([^\]]+)\]/)
        const orderedByNames = orderedByMatch
          ? orderedByMatch[1].split(',').map((n) => n.trim())
          : []
        const cleanNotes = i.itemNotes?.replace(/^\[Para:\s*[^\]]+\]\s*/, '').trim()

        return {
          id: i.id,
          name: i.product.name,
          quantity: i.quantity,
          unitPrice: i.unitPrice.toNumber(),
          subtotal: i.subtotal.toNumber(),
          modifiers: i.modifiers.map((m) => m.modifierOption.name),
          orderedByNames,
          notes: cleanNotes || undefined,
        }
      }),
    }))

    return NextResponse.json({ orders })
  } catch (error) {
    console.error('[GET /api/orders] Error al obtener órdenes:', error)
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 })
  }
}

/**
 * POST /api/orders
 * Crea un nuevo pedido, valida la sesión y emite el evento WebSocket al staff y a la mesa.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const result = await createOrderTransaction(body)

    // 1. Emitir evento en tiempo real al staff del restaurante
    emitNewOrder(body.restaurantId, {
      orderId: result.orderId,
      restaurantId: body.restaurantId,
      tableId: body.tableId,
      tableNumber: result.tableNumber,
      totalAmount: result.totalAmount,
      itemsCount: result.itemsCount,
      createdAt: result.createdAt,
    })

    // 2. Emitir evento en tiempo real a todos los comensales de la mesa
    const confirmedPayload: ConfirmedOrderPayload = {
      orderId: result.orderId,
      status: result.status,
      totalAmount: result.totalAmount,
      itemsCount: result.itemsCount,
      createdAt: result.createdAt,
      items: result.items,
    }
    const session = await getTableSession(body.sessionToken)
    emitOrderConfirmedToTable(body.restaurantId, body.tableId, confirmedPayload, session?.foodCourtId)

    // 3. Limpiar carrito borrador compartido en Redis/memoria para la mesa
    await storeSharedTableCart(body.tableId, [])

    // 4. Descontar inventario (fire-and-forget: no bloquea la respuesta al cliente)
    //    Se ejecuta en background; si falla, se registra en logs pero no rompe el pedido.
    deductStockForOrder(result.orderId, body.restaurantId, 'system')
      .then(async (deductionResult) => {
        if (!deductionResult.success) return

        // Emitir actualizaciones de inventario al staff
        for (const movementId of deductionResult.movements) {
          // Obtener datos del ítem actualizado para el evento
          const movement = await prisma.inventoryMovement.findUnique({
            where: { id: movementId },
            include: { inventoryItem: true },
          })
          if (!movement) continue

          emitInventoryUpdate(body.restaurantId, {
            restaurantId: body.restaurantId,
            inventoryItemId: movement.inventoryItemId,
            inventoryItemName: movement.inventoryItem.name,
            currentStock: movement.stockAfter.toNumber(),
            minStock: movement.inventoryItem.minStock.toNumber(),
            isLow: movement.stockAfter.toNumber() <= movement.inventoryItem.minStock.toNumber(),
            isEmpty: movement.stockAfter.toNumber() <= 0,
          })
        }

        // Emitir productos que quedaron sin stock
        for (const productId of deductionResult.stockIssues) {
          const issue = await prisma.productStockIssue.findFirst({
            where: { productId, restaurantId: body.restaurantId, resolvedAt: null },
            include: { inventoryItem: true },
          })
          if (!issue) continue

          emitProductUnavailable(body.restaurantId, {
            restaurantId: body.restaurantId,
            productId,
            reason: `Sin stock de ${issue.inventoryItem.name}`,
            inventoryItemId: issue.inventoryItemId,
          })
        }
      })
      .catch((err) => {
        console.error('[POST /api/orders] Error en deducción de stock (non-blocking):', err)
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
