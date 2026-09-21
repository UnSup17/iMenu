import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { DEFAULT_BRAND_THEME } from '@/lib/branding/types'
import { hexToRgb, rgbToHsl, getContrastRatio } from '@/lib/branding/palette-extractor'

const ALLOWED_ROLES = ['SUPERADMIN', 'ORG_ADMIN', 'RESTAURANT_ADMIN', 'FOOD_COURT_ADMIN']

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const user = session.user as {
      id: string
      role: string
      restaurantId?: string | null
      organizationId?: string | null
    }

    if (!ALLOWED_ROLES.includes(user.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    let restaurantId = user.restaurantId
    if (!restaurantId && user.organizationId) {
      const first = await prisma.restaurant.findFirst({
        where: { organizationId: user.organizationId },
        select: { id: true },
      })
      restaurantId = first?.id ?? null
    }
    if (!restaurantId && user.role === 'SUPERADMIN') {
      const first = await prisma.restaurant.findFirst({ select: { id: true } })
      restaurantId = first?.id ?? null
    }

    if (!restaurantId) {
      return NextResponse.json({ error: 'Restaurante no encontrado' }, { status: 404 })
    }

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      include: { brandTheme: true },
    })

    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurante no encontrado' }, { status: 404 })
    }

    const theme = {
      ...DEFAULT_BRAND_THEME,
      ...(restaurant.brandTheme || {}),
    }

    const formatColor = (hex: string) => {
      const [r, g, b] = hexToRgb(hex)
      const [h, s, l] = rgbToHsl(r, g, b)
      return {
        hex: hex.toUpperCase(),
        rgb: `rgb(${r}, ${g}, ${b})`,
        hsl: `hsl(${h}, ${s}%, ${l}%)`,
      }
    }

    const swatches = [
      { name: 'Color Primario (Acentos & Botones)', hex: theme.primaryColor },
      { name: 'Color Secundario (Superficies)', hex: theme.secondaryColor },
      { name: 'Color de Acento (Badges & Destaques)', hex: theme.accentColor },
      { name: 'Fondo Global (Background)', hex: theme.backgroundColor },
      { name: 'Superficie de Tarjetas (Cards)', hex: theme.surfaceColor },
      { name: 'Texto Principal', hex: theme.textColor },
      { name: 'Texto Secundario (Muted)', hex: theme.textMutedColor },
    ].map((s) => ({
      ...s,
      ...formatColor(s.hex),
      contrastOnBg: getContrastRatio(s.hex, theme.backgroundColor),
    }))

    const dateStr = new Date().toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Brand Kit Oficial — ${restaurant.name}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=${encodeURIComponent(
    theme.fontHeading
  )}:wght@600;700;800;900&family=${encodeURIComponent(
      theme.fontBody
    )}:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    @page {
      size: A4 portrait;
      margin: 15mm 15mm 15mm 15mm;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: '${theme.fontBody}', -apple-system, sans-serif;
      background: #ffffff;
      color: #18181b;
      line-height: 1.5;
      padding: 24px;
      max-width: 900px;
      margin: 0 auto;
    }
    h1, h2, h3, h4 {
      font-family: '${theme.fontHeading}', serif;
      font-weight: 800;
    }
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 2px solid #e4e4e7;
      padding-bottom: 20px;
      margin-bottom: 28px;
    }
    .logo-box {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .logo-img {
      width: 64px;
      height: 64px;
      border-radius: ${theme.borderRadius};
      object-fit: cover;
      border: 1px solid #e4e4e7;
    }
    .logo-badge {
      width: 64px;
      height: 64px;
      border-radius: ${theme.borderRadius};
      background: ${theme.primaryColor};
      color: #ffffff;
      font-size: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 900;
    }
    .badge-label {
      font-size: 11px;
      text-transform: uppercase;
      font-weight: 700;
      color: #71717a;
      letter-spacing: 1px;
    }
    .section {
      margin-bottom: 32px;
      page-break-inside: avoid;
    }
    .section-title {
      font-size: 16px;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: #09090b;
      margin-bottom: 16px;
      border-left: 4px solid ${theme.primaryColor};
      padding-left: 10px;
    }
    .palette-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 14px;
    }
    .color-card {
      border: 1px solid #e4e4e7;
      border-radius: 12px;
      overflow: hidden;
      display: flex;
    }
    .color-chip {
      width: 90px;
      min-height: 80px;
      border-right: 1px solid rgba(0,0,0,0.06);
    }
    .color-info {
      padding: 10px 14px;
      font-size: 12px;
      flex: 1;
    }
    .color-info strong {
      display: block;
      font-size: 13px;
      color: #09090b;
      margin-bottom: 4px;
    }
    .color-info code {
      display: block;
      font-family: monospace;
      color: #52525b;
      font-size: 11px;
    }
    .typography-specimen {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 20px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }
    .ui-showcase {
      display: flex;
      gap: 16px;
      align-items: center;
      background: ${theme.backgroundColor};
      padding: 20px;
      border-radius: 14px;
    }
    .demo-btn {
      background: ${theme.primaryColor};
      color: #ffffff;
      padding: 12px 24px;
      font-size: 13px;
      font-weight: 700;
      border: none;
      border-radius: ${theme.buttonStyle === 'pill' ? '9999px' : theme.borderRadius};
      box-shadow: 0 4px 12px ${theme.primaryColor}40;
    }
    .demo-card {
      background: ${theme.surfaceColor};
      color: ${theme.textColor};
      padding: 14px 20px;
      border-radius: ${theme.borderRadius};
      border: 1px solid rgba(255,255,255,0.1);
      font-size: 12px;
      flex: 1;
    }
    .print-bar {
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #09090b;
      color: #ffffff;
      padding: 12px 20px;
      border-radius: 9999px;
      font-weight: 700;
      font-size: 14px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.3);
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      border: 1px solid #27272a;
    }
    @media print {
      .print-bar { display: none; }
      body { padding: 0; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo-box">
      ${
        theme.logoUrl
          ? `<img src="${theme.logoUrl}" class="logo-img" alt="Logo">`
          : `<div class="logo-badge">${restaurant.name.charAt(0)}</div>`
      }
      <div>
        <span class="badge-label">Manual de Identidad & Brand Kit Oficial</span>
        <h1 style="font-size: 26px; color: #09090b;">${restaurant.name}</h1>
        <p style="font-size: 12px; color: #71717a;">Expedido el ${dateStr} • Generado por iMenu Cloud</p>
      </div>
    </div>
    <div style="text-align: right;">
      <span class="badge-label">Versión de Marca</span>
      <p style="font-size: 14px; font-weight: 800; color: ${theme.primaryColor};">v1.0 — 2026</p>
    </div>
  </div>

  <!-- Sección 1: Paleta Cromática -->
  <div class="section">
    <h2 class="section-title">1. Paleta Cromática Institucional</h2>
    <div class="palette-grid">
      ${swatches
        .map(
          (s) => `
        <div class="color-card">
          <div class="color-chip" style="background-color: ${s.hex};"></div>
          <div class="color-info">
            <strong>${s.name}</strong>
            <code>HEX: ${s.hex}</code>
            <code>RGB: ${s.rgb}</code>
            <code>HSL: ${s.hsl}</code>
            <span style="font-size: 10px; color: #71717a; display: block; margin-top: 2px;">
              Contraste vs Fondo: <strong>${s.contrastOnBg}:1</strong>
            </span>
          </div>
        </div>
      `
        )
        .join('')}
    </div>
  </div>

  <!-- Sección 2: Tipografías -->
  <div class="section">
    <h2 class="section-title">2. Tipografías Google Fonts</h2>
    <div class="typography-specimen">
      <div>
        <span class="badge-label">Tipografía de Titulares & H1</span>
        <h3 style="font-family: '${theme.fontHeading}'; font-size: 20px; margin: 6px 0 10px 0;">
          ${theme.fontHeading}
        </h3>
        <p style="font-family: '${theme.fontHeading}'; font-size: 15px; color: #334155;">
          Aa Bb Cc Dd Ee Ff Gg Hh Ii Jj Kk Ll Mm Nn Ññ Oo Pp Qq Rr Ss Tt Uu Vv Ww Xx Yy Zz 1234567890
        </p>
      </div>
      <div>
        <span class="badge-label">Tipografía de Textos & Descripciones</span>
        <h3 style="font-family: '${theme.fontBody}'; font-size: 20px; margin: 6px 0 10px 0;">
          ${theme.fontBody}
        </h3>
        <p style="font-family: '${theme.fontBody}'; font-size: 14px; color: #475569;">
          Diseñado para legibilidad óptima en cartas digitales QR, menús móviles y tickets térmicos de restaurante.
        </p>
      </div>
    </div>
  </div>

  <!-- Sección 3: Morfología de Componentes -->
  <div class="section">
    <h2 class="section-title">3. Estilo de Botones y Tarjetas</h2>
    <div class="ui-showcase">
      <button class="demo-btn">Botón Principal (${theme.buttonStyle})</button>
      <div class="demo-card">
        <strong style="color: ${theme.primaryColor}; display: block; margin-bottom: 2px;">
          Tarjeta de Producto (Glassmorphism: ${theme.glassmorphismEnabled ? 'Activo' : 'Inactivo'})
        </strong>
        Radio de Bordes: <code>${theme.borderRadius}</code>
      </div>
    </div>
  </div>

  <!-- Botón Flotante para Imprimir / Guardar en PDF -->
  <div class="print-bar" onclick="window.print()">
    <span>🖨️</span>
    <span>Imprimir / Guardar en PDF</span>
  </div>
</body>
</html>`

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    })
  } catch (error) {
    console.error('[GET /api/brand/brand-kit]', error)
    return NextResponse.json({ error: 'Error al generar Brand Kit' }, { status: 500 })
  }
}
