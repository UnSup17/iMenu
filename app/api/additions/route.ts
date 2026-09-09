import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const ADMIN_ROLES = ['SUPERADMIN', 'ORG_ADMIN', 'RESTAURANT_ADMIN', 'MANAGER']

async function getRestaurantId(userId: string, role: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { restaurantId: true, organizationId: true },
  })
  if (user?.restaurantId) return user.restaurantId
  if (user?.organizationId) {
    const first = await prisma.restaurant.findFirst({
      where: { organizationId: user.organizationId },
      select: { id: true },
    })
    if (first) return first.id
  }
  if (role === 'SUPERADMIN') {
    const first = await prisma.restaurant.findFirst({ select: { id: true } })
    return first?.id ?? null
  }
  return null
}

const CreateAdditionSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio').max(200),
  description: z.string().max(500).nullable().optional(),
  price: z.number().min(0, 'El precio no puede ser negativo'),
  isAvailable: z.boolean().optional().default(true),
  inventoryItemId: z.string().nullable().optional(),
  inventoryQuantity: z.number().positive().nullable().optional(),
  recipeProductId: z.string().nullable().optional(),
  categoryIds: z.array(z.string()).optional().default([]),
  productIds: z.array(z.string()).optional().default([]),
})

/**
 * GET /api/additions
 * Lista todas las adiciones del restaurante con sus categorías, productos e inventario.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const user = session.user as { id: string; role: string }
    if (!ADMIN_ROLES.includes(user.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const restaurantId = await getRestaurantId(user.id, user.role)
    if (!restaurantId) {
      return NextResponse.json({ error: 'Sin restaurante asignado' }, { status: 403 })
    }

    const additions = await prisma.addition.findMany({
      where: { restaurantId },
      include: {
        categories: {
          include: { category: true },
        },
        products: {
          include: { product: true },
        },
        inventoryItem: true,
        recipeProduct: {
          include: {
            recipeItems: {
              include: { inventoryItem: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ additions })
  } catch (error: any) {
    console.error('[GET /api/additions] Error:', error)
    return NextResponse.json({ error: 'Error al obtener adiciones' }, { status: 500 })
  }
}

/**
 * POST /api/additions
 * Crea una nueva adición con vinculación opcional a inventario/receta y categorías/productos.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const user = session.user as { id: string; role: string }
    if (!ADMIN_ROLES.includes(user.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const restaurantId = await getRestaurantId(user.id, user.role)
    if (!restaurantId) {
      return NextResponse.json({ error: 'Sin restaurante asignado' }, { status: 403 })
    }

    const body = await req.json()
    const data = CreateAdditionSchema.parse(body)

    const addition = await prisma.$transaction(async (tx) => {
      const created = await tx.addition.create({
        data: {
          restaurantId,
          name: data.name.trim(),
          description: data.description?.trim() || null,
          price: data.price,
          isAvailable: data.isAvailable,
          inventoryItemId: data.inventoryItemId || null,
          inventoryQuantity: data.inventoryQuantity ?? null,
          recipeProductId: data.recipeProductId || null,
        },
      })

      if (data.categoryIds.length > 0) {
        await tx.additionCategory.createMany({
          data: data.categoryIds.map((categoryId) => ({
            additionId: created.id,
            categoryId,
          })),
          skipDuplicates: true,
        })
      }

      if (data.productIds.length > 0) {
        await tx.additionProduct.createMany({
          data: data.productIds.map((productId) => ({
            additionId: created.id,
            productId,
          })),
          skipDuplicates: true,
        })
      }

      return await tx.addition.findUnique({
        where: { id: created.id },
        include: {
          categories: { include: { category: true } },
          products: { include: { product: true } },
          inventoryItem: true,
          recipeProduct: true,
        },
      })
    })

    return NextResponse.json({ addition }, { status: 201 })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 })
    }
    console.error('[POST /api/additions] Error:', error)
    return NextResponse.json({ error: 'Error al crear adición' }, { status: 500 })
  }
}
