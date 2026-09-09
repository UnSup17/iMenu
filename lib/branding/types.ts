export interface BrandThemeData {
  id?: string
  organizationId?: string | null
  restaurantId?: string | null
  foodCourtId?: string | null

  // Colores
  primaryColor: string
  secondaryColor: string
  accentColor: string
  backgroundColor: string
  surfaceColor: string
  textColor: string
  textMutedColor: string

  // Tipografías
  fontHeading: string
  fontBody: string

  // Morfología & Media
  borderRadius: string
  coverBannerUrl?: string | null
  logoUrl?: string | null

  // Gobernanza
  allowBranchOverrides?: boolean
  useCustomTheme?: boolean
  branchProposal?: any
}

export const DEFAULT_BRAND_THEME: BrandThemeData = {
  primaryColor: '#f59e0b',     // Amber 500
  secondaryColor: '#18181b',   // Zinc 900
  accentColor: '#fbbf24',      // Amber 400
  backgroundColor: '#09090b',  // Zinc 950
  surfaceColor: '#18181b',     // Zinc 900
  textColor: '#ffffff',
  textMutedColor: '#a1a1aa',   // Zinc 400
  fontHeading: 'Inter',
  fontBody: 'Inter',
  borderRadius: '1rem',        // 16px (rounded-2xl)
  coverBannerUrl: null,
  logoUrl: null,
  allowBranchOverrides: true,
  useCustomTheme: false,
}

export const GOOGLE_HEADING_FONTS = [
  { name: 'Inter', family: 'Inter', sample: 'Moderno & Limpio' },
  { name: 'Playfair Display', family: 'Playfair+Display', sample: 'Elegancia Hotelera' },
  { name: 'Montserrat', family: 'Montserrat', sample: 'Contemporáneo Dinámico' },
  { name: 'Poppins', family: 'Poppins', sample: 'Amigable & Vanguardista' },
  { name: 'Outfit', family: 'Outfit', sample: 'Minimalista & Fresco' },
  { name: 'Cinzel', family: 'Cinzel', sample: 'Lujo Clásico / Vinos' },
  { name: 'Syne', family: 'Syne', sample: 'Fusión Audaz & Urbano' },
  { name: 'Lora', family: 'Lora', sample: 'Trattoria & Bistró Cálido' },
  { name: 'Cormorant Garamond', family: 'Cormorant+Garamond', sample: 'Alta Cocina / Gourmet' },
  { name: 'Plus Jakarta Sans', family: 'Plus+Jakarta+Sans', sample: 'Tecnológico & Premium' },
]

export const GOOGLE_BODY_FONTS = [
  { name: 'Inter', family: 'Inter' },
  { name: 'Plus Jakarta Sans', family: 'Plus+Jakarta+Sans' },
  { name: 'Roboto', family: 'Roboto' },
  { name: 'Lora', family: 'Lora' },
  { name: 'DM Sans', family: 'DM+Sans' },
  { name: 'Open Sans', family: 'Open+Sans' },
]

export const BRAND_PRESETS: { name: string; description: string; theme: Partial<BrandThemeData> }[] = [
  {
    name: '👑 Hotel & Luxury Gold',
    description: 'Hoteles boutique, alta cocina, parrilla premium y cavas de vino.',
    theme: {
      primaryColor: '#d4af37',
      secondaryColor: '#121212',
      accentColor: '#f3e5ab',
      backgroundColor: '#0a0a0a',
      surfaceColor: '#171717',
      textColor: '#ffffff',
      textMutedColor: '#b0b0b0',
      fontHeading: 'Playfair Display',
      fontBody: 'Plus Jakarta Sans',
      borderRadius: '0.5rem',
    },
  },
  {
    name: '🍔 Modern Craft & Dark',
    description: 'Hamburgueserías gourmet, cervecerías artesanales y gastrobares.',
    theme: {
      primaryColor: '#f59e0b',
      secondaryColor: '#18181b',
      accentColor: '#fbbf24',
      backgroundColor: '#09090b',
      surfaceColor: '#18181b',
      textColor: '#ffffff',
      textMutedColor: '#a1a1aa',
      fontHeading: 'Montserrat',
      fontBody: 'Inter',
      borderRadius: '1rem',
    },
  },
  {
    name: '🍝 Warm Bistro & Trattoria',
    description: 'Restaurantes italianos, casas de pastas, bistrós franceses y asadores de autor.',
    theme: {
      primaryColor: '#e11d48',
      secondaryColor: '#292524',
      accentColor: '#f43f5e',
      backgroundColor: '#1c1917',
      surfaceColor: '#292524',
      textColor: '#fef3c7',
      textMutedColor: '#d6d3d1',
      fontHeading: 'Lora',
      fontBody: 'Plus Jakarta Sans',
      borderRadius: '1.25rem',
    },
  },
  {
    name: '🌿 Clean Light / Café & Bakery',
    description: 'Cafeterías de especialidad, pastelerías artesanales y restaurantes saludables.',
    theme: {
      primaryColor: '#059669',
      secondaryColor: '#f1f5f9',
      accentColor: '#10b981',
      backgroundColor: '#f8fafc',
      surfaceColor: '#ffffff',
      textColor: '#0f172a',
      textMutedColor: '#64748b',
      fontHeading: 'Outfit',
      fontBody: 'Inter',
      borderRadius: '1.5rem',
    },
  },
  {
    name: '🏮 Asian Fusion & Street',
    description: 'Sushi bars, ramen houses, cocina nikkei y street food asiático.',
    theme: {
      primaryColor: '#e11d48',
      secondaryColor: '#111827',
      accentColor: '#f59e0b',
      backgroundColor: '#030712',
      surfaceColor: '#111827',
      textColor: '#f9fafb',
      textMutedColor: '#9ca3af',
      fontHeading: 'Syne',
      fontBody: 'DM Sans',
      borderRadius: '0.75rem',
    },
  },
]
