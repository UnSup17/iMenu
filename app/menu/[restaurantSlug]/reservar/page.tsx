import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import { CustomerReservationClient } from './CustomerReservationClient'
import { BrandThemeInjector } from '@/components/branding/BrandThemeInjector'
import { getResolvedBrandTheme } from '@/lib/branding/resolver'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ restaurantSlug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { restaurantSlug } = await params
  const restaurant = await prisma.restaurant.findUnique({
    where: { slug: restaurantSlug, isActive: true },
    select: { name: true },
  })

  return {
    title: restaurant ? `Reservar Mesa — ${restaurant.name}` : 'Reservar Mesa — iMenu',
    description: 'Reserva tu mesa en línea, selecciona tus platillos por anticipado y recibe confirmación al instante por WhatsApp.',
  }
}

export default async function CustomerReservationPage({ params }: PageProps) {
  const { restaurantSlug } = await params

  const restaurant = await prisma.restaurant.findUnique({
    where: { slug: restaurantSlug, isActive: true },
    include: {
      categories: {
        where: { isActive: true },
        orderBy: { orderIndex: 'asc' },
        include: {
          products: {
            where: { isAvailable: true },
            orderBy: { orderIndex: 'asc' },
            select: {
              id: true,
              name: true,
              description: true,
              basePrice: true,
              imageUrl: true,
            },
          },
        },
      },
    },
  })

  if (!restaurant) {
    notFound()
  }

  const brandTheme = await getResolvedBrandTheme({ restaurantId: restaurant.id })

  // Serializar precios Decimal a number
  const serializedCategories = restaurant.categories.map((c) => ({
    id: c.id,
    name: c.name,
    products: c.products.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      price: Number(p.basePrice),
      imageUrl: p.imageUrl,
    })),
  }))

  return (
    <>
      <BrandThemeInjector theme={brandTheme} />
      <CustomerReservationClient
        restaurant={{
          id: restaurant.id,
          name: restaurant.name,
          slug: restaurant.slug,
          address: restaurant.description || null,
          phone: null,
          logoUrl: restaurant.logoUrl,
        }}
        categories={serializedCategories}
      />
    </>
  )
}
