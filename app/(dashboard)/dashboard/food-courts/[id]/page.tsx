import { auth } from '@/lib/auth'
import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { FoodCourtDetailClient } from './FoodCourtDetailClient'
import type { Metadata } from 'next'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const fc = await prisma.foodCourt.findUnique({
    where: { id },
    select: { name: true },
  })
  return {
    title: fc ? `${fc.name} — Plaza Gastronómica` : 'Plaza Gastronómica — iMenu Dashboard',
  }
}

export default async function FoodCourtDetailPage({ params }: PageProps) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const user = session.user as { organizationId?: string; role?: string; foodCourtId?: string }
  const allowedRoles = ['SUPERADMIN', 'ORG_ADMIN', 'FOOD_COURT_ADMIN', 'RESTAURANT_ADMIN', 'MANAGER']
  if (!allowedRoles.includes(user.role || '')) {
    redirect('/dashboard')
  }

  const { id } = await params

  // Si es FOOD_COURT_ADMIN, solo puede acceder a su propia plaza
  if (user.role === 'FOOD_COURT_ADMIN' && user.foodCourtId && user.foodCourtId !== id) {
    redirect('/dashboard')
  }

  const foodCourt = await prisma.foodCourt.findUnique({
    where: { id },
    include: {
      memberships: {
        include: {
          restaurant: {
            select: {
              id: true,
              name: true,
              slug: true,
              logoUrl: true,
              cuisineType: true,
            },
          },
        },
        orderBy: { orderIndex: 'asc' },
      },
      tables: {
        orderBy: { tableNumber: 'asc' },
        include: {
          sessions: {
            where: { closedAt: null },
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: {
              foodCourtPayments: {
                include: {
                  restaurant: {
                    select: {
                      id: true,
                      name: true,
                      slug: true,
                      logoUrl: true,
                      cuisineType: true,
                    },
                  },
                  invoice: {
                    select: {
                      id: true,
                      invoiceNumber: true,
                      status: true,
                      total: true,
                    },
                  },
                },
                orderBy: { createdAt: 'asc' },
              },
            },
          },
        },
      },
    },
  })

  if (!foodCourt) notFound()

  // Buscar todos los restaurantes disponibles en la organización para poder agregarlos
  const availableRestaurants = await prisma.restaurant.findMany({
    where: {
      ...(user.role === 'SUPERADMIN'
        ? {}
        : user.organizationId
        ? { organizationId: user.organizationId }
        : {}),
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      logoUrl: true,
      cuisineType: true,
    },
    orderBy: { name: 'asc' },
  })

  const canManage = ['SUPERADMIN', 'ORG_ADMIN', 'FOOD_COURT_ADMIN'].includes(user.role || '')

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <FoodCourtDetailClient
        foodCourt={{
          id: foodCourt.id,
          name: foodCourt.name,
          slug: foodCourt.slug,
          description: foodCourt.description,
          logoUrl: foodCourt.logoUrl,
          currency: foodCourt.currency,
          isActive: foodCourt.isActive,
          memberships: foodCourt.memberships.map((m) => ({
            id: m.id,
            restaurantId: m.restaurantId,
            orderIndex: m.orderIndex,
            isActive: m.isActive,
            restaurant: m.restaurant,
          })),
          tables: foodCourt.tables.map((t) => {
            const activeSession = t.sessions[0] ?? null
            return {
              id: t.id,
              tableNumber: t.tableNumber,
              zone: t.zone,
              status: t.status,
              activeSession: activeSession
                ? {
                    id: activeSession.id,
                    sessionToken: activeSession.sessionToken,
                    startedAt: activeSession.createdAt.toISOString(),
                    payments: activeSession.foodCourtPayments.map((p) => ({
                      id: p.id,
                      restaurantId: p.restaurantId,
                      restaurantName: p.restaurant.name,
                      restaurantSlug: p.restaurant.slug,
                      restaurantLogo: p.restaurant.logoUrl,
                      status: p.status,
                      totalAmount: Number(p.totalAmount),
                      paidAt: p.paidAt?.toISOString() || null,
                      invoiceId: p.invoiceId,
                      invoiceNumber: p.invoice?.invoiceNumber || null,
                    })),
                  }
                : null,
            }
          }),
        }}
        availableRestaurants={availableRestaurants}
        canManage={canManage}
      />
    </div>
  )
}
