import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { InvoiceStatus, PaymentMethod } from '@prisma/client'

export interface BankTransactionInput {
  date: string
  description: string
  amount: number
  type: 'CREDIT' | 'DEBIT' // CREDIT = Ingreso (Abono), DEBIT = Egreso (Cargo)
  reference?: string
}

export interface ReconciledPair {
  bankTransaction: BankTransactionInput
  systemRecord: {
    id: string
    type: 'PAYMENT' | 'EXPENSE'
    description: string
    date: string
    amount: number
    methodOrCategory?: string
  }
  confidence: number // 0-100
  difference: number
}

function parseCSV(content: string, preset: 'generic' | 'bancolombia' | 'davivienda'): BankTransactionInput[] {
  const lines = content
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)

  if (lines.length <= 1) return []

  // Detect delimiter (; or , or \t)
  const firstLine = lines[0]
  const delimiter = firstLine.includes(';') ? ';' : firstLine.includes('\t') ? '\t' : ','

  const rows = lines.slice(1).map((line) => {
    // Simple split ignoring nested quotes if simple, or clean quotes
    const cells = line.split(delimiter).map((c) => c.replace(/^["']|["']$/g, '').trim())
    return cells
  })

  const transactions: BankTransactionInput[] = []

  for (const cells of rows) {
    if (cells.length < 3) continue

    let dateStr = ''
    let description = ''
    let amount = 0
    let type: 'CREDIT' | 'DEBIT' = 'CREDIT'
    let reference = ''

    if (preset === 'bancolombia') {
      // Typically: Fecha, Descripción, Documento/Referencia, Valor, Saldo
      // or Fecha, Concepto, Débito, Crédito
      dateStr = cells[0]
      description = cells[1] || 'Movimiento Bancolombia'
      if (cells.length >= 5 && !isNaN(Number(cells[3].replace(/[^0-9.-]+/g, '')))) {
        // Formato Débito / Crédito
        const debit = Math.abs(parseFloat(cells[3].replace(/[^0-9.-]+/g, '')) || 0)
        const credit = Math.abs(parseFloat(cells[4].replace(/[^0-9.-]+/g, '')) || 0)
        if (credit > 0) {
          amount = credit
          type = 'CREDIT'
        } else {
          amount = debit
          type = 'DEBIT'
        }
      } else {
        reference = cells[2] || ''
        const rawVal = parseFloat(cells[3]?.replace(/[^0-9.-]+/g, '') || cells[2]?.replace(/[^0-9.-]+/g, '') || '0')
        type = rawVal >= 0 ? 'CREDIT' : 'DEBIT'
        amount = Math.abs(rawVal)
      }
    } else if (preset === 'davivienda') {
      // Typically: Fecha, Concepto, Referencia, Débito, Crédito
      dateStr = cells[0]
      description = cells[1] || 'Movimiento Davivienda'
      reference = cells[2] || ''
      const debit = Math.abs(parseFloat(cells[3]?.replace(/[^0-9.-]+/g, '') || '0'))
      const credit = Math.abs(parseFloat(cells[4]?.replace(/[^0-9.-]+/g, '') || '0'))
      if (credit > 0) {
        amount = credit
        type = 'CREDIT'
      } else {
        amount = debit
        type = 'DEBIT'
      }
    } else {
      // Generic format: Date (col 0), Description (col 1), Amount (col 2), optional Type/Ref
      dateStr = cells[0]
      description = cells[1] || 'Movimiento'
      const rawAmt = parseFloat(cells[2]?.replace(/[^0-9.-]+/g, '') || '0')
      reference = cells[3] || ''

      if (cells.length >= 5) {
        const debit = Math.abs(parseFloat(cells[2]?.replace(/[^0-9.-]+/g, '') || '0'))
        const credit = Math.abs(parseFloat(cells[3]?.replace(/[^0-9.-]+/g, '') || '0'))
        if (credit > 0) {
          amount = credit
          type = 'CREDIT'
        } else {
          amount = debit
          type = 'DEBIT'
        }
      } else {
        type = rawAmt >= 0 ? 'CREDIT' : 'DEBIT'
        amount = Math.abs(rawAmt)
      }
    }

    // Normalize date (Supports YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY)
    let parsedDate = new Date(dateStr)
    if (isNaN(parsedDate.getTime()) && dateStr.includes('/')) {
      const parts = dateStr.split('/')
      if (parts.length === 3) {
        if (parts[2].length === 4) {
          // DD/MM/YYYY
          parsedDate = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]))
        } else if (parts[0].length === 4) {
          // YYYY/MM/DD
          parsedDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
        }
      }
    }

    if (!isNaN(parsedDate.getTime()) && amount > 0) {
      transactions.push({
        date: parsedDate.toISOString().slice(0, 10),
        description,
        amount: parseFloat(amount.toFixed(2)),
        type,
        reference,
      })
    }
  }

  return transactions
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const user = session.user as { restaurantId?: string; role?: string }
    if (!user.restaurantId) {
      return NextResponse.json({ error: 'Restaurante no configurado' }, { status: 400 })
    }

    const allowed = ['SUPERADMIN', 'ORG_ADMIN', 'RESTAURANT_ADMIN', 'ACCOUNTANT']
    if (!allowed.includes(user.role || '')) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const body = await req.json()
    const { csvContent, transactions: incomingTransactions, preset = 'generic' } = body

    let bankTransactions: BankTransactionInput[] = []

    if (csvContent && typeof csvContent === 'string') {
      bankTransactions = parseCSV(csvContent, preset)
    } else if (Array.isArray(incomingTransactions)) {
      bankTransactions = incomingTransactions
    }

    if (bankTransactions.length === 0) {
      return NextResponse.json(
        { error: 'No se encontraron transacciones válidas en el extracto' },
        { status: 400 }
      )
    }

    // Determine min and max dates from transactions to query DB
    const dates = bankTransactions.map((t) => new Date(t.date).getTime()).filter((t) => !isNaN(t))
    const minTimestamp = Math.min(...dates) - 3 * 24 * 60 * 60 * 1000 // 3 days buffer before
    const maxTimestamp = Math.max(...dates) + 3 * 24 * 60 * 60 * 1000 // 3 days buffer after

    const startDate = new Date(minTimestamp)
    const endDate = new Date(maxTimestamp)

    // 1. Fetch system payments (Inflows through card, transfer, qr)
    const systemPayments = await prisma.payment.findMany({
      where: {
        receivedAt: { gte: startDate, lte: endDate },
        invoice: {
          restaurantId: user.restaurantId,
          status: InvoiceStatus.PAID,
        },
        method: {
          in: [
            PaymentMethod.CREDIT_CARD,
            PaymentMethod.DEBIT_CARD,
            PaymentMethod.TRANSFER,
            PaymentMethod.QR_CODE,
          ],
        },
      },
      include: {
        invoice: {
          select: { invoiceNumber: true, customerName: true },
        },
      },
    })

    // 2. Fetch system expenses (Outflows)
    const systemExpenses = await prisma.expense.findMany({
      where: {
        restaurantId: user.restaurantId,
        date: { gte: startDate, lte: endDate },
      },
    })

    // Reusable tracking of claimed system records
    const usedPaymentIds = new Set<string>()
    const usedExpenseIds = new Set<string>()

    const reconciled: ReconciledPair[] = []
    const unmatchedBank: BankTransactionInput[] = []

    // Algorithm: match Bank CREDITS against Payments, Bank DEBITS against Expenses
    for (const bankTx of bankTransactions) {
      const bDate = new Date(bankTx.date).getTime()
      let bestMatch: ReconciledPair | null = null

      if (bankTx.type === 'CREDIT') {
        // Match with Payment
        for (const payment of systemPayments) {
          if (usedPaymentIds.has(payment.id)) continue
          const pDate = new Date(payment.receivedAt).getTime()
          const diffDays = Math.abs(bDate - pDate) / (1000 * 60 * 60 * 24)
          if (diffDays > 2.5) continue // Exceeds tolerance window

          const pAmount = Number(payment.amount)
          const diffAmount = Math.abs(bankTx.amount - pAmount)
          const isExactAmount = diffAmount < 0.05
          const isTolerantAmount = diffAmount <= Math.max(1000, pAmount * 0.03) // 3% fee or $1.000 diff

          if (isExactAmount || isTolerantAmount) {
            const confidence = isExactAmount
              ? diffDays <= 0.5 ? 100 : 90
              : 75

            if (!bestMatch || confidence > bestMatch.confidence) {
              bestMatch = {
                bankTransaction: bankTx,
                systemRecord: {
                  id: payment.id,
                  type: 'PAYMENT',
                  description: `Pago Factura ${payment.invoice.invoiceNumber || 'POS'} - ${payment.invoice.customerName || 'Cliente'}`,
                  date: payment.receivedAt.toISOString().slice(0, 10),
                  amount: pAmount,
                  methodOrCategory: payment.method,
                },
                confidence,
                difference: parseFloat((bankTx.amount - pAmount).toFixed(2)),
              }
            }
          }
        }

        if (bestMatch) {
          usedPaymentIds.add(bestMatch.systemRecord.id)
          reconciled.push(bestMatch)
        } else {
          unmatchedBank.push(bankTx)
        }
      } else {
        // DEBIT -> Match with Expense
        for (const exp of systemExpenses) {
          if (usedExpenseIds.has(exp.id)) continue
          const eDate = new Date(exp.date).getTime()
          const diffDays = Math.abs(bDate - eDate) / (1000 * 60 * 60 * 24)
          if (diffDays > 2.5) continue

          const eAmount = Number(exp.amount)
          const diffAmount = Math.abs(bankTx.amount - eAmount)
          const isExactAmount = diffAmount < 0.05
          const isTolerantAmount = diffAmount <= Math.max(1000, eAmount * 0.02)

          if (isExactAmount || isTolerantAmount) {
            const confidence = isExactAmount
              ? diffDays <= 0.5 ? 100 : 90
              : 75

            if (!bestMatch || confidence > bestMatch.confidence) {
              bestMatch = {
                bankTransaction: bankTx,
                systemRecord: {
                  id: exp.id,
                  type: 'EXPENSE',
                  description: exp.description,
                  date: exp.date.toISOString().slice(0, 10),
                  amount: eAmount,
                  methodOrCategory: exp.category,
                },
                confidence,
                difference: parseFloat((bankTx.amount - eAmount).toFixed(2)),
              }
            }
          }
        }

        if (bestMatch) {
          usedExpenseIds.add(bestMatch.systemRecord.id)
          reconciled.push(bestMatch)
        } else {
          unmatchedBank.push(bankTx)
        }
      }
    }

    // Unmatched in system
    const unmatchedPayments = systemPayments
      .filter((p) => !usedPaymentIds.has(p.id))
      .map((p) => ({
        id: p.id,
        type: 'PAYMENT' as const,
        description: `Factura ${p.invoice.invoiceNumber || 'POS'} - ${p.invoice.customerName || 'Cliente'}`,
        date: p.receivedAt.toISOString().slice(0, 10),
        amount: Number(p.amount),
        methodOrCategory: p.method,
      }))

    const unmatchedExpenses = systemExpenses
      .filter((e) => !usedExpenseIds.has(e.id))
      .map((e) => ({
        id: e.id,
        type: 'EXPENSE' as const,
        description: e.description,
        date: e.date.toISOString().slice(0, 10),
        amount: Number(e.amount),
        methodOrCategory: e.category,
      }))

    const unmatchedSystem = [...unmatchedPayments, ...unmatchedExpenses]

    // Summary calculation
    const totalBankRecords = bankTransactions.length
    const totalReconciledCount = reconciled.length
    const totalReconciledAmount = reconciled.reduce((acc, r) => acc + r.bankTransaction.amount, 0)
    const matchRate = totalBankRecords > 0
      ? parseFloat(((totalReconciledCount / totalBankRecords) * 100).toFixed(1))
      : 0

    return NextResponse.json({
      summary: {
        totalBankRecords,
        totalReconciledCount,
        totalUnmatchedBank: unmatchedBank.length,
        totalUnmatchedSystem: unmatchedSystem.length,
        totalReconciledAmount: parseFloat(totalReconciledAmount.toFixed(2)),
        matchRate,
      },
      reconciled,
      unmatchedBank,
      unmatchedSystem,
    })
  } catch (error) {
    console.error('[Bank Reconciliation Error]:', error)
    return NextResponse.json(
      { error: 'Error al procesar la conciliación bancaria' },
      { status: 500 }
    )
  }
}
