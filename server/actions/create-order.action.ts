import { PrismaClient, Prisma } from '@prisma/client'
import { z } from 'zod'
import { getTableSession } from '@/lib/redis'

const prisma = new PrismaClient()

// ============================================================
// Esquemas de Validación Zod
// ============================================================

export const OrderItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive().max(50),
  selectedModifierOptionIds: z.array(z.string().min(1)).default([]),
  removedIngredientIds: z.array(z.string().min(1)).default([]),
  notes: z.string().max(250).optional(),
})

export const CreateOrderPayloadSchema = z.object({
  restaurantId: z.string().min(1),
  tableId: z.string().min(1),
  sessionToken: z.string().min(10),
  notes: z.string().max(500).optional(),
  items: z.array(OrderItemSchema).min(1, 'El carrito no puede estar vacío'),
})

export type CreateOrderInput = z.infer<typeof CreateOrderPayloadSchema>

export interface CreateOrderResult {
  success: true
  orderId: string
  tableNumber: number
  totalAmount: number
  itemsCount: number
}

// ============================================================
// Transacción de Creación de Orden
// ============================================================

export async function createOrderTransaction(input: CreateOrderInput): Promise<CreateOrderResult> {
  const parsed = CreateOrderPayloadSchema.parse(input)

  // Validar sesión en Redis primero (rápido, sin DB)
  const redisSession = await getTableSession(parsed.sessionToken)
  if (
    !redisSession ||
    redisSession.tableId !== parsed.tableId ||
    redisSession.restaurantId !== parsed.restaurantId
  ) {
    throw new Error('UNAUTHORIZED_OR_EXPIRED_SESSION: La sesión de mesa es inválida o ha expirado.')
  }

  return await prisma.$transaction(async (tx) => {
    // 1. Confirmar sesión activa en DB (fuente de verdad)
    const session = await tx.tableSession.findFirst({
      where: {
        sessionToken: parsed.sessionToken,
        tableId: parsed.tableId,
        status: 'ACTIVE',
        expiresAt: { gt: new Date() },
      },
      include: {
        table: true,
      },
    })

    if (!session || session.table.restaurantId !== parsed.restaurantId) {
      throw new Error('UNAUTHORIZED_OR_EXPIRED_SESSION: La sesión de mesa es inválida o ha expirado.')
    }

    // 2. Cargar productos en lote (con modificadores e ingredientes)
    const productIds = Array.from(new Set(parsed.items.map((i) => i.productId)))

    const dbProducts = await tx.product.findMany({
      where: {
        id: { in: productIds },
        restaurantId: parsed.restaurantId,
        isAvailable: true,
      },
      include: {
        modifierGroups: {
          include: {
            options: true,
          },
        },
        ingredients: true,
      },
    })

    if (dbProducts.length !== productIds.length) {
      throw new Error('INVALID_PRODUCT: Uno o más productos no existen o no están disponibles.')
    }

    const productMap = new Map(dbProducts.map((p) => [p.id, p]))

    // 3. Validación de reglas de negocio + cálculo de precios (server-side determinista)
    let calculatedTotal = new Prisma.Decimal(0)

    const orderItemsToCreate: Array<{
      productId: string
      quantity: number
      unitPrice: Prisma.Decimal
      subtotal: Prisma.Decimal
      itemNotes?: string
      modifiers: Array<{ modifierOptionId: string; priceCharged: Prisma.Decimal }>
      removedIngredients: Array<{ ingredientId: string }>
    }> = []

    for (const item of parsed.items) {
      const product = productMap.get(item.productId)!
      let itemPrice = new Prisma.Decimal(product.basePrice)
      const modifiersForThisItem: Array<{ modifierOptionId: string; priceCharged: Prisma.Decimal }> = []

      // Validar grupos de modificadores
      for (const group of product.modifierGroups) {
        const selectedInGroup = group.options.filter((opt) =>
          item.selectedModifierOptionIds.includes(opt.id),
        )

        if (group.isRequired && selectedInGroup.length < group.minSelect) {
          throw new Error(
            `MISSING_REQUIRED_MODIFIER: Debes seleccionar al menos ${group.minSelect} opción en "${group.name}".`,
          )
        }

        if (selectedInGroup.length > group.maxSelect) {
          throw new Error(
            `EXCEEDED_MODIFIER_LIMIT: Solo puedes seleccionar máximo ${group.maxSelect} opción en "${group.name}".`,
          )
        }

        for (const opt of selectedInGroup) {
          if (!opt.isAvailable) {
            throw new Error(`OPTION_UNAVAILABLE: La opción "${opt.name}" está agotada.`)
          }
          itemPrice = itemPrice.add(opt.extraPrice)
          modifiersForThisItem.push({
            modifierOptionId: opt.id,
            priceCharged: opt.extraPrice,
          })
        }
      }

      // Validar ingredientes removibles pertenecen al producto
      const validIngredientIds = new Set(product.ingredients.map((ing) => ing.id))
      for (const remId of item.removedIngredientIds) {
        if (!validIngredientIds.has(remId)) {
          throw new Error(
            'INVALID_INGREDIENT: Se intentó remover un ingrediente no asociado al producto.',
          )
        }
      }

      const itemSubtotal = itemPrice.mul(item.quantity)
      calculatedTotal = calculatedTotal.add(itemSubtotal)

      orderItemsToCreate.push({
        productId: product.id,
        quantity: item.quantity,
        unitPrice: itemPrice,
        subtotal: itemSubtotal,
        itemNotes: item.notes,
        modifiers: modifiersForThisItem,
        removedIngredients: item.removedIngredientIds.map((id) => ({ ingredientId: id })),
      })
    }

    // 4. Persistir la orden de forma atómica
    const order = await tx.order.create({
      data: {
        restaurantId: parsed.restaurantId,
        tableId: parsed.tableId,
        sessionId: session.id,
        status: 'RECEIVED',
        totalAmount: calculatedTotal,
        notes: parsed.notes,
        items: {
          create: orderItemsToCreate.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subtotal: item.subtotal,
            itemNotes: item.itemNotes,
            modifiers: {
              create: item.modifiers.map((m) => ({
                modifierOptionId: m.modifierOptionId,
                priceCharged: m.priceCharged,
              })),
            },
            removedIngredients: {
              create: item.removedIngredients.map((r) => ({
                ingredientId: r.ingredientId,
              })),
            },
          })),
        },
      },
      include: {
        items: {
          include: { modifiers: true, removedIngredients: true },
        },
      },
    })

    return {
      success: true as const,
      orderId: order.id,
      tableNumber: session.table.tableNumber,
      totalAmount: order.totalAmount.toNumber(),
      itemsCount: order.items.reduce((sum, i) => sum + i.quantity, 0),
    }
  })
}
