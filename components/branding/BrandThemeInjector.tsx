import React from 'react'
import type { BrandThemeData } from '@/lib/branding/types'

interface BrandThemeInjectorProps {
  theme: BrandThemeData
}

export function BrandThemeInjector({ theme }: BrandThemeInjectorProps) {
  // Construir URL de Google Fonts para la tipografía de encabezado y cuerpo
  const headingFontParam = encodeURIComponent(theme.fontHeading).replace(/%20/g, '+')
  const bodyFontParam = encodeURIComponent(theme.fontBody).replace(/%20/g, '+')
  
  const fontsUrl = `https://fonts.googleapis.com/css2?family=${headingFontParam}:wght@400;600;700;800;900&family=${bodyFontParam}:wght@400;500;600;700&display=swap`

  const cssVariables = `
    :root {
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
    }

    body {
      background-color: var(--brand-bg) !important;
      color: var(--brand-text) !important;
      font-family: var(--brand-font-body) !important;
    }

    h1, h2, h3, h4, .font-heading {
      font-family: var(--brand-font-heading) !important;
    }

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
        id="brand-theme-styles"
        dangerouslySetInnerHTML={{ __html: cssVariables }}
      />
    </>
  )
}
