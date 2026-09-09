import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { BrandStudioClient } from '@/components/branding/BrandStudioClient'
import { getResolvedBrandTheme } from '@/lib/branding/resolver'
import { DEFAULT_BRAND_THEME } from '@/lib/branding/types'

export default async function BrandStudioPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const user = session.user as {
    id: string
    role?: string
    organizationId?: string | null
    restaurantId?: string | null
    foodCourtId?: string | null
  }

  const allowedRoles = ['SUPERADMIN', 'ORG_ADMIN', 'RESTAURANT_ADMIN', 'FOOD_COURT_ADMIN']
  if (!allowedRoles.includes(user.role || '')) {
    redirect('/dashboard')
  }

  // Determinar ámbito de edición prioritario según el rol
  let targetType: 'ORGANIZATION' | 'RESTAURANT' | 'FOOD_COURT' = 'RESTAURANT'
  let targetId: string | undefined = undefined

  if (user.role === 'ORG_ADMIN' && user.organizationId) {
    targetType = 'ORGANIZATION'
    targetId = user.organizationId
  } else if (user.role === 'FOOD_COURT_ADMIN' && user.foodCourtId) {
    targetType = 'FOOD_COURT'
    targetId = user.foodCourtId
  } else if (user.restaurantId) {
    targetType = 'RESTAURANT'
    targetId = user.restaurantId
  } else if (user.organizationId) {
    targetType = 'ORGANIZATION'
    targetId = user.organizationId
  }

  // Cargar nombres descriptivos
  let organizationName: string | null = null
  let restaurantName: string | null = null
  let foodCourtName: string | null = null
  let orgTheme = null
  let branchTheme = null
  let allowBranchOverrides = true

  if (user.organizationId) {
    const org = await prisma.organization.findUnique({
      where: { id: user.organizationId },
      include: { brandTheme: true },
    })
    if (org) {
      organizationName = org.name
      if (org.brandTheme) {
        orgTheme = {
          ...DEFAULT_BRAND_THEME,
          ...org.brandTheme,
        }
        allowBranchOverrides = org.brandTheme.allowBranchOverrides
      }
    }
  }

  if (user.restaurantId) {
    const res = await prisma.restaurant.findUnique({
      where: { id: user.restaurantId },
      include: {
        brandTheme: true,
        organization: { include: { brandTheme: true } },
      },
    })
    if (res) {
      restaurantName = res.name
      if (res.brandTheme) {
        branchTheme = {
          ...DEFAULT_BRAND_THEME,
          ...res.brandTheme,
        }
      }
      if (res.organization?.brandTheme) {
        allowBranchOverrides = res.organization.brandTheme.allowBranchOverrides
      }
    }
  }

  if (user.foodCourtId) {
    const fc = await prisma.foodCourt.findUnique({
      where: { id: user.foodCourtId },
    })
    if (fc) {
      foodCourtName = fc.name
    }
  }

  // Resolver el tema actual
  const initialTheme = await getResolvedBrandTheme({
    restaurantId: user.restaurantId,
    foodCourtId: user.foodCourtId,
    organizationId: user.organizationId,
  })

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <BrandStudioClient
        initialTheme={initialTheme}
        orgTheme={orgTheme}
        branchTheme={branchTheme}
        allowBranchOverrides={allowBranchOverrides}
        role={user.role || 'RESTAURANT_ADMIN'}
        organizationName={organizationName}
        restaurantName={restaurantName}
        foodCourtName={foodCourtName}
        targetType={targetType}
        targetId={targetId}
      />
    </div>
  )
}
