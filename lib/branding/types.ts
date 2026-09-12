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

  // White-Label & Estilos Avanzados
  whiteLabelEnabled?: boolean
  glassmorphismEnabled?: boolean
  buttonStyle?: 'rounded' | 'pill' | 'sharp' | string
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
  whiteLabelEnabled: false,
  glassmorphismEnabled: true,
  buttonStyle: 'rounded',
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

export const FONT_PAIRINGS = [
  { name: 'Moderno & Limpio', heading: 'Inter', body: 'Plus Jakarta Sans', tag: 'Versátil' },
  { name: 'Lujo & Alta Cocina', heading: 'Playfair Display', body: 'Plus Jakarta Sans', tag: 'Fine Dining' },
  { name: 'Gastrobar & Smash', heading: 'Montserrat', body: 'Inter', tag: 'Urbano' },
  { name: 'Trattoria & Bistró', heading: 'Lora', body: 'Roboto', tag: 'Cálido' },
  { name: 'Cafetería & Bakery', heading: 'Outfit', body: 'DM Sans', tag: 'Fresco' },
  { name: 'Lounge & Steaks', heading: 'Cinzel', body: 'Lora', tag: 'Exclusivo' },
  { name: 'Asian Fusion & Nikkei', heading: 'Syne', body: 'DM Sans', tag: 'Vanguardista' },
  { name: 'Friendly & Casual', heading: 'Poppins', body: 'Open Sans', tag: 'Dinámico' },
]

export const BRAND_PRESETS: {
  name: string
  tag: string
  description: string
  theme: Partial<BrandThemeData>
}[] = [
  {
    name: '👑 Fine Dining & Golden Luxury',
    tag: 'Gourmet / Cavas',
    description: 'Hoteles boutique, alta cocina, carnes maduradas y cavas de vino.',
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
      buttonStyle: 'rounded',
      glassmorphismEnabled: true,
      coverBannerUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947',
    },
  },
  {
    name: '🍔 Burger Craft & Gastrobar',
    tag: 'Smash / Cervecería',
    description: 'Hamburgueserías gourmet, cervecerías artesanales y gastrobares nocturnos.',
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
      buttonStyle: 'rounded',
      glassmorphismEnabled: true,
      coverBannerUrl: 'https://images.unsplash.com/photo-1550547660-d9450f859349',
    },
  },
  {
    name: '🍕 Trattoria & Pizzeria Napolitana',
    tag: 'Italiano / Rústico',
    description: 'Restaurantes italianos, hornos de leña, pastas frescas y trattorias cálidas.',
    theme: {
      primaryColor: '#e11d48',
      secondaryColor: '#292524',
      accentColor: '#fb7185',
      backgroundColor: '#1c1917',
      surfaceColor: '#292524',
      textColor: '#fef3c7',
      textMutedColor: '#d6d3d1',
      fontHeading: 'Lora',
      fontBody: 'Roboto',
      borderRadius: '1.25rem',
      buttonStyle: 'rounded',
      glassmorphismEnabled: true,
      coverBannerUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591',
    },
  },
  {
    name: '☕ Specialty Café & Bakery',
    tag: 'Brunch / Pastelero',
    description: 'Cafés de origen, pastelería artesanal, brunch y espacios orgánicos luminosos.',
    theme: {
      primaryColor: '#059669',
      secondaryColor: '#f1f5f9',
      accentColor: '#10b981',
      backgroundColor: '#f8fafc',
      surfaceColor: '#ffffff',
      textColor: '#0f172a',
      textMutedColor: '#64748b',
      fontHeading: 'Outfit',
      fontBody: 'DM Sans',
      borderRadius: '1.5rem',
      buttonStyle: 'pill',
      glassmorphismEnabled: false,
      coverBannerUrl: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb',
    },
  },
  {
    name: '🏮 Asian Izakaya & Nikkei',
    tag: 'Sushi / Ramen',
    description: 'Sushi bars, ramen houses, cocina nikkei y street food japonés moderno.',
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
      buttonStyle: 'sharp',
      glassmorphismEnabled: true,
      coverBannerUrl: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c',
    },
  },
  {
    name: '🌮 Taquería & Latin Vibrant',
    tag: 'Mexicano / Fusión',
    description: 'Taquerías contemporáneas, cocina mexicana y sabores latinos con energía.',
    theme: {
      primaryColor: '#ea580c',
      secondaryColor: '#1c1917',
      accentColor: '#fbbf24',
      backgroundColor: '#0c0a09',
      surfaceColor: '#1c1917',
      textColor: '#ffffff',
      textMutedColor: '#a8a29e',
      fontHeading: 'Poppins',
      fontBody: 'Open Sans',
      borderRadius: '1rem',
      buttonStyle: 'rounded',
      glassmorphismEnabled: true,
      coverBannerUrl: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47',
    },
  },
  {
    name: '🍸 Cocktail Lounge & Speakeasy',
    tag: 'Coctelería / Noche',
    description: 'Bares de autor, terrazas lounge, coctelería molecular y música ambiente.',
    theme: {
      primaryColor: '#8b5cf6',
      secondaryColor: '#0f172a',
      accentColor: '#c084fc',
      backgroundColor: '#020617',
      surfaceColor: '#0f172a',
      textColor: '#f8fafc',
      textMutedColor: '#94a3b8',
      fontHeading: 'Cinzel',
      fontBody: 'Lora',
      borderRadius: '0.5rem',
      buttonStyle: 'rounded',
      glassmorphismEnabled: true,
      coverBannerUrl: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b',
    },
  },
  {
    name: '🥗 Green Clean & Healthy Bowls',
    tag: 'Saludable / Vegano',
    description: 'Poke bowls, ensaladas de autor, zumos prensados en frío y comida clean.',
    theme: {
      primaryColor: '#16a34a',
      secondaryColor: '#f0fdf4',
      accentColor: '#22c55e',
      backgroundColor: '#f8fafc',
      surfaceColor: '#ffffff',
      textColor: '#14532d',
      textMutedColor: '#4b5563',
      fontHeading: 'Plus Jakarta Sans',
      fontBody: 'Inter',
      borderRadius: '1.25rem',
      buttonStyle: 'pill',
      glassmorphismEnabled: false,
      coverBannerUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd',
    },
  },
]
