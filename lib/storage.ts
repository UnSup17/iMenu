import { put, del } from '@vercel/blob'
import fs from 'fs'
import path from 'path'

/**
 * Servicio unificado de almacenamiento de activos (Vercel Blob + Fallback local).
 * En producción o cuando BLOB_READ_WRITE_TOKEN está presente:
 *   Sube y distribuye mediante la red perimetral CDN de Vercel Blob.
 * En desarrollo local sin token:
 *   Guarda en public/uploads/ para permitir trabajo sin conexión.
 */

export function isVercelBlobEnabled(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN)
}

export interface UploadOptions {
  pathname: string
  buffer: Buffer | Blob | ArrayBuffer
  contentType?: string
}

export interface UploadResult {
  url: string
  pathname: string
  size?: number
}

/**
 * Sube un archivo a Vercel Blob con CDN global o al almacenamiento local en dev.
 */
export async function uploadBlob({
  pathname,
  buffer,
  contentType,
}: UploadOptions): Promise<UploadResult> {
  // Normalizar pathname para evitar barras iniciales
  const cleanPathname = pathname.replace(/^\/+/, '')

  if (isVercelBlobEnabled()) {
    const blob = await put(cleanPathname, buffer, {
      access: 'public',
      contentType: contentType || undefined,
      addRandomSuffix: false, // Mantiene nombres limpios según nuestra estructura
      allowOverwrite: true, // Permite re-subir y actualizar activos existentes
    })
    return {
      url: blob.url,
      pathname: blob.pathname,
    }
  }

  // Fallback para desarrollo local
  const localBuffer = Buffer.isBuffer(buffer)
    ? buffer
    : Buffer.from(buffer as ArrayBuffer)

  const localPath = path.join(process.cwd(), 'public', 'uploads', cleanPathname)
  const dir = path.dirname(localPath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  fs.writeFileSync(localPath, localBuffer)
  return {
    url: `/uploads/${cleanPathname}`,
    pathname: cleanPathname,
    size: localBuffer.length,
  }
}

/**
 * Elimina un activo de Vercel Blob o del sistema de archivos local.
 */
export async function deleteBlob(urlOrPath: string): Promise<void> {
  if (!urlOrPath) return

  if (urlOrPath.includes('blob.vercel-storage.com') || (isVercelBlobEnabled() && urlOrPath.startsWith('http'))) {
    try {
      await del(urlOrPath)
    } catch (err) {
      console.warn('[deleteBlob] Error al eliminar de Vercel Blob:', err)
    }
    return
  }

  // Eliminación local
  if (urlOrPath.startsWith('/uploads/')) {
    try {
      const cleanPath = urlOrPath.replace(/^\/+/, '')
      const fullPath = path.join(process.cwd(), 'public', cleanPath)
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath)
      }
    } catch (err) {
      console.warn('[deleteBlob] Error al eliminar archivo local:', err)
    }
  }
}

export interface PurgeCdnCacheOptions {
  revalidatePaths?: string[]
  revalidateTags?: string[]
}

export interface PurgeCdnResult {
  success: boolean
  restaurantSlug: string
  purgedPaths: string[]
  purgedTags: string[]
  timestamp: number
}

/**
 * Purga instantánea de la caché CDN perimetral (Next.js ISR y Tags)
 * y de la memoria intermedia/Redis para un restaurante.
 */
export async function purgeMenuCdnCache(
  restaurantSlug: string,
  options?: PurgeCdnCacheOptions
): Promise<PurgeCdnResult> {
  const defaultPaths = [
    `/menu/${restaurantSlug}`,
    `/menu/${restaurantSlug}/[tableId]`,
    `/dashboard`,
    `/dashboard/menu-pdf`,
  ]

  const pathsToPurge = options?.revalidatePaths || defaultPaths
  const tagsToPurge = options?.revalidateTags || [
    `menu-${restaurantSlug}`,
    `restaurant-${restaurantSlug}`,
  ]

  const purgedPaths: string[] = []
  const purgedTags: string[] = []

  // 1. Invalidación de Next.js ISR (Incremental Static Regeneration)
  try {
    const { revalidatePath, revalidateTag } = await import('next/cache')

    for (const pathStr of pathsToPurge) {
      try {
        revalidatePath(pathStr, 'page')
      } catch (err) {
        // En tests o scripts independientes revalidatePath puede ser un no-op sin contexto HTTP
      }
      purgedPaths.push(pathStr)
    }

    for (const tagStr of tagsToPurge) {
      try {
        // Next.js 16 requiere perfil o modo de caché en revalidateTag
        ;(revalidateTag as (tag: string, profile?: string) => void)(tagStr, 'default')
      } catch (err) {
        // Ignorar si no está en contexto de request
      }
      purgedTags.push(tagStr)
    }
  } catch (err) {
    console.warn('[purgeMenuCdnCache] next/cache no disponible:', err)
  }

  // 2. Invalidar caché en Redis si está configurado
  try {
    const { redis } = await import('@/lib/redis')
    // Intentar borrar claves de sesión o caché asociadas
    const cacheKeys = [
      `imenu:menu:${restaurantSlug}`,
      `imenu:cache:${restaurantSlug}`,
    ]
    for (const k of cacheKeys) {
      try {
        await redis.del(k)
      } catch {
        // Fallback silencioso de redis
      }
    }
  } catch {
    // Si no está disponible redis
  }

  console.log(`[purgeMenuCdnCache] Caché purgada para slug: "${restaurantSlug}". Rutas: [${purgedPaths.join(', ')}]`)

  return {
    success: true,
    restaurantSlug,
    purgedPaths,
    purgedTags,
    timestamp: Date.now(),
  }
}

