/**
 * Stock Manager — Lógica central de inventario
 *
 * Se encarga de:
 * 1. Descontar stock al recibir una orden (RECEIVED)
 * 2. Restaurar stock al cancelar una orden (CANCELLED)
 * 3. Actualizar ProductStockIssue cuando un ingrediente llega a 0
 * 4. Emitir eventos Socket.IO de disponibilidad al menú del cliente
 */

import { prisma } from '@/lib/prisma'
import { MovementType } from '@prisma/client'

/** ID de sistema para movimientos automáticos (sin usuario real) */
const SYSTEM_USER_PLACEHOLDER = 'system'

/**
 * Descuenta el stock de todos los ingredientes usados por los items de una orden.
 * Debe llamarse cuando la orden pasa a estado RECEIVED.
 *
 * Usa una transacción atómica: si falla cualquier ingrediente, ninguno se descuenta.
 */
export async function deductStockForOrder(
  orderId: string,
  restaurantId: string,
  createdById: string,
): Promise<StockDeductionResult> {
  // Cargar items de la orden con sus recetas
  const orderItems = await prisma.orderItem.findMany({
    where: { orderId },
    include: {
      product: {
        include: {
          recipeItems: {
            include: {
              inventoryItem: true,
            },
          },
        },
      },
    },
  })

  if (orderItems.length === 0) {
    return { success: true, movements: [], stockIssues: [] }
  }

  // Calcular la cantidad total a descontar por ítem de inventario
  // (puede aparecer en múltiples productos del mismo pedido)
  const deductions = new Map<string, { item: typeof orderItems[0]['product']['recipeItems'][0]['inventoryItem']; qty: number }>()

  for (const orderItem of orderItems) {
    for (const recipeItem of orderItem.product.recipeItems) {
      const totalQty = recipeItem.quantity.toNumber() * orderItem.quantity
      const existing = deductions.get(recipeItem.inventoryItemId)
      if (existing) {
        existing.qty += totalQty
      } else {
        deductions.set(recipeItem.inventoryItemId, {
          item: recipeItem.inventoryItem,
          qty: totalQty,
        })
      }
    }
  }

  if (deductions.size === 0) {
    // Ningún producto tiene receta configurada — ok, no hay nada que descontar
    return { success: true, movements: [], stockIssues: [] }
  }

  const movements: string[] = []
  const newStockIssues: string[] = []

  await prisma.$transaction(async (tx) => {
    for (const [inventoryItemId, { item, qty }] of deductions) {
      const stockBefore = item.currentStock.toNumber()
      const stockAfter = Math.max(0, stockBefore - qty)

      // Crear movimiento
      const movement = await tx.inventoryMovement.create({
        data: {
          restaurantId,
          inventoryItemId,
          type: MovementType.SALE,
          quantity: -qty,
          stockBefore,
          stockAfter,
          reference: orderId,
          createdById,
        },
      })
      movements.push(movement.id)

      // Actualizar stock
      await tx.inventoryItem.update({
        where: { id: inventoryItemId },
        data: { currentStock: stockAfter },
      })

      // Si llegó a 0 → marcar los productos afectados como sin stock
      if (stockAfter <= 0) {
        const affectedProducts = await tx.productRecipeItem.findMany({
          where: { inventoryItemId, product: { restaurantId } },
          select: { productId: true },
        })

        for (const { productId } of affectedProducts) {
          const existing = await tx.productStockIssue.findUnique({
            where: { productId_inventoryItemId: { productId, inventoryItemId } },
          })
          if (!existing) {
            await tx.productStockIssue.create({
              data: { productId, inventoryItemId, restaurantId },
            })
            newStockIssues.push(productId)
          }
        }
      }
    }
  })

  return { success: true, movements, stockIssues: newStockIssues }
}

/**
 * Restaura el stock de todos los movimientos asociados a una orden cancelada.
 * Debe llamarse cuando la orden pasa a estado CANCELLED.
 */
export async function restoreStockForOrder(
  orderId: string,
  restaurantId: string,
  createdById: string,
): Promise<StockRestorationResult> {
  // Buscar todos los movimientos de SALE de esta orden
  const saleMovements = await prisma.inventoryMovement.findMany({
    where: {
      reference: orderId,
      type: MovementType.SALE,
      restaurantId,
    },
    include: { inventoryItem: true },
  })

  if (saleMovements.length === 0) {
    return { success: true, restoredItems: [] }
  }

  const restoredItems: string[] = []
  const resolvedStockIssues: string[] = []

  await prisma.$transaction(async (tx) => {
    for (const movement of saleMovements) {
      const restorationQty = Math.abs(movement.quantity.toNumber())
      const stockBefore = movement.inventoryItem.currentStock.toNumber()
      const stockAfter = stockBefore + restorationQty

      // Crear movimiento inverso (ADJUSTMENT positivo)
      await tx.inventoryMovement.create({
        data: {
          restaurantId,
          inventoryItemId: movement.inventoryItemId,
          type: MovementType.ADJUSTMENT,
          quantity: restorationQty,
          stockBefore,
          stockAfter,
          reference: `cancel:${orderId}`,
          notes: 'Restauración por cancelación de orden',
          createdById,
        },
      })

      // Actualizar stock
      await tx.inventoryItem.update({
        where: { id: movement.inventoryItemId },
        data: { currentStock: stockAfter },
      })

      restoredItems.push(movement.inventoryItemId)

      // Si el stock volvió a ser positivo → resolver stock issues
      if (stockAfter > 0) {
        const resolved = await tx.productStockIssue.updateMany({
          where: {
            inventoryItemId: movement.inventoryItemId,
            restaurantId,
            resolvedAt: null,
          },
          data: { resolvedAt: new Date() },
        })
        if (resolved.count > 0) {
          resolvedStockIssues.push(movement.inventoryItemId)
        }
      }
    }
  })

  return { success: true, restoredItems, resolvedStockIssues }
}

/**
 * Retorna los productos sin stock (con detalle de qué ingrediente falta)
 * para el menú del cliente.
 */
export async function getProductStockIssues(restaurantId: string) {
  return prisma.productStockIssue.findMany({
    where: { restaurantId, resolvedAt: null },
    include: {
      inventoryItem: { select: { name: true } },
    },
  })
}

// ============================================================
// Types
// ============================================================

export interface StockDeductionResult {
  success: boolean
  movements: string[]
  stockIssues: string[]  // productIds que quedaron sin stock
}

export interface StockRestorationResult {
  success: boolean
  restoredItems: string[]
  resolvedStockIssues?: string[]  // inventoryItemIds que se recuperaron
}
