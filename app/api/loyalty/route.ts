import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Esquema de validación para acumulación de puntos
const earnLoyaltySchema = z.object({
  restaurantId: z.string().min(1, 'restaurantId es requerido'),
  customerPhone: z.string().min(7, 'Teléfono debe tener al menos 7 dígitos'),
  customerName: z.string().optional().nullable(),
  customerEmail: z.string().email().optional().nullable().or(z.literal('')),
  orderAmount: z.number().min(0).optional().default(0),
  rating: z.number().int().min(1).max(5).optional(),
  feedbackId: z.string().optional().nullable(),
})

// Inicialización segura de tablas de lealtad en MySQL
let isLoyaltyTablesReady = false
async function ensureLoyaltyTables() {
  if (isLoyaltyTablesReady) return
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS loyalty_members (
        id VARCHAR(191) NOT NULL PRIMARY KEY,
        restaurantId VARCHAR(191) NOT NULL,
        customerPhone VARCHAR(50) NOT NULL,
        customerName VARCHAR(191) NULL,
        customerEmail VARCHAR(191) NULL,
        points INT NOT NULL DEFAULT 0,
        tier VARCHAR(50) NOT NULL DEFAULT 'BRONZE',
        createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        UNIQUE KEY loyalty_members_restaurant_phone (restaurantId, customerPhone)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `)

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS loyalty_transactions (
        id VARCHAR(191) NOT NULL PRIMARY KEY,
        memberId VARCHAR(191) NOT NULL,
        restaurantId VARCHAR(191) NOT NULL,
        pointsAwarded INT NOT NULL,
        reason VARCHAR(191) NOT NULL,
        feedbackId VARCHAR(191) NULL,
        orderAmount DECIMAL(12, 2) NULL,
        couponCode VARCHAR(50) NULL,
        createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `)
    isLoyaltyTablesReady = true
  } catch (err) {
    console.error('[Loyalty ensureTables error]:', err)
  }
}

function calculateTier(points: number): {
  tier: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM'
  tierLabel: string
  tierBadge: string
  discountPercent: number
  nextTierPoints: number
} {
  if (points >= 1000) {
    return {
      tier: 'PLATINUM',
      tierLabel: 'Platino',
      tierBadge: '💎 Platino',
      discountPercent: 20,
      nextTierPoints: 1000,
    }
  } else if (points >= 500) {
    return {
      tier: 'GOLD',
      tierLabel: 'Oro',
      tierBadge: '🥇 Oro',
      discountPercent: 15,
      nextTierPoints: 1000,
    }
  } else if (points >= 200) {
    return {
      tier: 'SILVER',
      tierLabel: 'Plata',
      tierBadge: '🥈 Plata',
      discountPercent: 10,
      nextTierPoints: 500,
    }
  }
  return {
    tier: 'BRONZE',
    tierLabel: 'Bronce',
    tierBadge: '🥉 Bronce',
    discountPercent: 5,
    nextTierPoints: 200,
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureLoyaltyTables()
    const body = await req.json()
    const parsed = earnLoyaltySchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Datos de lealtad inválidos' },
        { status: 400 }
      )
    }

    const {
      restaurantId,
      customerPhone,
      customerName,
      customerEmail,
      orderAmount,
      rating,
      feedbackId,
    } = parsed.data

    // Normalizar número de teléfono (solo dígitos)
    const cleanPhone = customerPhone.replace(/\D/g, '')
    if (cleanPhone.length < 7) {
      return NextResponse.json({ error: 'Número de teléfono inválido' }, { status: 400 })
    }

    // Regla de Puntos:
    // 50 puntos fijos por registrar calificación de satisfacción
    // + 1 punto por cada $1.000 COP consumidos en la orden
    const feedbackPoints = rating ? 50 : 20
    const consumptionPoints = Math.floor((orderAmount || 0) / 1000)
    const pointsAwarded = feedbackPoints + consumptionPoints

    // Buscar miembro existente
    const existingMembers: any[] = await prisma.$queryRawUnsafe(
      `SELECT * FROM loyalty_members WHERE restaurantId = ? AND customerPhone = ? LIMIT 1`,
      restaurantId,
      cleanPhone
    )

    const crypto = await import('crypto')
    let memberId: string
    let currentPoints = 0

    if (existingMembers.length > 0) {
      const member = existingMembers[0]
      memberId = member.id
      currentPoints = Number(member.points) + pointsAwarded
      const tierInfo = calculateTier(currentPoints)

      await prisma.$executeRawUnsafe(
        `UPDATE loyalty_members SET points = ?, tier = ?, customerName = COALESCE(?, customerName), customerEmail = COALESCE(?, customerEmail), updatedAt = NOW() WHERE id = ?`,
        currentPoints,
        tierInfo.tier,
        customerName?.trim() || null,
        customerEmail?.trim() || null,
        memberId
      )
    } else {
      memberId = crypto.randomUUID()
      currentPoints = pointsAwarded
      const tierInfo = calculateTier(currentPoints)

      await prisma.$executeRawUnsafe(
        `INSERT INTO loyalty_members (id, restaurantId, customerPhone, customerName, customerEmail, points, tier, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        memberId,
        restaurantId,
        cleanPhone,
        customerName?.trim() || null,
        customerEmail?.trim() || null,
        currentPoints,
        tierInfo.tier
      )
    }

    // Generar código de cupón de recompensa digital único
    const couponCode = `LEAL-${cleanPhone.slice(-4)}-${Math.floor(100 + Math.random() * 900)}`
    const txId = crypto.randomUUID()

    await prisma.$executeRawUnsafe(
      `INSERT INTO loyalty_transactions (id, memberId, restaurantId, pointsAwarded, reason, feedbackId, orderAmount, couponCode, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      txId,
      memberId,
      restaurantId,
      pointsAwarded,
      rating ? `Calificación ${rating}★ + Consumo` : 'Registro de consumo',
      feedbackId || null,
      orderAmount || 0,
      couponCode
    )

    const tierMeta = calculateTier(currentPoints)

    return NextResponse.json({
      success: true,
      member: {
        id: memberId,
        phone: cleanPhone,
        name: customerName || 'Comensal Frecuente',
        points: currentPoints,
        tier: tierMeta.tier,
        tierLabel: tierMeta.tierLabel,
        tierBadge: tierMeta.tierBadge,
        discountPercent: tierMeta.discountPercent,
        nextTierPoints: tierMeta.nextTierPoints,
      },
      pointsAwarded,
      breakdown: {
        feedbackPoints,
        consumptionPoints,
      },
      rewardCoupon: {
        code: couponCode,
        discountPercent: tierMeta.discountPercent,
        description: `${tierMeta.discountPercent}% de descuento en tu próxima visita o bebida de cortesía`,
        expiresInDays: 30,
      },
    })
  } catch (error) {
    console.error('[Loyalty API POST error]:', error)
    return NextResponse.json({ error: 'Error al procesar puntos de lealtad' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    await ensureLoyaltyTables()
    const { searchParams } = new URL(req.url)
    const restaurantId = searchParams.get('restaurantId')
    const phone = searchParams.get('phone')

    if (!restaurantId || !phone) {
      return NextResponse.json({ error: 'restaurantId y phone requeridos' }, { status: 400 })
    }

    const cleanPhone = phone.replace(/\D/g, '')
    const members: any[] = await prisma.$queryRawUnsafe(
      `SELECT * FROM loyalty_members WHERE restaurantId = ? AND customerPhone = ? LIMIT 1`,
      restaurantId,
      cleanPhone
    )

    if (members.length === 0) {
      return NextResponse.json({ found: false, points: 0, tier: 'BRONZE' })
    }

    const member = members[0]
    const points = Number(member.points)
    const tierMeta = calculateTier(points)

    return NextResponse.json({
      found: true,
      member: {
        id: member.id,
        phone: member.customerPhone,
        name: member.customerName,
        points,
        tier: tierMeta.tier,
        tierLabel: tierMeta.tierLabel,
        tierBadge: tierMeta.tierBadge,
        discountPercent: tierMeta.discountPercent,
        nextTierPoints: tierMeta.nextTierPoints,
      },
    })
  } catch (error) {
    console.error('[Loyalty API GET error]:', error)
    return NextResponse.json({ error: 'Error al consultar lealtad' }, { status: 500 })
  }
}
