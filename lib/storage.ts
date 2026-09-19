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
