import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const splitPaymentSchema = z.object({
  tableId: z.string().min(1, 'tableId requerido'),
  sessionId: z.string().optional().nullable(),
  restaurantId: z.string().min(1, 'restaurantId requerido'),
  payerName: z.string().min(2, 'Nombre del pagador requerido'),
  payerPhone: z.string().optional().nullable(),
  payerEmail: z.string().email().optional().nullable().or(z.literal('')),
  splitType: z.enum(['INDIVIDUAL', 'EQUAL', 'CUSTOM', 'FULL']),
  amount: z.number().positive('El monto base debe ser mayor a cero'),
  tipAmount: z.number().min(0).default(0),
  totalPaid: z.number().positive('El total pagado debe ser mayor a cero'),
  paymentMethod: z.enum(['WOMPI', 'MERCADOPAGO', 'STRIPE', 'NEQUI', 'CARD']),
  itemsPaid: z.array(z.any()).optional().default([]),
})

let isTableSplitReady = false
async function ensureSplitPaymentsTable() {
  if (isTableSplitReady) return
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS table_split_payments (
        id VARCHAR(191) NOT NULL PRIMARY KEY,
        tableId VARCHAR(191) NOT NULL,
        sessionId VARCHAR(191) NULL,
        restaurantId VARCHAR(191) NOT NULL,
        payerName VARCHAR(191) NOT NULL,
        payerPhone VARCHAR(50) NULL,
        payerEmail VARCHAR(191) NULL,
        splitType VARCHAR(50) NOT NULL,
        amount DECIMAL(12, 2) NOT NULL,
        tipAmount DECIMAL(12, 2) NOT NULL DEFAULT 0,
        totalPaid DECIMAL(12, 2) NOT NULL,
        paymentMethod VARCHAR(50) NOT NULL,
        paymentReference VARCHAR(191) NOT NULL,
        gatewayStatus VARCHAR(50) NOT NULL DEFAULT 'APPROVED',
        itemsPaidJson LONGTEXT NULL,
        createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `)
    isTableSplitReady = true
  } catch (err) {
    console.error('[SplitPayment ensureTable error]:', err)
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureSplitPaymentsTable()
    const body = await req.json()
    const parsed = splitPaymentSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Datos de pago inválidos' },
        { status: 400 }
      )
    }

    const {
      tableId,
      sessionId,
      restaurantId,
      payerName,
      payerPhone,
      payerEmail,
      splitType,
      amount,
      tipAmount,
      totalPaid,
      paymentMethod,
      itemsPaid,
    } = parsed.data

    const crypto = await import('crypto')
    const paymentId = crypto.randomUUID()
    const paymentReference = `PAY-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`

    // Persistir el pago dividido en la base de datos
    await prisma.$executeRawUnsafe(
      `INSERT INTO table_split_payments (
        id, tableId, sessionId, restaurantId, payerName, payerPhone, payerEmail,
        splitType, amount, tipAmount, totalPaid, paymentMethod, paymentReference,
        gatewayStatus, itemsPaidJson, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'APPROVED', ?, NOW())`,
      paymentId,
      tableId,
      sessionId || null,
      restaurantId,
      payerName.trim(),
      payerPhone?.trim() || null,
      payerEmail?.trim() || null,
      splitType,
      amount,
      tipAmount,
      totalPaid,
      paymentMethod,
      paymentReference,
      JSON.stringify(itemsPaid || [])
    )

    // Consultar el total acumulado pagado por la mesa
    const paidRecords: any[] = await prisma.$queryRawUnsafe(
      `SELECT COALESCE(SUM(amount), 0) as totalAmountPaid, COALESCE(SUM(totalPaid), 0) as grandTotalPaid, COUNT(*) as paymentsCount
       FROM table_split_payments
       WHERE tableId = ? AND gatewayStatus = 'APPROVED'`,
      tableId
    )

    const totalTablePaid = paidRecords[0] ? Number(paidRecords[0].totalAmountPaid) : amount
    const paymentsCount = paidRecords[0] ? Number(paidRecords[0].paymentsCount) : 1

    return NextResponse.json({
      success: true,
      voucher: {
        paymentId,
        paymentReference,
        payerName: payerName.trim(),
        paymentMethod,
        splitType,
        amount,
        tipAmount,
        totalPaid,
        status: 'APPROVED',
        statusLabel: 'Pago Aprobado con Éxito',
        timestamp: new Date().toISOString(),
        tableId,
      },
      tableStats: {
        totalTablePaid,
        paymentsCount,
      },
      message: `¡Pago de $${totalPaid.toLocaleString()} registrado con éxito para ${payerName}!`,
    })
  } catch (error) {
    console.error('[Split Payment API error]:', error)
    return NextResponse.json({ error: 'Error al procesar el pago de la cuenta' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    await ensureSplitPaymentsTable()
    const { searchParams } = new URL(req.url)
    const tableId = searchParams.get('tableId')

    if (!tableId) {
      return NextResponse.json({ error: 'tableId requerido' }, { status: 400 })
    }

    const payments: any[] = await prisma.$queryRawUnsafe(
      `SELECT id, payerName, splitType, amount, tipAmount, totalPaid, paymentMethod, paymentReference, gatewayStatus, createdAt
       FROM table_split_payments
       WHERE tableId = ? AND gatewayStatus = 'APPROVED'
       ORDER BY createdAt DESC`,
      tableId
    )

    const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0)

    return NextResponse.json({
      payments,
      totalPaid,
    })
  } catch (error) {
    console.error('[Split Payment API GET error]:', error)
    return NextResponse.json({ error: 'Error al obtener pagos de la mesa' }, { status: 500 })
  }
}
