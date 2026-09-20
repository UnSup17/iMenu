import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const CreateAssetSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  category: z.enum(['KITCHEN_EQUIPMENT', 'FURNITURE', 'COMPUTING_POS', 'VEHICLE', 'OTHER']),
  serialNumber: z.string().optional().nullable(),
  acquisitionCost: z.number().positive('El costo debe ser positivo'),
  salvageValue: z.number().min(0).default(0),
  usefulLifeMonths: z.number().int().positive('La vida útil en meses debe ser mayor a cero'),
  acquisitionDate: z.string().min(1, 'La fecha de adquisición es requerida'),
  notes: z.string().optional().nullable(),
})

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const user = session.user as { restaurantId?: string; role?: string }
    if (!user.restaurantId) {
      return NextResponse.json({ error: 'Restaurante no configurado' }, { status: 400 })
    }

    const allowed = ['SUPERADMIN', 'ORG_ADMIN', 'RESTAURANT_ADMIN', 'ACCOUNTANT', 'MANAGER']
    if (!allowed.includes(user.role || '')) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const assets = await (prisma as any).fixedAsset.findMany({
      where: {
        restaurantId: user.restaurantId,
        isActive: true,
      },
      orderBy: { acquisitionDate: 'desc' },
    })

    const now = new Date()

    let totalAcquisitionCost = 0
    let totalAccumulatedDepreciation = 0
    let totalNetBookValue = 0
    let monthlyTotalDepreciation = 0

    const computedAssets = assets.map((asset: any) => {
      const cost = Number(asset.acquisitionCost)
      const salvage = Number(asset.salvageValue)
      const lifeMonths = asset.usefulLifeMonths || 60
      const acqDate = new Date(asset.acquisitionDate)

      // Monthly straight-line depreciation
      const monthlyDepreciation = lifeMonths > 0 ? (cost - salvage) / lifeMonths : 0

      // Approximate months elapsed (using 30.4375 average days/month)
      const diffMs = Math.max(0, now.getTime() - acqDate.getTime())
      const monthsElapsed = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30.4375))
      const effectiveMonths = Math.min(monthsElapsed, lifeMonths)

      const accumulatedDepreciation = effectiveMonths * monthlyDepreciation
      const currentBookValue = Math.max(salvage, cost - accumulatedDepreciation)
      const depreciationPercent = Math.min(100, Math.round((effectiveMonths / lifeMonths) * 100))
      const isFullyDepreciated = effectiveMonths >= lifeMonths

      totalAcquisitionCost += cost
      totalAccumulatedDepreciation += accumulatedDepreciation
      totalNetBookValue += currentBookValue
      if (!isFullyDepreciated) {
        monthlyTotalDepreciation += monthlyDepreciation
      }

      return {
        id: asset.id,
        name: asset.name,
        category: asset.category,
        serialNumber: asset.serialNumber,
        acquisitionCost: cost,
        salvageValue: salvage,
        usefulLifeMonths: lifeMonths,
        acquisitionDate: asset.acquisitionDate,
        notes: asset.notes,
        monthlyDepreciation: parseFloat(monthlyDepreciation.toFixed(2)),
        monthsElapsed,
        effectiveMonths,
        accumulatedDepreciation: parseFloat(accumulatedDepreciation.toFixed(2)),
        currentBookValue: parseFloat(currentBookValue.toFixed(2)),
        depreciationPercent,
        isFullyDepreciated,
      }
    })

    return NextResponse.json({
      assets: computedAssets,
      summary: {
        totalAssets: assets.length,
        totalAcquisitionCost: parseFloat(totalAcquisitionCost.toFixed(2)),
        totalAccumulatedDepreciation: parseFloat(totalAccumulatedDepreciation.toFixed(2)),
        totalNetBookValue: parseFloat(totalNetBookValue.toFixed(2)),
        monthlyTotalDepreciation: parseFloat(monthlyTotalDepreciation.toFixed(2)),
      },
    })
  } catch (error) {
    console.error('[Assets GET Error]:', error)
    return NextResponse.json({ error: 'Error al listar activos fijos' }, { status: 500 })
  }
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

    const allowed = ['SUPERADMIN', 'ORG_ADMIN', 'RESTAURANT_ADMIN', 'ACCOUNTANT', 'MANAGER']
    if (!allowed.includes(user.role || '')) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const body = await req.json()
    const data = CreateAssetSchema.parse(body)

    const asset = await (prisma as any).fixedAsset.create({
      data: {
        restaurantId: user.restaurantId,
        name: data.name,
        category: data.category,
        serialNumber: data.serialNumber || null,
        acquisitionCost: data.acquisitionCost,
        salvageValue: data.salvageValue,
        usefulLifeMonths: data.usefulLifeMonths,
        acquisitionDate: new Date(data.acquisitionDate),
        notes: data.notes || null,
      },
    })

    return NextResponse.json({ success: true, asset }, { status: 201 })
  } catch (error: any) {
    if (error?.name === 'ZodError') {
      return NextResponse.json({ error: error.errors[0]?.message }, { status: 422 })
    }
    console.error('[Assets POST Error]:', error)
    return NextResponse.json({ error: 'Error al registrar activo fijo' }, { status: 500 })
  }
}
