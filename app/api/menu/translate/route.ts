import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { translateDishContent } from '@/lib/menu/translator'
import { z } from 'zod'

const ALLOWED_ROLES = ['SUPERADMIN', 'ORG_ADMIN', 'RESTAURANT_ADMIN', 'MANAGER']

const TranslateSchema = z.object({
  scope: z.enum(['menu', 'category', 'product']).default('menu'),
  targetId: z.string().uuid().optional(),
  languages: z.array(z.enum(['en', 'pt'])).default(['en', 'pt']),
})

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

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const user = session.user as { id: string; role: string }
    if (!ALLOWED_ROLES.includes(user.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const restaurantId = await getRestaurantId(user.id, user.role)
    if (!restaurantId) {
      return NextResponse.json({ error: 'Sin restaurante asignado' }, { status: 403 })
    }

    const body = await req.json().catch(() => ({}))
    const parsed = TranslateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Parámetros inválidos', details: parsed.error.flatten() }, { status: 400 })
    }

    const { scope, targetId, languages } = parsed.data
    let productsToTranslate = []

    if (scope === 'product' && targetId) {
      const p = await prisma.product.findFirst({
        where: { id: targetId, restaurantId },
      })
      if (!p) return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 })
      productsToTranslate = [p]
    } else if (scope === 'category' && targetId) {
      productsToTranslate = await prisma.product.findMany({
        where: { categoryId: targetId, restaurantId },
      })
    } else {
      // Menú completo
      productsToTranslate = await prisma.product.findMany({
        where: { restaurantId },
      })
    }

    let translatedCount = 0
    const results = []

    for (const prod of productsToTranslate) {
      const trans = await translateDishContent(prod.name, prod.description, languages)
      const existing = prod.translations ? JSON.parse(prod.translations) : {}
      const merged = { ...existing, ...trans }

      await prisma.product.update({
        where: { id: prod.id },
        data: {
          translations: JSON.stringify(merged),
        },
      })

      translatedCount++
      results.push({
        id: prod.id,
        name: prod.name,
        translations: merged,
      })
    }

    // También traducir categorías si el scope es 'menu' o 'category'
    if (scope === 'menu' || scope === 'category') {
      const catWhere = scope === 'category' && targetId ? { id: targetId, restaurantId } : { restaurantId }
      const cats = await prisma.category.findMany({ where: catWhere })

      for (const cat of cats) {
        const trans = await translateDishContent(cat.name, null, languages)
        const existing = cat.translations ? JSON.parse(cat.translations) : {}
        const merged = { ...existing, ...trans }

        await prisma.category.update({
          where: { id: cat.id },
          data: {
            translations: JSON.stringify(merged),
          },
        })
      }
    }

    return NextResponse.json({
      success: true,
      scope,
      translatedCount,
      languages,
      results,
      message: `¡${translatedCount} platos traducidos exitosamente a ${languages.join(', ').toUpperCase()}!`,
    })
  } catch (error) {
    console.error('[POST /api/menu/translate]', error)
    return NextResponse.json({ error: 'Error al traducir menú con IA' }, { status: 500 })
  }
}
