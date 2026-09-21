import sharp from 'sharp'

export interface ThumbnailVariants {
  '150': Buffer
  '300': Buffer
  '600': Buffer
}

export interface ProcessedImageResult {
  main: Buffer
  thumbnails: ThumbnailVariants
}

/**
 * Genera automáticamente 3 variantes optimizadas de miniaturas en WebP:
 * - 150px: Miniaturas de carrito y terminal POS
 * - 300px: Cuadrícula del catálogo de productos
 * - 600px: Vista modal de detalle del producto
 * Además de la imagen principal comprimida (máx. 1200px).
 */
export async function generateProductThumbnails(
  inputBuffer: Buffer
): Promise<ProcessedImageResult> {
  // 1. Imagen principal optimizada (máx 1200px preservando aspecto, WebP q:85)
  const mainPromise = sharp(inputBuffer)
    .resize(1200, 1200, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: 85, effort: 4 })
    .toBuffer()

  // 2. Variante 150px (recorte cuadrado centrado para POS y carrito)
  const thumb150Promise = sharp(inputBuffer)
    .resize(150, 150, {
      fit: 'cover',
      position: 'centre',
    })
    .webp({ quality: 80, effort: 4 })
    .toBuffer()

  // 3. Variante 300px (recorte cuadrado centrado para grid del menú)
  const thumb300Promise = sharp(inputBuffer)
    .resize(300, 300, {
      fit: 'cover',
      position: 'centre',
    })
    .webp({ quality: 80, effort: 4 })
    .toBuffer()

  // 4. Variante 600px (detalle y modal)
  const thumb600Promise = sharp(inputBuffer)
    .resize(600, 600, {
      fit: 'cover',
      position: 'centre',
    })
    .webp({ quality: 85, effort: 4 })
    .toBuffer()

  const [main, t150, t300, t600] = await Promise.all([
    mainPromise,
    thumb150Promise,
    thumb300Promise,
    thumb600Promise,
  ])

  return {
    main,
    thumbnails: {
      '150': t150,
      '300': t300,
      '600': t600,
    },
  }
}
