'use client'

import { useState } from 'react'
import type { CalloutPin } from '@/lib/walkthrough-data'

interface MockupViewerProps {
  uiType: 'tables' | 'kds' | 'orders' | 'menu' | 'inventory' | 'cashier' | 'dian' | 'team' | 'brand' | 'generic'
  previewTitle: string
  previewBadge: string
  pins: CalloutPin[]
}

export function MockupViewer({ uiType, previewTitle, previewBadge, pins }: MockupViewerProps) {
  const [activePinId, setActivePinId] = useState<number>(pins[0]?.id ?? 1)
  const activePin = pins.find((p) => p.id === activePinId) || pins[0]

  return (
    <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/80 overflow-hidden shadow-2xl">
      {/* Top window chrome */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-zinc-900/90 border-b border-zinc-800/80 text-xs">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
          </div>
          <span className="text-zinc-400 font-mono text-[11px] ml-2 font-medium truncate">
            {previewTitle}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-[10px] font-semibold border border-amber-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            {previewBadge}
          </span>
        </div>
      </div>

      {/* Screen representation */}
      <div className="p-4 sm:p-6 bg-zinc-900/30">
        {uiType === 'tables' && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 sm:p-5 relative min-h-[220px]">
            {/* Header in mockup */}
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3 mb-4 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-sm">🪑 Mesas del Restaurante</span>
                <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 text-[10px]">8 Activas</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="px-2 py-1 rounded bg-amber-500/20 text-amber-400 font-semibold text-[11px]">Plano SVG</span>
                <span className="px-2 py-1 rounded bg-zinc-800/60 text-zinc-400 text-[11px]">Cuadrícula</span>
              </div>
            </div>

            {/* Tables Floor layout simulation */}
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              <div className="relative p-3 rounded-xl border border-amber-500/50 bg-amber-500/10 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] uppercase font-bold text-amber-400">Mesa 01</span>
                <span className="text-xs font-extrabold text-white mt-0.5">4 comensales</span>
                <span className="text-[10px] text-amber-300/80 font-mono mt-1">$142.000</span>
                <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-amber-400 animate-ping" />
              </div>

              <div className="p-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] uppercase font-bold text-emerald-400">Mesa 02</span>
                <span className="text-xs font-bold text-white mt-0.5">Disponible</span>
                <span className="text-[10px] text-zinc-400 mt-1">2 puestos</span>
              </div>

              <div className="p-3 rounded-xl border border-blue-500/40 bg-blue-500/10 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] uppercase font-bold text-blue-400">Mesa 03</span>
                <span className="text-xs font-bold text-white mt-0.5">Tradicional</span>
                <span className="text-[10px] text-blue-300/80 font-mono mt-1">$68.500</span>
              </div>

              <div className="p-3 rounded-xl border border-zinc-800 bg-zinc-900/60 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] uppercase font-bold text-zinc-400">Mesa 04</span>
                <span className="text-xs font-bold text-zinc-300 mt-0.5">Disponible</span>
                <span className="text-[10px] text-zinc-500 mt-1">6 puestos</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-400">
              <span>🟢 5 Libres &nbsp; 🟡 3 Ocupadas &nbsp; 🔔 1 Llamado</span>
              <span className="text-amber-400 font-medium">⚡ Actualizado en vivo</span>
            </div>
          </div>
        )}

        {uiType === 'kds' && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 sm:p-5 relative min-h-[220px]">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3 mb-4 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-sm">🍳 KDS Cocina Central</span>
                <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[10px] font-bold">4 Pendientes</span>
              </div>
              <div className="flex items-center gap-2 text-zinc-400 text-xs">
                <span>⏱️ Carga: <strong className="text-white">12 min</strong></span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Ticket 1 */}
              <div className="p-3 rounded-xl border border-amber-500/40 bg-zinc-900/90 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs pb-1 border-b border-zinc-800">
                    <strong className="text-amber-400">Mesa #02</strong>
                    <span className="text-[10px] font-mono text-amber-300 font-bold">04:18 ⏱️</span>
                  </div>
                  <div className="mt-2 space-y-1 text-xs text-zinc-300">
                    <div>1x 🍔 Hamburguesa Doble</div>
                    <div className="text-[10px] text-amber-400/90 pl-3">↳ Término medio, sin cebolla</div>
                    <div>1x 🍟 Papas Rústicas</div>
                  </div>
                </div>
                <button className="mt-3 w-full py-1 rounded bg-amber-500 text-zinc-950 text-xs font-bold">
                  En Preparación ➔
                </button>
              </div>

              {/* Ticket 2 */}
              <div className="p-3 rounded-xl border border-blue-500/40 bg-zinc-900/90 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs pb-1 border-b border-zinc-800">
                    <strong className="text-blue-400">Mesa #05</strong>
                    <span className="text-[10px] font-mono text-blue-300 font-bold">08:42 ⏱️</span>
                  </div>
                  <div className="mt-2 space-y-1 text-xs text-zinc-300">
                    <div>2x 🥩 Lomo al Trapo</div>
                    <div className="text-[10px] text-rose-400/90 pl-3">⚠️ Alergia a mariscos</div>
                    <div>2x 🍷 Copa Malbec</div>
                  </div>
                </div>
                <button className="mt-3 w-full py-1 rounded bg-emerald-500 text-zinc-950 text-xs font-bold">
                  ✓ Marcar Listo
                </button>
              </div>

              {/* Ticket 3 */}
              <div className="p-3 rounded-xl border border-emerald-500/40 bg-zinc-900/90 flex flex-col justify-between opacity-80">
                <div>
                  <div className="flex items-center justify-between text-xs pb-1 border-b border-zinc-800">
                    <strong className="text-emerald-400">Mesa #01</strong>
                    <span className="text-[10px] font-mono text-emerald-300 font-bold">LISTO</span>
                  </div>
                  <div className="mt-2 space-y-1 text-xs text-zinc-400 line-through">
                    <div>1x 🥗 Ensalada César</div>
                    <div>1x 🍋 Limonada de Coco</div>
                  </div>
                </div>
                <span className="mt-3 w-full py-1 text-center rounded bg-emerald-500/20 text-emerald-400 text-xs font-semibold">
                  Despachado al Mesero
                </span>
              </div>
            </div>
          </div>
        )}

        {uiType === 'orders' && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 sm:p-5 relative min-h-[220px]">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-zinc-400 pb-1">
                  <span>Catálogo de Salón</span>
                  <span className="text-amber-400">Mesa 04 Seleccionada</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-lg border border-zinc-800 bg-zinc-900 flex justify-between items-center cursor-pointer hover:border-amber-500/50">
                    <div>
                      <p className="font-bold text-white">Costillas BBQ</p>
                      <p className="text-amber-400 text-[11px] font-mono">$45.000</p>
                    </div>
                    <span className="text-zinc-400 text-base font-bold">+</span>
                  </div>
                  <div className="p-2.5 rounded-lg border border-zinc-800 bg-zinc-900 flex justify-between items-center cursor-pointer hover:border-amber-500/50">
                    <div>
                      <p className="font-bold text-white">Pizza Artesanal</p>
                      <p className="text-amber-400 text-[11px] font-mono">$38.000</p>
                    </div>
                    <span className="text-zinc-400 text-base font-bold">+</span>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-3 flex flex-col justify-between text-xs">
                <div>
                  <p className="font-bold text-white border-b border-zinc-800 pb-1">Comanda en Curso</p>
                  <div className="mt-2 space-y-1 text-zinc-300 text-[11px]">
                    <div className="flex justify-between">
                      <span>1x Costillas BBQ</span>
                      <span className="font-mono">$45.000</span>
                    </div>
                    <div className="text-[10px] text-zinc-500 pl-2">↳ Salsa extra aparte</div>
                    <div className="flex justify-between">
                      <span>2x Cerveza Corona</span>
                      <span className="font-mono">$24.000</span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 pt-2 border-t border-zinc-800">
                  <div className="flex justify-between font-bold text-white mb-2">
                    <span>Total:</span>
                    <span className="text-amber-400 font-mono">$69.000</span>
                  </div>
                  <button className="w-full py-1.5 rounded-lg bg-amber-500 text-zinc-950 font-bold text-xs">
                    Enviar a Cocina 🚀
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {uiType === 'menu' && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 sm:p-5 relative min-h-[220px]">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3 mb-3 text-xs">
              <span className="font-bold text-white text-sm">🍽️ Categorías & Platos</span>
              <button className="px-3 py-1 rounded-lg bg-amber-500 text-zinc-950 font-bold text-xs">
                + Nuevo Plato
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl border border-zinc-800 bg-zinc-900/80 flex gap-3 items-center">
                <div className="w-14 h-14 rounded-lg bg-zinc-800 flex items-center justify-center text-2xl shrink-0">
                  🥩
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-white truncate">Bife de Chorizo 350g</p>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">Activo</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 truncate">Corte Angus madurado 21 días</p>
                  <p className="text-amber-400 font-mono font-bold mt-1">$58.000 COP</p>
                </div>
              </div>

              <div className="p-3 rounded-xl border border-zinc-800 bg-zinc-900/80 flex gap-3 items-center">
                <div className="w-14 h-14 rounded-lg bg-zinc-800 flex items-center justify-center text-2xl shrink-0">
                  🍹
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-white truncate">Mojito de Maracuyá</p>
                    <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[10px] font-bold">Destacado</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 truncate">Ron añejo, hierbabuena fresca y pulpa</p>
                  <p className="text-amber-400 font-mono font-bold mt-1">$28.000 COP</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {uiType === 'inventory' && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 sm:p-5 relative min-h-[220px]">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3 mb-3 text-xs">
              <span className="font-bold text-white text-sm">📦 Control de Bodega & Insumos</span>
              <span className="text-xs text-rose-400 font-medium">1 Insumo en nivel crítico</span>
            </div>
            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded-lg border border-zinc-800 bg-zinc-900 flex items-center justify-between">
                <div>
                  <p className="font-bold text-white">Carne Angus Premium</p>
                  <p className="text-zinc-500 text-[11px]">Unidad: Kilogramos (kg)</p>
                </div>
                <div className="text-right">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold text-[11px]">28.5 kg</span>
                  <p className="text-[10px] text-zinc-400 mt-0.5">Mínimo: 10 kg</p>
                </div>
              </div>

              <div className="p-2.5 rounded-lg border border-rose-500/40 bg-rose-500/5 flex items-center justify-between">
                <div>
                  <p className="font-bold text-white">Queso Cheddar Madurado</p>
                  <p className="text-zinc-500 text-[11px]">Unidad: Kilogramos (kg)</p>
                </div>
                <div className="text-right">
                  <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 font-bold text-[11px]">1.8 kg ⚠️</span>
                  <p className="text-[10px] text-rose-300/80 mt-0.5">Punto de reorden: 5 kg</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {uiType === 'cashier' && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 sm:p-5 relative min-h-[220px]">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3 mb-3 text-xs">
              <span className="font-bold text-white text-sm">💰 Cobro & Pre-cuenta Mesa 03</span>
              <span className="font-mono text-zinc-400 text-xs">Ticket #FAC-2026-089</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 space-y-1.5">
                <div className="flex justify-between text-zinc-400">
                  <span>Subtotal Neto:</span>
                  <span className="font-mono text-white">$100.000</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Impoconsumo (8%):</span>
                  <span className="font-mono text-white">$8.000</span>
                </div>
                <div className="flex justify-between text-amber-400 font-medium">
                  <span>Propina Voluntaria (10%):</span>
                  <span className="font-mono">$10.000</span>
                </div>
                <div className="pt-2 border-t border-zinc-800 flex justify-between font-extrabold text-sm text-white">
                  <span>TOTAL A PAGAR:</span>
                  <span className="font-mono text-amber-400">$118.000 COP</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <button className="py-2 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-xs">
                    💵 Efectivo
                  </button>
                  <button className="py-2 rounded-lg bg-blue-500/20 border border-blue-500/40 text-blue-300 font-bold text-xs">
                    💳 Datáfono
                  </button>
                </div>
                <button className="w-full py-2.5 rounded-lg bg-amber-500 text-zinc-950 font-black text-xs shadow-lg">
                  Emitir Factura & Liberar Mesa ✓
                </button>
              </div>
            </div>
          </div>
        )}

        {uiType === 'dian' && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 sm:p-5 relative min-h-[220px]">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3 mb-3 text-xs">
              <span className="font-bold text-white text-sm">🏛️ Facturación Electrónica DIAN</span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">Producción Oficial</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs mb-3">
              <div className="p-2 rounded bg-zinc-900 border border-zinc-800">
                <span className="text-[10px] text-zinc-500">Prefijo</span>
                <p className="font-mono font-bold text-white">FE</p>
              </div>
              <div className="p-2 rounded bg-zinc-900 border border-zinc-800">
                <span className="text-[10px] text-zinc-500">Resolución</span>
                <p className="font-mono font-bold text-white">1876402891</p>
              </div>
              <div className="p-2 rounded bg-zinc-900 border border-zinc-800">
                <span className="text-[10px] text-zinc-500">Rango</span>
                <p className="font-mono font-bold text-white">1 - 50.000</p>
              </div>
              <div className="p-2 rounded bg-zinc-900 border border-zinc-800">
                <span className="text-[10px] text-zinc-500">Vigencia</span>
                <p className="font-mono font-bold text-emerald-400">Activa (18m)</p>
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-zinc-900/80 border border-zinc-800 flex items-center justify-between text-xs">
              <span className="font-mono text-[11px] text-zinc-400 truncate">CUFE: fe382a9...d471b80</span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold text-[10px]">Validación Exitosa DIAN ✓</span>
            </div>
          </div>
        )}

        {uiType === 'team' && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 sm:p-5 relative min-h-[220px]">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3 mb-3 text-xs">
              <span className="font-bold text-white text-sm">👥 Colaboradores & Permisos</span>
              <button className="px-3 py-1 rounded bg-amber-500 text-zinc-950 font-bold text-xs">
                + Invitar Empleado
              </button>
            </div>
            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-between">
                <div>
                  <p className="font-bold text-white">Carlos Mesero</p>
                  <p className="text-zinc-500 text-[11px]">mesero@demo.com</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold text-[10px]">WAITER</span>
                  <span className="text-zinc-400 text-xs">Activo</span>
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-between">
                <div>
                  <p className="font-bold text-white">Chef Cocina</p>
                  <p className="text-zinc-500 text-[11px]">cocina@demo.com</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold text-[10px]">KITCHEN</span>
                  <span className="text-zinc-400 text-xs">Activo</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {uiType === 'brand' && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 sm:p-5 relative min-h-[220px]">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3 mb-3 text-xs">
              <span className="font-bold text-white text-sm">🎨 Brand Studio — Identidad Visual</span>
              <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold text-[10px]">White-Label</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2">
                <p className="font-bold text-white">Colores Corporativos</p>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-amber-500 border border-white/20" />
                  <span className="font-mono text-zinc-300 text-xs">#F59E0B (Primario)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-zinc-950 border border-white/20" />
                  <span className="font-mono text-zinc-300 text-xs">#09090B (Fondo Oscuro)</span>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 flex flex-col items-center justify-center text-center">
                <span className="text-3xl mb-1">🍽️</span>
                <p className="font-bold text-white text-xs">El Rincón Gourmet</p>
                <span className="text-[10px] text-zinc-500">Logo SVG transparente activo</span>
              </div>
            </div>
          </div>
        )}

        {uiType === 'generic' && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 sm:p-5 relative min-h-[220px] flex flex-col items-center justify-center text-center">
            <span className="text-3xl mb-2">🏢</span>
            <p className="font-bold text-white text-sm">Hub Franquicia & Múltiples Sucursales</p>
            <p className="text-xs text-zinc-400 mt-1 max-w-md">
              Panel unificado para comparar ventas, rotación de platos y métricas entre todas las sedes del grupo gastronómico.
            </p>
          </div>
        )}
      </div>

      {/* Interactive Callout Pins Section */}
      <div className="border-t border-zinc-800/80 bg-zinc-900/60 p-3 sm:p-4">
        <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2">
          Puntos Clave de la Pantalla (Haz clic en cada número para explorar):
        </p>
        <div className="flex flex-wrap gap-2 mb-3">
          {pins.map((pin) => {
            const isSelected = pin.id === activePinId
            return (
              <button
                key={pin.id}
                onClick={() => setActivePinId(pin.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-amber-500 text-zinc-950 shadow-md scale-105'
                    : 'bg-zinc-800/80 text-zinc-300 hover:bg-zinc-700/80'
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-black ${
                    isSelected ? 'bg-zinc-950 text-amber-400' : 'bg-zinc-700 text-zinc-300'
                  }`}
                >
                  {pin.id}
                </span>
                <span>{pin.label}</span>
              </button>
            )
          })}
        </div>

        {activePin && (
          <div className="p-3 rounded-xl bg-zinc-950/70 border border-amber-500/30 text-xs flex items-start gap-3 animate-fadeIn">
            <span className="w-5 h-5 rounded-full bg-amber-500 text-zinc-950 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
              {activePin.id}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white">{activePin.label}</span>
                <span className="text-[10px] text-amber-400 font-mono">[{activePin.zone}]</span>
              </div>
              <p className="text-zinc-300 mt-1 leading-relaxed">{activePin.description}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
