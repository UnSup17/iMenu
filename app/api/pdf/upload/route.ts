import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

export const runtime = 'nodejs'

const USE_VERCEL_BLOB = Boolean(process.env.BLOB_READ_WRITE_TOKEN)

// ─── POST: subir PDF ──────────────────────────────────────────────────────
export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return Response.json({ error: 'No autorizado' }, { status: 401 })
  }
  const sessionUser = session.user as { id?: string; role?: string }
  if (sessionUser.role !== 'RESTAURANT_ADMIN' && sessionUser.role !== 'SUPERADMIN') {
    return Response.json({ error: 'Permisos insuficientes' }, { status: 403 })
  }

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id! },
    select: { restaurantId: true },
  })
  if (!user?.restaurantId) {
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

  let pdfUrl: string

  if (USE_VERCEL_BLOB) {
    // ── Producción: Vercel Blob ──────────────────────────────────────────
    const { put } = await import('@vercel/blob')
    const blob = await put(`menus/${user.restaurantId}/menu.pdf`, file, {
      access: 'public',
      contentType: 'application/pdf',
    })
    pdfUrl = blob.url
  } else {
    // ── Desarrollo local: public/uploads/ ────────────────────────────────
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const dir = join(process.cwd(), 'public', 'uploads', 'menus', user.restaurantId)
    await mkdir(dir, { recursive: true })
    await writeFile(join(dir, 'menu.pdf'), buffer)
    pdfUrl = `/uploads/menus/${user.restaurantId}/menu.pdf`
  }

  await prisma.restaurant.update({
    where: { id: user.restaurantId },
    data: { pdfUrl },
  })

  return Response.json({ url: pdfUrl })
}

// ─── DELETE: quitar PDF ───────────────────────────────────────────────────
export async function DELETE() {
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

  await prisma.restaurant.update({
    where: { id: user.restaurantId },
    data: { pdfUrl: null },
  })

  return Response.json({ ok: true })
}
