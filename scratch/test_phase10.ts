import sharp from 'sharp'
import puppeteer from 'puppeteer'
import fs from 'fs'
import path from 'path'
import { generateProductThumbnails } from '../lib/images/thumbnails'
import { purgeMenuCdnCache } from '../lib/storage'
import {
  enqueuePdfConversionJob,
  getPdfConversionJob,
  processPdfConversionJob,
} from '../lib/pdf/queue'
import { prisma } from '../lib/prisma'

async function runPhase10Tests() {
  console.log('═══════════════════════════════════════════════════════════════')
  console.log('       PRUEBAS AUTOMATIZADAS - FASE 10: PERFORMANCE Y WORKERS  ')
  console.log('═══════════════════════════════════════════════════════════════\n')

  let passed = 0
  let failed = 0

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`  ✓ ${msg}`)
      passed++
    } else {
      console.error(`  ✕ FAILED: ${msg}`)
      failed++
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 1: Generación Automática de Miniaturas con Sharp (150, 300, 600, main)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('─── TEST 1: Generador de Miniaturas WebP (Thumbnails) ────────')
  try {
    // Crear imagen de prueba sintética 1000x800
    const rawImageBuffer = await sharp({
      create: {
        width: 1000,
        height: 800,
        channels: 4,
        background: { r: 245, g: 158, b: 11, alpha: 1 }, // Amber #f59e0b
      },
    })
      .png()
      .toBuffer()

    const { main, thumbnails } = await generateProductThumbnails(rawImageBuffer)

    assert(Buffer.isBuffer(main), 'Buffer principal generado correctamente')
    assert(Buffer.isBuffer(thumbnails['150']), 'Miniatura 150px generada')
    assert(Buffer.isBuffer(thumbnails['300']), 'Miniatura 300px generada')
    assert(Buffer.isBuffer(thumbnails['600']), 'Miniatura 600px generada')

    const metaMain = await sharp(main).metadata()
    const meta150 = await sharp(thumbnails['150']).metadata()
    const meta300 = await sharp(thumbnails['300']).metadata()
    const meta600 = await sharp(thumbnails['600']).metadata()

    assert(metaMain.format === 'webp', `Principal es formato WebP (${metaMain.format})`)
    assert(meta150.format === 'webp' && meta150.width === 150 && meta150.height === 150, `Miniatura 150 es 150x150 WebP`)
    assert(meta300.format === 'webp' && meta300.width === 300 && meta300.height === 300, `Miniatura 300 es 300x300 WebP`)
    assert(meta600.format === 'webp' && meta600.width === 600 && meta600.height === 600, `Miniatura 600 es 600x600 WebP`)
    assert(
      (metaMain.width || 0) <= 1200 && (metaMain.height || 0) <= 1200,
      `Principal acotada a máx 1200px (${metaMain.width}x${metaMain.height})`
    )

    console.log(
      `  ℹ Tamaños: Main=${(main.length / 1024).toFixed(1)}KB, 600px=${(
        thumbnails['600'].length / 1024
      ).toFixed(1)}KB, 300px=${(thumbnails['300'].length / 1024).toFixed(1)}KB, 150px=${(
        thumbnails['150'].length / 1024
      ).toFixed(1)}KB`
    )
  } catch (err: any) {
    assert(false, `Error en TEST 1: ${err.message}`)
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 2: Purga Instantánea de Caché CDN Perimetral
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n─── TEST 2: Purga de Caché CDN y Memoria ─────────────────────')
  try {
    const purgeResult = await purgeMenuCdnCache('el-aguante', {
      revalidatePaths: ['/menu/el-aguante', '/dashboard'],
      revalidateTags: ['menu-el-aguante'],
    })

    assert(purgeResult.success === true, 'Purga ejecutada exitosamente')
    assert(purgeResult.restaurantSlug === 'el-aguante', 'Slug restaurado correctamente')
    assert(purgeResult.purgedPaths.includes('/menu/el-aguante'), 'Ruta /menu/el-aguante incluida en la purga')
    assert(purgeResult.purgedTags.includes('menu-el-aguante'), 'Tag menu-el-aguante purgado')
    assert(typeof purgeResult.timestamp === 'number', 'Timestamp válido emitido')
  } catch (err: any) {
    assert(false, `Error en TEST 2: ${err.message}`)
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 3: Background Workers y Cola de Conversión de PDFs
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n─── TEST 3: Background Worker de Conversión de PDFs ──────────')
  try {
    // 1. Obtener restaurante de prueba existente
    let testRestaurant = await prisma.restaurant.findUnique({
      where: { slug: 'el-aguante' },
      select: { id: true, slug: true, pdfUrl: true, pdfPageImages: true },
    })

    if (!testRestaurant) {
      testRestaurant = await prisma.restaurant.findFirst({
        select: { id: true, slug: true, pdfUrl: true, pdfPageImages: true },
      })
    }

    if (!testRestaurant) {
      throw new Error('No se encontró restaurante en la base de datos')
    }

    // 2. Generar un PDF sintético de 3 páginas para la prueba
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })
    const testPage = await browser.newPage()
    await testPage.setContent(`
      <div style="height: 100vh; background: #09090b; color: #f59e0b; padding: 40px; font-family: sans-serif;">
        <h1 style="font-size: 32px;">Menú Digital - Página 1</h1>
        <p style="color: #a1a1aa;">Hamburguesas Artesanales</p>
      </div>
      <div style="page-break-before: always; height: 100vh; background: #09090b; color: #10b981; padding: 40px; font-family: sans-serif;">
        <h1 style="font-size: 32px;">Menú Digital - Página 2</h1>
        <p style="color: #a1a1aa;">Bebidas & Cócteles</p>
      </div>
      <div style="page-break-before: always; height: 100vh; background: #09090b; color: #3b82f6; padding: 40px; font-family: sans-serif;">
        <h1 style="font-size: 32px;">Menú Digital - Página 3</h1>
        <p style="color: #a1a1aa;">Postres de la Casa</p>
      </div>
    `)
    const pdfBytes = await testPage.pdf({ format: 'A4', printBackground: true })
    await browser.close()

    // Guardar temporalmente el PDF de prueba en public/uploads/test-menu.pdf
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true })
    const testPdfPath = path.join(uploadsDir, 'test-menu.pdf')
    fs.writeFileSync(testPdfPath, pdfBytes)

    const testPdfUrl = '/uploads/test-menu.pdf'
    assert(fs.existsSync(testPdfPath), `PDF de prueba creado en ${testPdfPath} (${pdfBytes.length} bytes)`)

    // 3. Encolar el trabajo en la cola de workers
    const job = await enqueuePdfConversionJob({
      restaurantId: testRestaurant.id,
      restaurantSlug: testRestaurant.slug,
      pdfUrl: testPdfUrl,
    })

    assert(Boolean(job.id), `Trabajo encolado con ID: ${job.id}`)
    assert(job.status === 'queued', `Estado inicial del trabajo: ${job.status}`)

    // 4. Verificar consulta de estado inicial
    const polledJob = await getPdfConversionJob(job.id)
    assert(polledJob?.id === job.id, 'getPdfConversionJob recupera el trabajo encolado')

    // 5. Ejecutar el procesamiento del worker
    console.log('  ⏳ Procesando conversión con Puppeteer y Sharp en worker...')
    await processPdfConversionJob(job.id)

    // 6. Verificar estado final
    const completedJob = await getPdfConversionJob(job.id)
    assert(completedJob?.status === 'completed', `Estado final es completed (${completedJob?.status})`)
    assert((completedJob?.totalPages ?? 0) > 0, `Total de páginas identificadas: ${completedJob?.totalPages}`)
    assert(
      completedJob?.processedPages === completedJob?.totalPages,
      `Páginas procesadas coinciden con total (${completedJob?.processedPages}/${completedJob?.totalPages})`
    )
    assert(
      Array.isArray(completedJob?.pageImages) && completedJob.pageImages.length === completedJob?.totalPages,
      `Imágenes WebP generadas en el arreglo (${completedJob?.pageImages.length}) coinciden con total`
    )

    // 7. Verificar que la primera página WebP existe y es válida
    if (completedJob?.pageImages?.[0]) {
      const firstImg = completedJob.pageImages[0]
      if (firstImg.startsWith('http')) {
        const resp = await fetch(firstImg)
        assert(resp.ok, `Primera página WebP accesible en CDN (${resp.status})`)
      } else {
        const localImgPath = path.join(
          process.cwd(),
          'public',
          firstImg.replace(/^\/+/, '')
        )
        if (fs.existsSync(localImgPath)) {
          const meta = await sharp(localImgPath).metadata()
          assert(meta.format === 'webp', `Página generada 1 es formato WebP válido (${meta.format})`)
        }
      }
    }

    // 8. Verificar que la base de datos MySQL se actualizó
    const updatedRest = await prisma.restaurant.findUnique({
      where: { id: testRestaurant.id },
      select: { pdfPageImages: true },
    })
    const isArrayInDb =
      Array.isArray(updatedRest?.pdfPageImages) &&
      (updatedRest.pdfPageImages as string[]).length === completedJob?.totalPages
    assert(isArrayInDb, `Restaurant.pdfPageImages persistido en MySQL con URLs WebP`)
  } catch (err: any) {
    assert(false, `Error en TEST 3: ${err.message}`)
  }

  console.log('\n═══════════════════════════════════════════════════════════════')
  console.log(`   RESULTADOS: ${passed} APROBADAS | ${failed} FALLIDAS`)
  console.log('═══════════════════════════════════════════════════════════════\n')

  await prisma.$disconnect()

  if (failed > 0) {
    process.exit(1)
  }
}

runPhase10Tests().catch((e) => {
  console.error('Error no capturado:', e)
  process.exit(1)
})
