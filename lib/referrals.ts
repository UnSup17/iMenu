import { prisma } from './prisma'
import { recordAuditLog } from './audit'

/**
 * Obtiene o genera el código de referidos activo para una organización.
 */
export async function getOrCreateReferralCode(organizationId: string) {
  let referral = await prisma.referralCode.findFirst({
    where: { organizationId, isActive: true },
  })

  if (!referral) {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
    })

    const baseSlug = (org?.slug || 'IMENU')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 8)

    const randomSuffix = Math.floor(1000 + Math.random() * 9000)
    const code = `${baseSlug}-${randomSuffix}`

    referral = await prisma.referralCode.create({
      data: {
        organizationId,
        code,
        discountPercent: 20, // 20% de descuento estándar
        uses: 0,
        isActive: true,
      },
    })
  }

  return referral
}

/**
 * Valida si un código de referido existe, está activo y tiene cupos disponibles.
 */
export async function validateReferralCode(code: string): Promise<{
  valid: boolean
  error?: string
  referralCode?: any
}> {
  if (!code || typeof code !== 'string') {
    return { valid: false, error: 'Código de referido no proporcionado' }
  }

  const normalized = code.trim().toUpperCase()

  const referral = await prisma.referralCode.findUnique({
    where: { code: normalized },
    include: { organization: true },
  })

  if (!referral) {
    return { valid: false, error: 'Código de referido no encontrado o inválido' }
  }

  if (!referral.isActive) {
    return { valid: false, error: 'El código de referido ha sido desactivado' }
  }

  if (referral.maxUses !== null && referral.uses >= referral.maxUses) {
    return { valid: false, error: 'El código de referido ha alcanzado el límite máximo de usos' }
  }

  return { valid: true, referralCode: referral }
}

/**
 * Aplica un código de referido a una nueva organización al momento del registro.
 */
export async function applyReferralCodeToRegistration(
  newOrganizationId: string,
  rawCode: string
): Promise<{ success: boolean; discountPercent?: number; error?: string }> {
  const check = await validateReferralCode(rawCode)
  if (!check.valid || !check.referralCode) {
    return { success: false, error: check.error }
  }

  const referral = check.referralCode

  // Prevenir autoreferirse
  if (referral.organizationId === newOrganizationId) {
    return { success: false, error: 'No es posible utilizar tu propio código de referido' }
  }

  // 1. Vincular código a la nueva organización
  await prisma.organization.update({
    where: { id: newOrganizationId },
    data: { referredByCode: referral.code },
  })

  // 2. Aplicar descuento del 20% en su suscripción inicial
  await prisma.subscription.updateMany({
    where: { organizationId: newOrganizationId },
    data: { discountPercent: referral.discountPercent },
  })

  // 3. Incrementar usos del código de referido
  await prisma.referralCode.update({
    where: { id: referral.id },
    data: { uses: { increment: 1 } },
  })

  // 4. Bonificación a la organización que refirió (acumula 10% adicional hasta máx 50%)
  const referrerSub = await prisma.subscription.findUnique({
    where: { organizationId: referral.organizationId },
  })

  if (referrerSub) {
    const currentDiscount = referrerSub.discountPercent || 0
    const newDiscount = Math.min(50, currentDiscount + 10)
    await prisma.subscription.update({
      where: { id: referrerSub.id },
      data: { discountPercent: newDiscount },
    })
  }

  // 5. Registrar en auditoría
  await recordAuditLog({
    organizationId: newOrganizationId,
    event: 'REFERRAL_REDEEMED',
    details: {
      code: referral.code,
      discountPercent: referral.discountPercent,
      referrerOrganizationId: referral.organizationId,
    },
  })

  await recordAuditLog({
    organizationId: referral.organizationId,
    event: 'REFERRAL_EARNED',
    details: {
      code: referral.code,
      referredOrganizationId: newOrganizationId,
    },
  })

  return { success: true, discountPercent: referral.discountPercent }
}

/**
 * Obtiene estadísticas completas del programa de referidos para una organización.
 */
export async function getReferralStats(organizationId: string) {
  const referral = await getOrCreateReferralCode(organizationId)

  const referredOrgsCount = await prisma.organization.count({
    where: { referredByCode: referral.code },
  })

  const sub = await prisma.subscription.findUnique({
    where: { organizationId },
  })

  const baseUrl = process.env.NEXTAUTH_URL || 'https://imenu.app'
  const shareUrl = `${baseUrl}/register?ref=${referral.code}`

  return {
    code: referral.code,
    discountPercent: referral.discountPercent,
    currentDiscountEarned: sub?.discountPercent || 0,
    totalUses: referral.uses,
    referredOrgsCount,
    shareUrl,
    whatsappShareUrl: `https://wa.me/?text=${encodeURIComponent(
      `¡Hola! Te recomiendo iMenu para la gestión de tu restaurante. Regístrate con mi enlace para obtener 20% de descuento en tu plan: ${shareUrl}`
    )}`,
  }
}
