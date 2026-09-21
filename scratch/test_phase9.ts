import { PrismaClient, PlanTier } from '@prisma/client'
import { recordAuditLog, getRecentAuditLogs } from '../lib/audit'
import { sendOnboardingWelcomeEmail, sendTrialExpiringEmail } from '../lib/email'
import { getPlanPrice, enforceBranchLimitOnDowngrade, checkBranchLimit } from '../lib/subscription'
import { createStripeCheckoutSession } from '../lib/stripe'
import {
  getOrCreateReferralCode,
  validateReferralCode,
  applyReferralCodeToRegistration,
  getReferralStats,
} from '../lib/referrals'

const prisma = new PrismaClient()

async function runTests() {
  console.log('🧪 Iniciando Verificación Integral de Fase 9...\n')

  const testOrgAId = `test_org_a_${Date.now()}`
  const testOrgBId = `test_org_b_${Date.now()}`

  try {
    // -----------------------------------------------------------------
    // 1. Auditoría de Seguridad (AuditLog)
    // -----------------------------------------------------------------
    console.log('--- 1. Probando Registro de Auditoría ---')
    await recordAuditLog({
      organizationId: testOrgAId,
      event: 'LOGIN_SUCCESS',
      ip: '190.25.100.12',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36',
      details: { method: 'credentials', role: 'RESTAURANT_ADMIN' },
    })

    const auditLogs = await getRecentAuditLogs({ organizationId: testOrgAId, limit: 5 })
    console.log(`✅ Logs de auditoría recuperados: ${auditLogs.length}`)
    if (auditLogs.length === 0 || auditLogs[0].event !== 'LOGIN_SUCCESS') {
      throw new Error('Fallo en verificación de AuditLog')
    }
    console.log(`   Último evento: ${auditLogs[0].event}, IP: ${auditLogs[0].ip}`)

    // -----------------------------------------------------------------
    // 2. Emails de Onboarding y Alertas de Trial
    // -----------------------------------------------------------------
    console.log('\n--- 2. Probando Plantillas de Email Onboarding y Trial ---')
    const welcomeRes = await sendOnboardingWelcomeEmail(
      'test@gastronomia.co',
      'El Famoso Asador',
      'Carlos Chef'
    )
    console.log(`✅ Email onboarding enviado:`, welcomeRes)

    const trial3DaysRes = await sendTrialExpiringEmail(
      'test@gastronomia.co',
      'El Famoso Asador',
      3
    )
    console.log(`✅ Alerta trial 3 días enviada:`, trial3DaysRes)

    const trial1DayRes = await sendTrialExpiringEmail(
      'test@gastronomia.co',
      'El Famoso Asador',
      1
    )
    console.log(`✅ Alerta trial 1 día enviada:`, trial1DayRes)

    // -----------------------------------------------------------------
    // 3. Facturación Multimoneda (COP, MXN, USD)
    // -----------------------------------------------------------------
    console.log('\n--- 3. Probando Matriz Multimoneda (COP, MXN, USD) ---')
    const priceCOP = getPlanPrice(PlanTier.PRO, 'monthly', 'COP')
    const priceMXN = getPlanPrice(PlanTier.PRO, 'monthly', 'MXN')
    const priceUSD = getPlanPrice(PlanTier.PRO, 'yearly', 'USD')

    console.log(`✅ Plan PRO Mensual COP: ${priceCOP.formatted} (Monto: ${priceCOP.amount} ${priceCOP.currency})`)
    console.log(`✅ Plan PRO Mensual MXN: ${priceMXN.formatted} (Monto: ${priceMXN.amount} ${priceMXN.currency})`)
    console.log(`✅ Plan PRO Anual USD: ${priceUSD.formatted} (Monto: ${priceUSD.amount} ${priceUSD.currency})`)

    if (!priceCOP.formatted.includes('COP') || !priceMXN.formatted.includes('MXN') || !priceUSD.formatted.includes('USD')) {
      throw new Error('Fallo en formateo multimoneda')
    }

    // -----------------------------------------------------------------
    // 4. Sesión Stripe Checkout y Redirección
    // -----------------------------------------------------------------
    console.log('\n--- 4. Probando Stripe Checkout Session ---')
    const sessionRes = await createStripeCheckoutSession({
      organizationId: testOrgAId,
      tier: PlanTier.PRO,
      interval: 'monthly',
      currency: 'COP',
      successUrl: 'http://localhost:3000/dashboard/settings/billing/success',
      cancelUrl: 'http://localhost:3000/dashboard/settings/billing/cancel',
    })
    console.log(`✅ Sesión generada: ID=${sessionRes.sessionId}`)
    console.log(`   URL Redirección: ${sessionRes.url}`)
    if (!sessionRes.url.includes('/billing/success') && !sessionRes.url.startsWith('https://checkout.stripe.com')) {
      throw new Error('Fallo en URL de Stripe Checkout')
    }

    // -----------------------------------------------------------------
    // 5. Creación de Organizaciones y Revocación de Sedes Excedentes
    // -----------------------------------------------------------------
    console.log('\n--- 5. Probando Revocación de Sedes Excedentes al Degradar Plan ---')
    const orgA = await prisma.organization.create({
      data: {
        id: testOrgAId,
        name: 'Cadena Gourmet Org A',
        slug: `org-a-${Date.now()}`,
        plan: PlanTier.PRO,
      },
    })

    const branch1 = await prisma.restaurant.create({
      data: {
        name: 'Sede Centro',
        slug: `sede-centro-${Date.now()}`,
        organizationId: orgA.id,
        isActive: true,
      },
    })
    const branch2 = await prisma.restaurant.create({
      data: {
        name: 'Sede Norte',
        slug: `sede-norte-${Date.now()}`,
        organizationId: orgA.id,
        isActive: true,
      },
    })
    const branch3 = await prisma.restaurant.create({
      data: {
        name: 'Sede Poblado',
        slug: `sede-poblado-${Date.now()}`,
        organizationId: orgA.id,
        isActive: true,
      },
    })

    await prisma.subscription.create({
      data: {
        organizationId: orgA.id,
        tier: PlanTier.PRO,
        status: 'active',
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    })

    const limitCheckPro = await checkBranchLimit(orgA.id)
    console.log(`✅ Límite con PRO: ${limitCheckPro.currentCount} sedes de máx ${limitCheckPro.maxAllowed}`)

    // Degradar a BASIC (máximo 1 sede)
    console.log('   Ejecutando degradación a Plan BASIC (máx 1 sede)...')
    const downgradeRes = await enforceBranchLimitOnDowngrade(orgA.id, PlanTier.BASIC)
    console.log(`✅ Sedes activas resultantes: ${downgradeRes.activeCount}, desactivadas: ${downgradeRes.deactivatedCount}`)

    const refreshedBranches = await prisma.restaurant.findMany({
      where: { organizationId: orgA.id },
      orderBy: { createdAt: 'asc' },
    })

    console.log(`   Sede 1 (${refreshedBranches[0].name}): isActive=${refreshedBranches[0].isActive}`)
    console.log(`   Sede 2 (${refreshedBranches[1].name}): isActive=${refreshedBranches[1].isActive}`)
    console.log(`   Sede 3 (${refreshedBranches[2].name}): isActive=${refreshedBranches[2].isActive}`)

    if (!refreshedBranches[0].isActive || refreshedBranches[1].isActive || refreshedBranches[2].isActive) {
      throw new Error('Fallo en revocación de sedes excedentes')
    }

    // -----------------------------------------------------------------
    // 6. Programa de Referidos
    // -----------------------------------------------------------------
    console.log('\n--- 6. Probando Programa de Referidos ---')
    const referralA = await getOrCreateReferralCode(orgA.id)
    console.log(`✅ Código de referido creado para Org A: ${referralA.code}`)

    const validation = await validateReferralCode(referralA.code)
    console.log(`✅ Validación del código: valid=${validation.valid}`)
    if (!validation.valid) throw new Error('El código de referido debería ser válido')

    // Crear Organización B que se registra con el código de Org A
    const orgB = await prisma.organization.create({
      data: {
        id: testOrgBId,
        name: 'Restaurante Invitado Org B',
        slug: `org-b-${Date.now()}`,
        plan: PlanTier.BASIC,
      },
    })

    await prisma.subscription.create({
      data: {
        organizationId: orgB.id,
        tier: PlanTier.BASIC,
        status: 'trialing',
        currentPeriodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      },
    })

    const applyRes = await applyReferralCodeToRegistration(orgB.id, referralA.code)
    console.log(`✅ Código aplicado en registro Org B:`, applyRes)

    // Verificar datos en base de datos
    const updatedOrgB = await prisma.organization.findUnique({ where: { id: orgB.id } })
    const updatedSubB = await prisma.subscription.findUnique({ where: { organizationId: orgB.id } })
    const updatedSubA = await prisma.subscription.findUnique({ where: { organizationId: orgA.id } })
    const updatedReferralA = await prisma.referralCode.findUnique({ where: { id: referralA.id } })

    console.log(`   Org B referredByCode: ${updatedOrgB?.referredByCode}`)
    console.log(`   Org B discountPercent: ${updatedSubB?.discountPercent}%`)
    console.log(`   Org A bonus discountPercent: ${updatedSubA?.discountPercent}%`)
    console.log(`   Usos del código de Org A: ${updatedReferralA?.uses}`)

    if (
      updatedOrgB?.referredByCode !== referralA.code ||
      updatedSubB?.discountPercent !== 20 ||
      updatedReferralA?.uses !== 1
    ) {
      throw new Error('Fallo en aplicación de beneficios del programa de referidos')
    }

    const statsA = await getReferralStats(orgA.id)
    console.log(`✅ Estadísticas finales de Org A:`, {
      code: statsA.code,
      referredOrgsCount: statsA.referredOrgsCount,
      currentDiscountEarned: `${statsA.currentDiscountEarned}%`,
      shareUrl: statsA.shareUrl,
    })

    console.log('\n🎉 ¡TODAS LAS PRUEBAS DE LA FASE 9 FUERON EXITOSAS!')
  } finally {
    // Limpieza de datos de prueba
    console.log('\n🧹 Limpiando registros de prueba...')
    try {
      await prisma.auditLog.deleteMany({
        where: { organizationId: { in: [testOrgAId, testOrgBId] } },
      })
      await prisma.referralCode.deleteMany({
        where: { organizationId: { in: [testOrgAId, testOrgBId] } },
      })
      await prisma.subscription.deleteMany({
        where: { organizationId: { in: [testOrgAId, testOrgBId] } },
      })
      await prisma.restaurant.deleteMany({
        where: { organizationId: { in: [testOrgAId, testOrgBId] } },
      })
      await prisma.organization.deleteMany({
        where: { id: { in: [testOrgAId, testOrgBId] } },
      })
      console.log('✅ Base de datos limpia tras las pruebas.')
    } catch (cleanErr: any) {
      console.warn('Advertencia durante limpieza:', cleanErr.message)
    }
  }
}

runTests()
  .catch((err) => {
    console.error('❌ Error en pruebas de Fase 9:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
