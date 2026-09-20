import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const UpdateAssetSchema = z.object({
  name: z.string().min(2).optional(),
  category: z.enum(['KITCHEN_EQUIPMENT', 'FURNITURE', 'COMPUTING_POS', 'VEHICLE', 'OTHER']).optional(),
  serialNumber: z.string().optional().nullable(),
  acquisitionCost: z.number().positive().optional(),
  salvageValue: z.number().min(0).optional(),
  usefulLifeMonths: z.number().int().positive().optional(),
  acquisitionDate: z.string().optional(),
  notes: z.string().optional().nullable(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params
    const existing = await (prisma as any).fixedAsset.findFirst({
      where: { id, restaurantId: user.restaurantId },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Activo fijo no encontrado' }, { status: 404 })
    }

    const body = await req.json()
    const data = UpdateAssetSchema.parse(body)

    const updated = await (prisma as any).fixedAsset.update({
      where: { id },
      data: {
        ...data,
        acquisitionDate: data.acquisitionDate ? new Date(data.acquisitionDate) : undefined,
      },
    })

    return NextResponse.json({ success: true, asset: updated })
  } catch (error: any) {
    if (error?.name === 'ZodError') {
      return NextResponse.json({ error: error.errors[0]?.message }, { status: 422 })
    }
    console.error('[Assets PATCH Error]:', error)
    return NextResponse.json({ error: 'Error al actualizar activo fijo' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params
    const existing = await (prisma as any).fixedAsset.findFirst({
      where: { id, restaurantId: user.restaurantId },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Activo fijo no encontrado' }, { status: 404 })
    }

    // Soft delete
    await (prisma as any).fixedAsset.update({
      where: { id },
      data: { isActive: false },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Assets DELETE Error]:', error)
    return NextResponse.json({ error: 'Error al dar de baja el activo' }, { status: 500 })
  }
}
