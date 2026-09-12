import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

const ADMIN_ROLES = ['SUPERADMIN', 'ORG_ADMIN', 'RESTAURANT_ADMIN', 'MANAGER']
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const user = session.user as { id: string; role: string }
    if (!ADMIN_ROLES.includes(user.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No se envió ningún archivo de imagen' }, { status: 400 })
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Formato no soportado. Usa JPEG, PNG, WebP, GIF o SVG' },
        { status: 400 }
      )
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'La imagen excede el límite de 5MB' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Determinar extensión adecuada
    let ext = '.webp'
    if (file.type === 'image/jpeg') ext = '.jpg'
    else if (file.type === 'image/png') ext = '.png'
    else if (file.type === 'image/gif') ext = '.gif'
    else if (file.type === 'image/svg+xml') ext = '.svg'

    const hash = crypto.randomBytes(12).toString('hex')
    const fileName = `dish_${Date.now()}_${hash}${ext}`

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'menu')
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }

    const filePath = path.join(uploadDir, fileName)
    fs.writeFileSync(filePath, buffer)

    const publicUrl = `/uploads/menu/${fileName}`

    return NextResponse.json({
      success: true,
      url: publicUrl,
      fileName,
      size: file.size,
    })
  } catch (error) {
    console.error('[POST /api/menu/upload]', error)
    return NextResponse.json({ error: 'Error al subir la imagen' }, { status: 500 })
  }
}
