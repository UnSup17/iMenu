import React from 'react'
import type { BrandThemeData } from '@/lib/branding/types'

interface BrandThemeInjectorProps {
  theme: BrandThemeData
  id?: string
}

function getContrastTextColor(hexColor: string): string {
  const hex = (hexColor || '#000000').replace('#', '')
  const r = parseInt(hex.substring(0, 2), 16) || 0
  const g = parseInt(hex.substring(2, 4), 16) || 0
  const b = parseInt(hex.substring(4, 6), 16) || 0
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.55 ? '#09090b' : '#ffffff'
}

function isDarkColor(hexColor: string): boolean {
  const hex = (hexColor || '#000000').replace('#', '')
  const r = parseInt(hex.substring(0, 2), 16) || 0
  const g = parseInt(hex.substring(2, 4), 16) || 0
  const b = parseInt(hex.substring(4, 6), 16) || 0
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance < 0.5
}

export function BrandThemeInjector({ theme, id = 'brand-theme-styles' }: BrandThemeInjectorProps) {
  // Construir URL de Google Fonts para la tipografía de encabezado y cuerpo
  const headingFontParam = encodeURIComponent(theme.fontHeading || 'Inter').replace(/%20/g, '+')
  const bodyFontParam = encodeURIComponent(theme.fontBody || 'Inter').replace(/%20/g, '+')
  
  const fontsUrl = `https://fonts.googleapis.com/css2?family=${headingFontParam}:wght@400;600;700;800;900&family=${bodyFontParam}:wght@400;500;600;700&display=swap`

  const darkBg = isDarkColor(theme.backgroundColor)
  const contrastPrimary = getContrastTextColor(theme.primaryColor)
  const contrastAccent = getContrastTextColor(theme.accentColor)

  const cssVariables = `
    :root {
      /* Tokens de Identidad de Marca */
      --brand-primary: ${theme.primaryColor};
      --brand-secondary: ${theme.secondaryColor};
      --brand-accent: ${theme.accentColor};
      --brand-bg: ${theme.backgroundColor};
      --brand-surface: ${theme.surfaceColor};
      --brand-text: ${theme.textColor};
      --brand-muted: ${theme.textMutedColor};
      --brand-radius: ${theme.borderRadius};
      --brand-font-heading: '${theme.fontHeading}', sans-serif;
      --brand-font-body: '${theme.fontBody}', sans-serif;

      /* Mapeo Dinámico para Tailwind CSS v4 en Dashboard & Menú */
      --color-zinc-950: ${theme.backgroundColor};
      --color-zinc-900: ${theme.surfaceColor};
      --color-zinc-850: color-mix(in srgb, ${theme.surfaceColor} ${darkBg ? '88%' : '94%'}, ${theme.textColor} ${darkBg ? '12%' : '6%'});
      --color-zinc-800: color-mix(in srgb, ${theme.surfaceColor} ${darkBg ? '75%' : '88%'}, ${theme.textColor} ${darkBg ? '25%' : '12%'});
      --color-zinc-700: color-mix(in srgb, ${theme.surfaceColor} ${darkBg ? '60%' : '80%'}, ${theme.textColor} ${darkBg ? '40%' : '20%'});
      --color-zinc-600: color-mix(in srgb, ${theme.surfaceColor} ${darkBg ? '45%' : '65%'}, ${theme.textColor} ${darkBg ? '55%' : '35%'});
      --color-zinc-500: ${theme.textMutedColor};
      --color-zinc-400: color-mix(in srgb, ${theme.textMutedColor} ${darkBg ? '75%' : '80%'}, ${theme.textColor} ${darkBg ? '25%' : '20%'});
      --color-zinc-300: color-mix(in srgb, ${theme.textMutedColor} 40%, ${theme.textColor} 60%);
      --color-zinc-200: color-mix(in srgb, ${theme.textMutedColor} 15%, ${theme.textColor} 85%);
      --color-zinc-100: ${theme.textColor};
      ${darkBg ? `--color-white: ${theme.textColor || '#ffffff'};` : `--color-white: ${theme.textColor || '#0f172a'};`}

      --color-amber-500: ${theme.primaryColor};
      --color-amber-600: color-mix(in srgb, ${theme.primaryColor} 85%, black 15%);
      --color-amber-700: color-mix(in srgb, ${theme.primaryColor} 70%, black 30%);
      --color-amber-800: color-mix(in srgb, ${theme.primaryColor} 50%, black 50%);
      --color-amber-900: color-mix(in srgb, ${theme.primaryColor} 30%, black 70%);
      --color-amber-950: color-mix(in srgb, ${theme.primaryColor} 15%, black 85%);
      --color-amber-400: ${theme.accentColor};
      --color-amber-300: color-mix(in srgb, ${theme.accentColor} 80%, white 20%);
      --color-amber-200: color-mix(in srgb, ${theme.accentColor} 55%, white 45%);
      --color-amber-100: color-mix(in srgb, ${theme.accentColor} 30%, white 70%);
      --color-amber-50: color-mix(in srgb, ${theme.accentColor} 12%, white 88%);
    }

    body {
      background-color: var(--brand-bg) !important;
      color: var(--brand-text) !important;
      font-family: var(--brand-font-body) !important;
    }

    h1, h2, h3, h4, .font-heading {
      font-family: var(--brand-font-heading) !important;
    }

    /* Garantizar contraste óptimo en botones principales de la app */
    .bg-amber-500:not([class*="/"]), button.bg-amber-500, a.bg-amber-500 {
      color: ${contrastPrimary} !important;
    }
    .bg-amber-400:not([class*="/"]), button.bg-amber-400, a.bg-amber-400 {
      color: ${contrastAccent} !important;
    }

    ${!darkBg ? `.bg-white { background-color: ${theme.surfaceColor} !important; }` : ''}

    /* Utilidades de conveniencia White-Label */
    .bg-brand-primary { background-color: var(--brand-primary) !important; }
    .bg-brand-secondary { background-color: var(--brand-secondary) !important; }
    .bg-brand-accent { background-color: var(--brand-accent) !important; }
    .bg-brand-surface { background-color: var(--brand-surface) !important; }
    .bg-brand-bg { background-color: var(--brand-bg) !important; }

    .text-brand-primary { color: var(--brand-primary) !important; }
    .text-brand-secondary { color: var(--brand-secondary) !important; }
    .text-brand-accent { color: var(--brand-accent) !important; }
    .text-brand-text { color: var(--brand-text) !important; }
    .text-brand-muted { color: var(--brand-muted) !important; }

    .border-brand-primary { border-color: var(--brand-primary) !important; }
    .border-brand-surface { border-color: var(--brand-surface) !important; }
  `

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link rel="stylesheet" href={fontsUrl} />
      <style
        id={id}
        dangerouslySetInnerHTML={{ __html: cssVariables }}
      />
    </>
  )
}

