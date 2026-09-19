/**
 * Script de migración masiva de activos de El Aguante a Vercel Blob (CDN Global).
 *
 * Sube:
 *  1. PDF del Menú (comprimido a ~1.5MB) -> restaurants/{restaurantId}/menu/menu.pdf
 *  2. 14 páginas WebP pre-renderizadas -> restaurants/{restaurantId}/menu/page-{n}.webp
 *  3. Fotos WebP de todos los productos -> restaurants/{restaurantId}/products/{filename}
 *
 * Actualiza en MySQL:
 *  - Restaurant.pdfUrl con la URL pública de Vercel Blob
 *  - Restaurant.pdfPageImages con el arreglo JSON de las 14 URLs de Vercel Blob
 *  - Product.imageUrl de cada platillo con su URL correspondiente en Vercel Blob
 *
 * Uso:
 *   node scripts/migrate_assets_to_vercel_blob.js
 */

const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

// Cargar variables de entorno
if (process.loadEnvFile) {
  try { process.loadEnvFile(path.join(__dirname, '..', '.env.local')); } catch (_) {}
  try { process.loadEnvFile(path.join(__dirname, '..', '.env')); } catch (_) {}
}

const prisma = new PrismaClient();

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('   🚀 MIGRACIÓN DE ACTIVOS A VERCEL BLOB (CDN GLOBAL)          ');
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error('❌ ERROR: BLOB_READ_WRITE_TOKEN no está definido en .env o .env.local');
    process.exit(1);
  }

  const { put } = await import('@vercel/blob');

  // 1. Obtener restaurante
  const rest = await prisma.restaurant.findUnique({
    where: { slug: 'el-aguante' },
    select: { id: true, name: true, slug: true },
  });

  if (!rest) {
    console.error('❌ Restaurante "el-aguante" no encontrado en la base de datos.');
    process.exit(1);
  }

  console.log(`📌 Restaurante: ${rest.name} (${rest.slug})`);
  console.log(`🆔 ID: ${rest.id}\n`);

  // 2. Subir PDF del Menú
  console.log('─── 1. Subiendo PDF del Menú ─────────────────────────────────');
  const pdfSource = fs.existsSync(path.join(process.cwd(), 'public', 'elaguante_menu_new.pdf'))
    ? path.join(process.cwd(), 'public', 'elaguante_menu_new.pdf')
    : path.join(process.cwd(), 'public', 'elaguante_menu.pdf');

  const pdfBuffer = fs.readFileSync(pdfSource);
  const pdfBlobPath = `restaurants/${rest.id}/menu/menu.pdf`;
  console.log(`Subiendo ${path.basename(pdfSource)} (${(pdfBuffer.length / 1024 / 1024).toFixed(2)} MB) a "${pdfBlobPath}"...`);

  const pdfBlob = await put(pdfBlobPath, pdfBuffer, {
    access: 'public',
    contentType: 'application/pdf',
    addRandomSuffix: false,
  });
  console.log(`✅ PDF subido exitosamente:`);
  console.log(`   ${pdfBlob.url}\n`);

  // 3. Subir las 14 Páginas WebP pre-renderizadas
  console.log('─── 2. Subiendo Páginas WebP Pre-renderizadas ────────────────');
  const pagesDir = path.join(process.cwd(), 'public', 'menu-cache', 'el-aguante');
  const pageBlobUrls = [];

  for (let n = 1; n <= 14; n++) {
    const pageFile = path.join(pagesDir, `page-${n}.webp`);
    if (!fs.existsSync(pageFile)) {
      console.warn(`⚠️ Advertencia: ${pageFile} no existe, omitiendo.`);
      continue;
    }

    const pageBuffer = fs.readFileSync(pageFile);
    const pageBlobPath = `restaurants/${rest.id}/menu/page-${n}.webp`;
    const pageBlob = await put(pageBlobPath, pageBuffer, {
      access: 'public',
      contentType: 'image/webp',
      addRandomSuffix: false,
    });

    pageBlobUrls.push(pageBlob.url);
    console.log(`  ✓ Página ${n}/14 (${(pageBuffer.length / 1024).toFixed(1)} KB): ${pageBlob.url}`);
  }

  console.log(`✅ ${pageBlobUrls.length} páginas WebP subidas a Vercel Blob CDN.\n`);

  // 4. Subir Fotos de Productos a Vercel Blob
  console.log('─── 3. Subiendo Fotos de Productos ───────────────────────────');
  const productsDir = path.join(process.cwd(), 'public', 'images', 'products', 'elaguante');
  const productFiles = fs.readdirSync(productsDir).filter(f => f.endsWith('.webp'));

  const urlMap = new Map(); // localPath -> blobUrl
  let totalProductBytes = 0;

  for (const file of productFiles) {
    const filePath = path.join(productsDir, file);
    const fileBuffer = fs.readFileSync(filePath);
    totalProductBytes += fileBuffer.length;

    const blobPath = `restaurants/${rest.id}/products/${file}`;
    const blob = await put(blobPath, fileBuffer, {
      access: 'public',
      contentType: 'image/webp',
      addRandomSuffix: false,
    });

    const localRelative = `/images/products/elaguante/${file}`;
    urlMap.set(localRelative, blob.url);
    console.log(`  ✓ ${file} (${(fileBuffer.length / 1024).toFixed(1)} KB) -> ${blob.url}`);
  }

  console.log(`✅ ${productFiles.length} fotos de productos subidas (${(totalProductBytes / 1024).toFixed(1)} KB total).\n`);

  // 5. Actualizar Base de Datos MySQL
  console.log('─── 4. Actualizando Base de Datos (MySQL) ─────────────────────');

  // Actualizar Restaurant (pdfUrl y pdfPageImages)
  await prisma.restaurant.update({
    where: { id: rest.id },
    data: {
      pdfUrl: pdfBlob.url,
      pdfPageImages: pageBlobUrls,
    },
  });
  console.log(`✅ Restaurante actualizado con pdfUrl y ${pageBlobUrls.length} pdfPageImages.`);

  // Actualizar Productos
  const products = await prisma.product.findMany({
    where: { restaurantId: rest.id },
    select: { id: true, name: true, imageUrl: true },
  });

  let updatedProducts = 0;
  for (const prod of products) {
    if (prod.imageUrl && urlMap.has(prod.imageUrl)) {
      const newUrl = urlMap.get(prod.imageUrl);
      await prisma.product.update({
        where: { id: prod.id },
        data: { imageUrl: newUrl },
      });
      updatedProducts++;
    }
  }

  console.log(`✅ ${updatedProducts} productos actualizados con URLs CDN de Vercel Blob.`);

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('   🎉 MIGRACIÓN COMPLETADA CON ÉXITO                         ');
  console.log('═══════════════════════════════════════════════════════════════\n');
}

main()
  .catch((err) => {
    console.error('❌ Error durante la migración:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
