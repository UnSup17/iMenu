'use client'

import React, { useState, useEffect } from 'react'
import {
  BrandThemeData,
  DEFAULT_BRAND_THEME,
  BRAND_PRESETS,
  GOOGLE_HEADING_FONTS,
  GOOGLE_BODY_FONTS,
  FONT_PAIRINGS,
} from '@/lib/branding/types'
import { BrandThemeInjector } from './BrandThemeInjector'

interface BrandStudioClientProps {
  initialTheme: BrandThemeData
  orgTheme?: BrandThemeData | null
  branchTheme?: BrandThemeData | null
  allowBranchOverrides: boolean
  role: string
  organizationName?: string | null
  restaurantName?: string | null
  foodCourtName?: string | null
  targetType: 'ORGANIZATION' | 'RESTAURANT' | 'FOOD_COURT'
  targetId?: string
  initialCustomDomain?: string | null
  initialCustomDomainVerified?: boolean
  initialCustomDomainCname?: string | null
}

// Helper para convertir HEX a HSL y generar armonías
function hexToHsl(hex: string): { h: number; s: number; l: number } {
  let c = hex.replace('#', '')
  if (c.length === 3) c = c.split('').map((x) => x + x).join('')
  const num = parseInt(c, 16)
  const r = (num >> 16) / 255
  const g = ((num >> 8) & 255) / 255
  const b = (num & 255) / 255

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

  return { h, s: Math.round(s * 100), l: Math.round(l * 100) }
}

function hslToHex(h: number, s: number, l: number): string {
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

export function BrandStudioClient({
  initialTheme,
  orgTheme,
  branchTheme,
  allowBranchOverrides,
  role,
  organizationName,
  restaurantName,
  foodCourtName,
  targetType,
  targetId,
  initialCustomDomain,
  initialCustomDomainVerified,
  initialCustomDomainCname,
}: BrandStudioClientProps) {
  const [theme, setTheme] = useState<BrandThemeData>({
    ...DEFAULT_BRAND_THEME,
    ...initialTheme,
  })
  const [useCustomTheme, setUseCustomTheme] = useState<boolean>(
    targetType === 'RESTAURANT' ? (branchTheme?.useCustomTheme ?? false) : true
  )
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Tabs de configuración
  const [activeTab, setActiveTab] = useState<
    'presets' | 'colors' | 'typography' | 'shape' | 'assets' | 'domain'
  >('presets')

  // Estado del Live Preview
  const [previewDevice, setPreviewDevice] = useState<'mobile' | 'tablet'>('mobile')
  const [previewScreen, setPreviewScreen] = useState<'menu' | 'dish_modal' | 'cart'>('menu')
  const [selectedPresetTag, setSelectedPresetTag] = useState<string>('Todos')

  // Estado de Dominio Personalizado
  const [customDomainInput, setCustomDomainInput] = useState<string>(initialCustomDomain || '')
  const [domainVerified, setDomainVerified] = useState<boolean>(initialCustomDomainVerified || false)
  const [domainCname, setDomainCname] = useState<string | null>(initialCustomDomainCname || null)
  const [isCheckingDomain, setIsCheckingDomain] = useState(false)
  const [domainMessage, setDomainMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null)

  const isOrgAdmin = ['SUPERADMIN', 'ORG_ADMIN'].includes(role)
  const isBranchOfOrg = targetType === 'RESTAURANT' && !!orgTheme
  const canDirectlySave = !isBranchOfOrg || allowBranchOverrides || isOrgAdmin

  const handleApplyPreset = (presetTheme: Partial<BrandThemeData>) => {
    setTheme((prev) => ({
      ...prev,
      ...presetTheme,
    }))
    setSaveSuccess('Preset aplicado a la previsualización')
    setTimeout(() => setSaveSuccess(null), 3000)
  }

  // Generador de Armonía de Color HSL inteligente
  const handleGenerateHarmony = () => {
    try {
      const { h, s, l } = hexToHsl(theme.primaryColor)
      // Generar acento análogo (+30 grados en el círculo cromático)
      const accentH = (h + 30) % 360
      const accentColor = hslToHex(accentH, Math.min(s + 10, 95), Math.min(Math.max(l + 10, 45), 75))

      // Generar fondo oscuro premium con matiz sutil del color primario
      const bgH = h
      const backgroundColor = hslToHex(bgH, Math.min(s, 25), 6)
      const surfaceColor = hslToHex(bgH, Math.min(s, 22), 12)

      setTheme((prev) => ({
        ...prev,
        accentColor,
        backgroundColor,
        surfaceColor,
        secondaryColor: surfaceColor,
        textColor: '#ffffff',
        textMutedColor: hslToHex(bgH, 15, 68),
      }))

      setSaveSuccess('¡Armonía cromática generada basada en tu color primario!')
      setTimeout(() => setSaveSuccess(null), 3500)
    } catch (err) {
      console.error('Error generating harmony:', err)
    }
  }

  const handleSave = async (asProposal = false) => {
    setIsSaving(true)
    setSaveSuccess(null)
    setErrorMsg(null)

    try {
      const res = await fetch('/api/brand', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...theme,
          targetType,
          targetId,
          useCustomTheme: targetType === 'RESTAURANT' ? useCustomTheme : true,
          isProposal: asProposal,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Error al guardar tema')
      }

      setSaveSuccess(
        asProposal
          ? 'Propuesta de estilo enviada al Administrador Corporativo para revisión.'
          : '¡Identidad de marca y configuración guardadas exitosamente!'
      )
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al conectar con el servidor')
    } finally {
      setIsSaving(false)
    }
  }

  // Guardar y verificar Dominio
  const handleSaveDomain = async () => {
    setIsCheckingDomain(true)
    setDomainMessage(null)

    try {
      const res = await fetch('/api/brand/domain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: customDomainInput }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Error al registrar dominio')
      }

      setDomainVerified(data.verified)
      setDomainCname(data.cnameTarget)
      if (data.verified) {
        setDomainMessage({
          type: 'success',
          text: '¡Dominio verificado con éxito! Tu menú responderá de inmediato en este enlace.',
        })
      } else {
        setDomainMessage({
          type: 'info',
          text: data.message || 'Dominio guardado. Por favor configura tu registro CNAME en tu proveedor DNS.',
        })
      }
    } catch (err: any) {
      setDomainMessage({ type: 'error', text: err.message || 'Error al verificar dominio' })
    } finally {
      setIsCheckingDomain(false)
    }
  }

  const handleDeleteDomain = async () => {
    if (!confirm('¿Seguro que deseas desvincular el dominio personalizado?')) return
    setIsCheckingDomain(true)
    setDomainMessage(null)

    try {
      const res = await fetch('/api/brand/domain', { method: 'DELETE' })
      if (!res.ok) throw new Error('Error al desvincular')
      setCustomDomainInput('')
      setDomainVerified(false)
      setDomainCname(null)
      setDomainMessage({ type: 'success', text: 'Dominio personalizado eliminado' })
    } catch (err: any) {
      setDomainMessage({ type: 'error', text: err.message })
    } finally {
      setIsCheckingDomain(false)
    }
  }

  // Filtrado de presets
  const presetTags = ['Todos', 'Gourmet / Cavas', 'Smash / Cervecería', 'Italiano / Rústico', 'Japonesa / Nikkei', 'Café & Brunch', 'Cantina / Tacos', 'Saludable / Orgánico', 'Chocolatería']
  const filteredPresets = selectedPresetTag === 'Todos'
    ? BRAND_PRESETS
    : BRAND_PRESETS.filter((p) => p.tag === selectedPresetTag)

  // Obtener radio de borde de botón según buttonStyle
  const getButtonRadius = () => {
    if (theme.buttonStyle === 'pill') return '9999px'
    if (theme.buttonStyle === 'sharp') return '2px'
    return theme.borderRadius || '0.75rem'
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-16">
      {/* Inyector de estilos en la página para que las fuentes y tokens apliquen al mockup */}
      <BrandThemeInjector theme={theme} />

      {/* Header del Studio */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-zinc-900/60 p-6 rounded-3xl border border-zinc-800 shadow-xl backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">✨</span>
            <h1 className="text-2xl font-black tracking-tight text-white">
              Studio de Marca & Experiencia Visual
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">
              v2.5 Live
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
            Diseña la experiencia estética que verán tus clientes al escanear el código QR.
            Personaliza paletas cromáticas, fuentes Google, botones interactivos y configura tu dominio propio con White-Label.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => handleSave(false)}
            disabled={isSaving || !canDirectlySave}
            className="flex-1 sm:flex-none px-6 py-2.5 rounded-2xl bg-amber-500 text-black font-extrabold text-xs tracking-wide hover:bg-amber-400 active:scale-95 disabled:opacity-50 transition-all shadow-lg shadow-amber-500/20 cursor-pointer flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <span className="animate-spin text-sm">⏳</span>
            ) : (
              <span>💾</span>
            )}
            {canDirectlySave ? 'Publicar Cambios' : 'Solo Modo Lectura'}
          </button>
        </div>
      </div>

      {/* Alerts */}
      {saveSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-950/80 border border-emerald-800 text-emerald-200 text-xs font-semibold flex items-center gap-3 animate-in slide-in-from-top-2">
          <span className="text-lg">✅</span>
          <span>{saveSuccess}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-950/80 border border-rose-800 text-rose-200 text-xs font-semibold flex items-center gap-3 animate-in slide-in-from-top-2">
          <span className="text-lg">⚠️</span>
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Studio Grid: Controls on Left, Live Mockup on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Design Controls (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Navigation Tabs */}
          <div className="flex flex-wrap gap-1.5 bg-zinc-900/90 p-1.5 rounded-2xl border border-zinc-800 shadow-inner">
            {[
              { id: 'presets', label: '⚡ Presets' },
              { id: 'colors', label: '🎨 Colores & Armonía' },
              { id: 'typography', label: '🔤 Tipografías' },
              { id: 'shape', label: '📐 Estilos & White-Label' },
              { id: 'assets', label: '🖼️ Logos & Media' },
              { id: 'domain', label: '🌐 Dominio Propio' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all text-center flex items-center gap-1.5 cursor-pointer
                  ${
                    activeTab === tab.id
                      ? 'bg-amber-500 text-black shadow-md'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                  }`}
              >
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* TAB 1: PRESETS GASTRONÓMICOS */}
          {activeTab === 'presets' && (
            <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-black text-white flex items-center gap-2">
                    <span>⚡</span> Plantillas Gastronómicas de Autor
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Aplica combinaciones cromáticas, tipografías y proporciones diseñadas por especialistas en hospitality.
                  </p>
                </div>
              </div>

              {/* Tag filters */}
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {presetTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setSelectedPresetTag(tag)}
                    className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap
                      ${
                        selectedPresetTag === tag
                          ? 'bg-zinc-100 text-zinc-900 shadow'
                          : 'bg-zinc-800/70 text-zinc-400 hover:text-white'
                      }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>

              {/* Grid of presets */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {filteredPresets.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => handleApplyPreset(preset.theme)}
                    className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800 hover:border-amber-500/60 text-left transition-all group flex flex-col justify-between hover:shadow-lg hover:shadow-amber-500/5 cursor-pointer relative overflow-hidden"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-black text-white group-hover:text-amber-400 transition-colors">
                          {preset.name}
                        </span>
                        <div className="flex gap-1 shrink-0">
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-sm"
                            style={{ backgroundColor: preset.theme.primaryColor }}
                            title="Color Primario"
                          />
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-sm"
                            style={{ backgroundColor: preset.theme.backgroundColor }}
                            title="Color Fondo"
                          />
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-sm"
                            style={{ backgroundColor: preset.theme.accentColor }}
                            title="Color Acento"
                          />
                        </div>
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-1.5 line-clamp-2 leading-relaxed">
                        {preset.description}
                      </p>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-zinc-800/80 flex items-center justify-between text-[10px] text-zinc-500 font-mono">
                      <span>{preset.theme.fontHeading}</span>
                      <span className="text-amber-400 font-bold group-hover:translate-x-0.5 transition-transform">
                        Aplicar ➔
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: COLORES & GENERADOR DE ARMONÍA */}
          {activeTab === 'colors' && (
            <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-black text-white flex items-center gap-2">
                    <span>🎨</span> Paleta Cromática & Armonía HSL
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Configura cada color o genera un balance cromático profesional con un solo clic.
                  </p>
                </div>
                <button
                  onClick={handleGenerateHarmony}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
                >
                  <span>⚡</span>
                  <span>Generar Armonía HSL</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Primario */}
                <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-2">
                  <label className="text-xs font-bold text-zinc-200 block">Color Primario (Acciones & Botones)</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={theme.primaryColor}
                      onChange={(e) => setTheme({ ...theme, primaryColor: e.target.value })}
                      className="w-10 h-10 rounded-xl cursor-pointer bg-transparent border-0"
                    />
                    <input
                      type="text"
                      value={theme.primaryColor}
                      onChange={(e) => setTheme({ ...theme, primaryColor: e.target.value })}
                      className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white font-mono uppercase"
                    />
                  </div>
                  <p className="text-[10px] text-zinc-500">Define botones principales, precios destacados e insignias activas.</p>
                </div>

                {/* Acento */}
                <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-2">
                  <label className="text-xs font-bold text-zinc-200 block">Color de Acento (Badges & Promociones)</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={theme.accentColor}
                      onChange={(e) => setTheme({ ...theme, accentColor: e.target.value })}
                      className="w-10 h-10 rounded-xl cursor-pointer bg-transparent border-0"
                    />
                    <input
                      type="text"
                      value={theme.accentColor}
                      onChange={(e) => setTheme({ ...theme, accentColor: e.target.value })}
                      className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white font-mono uppercase"
                    />
                  </div>
                  <p className="text-[10px] text-zinc-500">Badges de recomendación de chef y platos en oferta.</p>
                </div>

                {/* Fondo */}
                <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-2">
                  <label className="text-xs font-bold text-zinc-200 block">Color de Fondo General</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={theme.backgroundColor}
                      onChange={(e) => setTheme({ ...theme, backgroundColor: e.target.value })}
                      className="w-10 h-10 rounded-xl cursor-pointer bg-transparent border-0"
                    />
                    <input
                      type="text"
                      value={theme.backgroundColor}
                      onChange={(e) => setTheme({ ...theme, backgroundColor: e.target.value })}
                      className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white font-mono uppercase"
                    />
                  </div>
                  <p className="text-[10px] text-zinc-500">El lienzo base del menú en el smartphone del cliente.</p>
                </div>

                {/* Superficie */}
                <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-2">
                  <label className="text-xs font-bold text-zinc-200 block">Color de Superficie (Tarjetas de Platos)</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={theme.surfaceColor}
                      onChange={(e) => setTheme({ ...theme, surfaceColor: e.target.value })}
                      className="w-10 h-10 rounded-xl cursor-pointer bg-transparent border-0"
                    />
                    <input
                      type="text"
                      value={theme.surfaceColor}
                      onChange={(e) => setTheme({ ...theme, surfaceColor: e.target.value })}
                      className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white font-mono uppercase"
                    />
                  </div>
                  <p className="text-[10px] text-zinc-500">Tarjetas de platos, modales y barras flotantes.</p>
                </div>

                {/* Texto Principal */}
                <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-2">
                  <label className="text-xs font-bold text-zinc-200 block">Color de Texto Principal</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={theme.textColor}
                      onChange={(e) => setTheme({ ...theme, textColor: e.target.value })}
                      className="w-10 h-10 rounded-xl cursor-pointer bg-transparent border-0"
                    />
                    <input
                      type="text"
                      value={theme.textColor}
                      onChange={(e) => setTheme({ ...theme, textColor: e.target.value })}
                      className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white font-mono uppercase"
                    />
                  </div>
                  <p className="text-[10px] text-zinc-500">Títulos y nombres de productos.</p>
                </div>

                {/* Texto Secundario */}
                <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-2">
                  <label className="text-xs font-bold text-zinc-200 block">Color de Texto Secundario / Descriptivo</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={theme.textMutedColor}
                      onChange={(e) => setTheme({ ...theme, textMutedColor: e.target.value })}
                      className="w-10 h-10 rounded-xl cursor-pointer bg-transparent border-0"
                    />
                    <input
                      type="text"
                      value={theme.textMutedColor}
                      onChange={(e) => setTheme({ ...theme, textMutedColor: e.target.value })}
                      className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white font-mono uppercase"
                    />
                  </div>
                  <p className="text-[10px] text-zinc-500">Ingredientes, descripciones y subtítulos.</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: TIPOGRAFÍAS GOOGLE & PAIRINGS */}
          {activeTab === 'typography' && (
            <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-6 space-y-6">
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <span>🔤</span> Tipografías & Maridajes Tipográficos (Font Pairings)
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Elige combinaciones diseñadas para máxima legibilidad en dispositivos móviles.
                </p>
              </div>

              {/* Pairings Rápidos */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block">
                  Maridajes Tipográficos Sugeridos
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {FONT_PAIRINGS.map((pair) => (
                    <button
                      key={pair.name}
                      onClick={() =>
                        setTheme((prev) => ({
                          ...prev,
                          fontHeading: pair.heading,
                          fontBody: pair.body,
                        }))
                      }
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between
                        ${
                          theme.fontHeading === pair.heading && theme.fontBody === pair.body
                            ? 'bg-amber-500/10 border-amber-500 text-amber-300'
                            : 'bg-zinc-950/70 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                        }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs">{pair.name}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400">
                            {pair.tag}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-500 mt-0.5 font-mono">
                          {pair.heading} + {pair.body}
                        </p>
                      </div>
                      {theme.fontHeading === pair.heading && theme.fontBody === pair.body && (
                        <span className="text-amber-400 text-sm">✓</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Selector individual de fuentes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-2">
                  <label className="text-xs font-bold text-zinc-200 block">Fuente de Encabezados & Títulos</label>
                  <select
                    value={theme.fontHeading}
                    onChange={(e) => setTheme({ ...theme, fontHeading: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white font-semibold cursor-pointer"
                  >
                    {GOOGLE_HEADING_FONTS.map((font) => (
                      <option key={font.name} value={font.name}>
                        {font.name} — {font.sample}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-zinc-500">Se aplica a títulos de categorías, nombre de platos y encabezados.</p>
                </div>

                <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-2">
                  <label className="text-xs font-bold text-zinc-200 block">Fuente del Cuerpo & Párrafos</label>
                  <select
                    value={theme.fontBody}
                    onChange={(e) => setTheme({ ...theme, fontBody: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white font-semibold cursor-pointer"
                  >
                    {GOOGLE_BODY_FONTS.map((font) => (
                      <option key={font.name} value={font.name}>
                        {font.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-zinc-500">Se aplica a descripciones de platos, modificadores y precios.</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: FORMAS, BOTONES & WHITE-LABEL */}
          {activeTab === 'shape' && (
            <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-6 space-y-6">
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <span>📐</span> Estilos de Interfaz, Botones & White-Label
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Ajusta la personalidad visual de los controles táctiles y elimina referencias de plataforma.
                </p>
              </div>

              {/* Estilo de Botón */}
              <div className="space-y-2.5">
                <label className="text-xs font-bold text-zinc-200 block">Estilo de Botones de Acción</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'rounded', label: 'Suave Redondeado', desc: 'Moderno (12px)' },
                    { id: 'pill', label: 'Píldora / Cápsula', desc: 'Orgánico (999px)' },
                    { id: 'sharp', label: 'Recto / Sharp', desc: 'Minimalista (2px)' },
                  ].map((st) => (
                    <button
                      key={st.id}
                      onClick={() => setTheme({ ...theme, buttonStyle: st.id as any })}
                      className={`p-3 rounded-2xl border text-center transition-all cursor-pointer
                        ${
                          (theme.buttonStyle || 'rounded') === st.id
                            ? 'bg-amber-500/10 border-amber-500 text-amber-300 font-black'
                            : 'bg-zinc-950/70 border-zinc-800 text-zinc-400 hover:text-white'
                        }`}
                    >
                      <span className="text-xs block">{st.label}</span>
                      <span className="text-[10px] text-zinc-500 mt-0.5 block">{st.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Radio de Tarjetas */}
              <div className="space-y-2.5">
                <label className="text-xs font-bold text-zinc-200 block">Curvatura de Tarjetas y Modales</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { value: '0.25rem', label: 'Mínimo (4px)' },
                    { value: '0.5rem', label: 'Moderado (8px)' },
                    { value: '1rem', label: 'Estándar (16px)' },
                    { value: '1.5rem', label: 'Muy Redondo (24px)' },
                  ].map((r) => (
                    <button
                      key={r.value}
                      onClick={() => setTheme({ ...theme, borderRadius: r.value })}
                      className={`py-2 px-3 rounded-xl border text-xs text-center transition-all cursor-pointer
                        ${
                          theme.borderRadius === r.value
                            ? 'bg-amber-500 text-black font-bold'
                            : 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                        }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Glassmorphism Toggle */}
              <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white block">Efecto Glassmorphism / Desenfoque Traslúcido</span>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Aplica desenfoque de fondo elegante (backdrop-blur) en la barra de navegación y tarjetas flotantes.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={theme.glassmorphismEnabled ?? true}
                  onChange={(e) => setTheme({ ...theme, glassmorphismEnabled: e.target.checked })}
                  className="w-5 h-5 rounded text-amber-500 cursor-pointer accent-amber-500"
                />
              </div>

              {/* WHITE-LABEL TOGGLE */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-zinc-900 to-zinc-950 border border-amber-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🛡️</span>
                    <div>
                      <span className="text-xs font-black text-amber-300 block">
                        Modo White-Label Corporativo (Marca Blanca)
                      </span>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        Elimina todas las referencias a &quot;iMenu&quot; en el menú móvil del comensal y en las tirillas de pago POS.
                      </p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={theme.whiteLabelEnabled ?? false}
                    onChange={(e) => setTheme({ ...theme, whiteLabelEnabled: e.target.checked })}
                    className="w-5 h-5 rounded text-amber-500 cursor-pointer accent-amber-500"
                  />
                </div>
                <div className="text-[10px] text-amber-400/80 bg-black/30 p-2.5 rounded-xl border border-amber-500/20 font-mono">
                  {theme.whiteLabelEnabled
                    ? '✓ White-label ACTIVO: Tus clientes solo verán tu logo corporativo y el nombre de tu restaurante.'
                    : '✗ White-label inactivo: El menú mostrará la insignia discreta "Experiencia digital por iMenu".'}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: LOGOS & MEDIA */}
          {activeTab === 'assets' && (
            <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-6 space-y-6">
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <span>🖼️</span> Logotipo Corporativo e Imagen de Portada
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Carga los identificadores visuales oficiales de tu marca para enriquecer la experiencia.
                </p>
              </div>

              <div className="space-y-4 text-xs">
                <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-2">
                  <label className="block text-zinc-200 font-bold">URL del Logotipo (PNG / SVG transparente recomendado)</label>
                  <input
                    type="url"
                    placeholder="https://ejemplo.com/logo-restaurante.png"
                    value={theme.logoUrl || ''}
                    onChange={(e) => setTheme({ ...theme, logoUrl: e.target.value || null })}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white text-xs font-mono"
                  />
                  <p className="text-[10px] text-zinc-500">Aparece en la cabecera superior del menú, tickets y previsualizador.</p>
                </div>

                <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-2">
                  <label className="block text-zinc-200 font-bold">URL de Portada / Banner Hero (JPG / WebP)</label>
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/photo-..."
                    value={theme.coverBannerUrl || ''}
                    onChange={(e) => setTheme({ ...theme, coverBannerUrl: e.target.value || null })}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white text-xs font-mono"
                  />
                  <p className="text-[10px] text-zinc-500">Banner fotográfico superior en la parte superior del menú móvil.</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: DOMINIO PERSONALIZADO (CNAME) */}
          {activeTab === 'domain' && (
            <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-6 space-y-6">
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <span>🌐</span> Dominio Personalizado para tu Menú QR
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Conecta tu propio subdominio (ej: <code className="text-amber-400">menu.mirestaurante.com</code>) para que los clientes no vean la URL de iMenu.
                </p>
              </div>

              {domainMessage && (
                <div
                  className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center gap-2.5 ${
                    domainMessage.type === 'success'
                      ? 'bg-emerald-950/80 border border-emerald-800 text-emerald-300'
                      : domainMessage.type === 'error'
                      ? 'bg-rose-950/80 border border-rose-800 text-rose-300'
                      : 'bg-amber-950/80 border border-amber-800 text-amber-300'
                  }`}
                >
                  <span>{domainMessage.type === 'success' ? '✅' : domainMessage.type === 'error' ? '❌' : 'ℹ️'}</span>
                  <span>{domainMessage.text}</span>
                </div>
              )}

              <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 space-y-1">
                    <label className="text-xs font-bold text-zinc-300">Subdominio del Restaurante</label>
                    <input
                      type="text"
                      placeholder="menu.mirestaurante.com"
                      value={customDomainInput}
                      onChange={(e) => setCustomDomainInput(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono"
                    />
                  </div>

                  <div className="flex items-end gap-2">
                    <button
                      onClick={handleSaveDomain}
                      disabled={isCheckingDomain || !customDomainInput}
                      className="px-5 py-2.5 rounded-xl bg-amber-500 text-black font-extrabold text-xs hover:bg-amber-400 active:scale-95 disabled:opacity-50 transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      {isCheckingDomain ? 'Verificando...' : 'Guardar y Verificar'}
                    </button>
                    {customDomainInput && (
                      <button
                        onClick={handleDeleteDomain}
                        disabled={isCheckingDomain}
                        className="px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-400 hover:text-rose-400 text-xs font-bold transition-colors cursor-pointer"
                        title="Desvincular dominio"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>

                {/* Status Badge */}
                <div className="flex items-center gap-2 pt-2 border-t border-zinc-800">
                  <span className="text-xs text-zinc-400">Estado de propagación:</span>
                  {domainVerified ? (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-[11px] flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      Activo & Verificado SSL
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold text-[11px] flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      Pendiente de configuración DNS
                    </span>
                  )}
                </div>
              </div>

              {/* Guía DNS */}
              <div className="p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 space-y-3">
                <h4 className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                  <span>📖</span> Instrucciones de Configuración DNS (Cloudflare, GoDaddy, Namecheap)
                </h4>
                <div className="text-[11px] text-zinc-400 space-y-2">
                  <p>Crea un registro de tipo <strong>CNAME</strong> en el panel de tu proveedor de dominio:</p>
                  <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 font-mono text-[10px] space-y-1">
                    <div><strong>Tipo:</strong> CNAME</div>
                    <div><strong>Nombre / Host:</strong> menu (o subdominio elegido)</div>
                    <div><strong>Destino / Valor:</strong> {domainCname || 'cname.imenu.app'}</div>
                    <div><strong>TTL:</strong> Automático o 300 segundos</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: INTERACTIVE LIVE PREVIEW (5 cols) */}
        <div className="lg:col-span-5">
          <div className="sticky top-6 space-y-3">
            {/* Header del Preview con Controles de Dispositivo & Vistas */}
            <div className="flex flex-col gap-2 bg-zinc-900/80 border border-zinc-800 p-3 rounded-2xl backdrop-blur-md shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  Previsualización en Tiempo Real
                </span>

                {/* Device Switcher */}
                <div className="flex bg-zinc-950 p-0.5 rounded-xl border border-zinc-800 text-[11px]">
                  <button
                    onClick={() => setPreviewDevice('mobile')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      previewDevice === 'mobile'
                        ? 'bg-amber-500 text-black'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    📱 Móvil
                  </button>
                  <button
                    onClick={() => setPreviewDevice('tablet')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      previewDevice === 'tablet'
                        ? 'bg-amber-500 text-black'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    💻 Tablet
                  </button>
                </div>
              </div>

              {/* Screen Views Switcher */}
              <div className="flex gap-1 border-t border-zinc-800 pt-2 text-[11px]">
                {[
                  { id: 'menu', label: '1. Menú' },
                  { id: 'dish_modal', label: '2. Modal Plato' },
                  { id: 'cart', label: '3. Carrito' },
                ].map((sc) => (
                  <button
                    key={sc.id}
                    onClick={() => setPreviewScreen(sc.id as any)}
                    className={`flex-1 py-1 rounded-lg font-bold text-center transition-all cursor-pointer ${
                      previewScreen === sc.id
                        ? 'bg-zinc-800 text-amber-400 border border-amber-500/40 shadow-sm'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {sc.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Device Mockup Canvas */}
            <div
              className={`mx-auto border-[10px] border-zinc-900 rounded-[44px] shadow-2xl overflow-hidden relative transition-all duration-300 flex flex-col ${
                previewDevice === 'mobile' ? 'w-full max-w-[360px]' : 'w-full max-w-[500px]'
              }`}
              style={{
                backgroundColor: theme.backgroundColor,
                color: theme.textColor,
                fontFamily: theme.fontBody || 'Inter',
                minHeight: '620px',
              }}
            >
              {/* Notch / Dynamic Island */}
              <div className="w-24 h-4 bg-zinc-900 rounded-full mx-auto my-2 shrink-0 z-20" />

              {/* SCREEN 1: MENÚ GENERAL */}
              {previewScreen === 'menu' && (
                <div className="flex-1 flex flex-col justify-between overflow-y-auto">
                  <div>
                    {/* Cover Banner Mock */}
                    <div className="h-32 w-full relative overflow-hidden bg-zinc-800 shrink-0">
                      {theme.coverBannerUrl ? (
                        <img
                          src={theme.coverBannerUrl}
                          alt="Portada"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div
                          className="w-full h-full opacity-40 flex items-center justify-center text-xs font-bold"
                          style={{
                            background: `linear-gradient(135deg, ${theme.primaryColor}, ${theme.secondaryColor})`,
                          }}
                        >
                          Foto de Portada
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    </div>

                    {/* Header Profile & Brand */}
                    <div className="px-4 -mt-8 relative z-10 space-y-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-14 h-14 rounded-2xl border-2 flex items-center justify-center overflow-hidden shadow-lg shrink-0"
                          style={{
                            borderColor: theme.primaryColor,
                            backgroundColor: theme.surfaceColor,
                          }}
                        >
                          {theme.logoUrl ? (
                            <img src={theme.logoUrl} alt="Logo" className="w-full h-full object-contain p-1" />
                          ) : (
                            <span className="font-black text-lg" style={{ color: theme.primaryColor }}>
                              {(restaurantName || organizationName || 'IM')[0]}
                            </span>
                          )}
                        </div>
                        <div>
                          <h4
                            className="font-black text-sm tracking-tight"
                            style={{
                              fontFamily: theme.fontHeading || 'Inter',
                              color: theme.textColor,
                            }}
                          >
                            {restaurantName || organizationName || 'Nombre del Restaurante'}
                          </h4>
                          <p className="text-[10px]" style={{ color: theme.textMutedColor }}>
                            Mesa 4 • Menú Digital
                          </p>
                        </div>
                      </div>

                      {/* Category Pills Mock */}
                      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px]">
                        <span
                          className="px-3 py-1 font-bold whitespace-nowrap shadow-sm"
                          style={{
                            backgroundColor: theme.primaryColor,
                            color: '#000000',
                            borderRadius: getButtonRadius(),
                          }}
                        >
                          ⭐ Especialidades
                        </span>
                        <span
                          className="px-3 py-1 font-semibold whitespace-nowrap"
                          style={{
                            backgroundColor: theme.surfaceColor,
                            color: theme.textMutedColor,
                            borderRadius: getButtonRadius(),
                          }}
                        >
                          Entradas
                        </span>
                        <span
                          className="px-3 py-1 font-semibold whitespace-nowrap"
                          style={{
                            backgroundColor: theme.surfaceColor,
                            color: theme.textMutedColor,
                            borderRadius: getButtonRadius(),
                          }}
                        >
                          Bebidas
                        </span>
                      </div>

                      {/* Product Card Mock */}
                      <div
                        className="p-3 border space-y-2.5 transition-all shadow-sm"
                        style={{
                          backgroundColor: theme.surfaceColor,
                          borderColor: `${theme.primaryColor}30`,
                          borderRadius: theme.borderRadius,
                          backdropFilter: theme.glassmorphismEnabled ? 'blur(8px)' : 'none',
                        }}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span
                                className="font-bold text-xs"
                                style={{
                                  fontFamily: theme.fontHeading || 'Inter',
                                  color: theme.textColor,
                                }}
                              >
                                Plato Insignia de Autor
                              </span>
                              <span
                                className="px-1.5 py-0.5 text-[9px] font-black rounded uppercase"
                                style={{
                                  backgroundColor: `${theme.accentColor}25`,
                                  color: theme.accentColor,
                                }}
                              >
                                Recomendado
                              </span>
                            </div>
                            <p className="text-[10px] mt-0.5 line-clamp-2" style={{ color: theme.textMutedColor }}>
                              Preparado con insumos selectos y receta tradicional de la casa.
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <span
                            className="font-black text-xs"
                            style={{ color: theme.primaryColor }}
                          >
                            $ 38.500
                          </span>
                          <button
                            onClick={() => setPreviewScreen('dish_modal')}
                            className="px-3 py-1 text-[11px] font-extrabold shadow transition-transform active:scale-95 cursor-pointer"
                            style={{
                              backgroundColor: theme.primaryColor,
                              color: '#000000',
                              borderRadius: getButtonRadius(),
                            }}
                          >
                            + Agregar
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Footer & Floating Bar */}
                  <div className="px-4 pb-3 pt-4 space-y-3">
                    {/* Floating Cart Button */}
                    <button
                      onClick={() => setPreviewScreen('cart')}
                      className="w-full p-2.5 flex items-center justify-between text-xs font-black shadow-xl cursor-pointer"
                      style={{
                        backgroundColor: theme.primaryColor,
                        color: '#000000',
                        borderRadius: getButtonRadius(),
                      }}
                    >
                      <span>🛒 1 Producto</span>
                      <span>Ver Carrito • $ 38.500 ➔</span>
                    </button>

                    {/* White Label Watermark Mock */}
                    <div className="text-center text-[10px]">
                      {theme.whiteLabelEnabled ? (
                        <span className="opacity-30">Menú digital interactivo</span>
                      ) : (
                        <span className="opacity-50">Experiencia digital por <strong>iMenu</strong></span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* SCREEN 2: MODAL DE PLATO CON MODIFICADORES */}
              {previewScreen === 'dish_modal' && (
                <div className="flex-1 flex flex-col justify-between p-4 animate-in fade-in duration-200">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: `${theme.primaryColor}20` }}>
                      <span className="text-xs font-bold" style={{ color: theme.textMutedColor }}>Detalle del Plato</span>
                      <button
                        onClick={() => setPreviewScreen('menu')}
                        className="text-xs font-bold text-zinc-400 hover:text-white cursor-pointer"
                      >
                        ✕ Cerrar
                      </button>
                    </div>

                    <div
                      className="h-28 rounded-xl overflow-hidden bg-zinc-800 flex items-center justify-center text-xs font-bold"
                      style={{
                        background: `linear-gradient(135deg, ${theme.primaryColor}40, ${theme.surfaceColor})`,
                      }}
                    >
                      Foto del Plato en Alta Resolución
                    </div>

                    <h3
                      className="text-sm font-black"
                      style={{
                        fontFamily: theme.fontHeading || 'Inter',
                        color: theme.textColor,
                      }}
                    >
                      Plato Insignia de Autor
                    </h3>
                    <p className="text-[11px]" style={{ color: theme.textMutedColor }}>
                      Corte selecto preparado a la brasa con guarnición de papas rústicas y vegetales asados.
                    </p>

                    {/* Modificadores Checklist Mock */}
                    <div className="p-3 rounded-xl space-y-2 border" style={{ backgroundColor: theme.surfaceColor, borderColor: `${theme.primaryColor}25` }}>
                      <span className="text-[10px] font-black uppercase tracking-wider block" style={{ color: theme.accentColor }}>
                        Término de Cocción (Elige 1)
                      </span>
                      {['Término Medio (Recomendado)', 'Tres Cuartos', 'Bien Asado'].map((term, i) => (
                        <label key={term} className="flex items-center justify-between text-[11px] cursor-pointer">
                          <span>{term}</span>
                          <input
                            type="radio"
                            name="mock_radio"
                            defaultChecked={i === 0}
                            className="accent-amber-500"
                          />
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 space-y-2">
                    <button
                      onClick={() => setPreviewScreen('cart')}
                      className="w-full py-2.5 px-4 font-black text-xs shadow-xl flex items-center justify-between cursor-pointer"
                      style={{
                        backgroundColor: theme.primaryColor,
                        color: '#000000',
                        borderRadius: getButtonRadius(),
                      }}
                    >
                      <span>Agregar al Pedido</span>
                      <span>$ 38.500</span>
                    </button>
                  </div>
                </div>
              )}

              {/* SCREEN 3: CARRITO & CHECKOUT */}
              {previewScreen === 'cart' && (
                <div className="flex-1 flex flex-col justify-between p-4 animate-in fade-in duration-200">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: `${theme.primaryColor}20` }}>
                      <span className="text-xs font-bold" style={{ color: theme.textMutedColor }}>Carrito Mesa 4</span>
                      <button
                        onClick={() => setPreviewScreen('menu')}
                        className="text-xs font-bold text-zinc-400 hover:text-white cursor-pointer"
                      >
                        ← Volver al Menú
                      </button>
                    </div>

                    {/* Item list */}
                    <div className="p-3 rounded-xl space-y-2 border" style={{ backgroundColor: theme.surfaceColor, borderColor: `${theme.primaryColor}25` }}>
                      <div className="flex justify-between items-start text-xs">
                        <div>
                          <span className="font-bold" style={{ color: theme.textColor }}>1x Plato Insignia</span>
                          <p className="text-[10px]" style={{ color: theme.textMutedColor }}>Término Medio</p>
                        </div>
                        <span className="font-black" style={{ color: theme.primaryColor }}>$ 38.500</span>
                      </div>
                    </div>

                    {/* Breakdown */}
                    <div className="space-y-1 text-[11px] pt-2" style={{ color: theme.textMutedColor }}>
                      <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span>$ 35.000</span>
                      </div>
                      <div className="flex justify-between">
                        <span>IVA (10%):</span>
                        <span>$ 3.500</span>
                      </div>
                      <div className="flex justify-between text-xs font-black pt-1 border-t" style={{ borderColor: `${theme.primaryColor}20`, color: theme.textColor }}>
                        <span>Total a Pagar:</span>
                        <span style={{ color: theme.primaryColor }}>$ 38.500</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 pt-4">
                    <button
                      onClick={() => setPreviewScreen('menu')}
                      className="w-full py-2.5 px-4 font-black text-xs shadow-xl flex items-center justify-center gap-2 cursor-pointer"
                      style={{
                        backgroundColor: theme.primaryColor,
                        color: '#000000',
                        borderRadius: getButtonRadius(),
                      }}
                    >
                      <span>🚀 Confirmar Pedido a Cocina</span>
                    </button>
                    {theme.whiteLabelEnabled ? (
                      <p className="text-[9px] text-center opacity-30">Ticket oficial del establecimiento</p>
                    ) : (
                      <p className="text-[9px] text-center opacity-50">Procesado con tecnología iMenu</p>
                    )}
                  </div>
                </div>
              )}

              {/* Bottom Home Indicator */}
              <div className="w-28 h-1 bg-zinc-800 rounded-full mx-auto my-2 shrink-0 z-20" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
