import { prisma } from '@/lib/prisma'
import { PlanTier } from '@prisma/client'

export interface PlanDetails {
  tier: PlanTier
  name: string
  description: string
  priceMonthlyCOP: number
  priceYearlyCOP: number
  priceMonthlyMXN: number
  priceYearlyMXN: number
  priceMonthlyUSD: number
  priceYearlyUSD: number
  maxBranches: number // -1 = ilimitado
  features: string[]
  stripePriceIdMonthly?: string
  stripePriceIdYearly?: string
}

export const PLAN_CONFIGS: Record<PlanTier, PlanDetails> = {
  BASIC: {
    tier: 'BASIC',
    name: 'Plan Básico',
    description: 'Ideal para 1 restaurante o cafetería que inicia con menú digital y facturación.',
    priceMonthlyCOP: 99000,
    priceYearlyCOP: 990000,
    priceMonthlyMXN: 499,
    priceYearlyMXN: 4990,
    priceMonthlyUSD: 29,
    priceYearlyUSD: 290,
    maxBranches: 1,
    features: [
      '1 Restaurante / Sucursal',
      'Mesas con QR y menú digital interactivo',
      'Facturación POS y tickets térmicos',
      'Inventario básico y recetas',
      'Soporte estándar por email',
    ],
  },
  PRO: {
    tier: 'PRO',
    name: 'Plan Profesional (Franquicias)',
    description: 'Para cadenas y restaurantes en crecimiento con control contable e inventario avanzado.',
    priceMonthlyCOP: 249000,
    priceYearlyCOP: 2490000,
    priceMonthlyMXN: 1199,
    priceYearlyMXN: 11990,
    priceMonthlyUSD: 69,
    priceYearlyUSD: 690,
    maxBranches: 5,
    features: [
      'Hasta 5 Restaurantes / Sucursales',
      'Módulo Contable Completo (P&L, Arqueo de Caja, IVA DIAN)',
      'Panel Consolidado de Organización',
      'Control de mermas y alertas en tiempo real',
      'Gestión de roles avanzada (Accountant, Manager, Waiter)',
      'Soporte prioritario WhatsApp',
    ],
  },
  ENTERPRISE: {
    tier: 'ENTERPRISE',
    name: 'Plan Empresarial',
    description: 'Para grandes cadenas, hoteles y operaciones a gran escala con integración DIAN directa.',
    priceMonthlyCOP: 499000,
    priceYearlyCOP: 4990000,
    priceMonthlyMXN: 2499,
    priceYearlyMXN: 24990,
    priceMonthlyUSD: 139,
    priceYearlyUSD: 1390,
    maxBranches: 999,
    features: [
      'Sucursales y restaurantes ilimitados',
      'Facturación Electrónica DIAN Directa (UBL 2.1)',
      'API y Webhooks dedicados',
      'Reportes corporativos consolidados y multi-moneda',
      'Gerente de cuenta y SLA 99.9%',
    ],
  },
}

export type SupportedBillingCurrency = 'COP' | 'MXN' | 'USD'

export function getPlanPrice(
  tier: PlanTier,
  interval: 'monthly' | 'yearly',
  currency: SupportedBillingCurrency = 'COP'
): { amount: number; currency: string; formatted: string } {
  const plan = PLAN_CONFIGS[tier]
  const isYearly = interval === 'yearly'

  const curr = (currency || 'COP').toUpperCase() as SupportedBillingCurrency

  switch (curr) {
    case 'MXN': {
      const amount = isYearly ? plan.priceYearlyMXN : plan.priceMonthlyMXN
      return {
        amount,
        currency: 'mxn',
        formatted: `$${amount.toLocaleString('es-MX')} MXN`,
      }
    }
    case 'USD': {
      const amount = isYearly ? plan.priceYearlyUSD : plan.priceMonthlyUSD
      return {
        amount,
        currency: 'usd',
        formatted: `$${amount.toLocaleString('en-US')} USD`,
      }
    }
    case 'COP':
    default: {
      const amount = isYearly ? plan.priceYearlyCOP : plan.priceMonthlyCOP
      return {
        amount,
        currency: 'cop',
        formatted: `$${amount.toLocaleString('es-CO')} COP`,
      }
    }
  }
}

/**
 * Obtiene o crea la suscripción por defecto con trial de 14 días para una organización.
 */
export async function getOrCreateOrganizationSubscription(organizationId: string) {
  let sub = await prisma.subscription.findUnique({
    where: { organizationId },
    include: { organization: true },
  })

  if (!sub) {
    const now = new Date()
    const trialEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000) // 14 días

    sub = await prisma.subscription.create({
      data: {
        organizationId,
        tier: PlanTier.BASIC,
        status: 'trialing',
        currentPeriodStart: now,
        currentPeriodEnd: trialEnd,
        trialEndsAt: trialEnd,
      },
      include: { organization: true },
    })
  }

  return sub
}

/**
 * Verifica si una organización tiene una suscripción activa o trial vigente.
 */
export function isSubscriptionActive(sub: {
  status: string
  currentPeriodEnd: Date
  trialEndsAt?: Date | null
}): { isActive: boolean; isTrial: boolean; daysRemaining: number } {
  const now = new Date()
  const isTrial = sub.status === 'trialing'
  const targetDate = isTrial && sub.trialEndsAt ? new Date(sub.trialEndsAt) : new Date(sub.currentPeriodEnd)

  const diffMs = targetDate.getTime() - now.getTime()
  const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
  const isActive = ['active', 'trialing'].includes(sub.status) && targetDate > now

  return {
    isActive,
    isTrial,
    daysRemaining,
  }
}

/**
 * Valida si la organización puede crear una nueva sucursal según su plan.
 */
export async function checkBranchLimit(organizationId: string): Promise<{
  allowed: boolean
  currentCount: number
  maxAllowed: number
  tier: PlanTier
}> {
  const sub = await getOrCreateOrganizationSubscription(organizationId)
  const plan = PLAN_CONFIGS[sub.tier]

  const branchCount = await prisma.restaurant.count({
    where: { organizationId },
  })

  const allowed = plan.maxBranches === -1 || branchCount < plan.maxBranches

  return {
    allowed,
    currentCount: branchCount,
    maxAllowed: plan.maxBranches,
    tier: sub.tier,
  }
}

/**
 * Deshabilita automáticamente las sucursales excedentes al degradar plan.
 */
export async function enforceBranchLimitOnDowngrade(
  organizationId: string,
  newTier: PlanTier
): Promise<{ deactivatedCount: number; activeCount: number }> {
  const plan = PLAN_CONFIGS[newTier]
  if (plan.maxBranches === -1 || plan.maxBranches >= 999) {
    return { deactivatedCount: 0, activeCount: 0 }
  }

  // Obtener sucursales ordenadas por fecha de creación (las más antiguas se conservan)
  const branches = await prisma.restaurant.findMany({
    where: { organizationId },
    orderBy: { createdAt: 'asc' },
  })

  let activeCount = 0
  let deactivatedCount = 0

  for (let i = 0; i < branches.length; i++) {
    const branch = branches[i]
    if (i < plan.maxBranches) {
      // Conservar activa
      if (!branch.isActive) {
        await prisma.restaurant.update({
          where: { id: branch.id },
          data: { isActive: true },
        })
      }
      activeCount++
    } else {
      // Excedente -> Desactivar
      if (branch.isActive) {
        await prisma.restaurant.update({
          where: { id: branch.id },
          data: { isActive: false },
        })
        deactivatedCount++
      }
    }
  }

  if (deactivatedCount > 0) {
    const { recordAuditLog } = await import('@/lib/audit')
    await recordAuditLog({
      organizationId,
      event: 'BRANCHES_DEACTIVATED',
      details: {
        newTier,
        maxAllowed: plan.maxBranches,
        deactivatedCount,
      },
    })
  }

  return { deactivatedCount, activeCount }
}
