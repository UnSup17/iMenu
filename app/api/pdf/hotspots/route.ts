import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { NextRequest } from 'next/server'

export const runtime = 'nodejs'

type SessionUser = { id?: string; role?: string }

// ─── GET /api/pdf/hotspots?restaurantId=X ─────────────────────────────────
export async function GET(request: NextRequest) {
  const restaurantId = request.nextUrl.searchParams.get('restaurantId')
  if (!restaurantId) {
    return Response.json({ error: 'restaurantId requerido' }, { status: 400 })
  }

  const hotspots = await prisma.pdfHotspot.findMany({
    where: { restaurantId },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          description: true,
          basePrice: true,
          imageUrl: true,
          modifierGroups: {
            include: { options: true },
          },
          ingredients: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  })

  return Response.json(hotspots)
}

// ─── POST /api/pdf/hotspots ────────────────────────────────────────────────
export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return Response.json({ error: 'No autorizado' }, { status: 401 })
  }
  const sessionUser = session.user as SessionUser
  if (sessionUser.role !== 'RESTAURANT_ADMIN' && sessionUser.role !== 'SUPERADMIN') {
    return Response.json({ error: 'Permisos insuficientes' }, { status: 403 })
  }

  const body = await request.json() as {
    productId: string
    page: number
    x: number
    y: number
    width: number
    height: number
  }

  const { productId, page, x, y, width, height } = body
  if (!productId || page === undefined || x === undefined || y === undefined
      || width === undefined || height === undefined) {
    return Response.json({ error: 'Campos incompletos' }, { status: 400 })
  }

  // Obtener restaurantId del admin autenticado
  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id! },
    select: { restaurantId: true },
  })
  if (!user?.restaurantId) {
    return Response.json({ error: 'Sin restaurante asignado' }, { status: 400 })
  }

  const hotspot = await prisma.pdfHotspot.create({
    data: {
      restaurantId: user.restaurantId,
      productId,
      page,
      x,
      y,
      width,
      height,
    },
    include: {
      product: { select: { id: true, name: true } },
    },
  })

  return Response.json(hotspot, { status: 201 })
}

// ─── DELETE /api/pdf/hotspots?id=X ────────────────────────────────────────
export async function DELETE(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return Response.json({ error: 'No autorizado' }, { status: 401 })
  }
  const sessionUser = session.user as SessionUser
  if (sessionUser.role !== 'RESTAURANT_ADMIN' && sessionUser.role !== 'SUPERADMIN') {
    return Response.json({ error: 'Permisos insuficientes' }, { status: 403 })
  }

  const id = request.nextUrl.searchParams.get('id')
  if (!id) {
    return Response.json({ error: 'id requerido' }, { status: 400 })
  }

  // Verificar que el hotspot pertenece al restaurante del admin
  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id! },
    select: { restaurantId: true },
  })

  const hotspot = await prisma.pdfHotspot.findUnique({ where: { id } })
  if (!hotspot || hotspot.restaurantId !== user?.restaurantId) {
    return Response.json({ error: 'No encontrado' }, { status: 404 })
  }

  await prisma.pdfHotspot.delete({ where: { id } })
  return Response.json({ ok: true })
}
