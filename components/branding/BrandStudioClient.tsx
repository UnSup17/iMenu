'use client'

import React, { useState, useEffect } from 'react'
import {
  BrandThemeData,
  DEFAULT_BRAND_THEME,
  BRAND_PRESETS,
  GOOGLE_HEADING_FONTS,
  GOOGLE_BODY_FONTS,
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
}: BrandStudioClientProps) {
  const [theme, setTheme] = useState<BrandThemeData>(initialTheme)
  const [useCustomTheme, setUseCustomTheme] = useState<boolean>(
    targetType === 'RESTAURANT' ? (branchTheme?.useCustomTheme ?? false) : true
  )
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'colors' | 'typography' | 'shape' | 'assets'>('colors')

  const isOrgAdmin = ['SUPERADMIN', 'ORG_ADMIN'].includes(role)
  const isBranchOfOrg = targetType === 'RESTAURANT' && !!orgTheme
  const canDirectlySave = !isBranchOfOrg || allowBranchOverrides || isOrgAdmin

  const handleApplyPreset = (presetTheme: Partial<BrandThemeData>) => {
    setTheme((prev) => ({
      ...prev,
      ...presetTheme,
    }))
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
          ? '¡Propuesta de personalización enviada con éxito para revisión!'
          : '¡Identidad de marca guardada y aplicada con éxito!'
      )
      setTimeout(() => setSaveSuccess(null), 5000)
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al guardar')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Dynamic Fonts & Tokens Injector for Live Preview */}
      <BrandThemeInjector theme={theme} />

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-900/60 border border-zinc-800/80 p-6 rounded-3xl backdrop-blur-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎨</span>
            <h1 className="text-2xl font-black text-white tracking-tight">
              Estudio de Identidad de Marca
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">
              White-Label Engine
            </span>
          </div>
          <p className="text-zinc-400 text-xs mt-1">
            {targetType === 'ORGANIZATION' && `Configurando Marca Maestra para la franquicia: ${organizationName || 'Organización'}`}
            {targetType === 'RESTAURANT' && `Personalización para la sede: ${restaurantName || 'Restaurante'}`}
            {targetType === 'FOOD_COURT' && `Identidad visual para la plaza: ${foodCourtName || 'Plaza Gastronómica'}`}
          </p>
        </div>

        {/* Status Alerts / Quick Actions */}
        <div className="flex items-center gap-3">
          {saveSuccess && (
            <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl animate-fade-in">
              {saveSuccess}
            </span>
          )}
          {errorMsg && (
            <span className="text-xs font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-xl">
              {errorMsg}
            </span>
          )}

          {isBranchOfOrg && !allowBranchOverrides && !isOrgAdmin ? (
            <button
              onClick={() => handleSave(true)}
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs transition-all shadow-lg shadow-amber-500/10 disabled:opacity-50"
            >
              {isSaving ? 'Enviando...' : '📩 Enviar Propuesta a Franquicia'}
            </button>
          ) : (
            <button
              onClick={() => handleSave(false)}
              disabled={isSaving}
              className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs transition-all shadow-lg shadow-amber-500/10 disabled:opacity-50"
            >
              {isSaving ? 'Guardando...' : '💾 Guardar y Aplicar Marca'}
            </button>
          )}
        </div>
      </div>

      {/* Alerta de herencia de franquicia para sedes */}
      {isBranchOfOrg && (
        <div className="bg-zinc-900/90 border border-amber-500/20 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3">
            <span className="text-xl">🏢</span>
            <div>
              <p className="font-bold text-white">Esta sede pertenece a la franquicia {organizationName}</p>
              <p className="text-zinc-400">
                {allowBranchOverrides
                  ? 'La franquicia permite que personalices la identidad de esta sede de forma autónoma.'
                  : 'La franquicia controla la identidad maestra. Puedes proponer cambios específicos para revisión.'}
              </p>
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={useCustomTheme}
              onChange={(e) => setUseCustomTheme(e.target.checked)}
              className="w-4 h-4 rounded text-amber-500"
            />
            <span className="font-bold text-zinc-200">Activar personalización local para esta sede</span>
          </label>
        </div>
      )}

      {/* Main Studio Grid: Controls on Left, Live Mockup on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Design Controls (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Quick Presets Carousel */}
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                ⚡ Presets de Marca Instantáneos
              </h3>
              <span className="text-[11px] text-zinc-500">Haz clic para aplicar estilo completo</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 sm:grid-rows-3 gap-2">
              {BRAND_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => handleApplyPreset(preset.theme)}
                  className="p-3 rounded-2xl bg-zinc-950/80 border border-zinc-800 hover:border-amber-500/50 text-left transition-all group flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-white group-hover:text-amber-400 transition-colors">
                      {preset.name}
                    </span>
                    <div className="flex gap-1">
                      <span
                        className="w-3 h-3 rounded-full border border-white/20"
                        style={{ backgroundColor: preset.theme.primaryColor }}
                      />
                      <span
                        className="w-3 h-3 rounded-full border border-white/20"
                        style={{ backgroundColor: preset.theme.backgroundColor }}
                      />
                      <span
                        className="w-3 h-3 rounded-full border border-white/20"
                        style={{ backgroundColor: preset.theme.accentColor }}
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-zinc-400 mt-1 line-clamp-1">{preset.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Navigation Tabs for Granular Tuning */}
          <div className="flex gap-1 bg-zinc-900 p-1.5 rounded-2xl border border-zinc-800">
            {[
              { id: 'colors', label: '🎨 Colores', desc: 'Paleta cromática' },
              { id: 'typography', label: '🔤 Tipografías', desc: 'Google Fonts' },
              { id: 'shape', label: '📐 Estilos & Formas', desc: 'Radios y bordes' },
              { id: 'assets', label: '🖼️ Logos & Portada', desc: 'Identidad gráfica' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all text-center
                  ${
                    activeTab === tab.id
                      ? 'bg-amber-500 text-black shadow-md'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab 1: Colors Tuning */}
          {activeTab === 'colors' && (
            <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-6 space-y-6">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <span>🎨</span> Paleta de Colores de la Marca
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Primary Color */}
                <div className="bg-zinc-950/80 p-3.5 rounded-2xl border border-zinc-800/80 space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="font-bold text-zinc-200">Color Primario (Marca)</label>
                    <span className="font-mono text-[11px] text-zinc-400">{theme.primaryColor}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={theme.primaryColor}
                      onChange={(e) => setTheme({ ...theme, primaryColor: e.target.value })}
                      className="w-10 h-10 rounded-xl cursor-pointer border-0 bg-transparent"
                    />
                    <input
                      type="text"
                      value={theme.primaryColor}
                      onChange={(e) => setTheme({ ...theme, primaryColor: e.target.value })}
                      className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white font-mono text-xs uppercase"
                    />
                  </div>
                  <p className="text-[10px] text-zinc-500">Botones destacados, badges principales y acentos de marca.</p>
                </div>

                {/* Accent Color */}
                <div className="bg-zinc-950/80 p-3.5 rounded-2xl border border-zinc-800/80 space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="font-bold text-zinc-200">Color de Acento (CTA)</label>
                    <span className="font-mono text-[11px] text-zinc-400">{theme.accentColor}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={theme.accentColor}
                      onChange={(e) => setTheme({ ...theme, accentColor: e.target.value })}
                      className="w-10 h-10 rounded-xl cursor-pointer border-0 bg-transparent"
                    />
                    <input
                      type="text"
                      value={theme.accentColor}
                      onChange={(e) => setTheme({ ...theme, accentColor: e.target.value })}
                      className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white font-mono text-xs uppercase"
                    />
                  </div>
                  <p className="text-[10px] text-zinc-500">Promociones, insignias de ofertas especiales y botones secundarios.</p>
                </div>

                {/* Background Color */}
                <div className="bg-zinc-950/80 p-3.5 rounded-2xl border border-zinc-800/80 space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="font-bold text-zinc-200">Color de Fondo Global</label>
                    <span className="font-mono text-[11px] text-zinc-400">{theme.backgroundColor}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={theme.backgroundColor}
                      onChange={(e) => setTheme({ ...theme, backgroundColor: e.target.value })}
                      className="w-10 h-10 rounded-xl cursor-pointer border-0 bg-transparent"
                    />
                    <input
                      type="text"
                      value={theme.backgroundColor}
                      onChange={(e) => setTheme({ ...theme, backgroundColor: e.target.value })}
                      className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white font-mono text-xs uppercase"
                    />
                  </div>
                  <p className="text-[10px] text-zinc-500">Fondo de la web y el menú comensal (soporta dark o light).</p>
                </div>

                {/* Surface Color */}
                <div className="bg-zinc-950/80 p-3.5 rounded-2xl border border-zinc-800/80 space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="font-bold text-zinc-200">Color de Tarjetas & Superficies</label>
                    <span className="font-mono text-[11px] text-zinc-400">{theme.surfaceColor}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={theme.surfaceColor}
                      onChange={(e) => setTheme({ ...theme, surfaceColor: e.target.value })}
                      className="w-10 h-10 rounded-xl cursor-pointer border-0 bg-transparent"
                    />
                    <input
                      type="text"
                      value={theme.surfaceColor}
                      onChange={(e) => setTheme({ ...theme, surfaceColor: e.target.value })}
                      className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white font-mono text-xs uppercase"
                    />
                  </div>
                  <p className="text-[10px] text-zinc-500">Fondo de tarjetas de producto, modales y barras de navegación.</p>
                </div>

                {/* Text Color */}
                <div className="bg-zinc-950/80 p-3.5 rounded-2xl border border-zinc-800/80 space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="font-bold text-zinc-200">Texto Principal</label>
                    <span className="font-mono text-[11px] text-zinc-400">{theme.textColor}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={theme.textColor}
                      onChange={(e) => setTheme({ ...theme, textColor: e.target.value })}
                      className="w-10 h-10 rounded-xl cursor-pointer border-0 bg-transparent"
                    />
                    <input
                      type="text"
                      value={theme.textColor}
                      onChange={(e) => setTheme({ ...theme, textColor: e.target.value })}
                      className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white font-mono text-xs uppercase"
                    />
                  </div>
                  <p className="text-[10px] text-zinc-500">Títulos y precios principales.</p>
                </div>

                {/* Text Muted Color */}
                <div className="bg-zinc-950/80 p-3.5 rounded-2xl border border-zinc-800/80 space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="font-bold text-zinc-200">Texto Secundario (Muted)</label>
                    <span className="font-mono text-[11px] text-zinc-400">{theme.textMutedColor}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={theme.textMutedColor}
                      onChange={(e) => setTheme({ ...theme, textMutedColor: e.target.value })}
                      className="w-10 h-10 rounded-xl cursor-pointer border-0 bg-transparent"
                    />
                    <input
                      type="text"
                      value={theme.textMutedColor}
                      onChange={(e) => setTheme({ ...theme, textMutedColor: e.target.value })}
                      className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white font-mono text-xs uppercase"
                    />
                  </div>
                  <p className="text-[10px] text-zinc-500">Descripciones de platos, notas y subtítulos.</p>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Typography Tuning */}
          {activeTab === 'typography' && (
            <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-6 space-y-6">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <span>🔤</span> Tipografías de Google Fonts
              </h3>

              {/* Headings Font Selection */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-zinc-200">
                  Tipografía para Títulos y Encabezados ({theme.fontHeading})
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {GOOGLE_HEADING_FONTS.map((f) => (
                    <button
                      key={f.name}
                      onClick={() => setTheme({ ...theme, fontHeading: f.name })}
                      className={`p-3 rounded-2xl border text-left transition-all flex items-center justify-between
                        ${
                          theme.fontHeading === f.name
                            ? 'bg-amber-500/10 border-amber-500 text-white shadow-sm'
                            : 'bg-zinc-950/60 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                        }`}
                    >
                      <div>
                        <span className="text-xs font-bold block">{f.name}</span>
                        <span className="text-[10px] text-zinc-500">{f.sample}</span>
                      </div>
                      {theme.fontHeading === f.name && (
                        <span className="text-amber-400 text-sm">✓</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Body Font Selection */}
              <div className="space-y-3 pt-2">
                <label className="block text-xs font-bold text-zinc-200">
                  Tipografía para Textos y Descripciones ({theme.fontBody})
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {GOOGLE_BODY_FONTS.map((f) => (
                    <button
                      key={f.name}
                      onClick={() => setTheme({ ...theme, fontBody: f.name })}
                      className={`p-2.5 rounded-2xl border text-left transition-all flex items-center justify-between
                        ${
                          theme.fontBody === f.name
                            ? 'bg-amber-500/10 border-amber-500 text-white'
                            : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                        }`}
                    >
                      <span className="text-xs font-semibold">{f.name}</span>
                      {theme.fontBody === f.name && <span className="text-amber-400 text-xs">✓</span>}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Shape & Styling Tuning */}
          {activeTab === 'shape' && (
            <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-6 space-y-6">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <span>📐</span> Estilos de Bordes & Geometría
              </h3>

              <div className="space-y-3">
                <label className="block text-xs font-bold text-zinc-200">
                  Curvatura de Tarjetas, Modales y Botones
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  {[
                    { label: 'Cuadrado Minimalista', radius: '0px', visual: 'rounded-none' },
                    { label: 'Sutil Editorial', radius: '0.5rem', visual: 'rounded-lg' },
                    { label: 'Moderno (16px)', radius: '1rem', visual: 'rounded-2xl' },
                    { label: 'Ultra Curvado', radius: '1.5rem', visual: 'rounded-3xl' },
                  ].map((shape) => (
                    <button
                      key={shape.radius}
                      onClick={() => setTheme({ ...theme, borderRadius: shape.radius })}
                      className={`p-4 border transition-all flex flex-col items-center justify-center gap-2
                        ${shape.visual}
                        ${
                          theme.borderRadius === shape.radius
                            ? 'bg-amber-500/10 border-amber-500 text-white'
                            : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                        }`}
                    >
                      <div className={`w-8 h-8 border-2 border-dashed border-amber-400 ${shape.visual}`} />
                      <span className="text-[11px] font-bold">{shape.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Franchise Governance Switch (Only for ORG_ADMIN) */}
              {isOrgAdmin && targetType === 'ORGANIZATION' && (
                <div className="bg-zinc-950/80 p-4 rounded-2xl border border-zinc-800 space-y-2 mt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-white">
                        Permitir que las sucursales propongan o adapten su sede
                      </p>
                      <p className="text-[11px] text-zinc-400">
                        Si está activo, los administradores de sucursal podrán subir fotos locales o proponer ajustes de acento.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={theme.allowBranchOverrides ?? true}
                      onChange={(e) => setTheme({ ...theme, allowBranchOverrides: e.target.checked })}
                      className="w-5 h-5 rounded text-amber-500 cursor-pointer"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab 4: Logos & Banner Assets */}
          {activeTab === 'assets' && (
            <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-6 space-y-6">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <span>🖼️</span> Logotipo Corporativo e Imagen de Portada
              </h3>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block text-zinc-300 font-bold mb-1">URL del Logotipo (PNG / SVG transparente)</label>
                  <input
                    type="url"
                    placeholder="https://ejemplo.com/logo.png"
                    value={theme.logoUrl || ''}
                    onChange={(e) => setTheme({ ...theme, logoUrl: e.target.value || null })}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2.5 text-white"
                  />
                  <p className="text-[10px] text-zinc-500 mt-1">Se muestra en la cabecera del menú comensal y tickets.</p>
                </div>

                <div>
                  <label className="block text-zinc-300 font-bold mb-1">URL de Portada / Banner Hero (JPG / WebP)</label>
                  <input
                    type="url"
                    placeholder="https://ejemplo.com/banner-restaurante.jpg"
                    value={theme.coverBannerUrl || ''}
                    onChange={(e) => setTheme({ ...theme, coverBannerUrl: e.target.value || null })}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2.5 text-white"
                  />
                  <p className="text-[10px] text-zinc-500 mt-1">Banner visual superior del menú digital comensal.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: LIVE PREVIEW (Smartphone Mockup) (5 cols) */}
        <div className="lg:col-span-5">
          <div className="sticky top-6 space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-black text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <span>📱</span> Previsualización en Vivo
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300">
                Menú Comensal
              </span>
            </div>

            {/* Smartphone Frame with Dynamic Tokens */}
            <div
              className="w-full max-w-[360px] mx-auto border-[10px] border-zinc-900 rounded-[44px] shadow-2xl overflow-hidden relative transition-all duration-300"
              style={{
                backgroundColor: theme.backgroundColor,
                color: theme.textColor,
                fontFamily: `var(--brand-font-body)`,
              }}
            >
              {/* Phone Speaker & Camera Notch */}
              <div className="w-24 h-4 bg-zinc-900 rounded-full mx-auto my-2 shrink-0" />

              {/* Cover Banner Mock */}
              <div className="h-32 w-full relative overflow-hidden bg-zinc-800">
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
                    className="w-14 h-14 rounded-2xl border-2 flex items-center justify-center overflow-hidden shadow-lg"
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
                        fontFamily: `var(--brand-font-heading)`,
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
                    className="px-3 py-1 font-bold whitespace-nowrap"
                    style={{
                      backgroundColor: theme.primaryColor,
                      color: '#000000',
                      borderRadius: theme.borderRadius,
                    }}
                  >
                    ⭐ Especialidades
                  </span>
                  <span
                    className="px-3 py-1 font-semibold whitespace-nowrap"
                    style={{
                      backgroundColor: theme.surfaceColor,
                      color: theme.textMutedColor,
                      borderRadius: theme.borderRadius,
                    }}
                  >
                    Entradas
                  </span>
                  <span
                    className="px-3 py-1 font-semibold whitespace-nowrap"
                    style={{
                      backgroundColor: theme.surfaceColor,
                      color: theme.textMutedColor,
                      borderRadius: theme.borderRadius,
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
                  }}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span
                          className="font-bold text-xs"
                          style={{
                            fontFamily: `var(--brand-font-heading)`,
                            color: theme.textColor,
                          }}
                        >
                          Plato Insignia de Autor
                        </span>
                        <span
                          className="px-1.5 py-0.5 text-[9px] font-black rounded-full uppercase"
                          style={{
                            backgroundColor: `${theme.accentColor}25`,
                            color: theme.accentColor,
                          }}
                        >
                          Oferta
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
                      className="px-3 py-1 text-[11px] font-extrabold shadow transition-transform active:scale-95"
                      style={{
                        backgroundColor: theme.primaryColor,
                        color: '#000000',
                        borderRadius: theme.borderRadius,
                      }}
                    >
                      + Agregar
                    </button>
                  </div>
                </div>

                {/* Floating Bottom Cart Preview */}
                <div
                  className="p-2.5 flex items-center justify-between text-xs font-black shadow-xl mb-4"
                  style={{
                    backgroundColor: theme.primaryColor,
                    color: '#000000',
                    borderRadius: theme.borderRadius,
                  }}
                >
                  <span>🛒 1 Producto</span>
                  <span>Ver Carrito • $ 38.500 ↗</span>
                </div>
              </div>

              {/* Bottom Home Indicator */}
              <div className="w-28 h-1 bg-zinc-800 rounded-full mx-auto my-2" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
