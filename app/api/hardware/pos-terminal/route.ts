import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { processPosCharge, PosTerminalConfig } from '@/lib/hardware/pos-terminal'
import { z } from 'zod'

const chargeSchema = z.object({
  amount: z.number().positive(),
  reference: z.string().min(1),
  invoiceNumber: z.string().optional(),
  installments: z.number().min(1).default(1),
  terminalIp: z.string().optional(),
  terminalPort: z.number().optional(),
  brand: z.enum(['INGENICO', 'VERIFONE', 'PAX', 'REDEBAN', 'CREDIBANCO', 'GENERIC_POS']).default('GENERIC_POS'),
  protocol: z.enum(['NETWORK_TCP', 'WEB_SERIAL', 'SIMULATOR']).default('SIMULATOR'),
})

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await req.json()
    const parsed = chargeSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Datos inválidos' }, { status: 400 })
    }

    const { amount, reference, invoiceNumber, installments, terminalIp, terminalPort, brand, protocol } = parsed.data

    const config: PosTerminalConfig = {
      protocol,
      brand,
      terminalIp,
      terminalPort,
    }

    const response = await processPosCharge(config, {
      amount,
      reference,
      invoiceNumber,
      installments,
    })

    if (!response.success) {
      return NextResponse.json({ error: response.error || 'Cobro rechazado por datáfono' }, { status: 422 })
    }

    return NextResponse.json({
      success: true,
      transaction: response,
    })
  } catch (error: any) {
    console.error('[POS Terminal API error]:', error)
    return NextResponse.json({ error: 'Error al comunicarse con el datáfono' }, { status: 500 })
  }
}
