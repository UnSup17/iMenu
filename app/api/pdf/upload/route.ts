import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { uploadBlob, deleteBlob } from '@/lib/storage'

export const runtime = 'nodejs'

// ─── POST: subir PDF ──────────────────────────────────────────────────────
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return Response.json({ error: 'No autorizado' }, { status: 401 })
    }
    const sessionUser = session.user as { id?: string; role?: string }
    const allowedRoles = ['SUPERADMIN', 'ORG_ADMIN', 'RESTAURANT_ADMIN']
    if (!allowedRoles.includes(sessionUser.role || '')) {
      return Response.json({ error: 'Permisos insuficientes' }, { status: 403 })
    }

    const user = await prisma.user.findUnique({
      where: { id: sessionUser.id! },
      select: { restaurantId: true, organizationId: true },
    })

    let targetRestaurantId = user?.restaurantId
    if (!targetRestaurantId && user?.organizationId) {
      const firstBranch = await prisma.restaurant.findFirst({
        where: { organizationId: user.organizationId },
        select: { id: true },
      })
      targetRestaurantId = firstBranch?.id ?? null
    }

    if (!targetRestaurantId) {
      return Response.json({ error: 'No tienes un restaurante asignado' }, { status: 400 })
    }

    const formData = await request.formData()
    const file = formData.get('pdf') as File | null
    if (!file) {
      return Response.json({ error: 'No se recibió ningún archivo' }, { status: 400 })
    }
    if (file.type !== 'application/pdf') {
      return Response.json({ error: 'El archivo debe ser un PDF' }, { status: 400 })
    }
    if (file.size > 20 * 1024 * 1024) {
      return Response.json({ error: 'El PDF no puede superar los 20 MB' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const uploadResult = await uploadBlob({
      pathname: `restaurants/${targetRestaurantId}/menu/menu.pdf`,
      buffer,
      contentType: 'application/pdf',
    })

    await prisma.restaurant.update({
      where: { id: targetRestaurantId },
      data: { pdfUrl: uploadResult.url },
    })

    return Response.json({ url: uploadResult.url })
  } catch (error) {
    console.error('[POST /api/pdf/upload] Error:', error)
    return Response.json({
      error: error instanceof Error ? error.message : 'Error desconocido al subir el archivo'
    }, { status: 500 })
  }
}

// ─── DELETE: quitar PDF ───────────────────────────────────────────────────
export async function DELETE() {
  try {
    const session = await auth()
    if (!session?.user) {
      return Response.json({ error: 'No autorizado' }, { status: 401 })
    }

    const sessionUser = session.user as { id?: string }
    const user = await prisma.user.findUnique({
      where: { id: sessionUser.id! },
      select: { restaurantId: true },
    })
    if (!user?.restaurantId) {
      return Response.json({ error: 'No tienes un restaurante asignado' }, { status: 400 })
    }

    const rest = await prisma.restaurant.findUnique({
      where: { id: user.restaurantId },
      select: { pdfUrl: true, pdfPageImages: true },
    })

    if (rest?.pdfUrl) {
      await deleteBlob(rest.pdfUrl)
    }

    if (Array.isArray(rest?.pdfPageImages)) {
      for (const imgUrl of rest.pdfPageImages) {
        if (typeof imgUrl === 'string') {
          await deleteBlob(imgUrl)
        }
      }
    }

    await prisma.restaurant.update({
      where: { id: user.restaurantId },
      data: { pdfUrl: null, pdfPageImages: Prisma.DbNull },
    })

    return Response.json({ ok: true })
  } catch (error) {
    console.error('[DELETE /api/pdf/upload] Error:', error)
    return Response.json({
      error: error instanceof Error ? error.message : 'Error desconocido al eliminar el archivo'
    }, { status: 500 })
  }
}
