import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import crypto from 'crypto'
import { uploadBlob } from '@/lib/storage'
import { generateProductThumbnails } from '@/lib/images/thumbnails'

const ADMIN_ROLES = ['SUPERADMIN', 'ORG_ADMIN', 'RESTAURANT_ADMIN', 'MANAGER']
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
const RASTER_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const user = session.user as { id: string; role: string; restaurantId?: string }
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
      return NextResponse.json({ error: 'La imagen excede el límite de 10MB' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const targetRestaurantId =
      (formData.get('restaurantId') as string) || user.restaurantId || 'general'
    const hash = crypto.randomBytes(8).toString('hex')
    const baseName = `prod_${Date.now()}_${hash}`

    // ── Si es imagen raster (JPEG/PNG/WebP), generamos miniaturas con Sharp ────
    if (RASTER_TYPES.includes(file.type)) {
      try {
        const { main, thumbnails } = await generateProductThumbnails(buffer)

        const basePath = `restaurants/${targetRestaurantId}/products`
        const [mainRes, t150Res, t300Res, t600Res] = await Promise.all([
          uploadBlob({
            pathname: `${basePath}/${baseName}.webp`,
            buffer: main,
            contentType: 'image/webp',
          }),
          uploadBlob({
            pathname: `${basePath}/${baseName}-150.webp`,
            buffer: thumbnails['150'],
            contentType: 'image/webp',
          }),
          uploadBlob({
            pathname: `${basePath}/${baseName}-300.webp`,
            buffer: thumbnails['300'],
            contentType: 'image/webp',
          }),
          uploadBlob({
            pathname: `${basePath}/${baseName}-600.webp`,
            buffer: thumbnails['600'],
            contentType: 'image/webp',
          }),
        ])

        return NextResponse.json({
          success: true,
          url: mainRes.url,
          fileName: `${baseName}.webp`,
          size: main.length,
          thumbnails: {
            '150': t150Res.url,
            '300': t300Res.url,
            '600': t600Res.url,
          },
        })
      } catch (sharpError) {
        console.warn('[POST /api/menu/upload] Error generando miniaturas con Sharp, subiendo original:', sharpError)
        // Fallback a subida directa si Sharp falla
      }
    }

    // ── Fallback o archivos vectoriales (SVG) / GIF animados ─────────────────
    let ext = '.webp'
    if (file.type === 'image/jpeg') ext = '.jpg'
    else if (file.type === 'image/png') ext = '.png'
    else if (file.type === 'image/gif') ext = '.gif'
    else if (file.type === 'image/svg+xml') ext = '.svg'

    const fileName = `${baseName}${ext}`
    const pathname = `restaurants/${targetRestaurantId}/products/${fileName}`

    const result = await uploadBlob({
      pathname,
      buffer,
      contentType: file.type || 'image/webp',
    })

    return NextResponse.json({
      success: true,
      url: result.url,
      fileName,
      size: file.size,
      thumbnails: {
        '150': result.url,
        '300': result.url,
        '600': result.url,
      },
    })
  } catch (error) {
    console.error('[POST /api/menu/upload]', error)
    return NextResponse.json({ error: 'Error al subir la imagen' }, { status: 500 })
  }
}
