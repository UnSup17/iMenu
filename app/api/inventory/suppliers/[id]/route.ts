import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const UpdateSchema = z.object({
  name: z.string().min(2).optional(),
  taxId: z.string().optional(),
  contactName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
})

async function resolveSupplier(supplierId: string, restaurantId: string) {
  return prisma.supplier.findFirst({ where: { id: supplierId, restaurantId } })
}

/**
 * GET /api/inventory/suppliers/[id]
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const user = session.user as { restaurantId?: string }
  if (!user.restaurantId) return NextResponse.json({ error: 'Sin restaurante' }, { status: 403 })

  const { id } = await params
  const supplier = await resolveSupplier(id, user.restaurantId)
  if (!supplier) return NextResponse.json({ error: 'Proveedor no encontrado' }, { status: 404 })

  const purchaseOrders = await prisma.purchaseOrder.findMany({
    where: { supplierId: id },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: {
      id: true, orderNumber: true, status: true, total: true, createdAt: true,
    },
  })

  return NextResponse.json({ supplier, purchaseOrders })
}

/**
 * PATCH /api/inventory/suppliers/[id]
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const user = session.user as { restaurantId?: string; role: string }
  if (!user.restaurantId) return NextResponse.json({ error: 'Sin restaurante' }, { status: 403 })

  const allowed = ['SUPERADMIN', 'ORG_ADMIN', 'RESTAURANT_ADMIN', 'MANAGER']
  if (!allowed.includes(user.role)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const { id } = await params
  const existing = await resolveSupplier(id, user.restaurantId)
  if (!existing) return NextResponse.json({ error: 'Proveedor no encontrado' }, { status: 404 })

  const body = await request.json()
  const data = UpdateSchema.parse(body)

  const supplier = await prisma.supplier.update({
    where: { id },
    data: { ...data, email: data.email || null },
  })

  return NextResponse.json({ supplier })
}

/**
 * DELETE /api/inventory/suppliers/[id] — Soft delete
 */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const user = session.user as { restaurantId?: string; role: string }
  if (!user.restaurantId) return NextResponse.json({ error: 'Sin restaurante' }, { status: 403 })

  const allowed = ['SUPERADMIN', 'ORG_ADMIN', 'RESTAURANT_ADMIN', 'MANAGER']
  if (!allowed.includes(user.role)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const { id } = await params
  const existing = await resolveSupplier(id, user.restaurantId)
  if (!existing) return NextResponse.json({ error: 'Proveedor no encontrado' }, { status: 404 })

  await prisma.supplier.update({ where: { id }, data: { isActive: false } })
  return NextResponse.json({ success: true })
}
