/**
 * Extractor de Paleta Cromática y Armonías de Color a partir de Fotos del Restaurante
 * Algoritmo de cuantización cromática y afinamiento para BrandTheme.
 */

import { BrandThemeData, DEFAULT_BRAND_THEME } from './types'

export interface ColorSwatch {
  hex: string
  rgb: [number, number, number]
  hsl: [number, number, number]
  population: number
  saturation: number
  luminance: number
}

export interface ExtractedPaletteResult {
  dominantColors: string[]
  suggestedTheme: Partial<BrandThemeData>
  contrastCheck: {
    primaryOnBackground: number
    textOnBackground: number
  }
}

// Helpers cromáticos
export function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (val: number) => Math.max(0, Math.min(255, Math.round(val)))
  return `#${[clamp(r), clamp(g), clamp(b)]
    .map((x) => x.toString(16).padStart(2, '0'))
    .join('')}`
}

export function hexToRgb(hex: string): [number, number, number] {
  let c = hex.replace('#', '')
  if (c.length === 3) c = c.split('').map((x) => x + x).join('')
  const num = parseInt(c, 16) || 0
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255]
}

export function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0)
        break
      case g:
        h = (b - r) / d + 2
        break
      case b:
        h = (r - g) / d + 4
        break
    }
    h = Math.round(h * 60)
  }
  return [h, Math.round(s * 100), Math.round(l * 100)]
}

export function hslToHex(h: number, s: number, l: number): string {
  s /= 100
  l /= 100
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * color).toString(16).padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    c /= 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
}

export function getContrastRatio(hex1: string, hex2: string): number {
  const [r1, g1, b1] = hexToRgb(hex1)
  const [r2, g2, b2] = hexToRgb(hex2)
  const lum1 = getLuminance(r1, g1, b1)
  const lum2 = getLuminance(r2, g2, b2)
  const brightest = Math.max(lum1, lum2)
  const darkest = Math.min(lum1, lum2)
  return Number(((brightest + 0.05) / (darkest + 0.05)).toFixed(2))
}

/**
 * Cuantiza píxeles en swatches y selecciona la paleta para BrandTheme
 */
export function buildPaletteFromRgbSamples(samples: [number, number, number][]): ExtractedPaletteResult {
  if (!samples || samples.length === 0) {
    return {
      dominantColors: ['#f59e0b', '#fbbf24', '#18181b', '#09090b'],
      suggestedTheme: DEFAULT_BRAND_THEME,
      contrastCheck: { primaryOnBackground: 8.5, textOnBackground: 19.5 },
    }
  }

  // Agrupar colores por tono (Hue bins de 20 grados) y brillo
  const colorBuckets = new Map<string, { r: number; g: number; b: number; count: number }>()

  for (const [r, g, b] of samples) {
    // Reducir espacio de color a pasos de 16
    const qr = Math.round(r / 16) * 16
    const qg = Math.round(g / 16) * 16
    const qb = Math.round(b / 16) * 16
    const key = `${qr},${qg},${qb}`
    const bkt = colorBuckets.get(key)
    if (bkt) {
      bkt.count++
    } else {
      colorBuckets.set(key, { r: qr, g: qg, b: qb, count: 1 })
    }
  }

  const swatches: ColorSwatch[] = Array.from(colorBuckets.values())
    .map(({ r, g, b, count }) => {
      const [h, s, l] = rgbToHsl(r, g, b)
      return {
        hex: rgbToHex(r, g, b),
        rgb: [r, g, b] as [number, number, number],
        hsl: [h, s, l] as [number, number, number],
        population: count,
        saturation: s,
        luminance: l,
      }
    })
    .sort((a, b) => b.population - a.population)

  // Encontrar el color primario: priorizar colores con saturación media/alta (> 35%) y luminosidad moderada (25% a 75%)
  const vibrantCandidates = swatches.filter((s) => s.saturation >= 35 && s.luminance >= 25 && s.luminance <= 75)
  const primarySwatch = vibrantCandidates[0] || swatches[0] || {
    hex: '#f59e0b',
    hsl: [38, 92, 50],
  }

  const [primaryH, primaryS] = [primarySwatch.hsl[0], primarySwatch.hsl[1]]

  // Color de acento: análogo (+35 grados) o complementario (+180 grados)
  const accentH = (primaryH + 35) % 360
  const accentColor = hslToHex(accentH, Math.min(primaryS + 10, 95), 58)

  // Fondo OLED negro estilizado con sutil matiz del primario
  const backgroundColor = hslToHex(primaryH, Math.min(primaryS, 18), 5)
  // Superficie de tarjetas
  const surfaceColor = hslToHex(primaryH, Math.min(primaryS, 16), 11)
  const secondaryColor = surfaceColor

  const suggestedTheme: Partial<BrandThemeData> = {
    primaryColor: primarySwatch.hex,
    accentColor,
    backgroundColor,
    surfaceColor,
    secondaryColor,
    textColor: '#ffffff',
    textMutedColor: hslToHex(primaryH, 12, 65),
    glassmorphismEnabled: true,
  }

  const topHexColors = swatches.slice(0, 6).map((s) => s.hex)

  return {
    dominantColors: topHexColors.length > 0 ? topHexColors : [primarySwatch.hex, accentColor],
    suggestedTheme,
    contrastCheck: {
      primaryOnBackground: getContrastRatio(primarySwatch.hex, backgroundColor),
      textOnBackground: getContrastRatio('#ffffff', backgroundColor),
    },
  }
}

/**
 * Función para ejecutar en el cliente (Browser): extrae píxeles de una foto usando un <canvas> invisible
 */
export async function extractPaletteFromClientImage(file: File): Promise<ExtractedPaletteResult> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      return resolve(buildPaletteFromRgbSamples([]))
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')
          if (!ctx) return resolve(buildPaletteFromRgbSamples([]))

          // Escalar la imagen a una resolución compacta (máx 100x100) para muestreo ultra-rápido (<10ms)
          const targetW = 80
          const targetH = Math.max(1, Math.round((img.height / img.width) * targetW))
          canvas.width = targetW
          canvas.height = targetH
          ctx.drawImage(img, 0, 0, targetW, targetH)

          const imgData = ctx.getImageData(0, 0, targetW, targetH).data
          const samples: [number, number, number][] = []

          // Muestrear cada 4 píxeles para máxima velocidad
          for (let i = 0; i < imgData.length; i += 16) {
            const a = imgData[i + 3]
            if (a > 128) {
              samples.push([imgData[i], imgData[i + 1], imgData[i + 2]])
            }
          }

          resolve(buildPaletteFromRgbSamples(samples))
        } catch (err) {
          reject(err)
        }
      }
      img.onerror = reject
      img.src = e.target?.result as string
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
