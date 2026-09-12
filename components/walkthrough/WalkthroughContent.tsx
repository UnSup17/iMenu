'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import type { RoleType } from '@/lib/walkthrough-data'
import {
  WALKTHROUGH_DATA,
  ROLE_LABELS,
  MODULE_CATEGORIES,
} from '@/lib/walkthrough-data'
import { FunctionalityCard } from './FunctionalityCard'

interface UserSessionInfo {
  id?: string
  name?: string | null
  email?: string | null
  role: RoleType
  restaurantSlug?: string | null
}

interface WalkthroughContentProps {
  user: UserSessionInfo
}

export function WalkthroughContent({ user }: WalkthroughContentProps) {
  const [selectedRole, setSelectedRole] = useState<RoleType | 'ALL'>(user.role)
  const [selectedModule, setSelectedModule] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [completedIds, setCompletedIds] = useState<string[]>([])

  const canSwitchRole = ['SUPERADMIN', 'ORG_ADMIN', 'RESTAURANT_ADMIN', 'MANAGER'].includes(user.role)

  // Cargar estado de progreso en localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`imenu_walkthrough_completed_${user.id || 'guest'}`)
      if (saved) {
        setCompletedIds(JSON.parse(saved))
      }
    } catch {
      // Ignorar errores de storage
    }
  }, [user.id])

  const toggleComplete = (id: string) => {
    setCompletedIds((prev) => {
      const next = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
      try {
        localStorage.setItem(`imenu_walkthrough_completed_${user.id || 'guest'}`, JSON.stringify(next))
      } catch {
        // Ignorar errores de storage
      }
      return next
    })
  }

  // Filtrado de funcionalidades
  const filteredItems = useMemo(() => {
    return WALKTHROUGH_DATA.filter((item) => {
      // Filtro por Rol
      if (selectedRole !== 'ALL') {
        if (!item.allowedRoles.includes(selectedRole as RoleType)) {
          return false
        }
      }

      // Filtro por Módulo
      if (selectedModule !== 'all') {
        const modMap: Record<string, string> = {
          salon: 'Salón & Mesas',
          comandas: 'Toma de Pedidos',
          cocina: 'Cocina & KDS',
          menu: 'Menú & Catálogo',
          inventario: 'Inventario & Recetas',
          caja: 'Facturación & Caja',
          contabilidad: 'Contabilidad & DIAN',
          equipo: 'Equipo & Seguridad',
          franquicia: 'Franquicia & Sedes',
        }
        if (modMap[selectedModule] && item.module !== modMap[selectedModule]) {
          return false
        }
      }

      // Filtro por búsqueda de texto
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchTitle = item.title.toLowerCase().includes(q)
        const matchSummary = item.summary.toLowerCase().includes(q)
        const matchRoute = item.route.toLowerCase().includes(q)
        const matchTags = item.tags.some((t) => t.toLowerCase().includes(q))
        const matchSteps = item.steps.some(
          (s) => s.title.toLowerCase().includes(q) || s.detail.toLowerCase().includes(q)
        )
        const matchConsiderations =
          item.considerations.warnings.some((w) => w.toLowerCase().includes(q)) ||
          item.considerations.bestPractices.some((b) => b.toLowerCase().includes(q))

        if (!matchTitle && !matchSummary && !matchRoute && !matchTags && !matchSteps && !matchConsiderations) {
          return false
        }
      }

      return true
    })
  }, [selectedRole, selectedModule, searchQuery])

  // Estadísticas del rol activo
  const roleItems = useMemo(() => {
    if (selectedRole === 'ALL') return WALKTHROUGH_DATA
    return WALKTHROUGH_DATA.filter((i) => i.allowedRoles.includes(selectedRole as RoleType))
  }, [selectedRole])

  const totalTimeMinutes = useMemo(() => {
    return filteredItems.reduce((acc, item) => acc + item.estimatedMinutes, 0)
  }, [filteredItems])

  const completedCount = useMemo(() => {
    return roleItems.filter((i) => completedIds.includes(i.id)).length
  }, [roleItems, completedIds])

  const progressPercentage = roleItems.length > 0 ? Math.round((completedCount / roleItems.length) * 100) : 0

  const userRoleMeta = ROLE_LABELS[user.role]

  return (
    <div className="min-h-screen bg-zinc-950 text-white selection:bg-amber-500 selection:text-zinc-950">
      {/* Top sticky navigation bar */}
      <header className="sticky top-0 z-40 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800/80 px-4 sm:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800"
          >
            <span>←</span>
            <span>Dashboard</span>
          </Link>
          <div className="h-4 w-px bg-zinc-800 hidden sm:block" />
          <div className="flex items-center gap-2">
            <span className="text-lg">📖</span>
            <span className="font-extrabold text-sm sm:text-base tracking-tight text-white">
              Manual de Usuario iMenu
            </span>
          </div>
        </div>

        {/* Perfil en sesión */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-white truncate max-w-[200px]">
              {user.name || user.email}
            </p>
            <p className="text-[10px] text-zinc-400 truncate font-mono">
              {user.restaurantSlug || 'iMenu SaaS'}
            </p>
          </div>
          <span
            className={`text-xs px-2.5 py-1 rounded-full font-bold border ${
              userRoleMeta?.badgeColor ?? 'bg-zinc-800 text-zinc-300 border-zinc-700'
            }`}
          >
            {userRoleMeta?.label ?? user.role}
          </span>
          <button
            onClick={() => window.print()}
            title="Imprimir o exportar guía en PDF"
            className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-300 flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <span>🖨️</span>
            <span className="hidden sm:inline">Imprimir Guía</span>
          </button>
        </div>
      </header>

      {/* Main hero section */}
      <section className="px-4 sm:px-8 pt-8 pb-6 border-b border-zinc-800/60 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold mb-3">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              Guía Operativa Personalizada para tu Perfil
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white font-heading">
              Manual de Procedimientos & Operación
            </h1>
            <p className="text-zinc-400 text-sm sm:text-base mt-2 max-w-2xl leading-relaxed">
              Bienvenido, <strong className="text-white">{user.name || user.email}</strong>. Esta guía contiene
              las instrucciones paso a paso, capturas de pantalla interactivas y consideraciones críticas para las
              funcionalidades habilitadas para tu rol de <strong className="text-amber-400">{userRoleMeta?.label}</strong>.
            </p>
          </div>

          {/* Tarjeta de progreso de aprendizaje */}
          <div className="w-full md:w-80 rounded-2xl bg-zinc-900/90 border border-zinc-800 p-4 shadow-xl shrink-0">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-bold text-zinc-300">Tu Progreso de Capacitación</span>
              <span className="font-mono font-extrabold text-amber-400 text-sm">{progressPercentage}%</span>
            </div>
            <div className="w-full bg-zinc-800 rounded-full h-2.5 overflow-hidden mb-3">
              <div
                className="bg-gradient-to-r from-amber-500 to-emerald-400 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <div className="grid grid-cols-2 gap-2 text-center text-xs">
              <div className="p-2 rounded-xl bg-zinc-950/60 border border-zinc-800/80">
                <span className="text-[10px] text-zinc-400">Funciones Dominadas</span>
                <p className="font-bold text-white text-sm mt-0.5">
                  {completedCount} / {roleItems.length}
                </p>
              </div>
              <div className="p-2 rounded-xl bg-zinc-950/60 border border-zinc-800/80">
                <span className="text-[10px] text-zinc-400">Tiempo de Lectura</span>
                <p className="font-bold text-amber-400 text-sm mt-0.5">~{totalTimeMinutes} min</p>
              </div>
            </div>
          </div>
        </div>

        {/* Selector de Rol (para administradores y gerentes que capacitan al equipo) */}
        {canSwitchRole && (
          <div className="mt-6 pt-5 border-t border-zinc-800/80 flex flex-wrap items-center gap-3">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Vista de rol (Modo Capacitación):
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setSelectedRole(user.role)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedRole === user.role
                    ? 'bg-amber-500 text-zinc-950 shadow-md scale-105'
                    : 'bg-zinc-900 text-zinc-300 border border-zinc-800 hover:bg-zinc-800'
                }`}
              >
                ★ Mi Rol ({userRoleMeta?.label})
              </button>
              {(['WAITER', 'KITCHEN', 'ACCOUNTANT', 'MANAGER', 'RESTAURANT_ADMIN'] as RoleType[])
                .filter((r) => r !== user.role)
                .map((r) => (
                  <button
                    key={r}
                    onClick={() => setSelectedRole(r)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      selectedRole === r
                        ? 'bg-amber-500 text-zinc-950 font-bold shadow-md scale-105'
                        : 'bg-zinc-900/80 text-zinc-400 border border-zinc-800 hover:bg-zinc-800 hover:text-white'
                    }`}
                  >
                    Ver como {ROLE_LABELS[r]?.label}
                  </button>
                ))}
              <button
                onClick={() => setSelectedRole('ALL')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  selectedRole === 'ALL'
                    ? 'bg-purple-500 text-white font-bold shadow-md scale-105'
                    : 'bg-zinc-900/80 text-zinc-400 border border-zinc-800 hover:bg-zinc-800 hover:text-white'
                }`}
              >
                Todas las funcionalidades
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Filter and Search Toolbar */}
      <section className="px-4 sm:px-8 py-5 max-w-7xl mx-auto space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Buscador */}
          <div className="relative flex-1 max-w-lg">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">
              🔍
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por funcionalidad, pantalla, paso, o error a evitar..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-white text-sm outline-none transition-all placeholder:text-zinc-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white text-xs cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          <div className="text-xs text-zinc-400 flex items-center justify-between sm:justify-end gap-2">
            <span>
              Mostrando <strong className="text-white">{filteredItems.length}</strong> de{' '}
              <strong className="text-zinc-300">{roleItems.length}</strong> guías
            </span>
            {completedCount > 0 && (
              <button
                onClick={() => {
                  if (confirm('¿Deseas reiniciar tu progreso de capacitación guardado?')) {
                    setCompletedIds([])
                    localStorage.removeItem(`imenu_walkthrough_completed_${user.id || 'guest'}`)
                  }
                }}
                className="text-[11px] text-zinc-500 hover:text-rose-400 underline cursor-pointer ml-2"
              >
                Reiniciar progreso
              </button>
            )}
          </div>
        </div>

        {/* Pestañas de Módulos */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {MODULE_CATEGORIES.map((cat) => {
            const isSelected = selectedModule === cat.id
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedModule(cat.id)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-amber-500 text-zinc-950 shadow-md font-bold'
                    : 'bg-zinc-900/80 text-zinc-400 border border-zinc-800 hover:bg-zinc-800 hover:text-zinc-200'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            )
          })}
        </div>
      </section>

      {/* Cards list */}
      <main className="px-4 sm:px-8 pb-16 max-w-7xl mx-auto">
        {filteredItems.length === 0 ? (
          <div className="py-16 text-center rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8">
            <span className="text-4xl">🔍</span>
            <h3 className="text-lg font-bold text-white mt-3">No se encontraron funcionalidades</h3>
            <p className="text-zinc-400 text-xs sm:text-sm mt-1 max-w-md mx-auto">
              No hay guías que coincidan con los filtros de búsqueda o rol seleccionados. Prueba limpiando el término de búsqueda o seleccionando otro módulo.
            </p>
            <button
              onClick={() => {
                setSearchQuery('')
                setSelectedModule('all')
                setSelectedRole(user.role)
              }}
              className="mt-4 px-4 py-2 rounded-xl bg-amber-500 text-zinc-950 font-bold text-xs cursor-pointer hover:bg-amber-400"
            >
              Restablecer filtros
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {filteredItems.map((item) => (
              <FunctionalityCard
                key={item.id}
                item={item}
                isCompleted={completedIds.includes(item.id)}
                onToggleComplete={toggleComplete}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
