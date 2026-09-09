import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import type { Metadata } from 'next'
import { AdditionsManager } from '@/components/additions/AdditionsManager'

export const metadata: Metadata = {
  title: 'Adiciones & Extras — iMenu',
  description: 'Administra las adiciones, extras e ingredientes opcionales para tus platos del menú.',
}

const ALLOWED_ROLES = ['SUPERADMIN', 'ORG_ADMIN', 'RESTAURANT_ADMIN', 'MANAGER']

export default async function AdditionsPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const sessionUser = session.user as { id: string; role: string }
  if (!ALLOWED_ROLES.includes(sessionUser.role)) redirect('/dashboard')

  // Resolver restaurantId
  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { restaurantId: true, organizationId: true },
  })

  let restaurantId = user?.restaurantId
  if (!restaurantId && user?.organizationId) {
    const first = await prisma.restaurant.findFirst({
      where: { organizationId: user.organizationId },
      select: { id: true },
    })
    restaurantId = first?.id ?? null
  }
  if (!restaurantId && sessionUser.role === 'SUPERADMIN') {
    const first = await prisma.restaurant.findFirst({ select: { id: true } })
    restaurantId = first?.id ?? null
  }
  if (!restaurantId) redirect('/dashboard')

  // Cargar datos en paralelo
  const [restaurant, additions, categories, inventoryItems, productsWithRecipes] = await Promise.all([
    prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { currency: true },
    }),
    prisma.addition.findMany({
      where: { restaurantId },
      include: {
        categories: {
          include: { category: { select: { id: true, name: true } } },
        },
        products: {
          include: { product: { select: { id: true, name: true, categoryId: true } } },
        },
        inventoryItem: {
          select: { id: true, name: true, unit: true, currentStock: true },
        },
        recipeProduct: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.category.findMany({
      where: { restaurantId, isActive: true },
      orderBy: { orderIndex: 'asc' },
      include: {
        products: {
          where: { isAvailable: true },
          select: { id: true, name: true },
          orderBy: { name: 'asc' },
        },
      },
    }),
    prisma.inventoryItem.findMany({
      where: { restaurantId, isActive: true },
      select: {
        id: true,
        name: true,
        unit: true,
        currentStock: true,
        costPerUnit: true,
      },
      orderBy: { name: 'asc' },
    }),
    prisma.product.findMany({
      where: {
        restaurantId,
        isAvailable: true,
        recipeItems: { some: {} },
      },
      select: {
        id: true,
        name: true,
        category: { select: { name: true } },
      },
      orderBy: { name: 'asc' },
    }),
  ])

  // Serializar Decimal → number
  const serializedAdditions = additions.map((a) => ({
    id: a.id,
    name: a.name,
    description: a.description,
    price: a.price.toNumber(),
    isAvailable: a.isAvailable,
    imageUrl: a.imageUrl,
    inventoryItemId: a.inventoryItemId,
    inventoryQuantity: a.inventoryQuantity?.toNumber() ?? null,
    recipeProductId: a.recipeProductId,
    inventoryItem: a.inventoryItem
      ? {
          id: a.inventoryItem.id,
          name: a.inventoryItem.name,
          unit: a.inventoryItem.unit,
          currentStock: a.inventoryItem.currentStock.toNumber(),
        }
      : null,
    recipeProduct: a.recipeProduct
      ? {
          id: a.recipeProduct.id,
          name: a.recipeProduct.name,
        }
      : null,
    categories: a.categories.map((c) => ({
      categoryId: c.categoryId,
      category: c.category,
    })),
    products: a.products.map((p) => ({
      productId: p.productId,
      product: p.product,
    })),
  }))

  const serializedInventoryItems = inventoryItems.map((i) => ({
    id: i.id,
    name: i.name,
    unit: i.unit,
    currentStock: i.currentStock.toNumber(),
    costPerUnit: i.costPerUnit.toNumber(),
  }))

  const serializedRecipeProducts = productsWithRecipes.map((p) => ({
    id: p.id,
    name: p.name,
    categoryName: p.category?.name,
  }))

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <AdditionsManager
        initialAdditions={serializedAdditions}
        categories={categories}
        inventoryItems={serializedInventoryItems}
        recipeProducts={serializedRecipeProducts}
        currency={restaurant?.currency || 'COP'}
      />
    </div>
  )
}
