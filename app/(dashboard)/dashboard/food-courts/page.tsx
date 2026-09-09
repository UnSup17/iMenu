import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { FoodCourtListClient } from './FoodCourtListClient'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Plazas Gastronómicas — iMenu Dashboard',
}

export default async function FoodCourtsDashboardPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const user = session.user as { organizationId?: string; role?: string }
  const allowedRoles = ['SUPERADMIN', 'ORG_ADMIN', 'RESTAURANT_ADMIN', 'MANAGER']
  if (!allowedRoles.includes(user.role || '')) {
    redirect('/dashboard')
  }

  const foodCourts = await prisma.foodCourt.findMany({
    where: {
      ...(user.role === 'SUPERADMIN'
        ? {}
        : user.organizationId
        ? { organizationId: user.organizationId }
        : {}),
    },
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
      _count: {
        select: { tables: true, users: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  const canCreate = ['SUPERADMIN', 'ORG_ADMIN'].includes(user.role || '')

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <FoodCourtListClient initialFoodCourts={foodCourts} canCreate={canCreate} />
    </div>
  )
}
