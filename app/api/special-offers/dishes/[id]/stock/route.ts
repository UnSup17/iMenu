import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const UpdateStockSchema = z.object({
  specialOfferStock: z.number().int().min(0).nullable().optional(),
  addStock: z.number().int().min(1).optional(),
  resetSold: z.boolean().optional(),
  specialOfferCost: z.number().min(0).nullable().optional(),
  isAvailable: z.boolean().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const parsed = UpdateStockSchema.parse(body)

    const product = await prisma.product.findUnique({
      where: { id },
    })

    if (!product) {
      return NextResponse.json({ error: 'Plato no encontrado' }, { status: 404 })
    }

    let newStock = parsed.specialOfferStock !== undefined ? parsed.specialOfferStock : product.specialOfferStock
    if (parsed.addStock && newStock !== null) {
      newStock += parsed.addStock
    }

    let newSold = parsed.resetSold ? 0 : product.specialOfferStockSold

    const isNowAvailable = parsed.isAvailable !== undefined
      ? parsed.isAvailable
      : (newStock !== null ? newSold < newStock : true)

    const updated = await prisma.product.update({
      where: { id },
      data: {
        ...(newStock !== undefined && { specialOfferStock: newStock }),
        ...(parsed.resetSold && { specialOfferStockSold: newSold }),
        ...(parsed.specialOfferCost !== undefined && { specialOfferCost: parsed.specialOfferCost }),
        isAvailable: isNowAvailable,
      },
    })

    return NextResponse.json({ success: true, product: updated })
  } catch (error: any) {
    console.error('[PATCH /api/special-offers/dishes/[id]/stock] Error:', error)
    return NextResponse.json({ error: error.message || 'Error al actualizar cupo del plato' }, { status: 400 })
  }
}
