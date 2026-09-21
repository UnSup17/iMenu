import { BrandThemeInjector } from '@/components/branding/BrandThemeInjector'
import { BrandThemeData, DEFAULT_BRAND_THEME } from '@/lib/branding/types'
import Link from 'next/link'

interface PageProps {
  searchParams: Promise<{
    theme?: string
    name?: string
  }>
}

export default async function BrandPreviewPage({ searchParams }: PageProps) {
  const { theme: rawTheme, name: restaurantName = 'Mi Restaurante' } = await searchParams

  let theme: BrandThemeData = DEFAULT_BRAND_THEME
  if (rawTheme) {
    try {
      const parsed = JSON.parse(decodeURIComponent(rawTheme))
      theme = { ...DEFAULT_BRAND_THEME, ...parsed }
    } catch {
      // Fallback a default
    }
  }

  const sampleCategories = ['Especiales', 'Entradas', 'Platos Fuertes', 'Bebidas', 'Postres']
  const sampleDishes = [
    {
      id: 'p1',
      name: 'Hamburguesa Trufada & Queso Brie',
      desc: 'Carne Angus 200g, cebolla caramelizada al oporto, queso brie fundido y mayonesa de trufa negra.',
      price: 36000,
      badge: 'Recomendado',
      sizes: 'Pequeño / Mediano / Grande',
    },
    {
      id: 'p2',
      name: 'Costillas BBQ Ahumadas en Leña',
      desc: 'Glaseadas con salsa BBQ artesanal de la casa, acompañadas de papas rústicas y ensalada coleslaw.',
      price: 44000,
      badge: 'Popular',
      sizes: 'Media / Entera',
    },
    {
      id: 'p3',
      name: 'Salmón Grillé con Risotto de Espárragos',
      desc: 'Filete de salmón fresco sobre cremoso risotto de parmesano y espárragos verdes.',
      price: 52000,
      badge: 'Chef',
      sizes: null,
    },
  ]

  return (
    <div
      className="min-h-screen pb-24"
      style={{
        backgroundColor: 'var(--brand-bg, #09090b)',
        color: 'var(--brand-text, #ffffff)',
        fontFamily: 'var(--brand-font-body, Inter, sans-serif)',
      }}
    >
      <BrandThemeInjector theme={theme} />

      {/* Banner de Modo Previsualización */}
      <div className="sticky top-0 z-50 bg-amber-500 text-zinc-950 text-xs font-bold py-2 px-4 text-center shadow-md flex items-center justify-between">
        <div className="flex items-center gap-1.5 mx-auto">
          <span>📱</span>
          <span>Modo Previsualización Móvil en Vivo (Borrador no publicado)</span>
        </div>
      </div>

      {/* Header del Restaurante */}
      <header className="p-5 border-b border-white/10">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {theme.logoUrl ? (
              <img
                src={theme.logoUrl}
                alt="Logo"
                className="w-12 h-12 rounded-xl object-cover border border-white/20 shadow-md"
              />
            ) : (
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold border border-white/20 shadow-md"
                style={{
                  backgroundColor: 'var(--brand-primary, #f59e0b)',
                  color: '#ffffff',
                }}
              >
                {restaurantName.charAt(0)}
              </div>
            )}
            <div>
              <h1
                className="text-lg font-black tracking-tight"
                style={{ fontFamily: 'var(--brand-font-heading, Inter, sans-serif)' }}
              >
                {restaurantName}
              </h1>
              <p className="text-xs" style={{ color: 'var(--brand-muted, #a1a1aa)' }}>
                Mesa #1 • Menú Digital QR
              </p>
            </div>
          </div>
          <div
            className="text-xs px-2.5 py-1 rounded-full font-bold border"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--brand-primary) 15%, transparent)',
              color: 'var(--brand-primary)',
              borderColor: 'color-mix(in srgb, var(--brand-primary) 35%, transparent)',
            }}
          >
            Abierto
          </div>
        </div>
      </header>

      {/* Categorías Scrolleables */}
      <div className="max-w-md mx-auto p-4">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          {sampleCategories.map((cat, idx) => (
            <button
              key={cat}
              className="px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all border"
              style={
                idx === 0
                  ? {
                      backgroundColor: 'var(--brand-primary, #f59e0b)',
                      color: '#ffffff',
                      borderColor: 'var(--brand-primary, #f59e0b)',
                    }
                  : {
                      backgroundColor: 'var(--brand-surface, #18181b)',
                      color: 'var(--brand-muted, #a1a1aa)',
                      borderColor: 'rgba(255, 255, 255, 0.08)',
                    }
              }
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Lista de Platos Mock */}
        <div className="mt-6 space-y-4">
          <h2
            className="text-sm font-black uppercase tracking-wider mb-3"
            style={{ fontFamily: 'var(--brand-font-heading)' }}
          >
            Platos Estrella de la Casa
          </h2>

          {sampleDishes.map((dish) => (
            <div
              key={dish.id}
              className="p-4 rounded-2xl border transition-all shadow-sm"
              style={{
                backgroundColor: 'var(--brand-surface, #18181b)',
                borderColor: 'rgba(255, 255, 255, 0.08)',
                borderRadius: 'var(--brand-radius, 1rem)',
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3
                      className="font-bold text-base"
                      style={{ fontFamily: 'var(--brand-font-heading)' }}
                    >
                      {dish.name}
                    </h3>
                  </div>
                  <p
                    className="text-xs mt-1.5 leading-relaxed"
                    style={{ color: 'var(--brand-muted, #a1a1aa)' }}
                  >
                    {dish.desc}
                  </p>
                  {dish.sizes && (
                    <span className="inline-block mt-2 text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded font-medium">
                      📏 {dish.sizes}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/5">
                <span
                  className="font-extrabold text-base"
                  style={{ color: 'var(--brand-primary, #f59e0b)' }}
                >
                  ${dish.price.toLocaleString('es-CO')}
                </span>
                <button
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-transform active:scale-95 shadow-sm"
                  style={{
                    backgroundColor: 'var(--brand-primary, #f59e0b)',
                    borderRadius: theme.buttonStyle === 'pill' ? '9999px' : 'var(--brand-radius, 0.5rem)',
                  }}
                >
                  + Agregar
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Botón flotante inferior de Carrito */}
      <div className="fixed bottom-4 inset-x-4 max-w-md mx-auto z-40">
        <div
          className="p-3.5 rounded-2xl border shadow-2xl flex items-center justify-between"
          style={{
            backgroundColor: 'var(--brand-surface, #18181b)',
            borderColor: 'color-mix(in srgb, var(--brand-primary) 35%, transparent)',
            borderRadius: 'var(--brand-radius, 1rem)',
          }}
        >
          <div className="flex items-center gap-2.5">
            <span className="text-xl">🛒</span>
            <div>
              <p className="text-xs font-bold">2 productos en orden</p>
              <p className="text-[11px]" style={{ color: 'var(--brand-primary)' }}>
                Total: $80.000 COP
              </p>
            </div>
          </div>
          <button
            className="px-4 py-2 rounded-xl text-xs font-bold text-white shadow-md"
            style={{
              backgroundColor: 'var(--brand-primary, #f59e0b)',
              borderRadius: theme.buttonStyle === 'pill' ? '9999px' : '0.75rem',
            }}
          >
            Ver Pedido →
          </button>
        </div>
      </div>
    </div>
  )
}
