import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import sharp from 'sharp'
import { prisma } from '@/lib/prisma'
import { uploadBlob, purgeMenuCdnCache } from '@/lib/storage'
import { redis } from '@/lib/redis'

export interface PdfJob {
  id: string
  restaurantId: string
  restaurantSlug: string
  pdfUrl: string
  status: 'queued' | 'processing' | 'completed' | 'failed'
  totalPages: number
  processedPages: number
  pageImages: string[]
  error?: string
  createdAt: number
  updatedAt: number
}

// ── In-Memory Store (Respaldo instantáneo local) ──────────────────────────────
const memoryJobs = new Map<string, PdfJob>()

const JOB_KEY_PREFIX = 'imenu:pdf_job:'
const JOB_TTL_SECONDS = 3600 // 1 hora
let redisAvailable = true

/**
 * Encola un nuevo trabajo de conversión de PDF.
 */
export async function enqueuePdfConversionJob({
  restaurantId,
  restaurantSlug,
  pdfUrl,
}: {
  restaurantId: string
  restaurantSlug: string
  pdfUrl: string
}): Promise<PdfJob> {
  const id = `job_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`
  const now = Date.now()

  const job: PdfJob = {
    id,
    restaurantId,
    restaurantSlug,
    pdfUrl,
    status: 'queued',
    totalPages: 0,
    processedPages: 0,
    pageImages: [],
    createdAt: now,
    updatedAt: now,
  }

  memoryJobs.set(id, job)

  if (redisAvailable) {
    try {
      await redis.set(`${JOB_KEY_PREFIX}${id}`, JSON.stringify(job), {
        ex: JOB_TTL_SECONDS,
      })
    } catch (err) {
      redisAvailable = false
      console.warn('[PdfQueue] Redis no disponible, usando caché en memoria para jobs de PDF.')
    }
  }

  return job
}

/**
 * Consulta el estado actual de un trabajo.
 */
export async function getPdfConversionJob(id: string): Promise<PdfJob | null> {
  const local = memoryJobs.get(id)
  if (local) return local

  if (redisAvailable) {
    try {
      const raw = await redis.get<string>(`${JOB_KEY_PREFIX}${id}`)
      if (raw) {
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : (raw as PdfJob)
        memoryJobs.set(id, parsed)
        return parsed
      }
    } catch (err) {
      redisAvailable = false
    }
  }

  return null
}

/**
 * Actualiza el progreso o estado de un trabajo.
 */
export async function updatePdfConversionJob(
  id: string,
  updates: Partial<PdfJob>
): Promise<PdfJob | null> {
  const current = await getPdfConversionJob(id)
  if (!current) return null

  const updated: PdfJob = {
    ...current,
    ...updates,
    updatedAt: Date.now(),
  }

  memoryJobs.set(id, updated)

  if (redisAvailable) {
    try {
      await redis.set(`${JOB_KEY_PREFIX}${id}`, JSON.stringify(updated), {
        ex: JOB_TTL_SECONDS,
      })
    } catch (err) {
      redisAvailable = false
    }
  }

  return updated
}

/**
 * Worker en segundo plano: procesa la conversión del PDF por bloques de páginas,
 * las comprime en WebP de alta fidelidad con Sharp (~40KB/pág),
 * las sube a almacenamiento persistente, actualiza el restaurante en la base de datos
 * y purga la caché CDN.
 */
export async function processPdfConversionJob(jobId: string): Promise<void> {
  const job = await getPdfConversionJob(jobId)
  if (!job || job.status === 'processing' || job.status === 'completed') {
    return
  }

  await updatePdfConversionJob(jobId, { status: 'processing' })

  let puppeteer: any = null
  let browser: any = null

  try {
    // 1. Obtener buffer del PDF
    let pdfBuffer: Buffer
    if (job.pdfUrl.startsWith('http://') || job.pdfUrl.startsWith('https://')) {
      const resp = await fetch(job.pdfUrl)
      if (!resp.ok) {
        throw new Error(`No se pudo descargar el PDF desde ${job.pdfUrl} (status ${resp.status})`)
      }
      const arr = await resp.arrayBuffer()
      pdfBuffer = Buffer.from(arr)
    } else {
      const localPath = path.join(
        process.cwd(),
        'public',
        job.pdfUrl.replace(/^\/+/, '')
      )
      if (!fs.existsSync(localPath)) {
        throw new Error(`Archivo local de PDF no encontrado en ${localPath}`)
      }
      pdfBuffer = fs.readFileSync(localPath)
    }

    // 2. Inicializar Puppeteer para renderizar el PDF
    puppeteer = (await import('puppeteer')).default
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    })

    const page = await browser.newPage()
    await page.setViewport({ width: 720, height: 1280 })

    // Inyectar PDF.js en la página
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
      </head>
      <body>
        <script>
          pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
          let pdfDoc = null;
          window.loadPdf = async function(arr) {
            const uint8 = new Uint8Array(arr);
            pdfDoc = await pdfjsLib.getDocument({ data: uint8 }).promise;
            return pdfDoc.numPages;
          };

          window.renderPage = async function(pageNum) {
            const page = await pdfDoc.getPage(pageNum);
            const viewport = page.getViewport({ scale: 1.5 });
            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const ctx = canvas.getContext('2d');
            await page.render({ canvasContext: ctx, viewport }).promise;
            return canvas.toDataURL('image/jpeg', 0.9);
          };
        </script>
      </body>
      </html>
    `)

    // Cargar PDF en memoria dentro de Chromium
    const totalPages: number = await page.evaluate(async (arr: number[]) => {
      return await (window as any).loadPdf(arr)
    }, Array.from(pdfBuffer))

    await updatePdfConversionJob(jobId, { totalPages })
    console.log(`[PdfWorker] Job ${jobId}: PDF cargado con ${totalPages} páginas. Iniciando conversión en bloques...`)

    const pageImages: string[] = []
    const CHUNK_SIZE = 5 // Procesar en bloques de 5 páginas para mantener memoria baja

    for (let chunkStart = 1; chunkStart <= totalPages; chunkStart += CHUNK_SIZE) {
      const chunkEnd = Math.min(chunkStart + CHUNK_SIZE - 1, totalPages)

      for (let pageNum = chunkStart; pageNum <= chunkEnd; pageNum++) {
        // Renderizar página en Chromium
        const dataUrl: string = await page.evaluate(async (p: number) => {
          return await (window as any).renderPage(p)
        }, pageNum)

        const base64Content = dataUrl.replace(/^data:image\/jpeg;base64,/, '')
        const rawImgBuffer = Buffer.from(base64Content, 'base64')

        // Comprimir a WebP de alta fidelidad con Sharp
        const webpBuffer = await sharp(rawImgBuffer)
          .webp({ quality: 85, effort: 4 })
          .toBuffer()

        // Subir a Vercel Blob o local
        const pathname = `restaurants/${job.restaurantId}/menu/pages/page-${pageNum}.webp`
        const uploadResult = await uploadBlob({
          pathname,
          buffer: webpBuffer,
          contentType: 'image/webp',
        })

        pageImages.push(uploadResult.url)

        await updatePdfConversionJob(jobId, {
          processedPages: pageNum,
          pageImages: [...pageImages],
        })

        console.log(
          `[PdfWorker] Job ${jobId}: Página ${pageNum}/${totalPages} WebP generada (${(
            webpBuffer.length / 1024
          ).toFixed(1)} KB) -> ${uploadResult.url}`
        )
      }
    }

    // 3. Actualizar el restaurante en MySQL
    await prisma.restaurant.update({
      where: { id: job.restaurantId },
      data: {
        pdfUrl: job.pdfUrl,
        pdfPageImages: pageImages,
      },
    })

    // 4. Purgar caché CDN
    await purgeMenuCdnCache(job.restaurantSlug)

    // 5. Finalizar job
    await updatePdfConversionJob(jobId, {
      status: 'completed',
      processedPages: totalPages,
      pageImages,
    })

    console.log(`[PdfWorker] ✅ Job ${jobId} completado exitosamente: ${totalPages} páginas convertidas.`)
  } catch (error: any) {
    console.error(`[PdfWorker] ❌ Error en job ${jobId}:`, error)
    await updatePdfConversionJob(jobId, {
      status: 'failed',
      error: error?.message || 'Error desconocido durante la conversión',
    })
  } finally {
    if (browser) {
      try {
        await browser.close()
      } catch {}
    }
  }
}
