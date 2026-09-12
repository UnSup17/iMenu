'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { FunctionalityItem } from '@/lib/walkthrough-data'
import { ROLE_LABELS } from '@/lib/walkthrough-data'
import { MockupViewer } from './MockupViewer'

interface FunctionalityCardProps {
  item: FunctionalityItem
  isCompleted: boolean
  onToggleComplete: (id: string) => void
}

export function FunctionalityCard({ item, isCompleted, onToggleComplete }: FunctionalityCardProps) {
  const [completedSteps, setCompletedSteps] = useState<number[]>([])
  const [activeTab, setActiveTab] = useState<'visual' | 'steps' | 'considerations'>('visual')

  const toggleStep = (stepNumber: number) => {
    setCompletedSteps((prev) =>
      prev.includes(stepNumber) ? prev.filter((s) => s !== stepNumber) : [...prev, stepNumber]
    )
  }

  const allStepsCompleted = completedSteps.length === item.steps.length

  return (
    <article
      id={item.id}
      className={`rounded-2xl border transition-all duration-300 overflow-hidden shadow-xl ${
        isCompleted
          ? 'bg-zinc-900/40 border-emerald-500/40'
          : 'bg-zinc-900/80 border-zinc-800 hover:border-zinc-700'
      }`}
    >
      {/* Header bar */}
      <div className="p-5 sm:p-6 border-b border-zinc-800/80">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-2xl shrink-0 shadow-inner">
              {item.moduleIcon}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full bg-zinc-800 text-zinc-300 text-xs font-semibold">
                  {item.module}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-zinc-800/60 text-zinc-400 text-xs">
                  ⏱️ {item.estimatedMinutes} min
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    item.difficulty === 'Básico'
                      ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                      : item.difficulty === 'Intermedio'
                      ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                      : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                  }`}
                >
                  {item.difficulty}
                </span>
                {isCompleted && (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500 text-zinc-950 text-xs font-black flex items-center gap-1 shadow-sm">
                    ✓ Dominada
                  </span>
                )}
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                {item.title}
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                <strong className="text-zinc-300">Audiencia recomendada:</strong> {item.targetAudience}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start">
            <Link
              href={item.route}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs transition-all shadow-md active:scale-95"
            >
              <span>Abrir Pantalla</span>
              <span>↗</span>
            </Link>
          </div>
        </div>

        {/* Roles permitidos */}
        <div className="mt-4 flex flex-wrap items-center gap-1.5 pt-3 border-t border-zinc-800/60">
          <span className="text-[11px] font-semibold text-zinc-400 mr-1">Perfiles con acceso:</span>
          {item.allowedRoles.map((role) => {
            const roleInfo = ROLE_LABELS[role]
            return (
              <span
                key={role}
                className={`text-[10px] px-2 py-0.5 rounded-md font-semibold border ${
                  roleInfo?.badgeColor ?? 'bg-zinc-800 text-zinc-300 border-zinc-700'
                }`}
              >
                {roleInfo?.label ?? role}
              </span>
            )
          })}
        </div>

        {/* Resumen ejecutivo */}
        <div className="mt-4 p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800 text-sm text-zinc-300 leading-relaxed">
          <strong className="text-amber-400 font-semibold">Objetivo: </strong>
          {item.summary}
        </div>
      </div>

      {/* Tabs navigation within card */}
      <div className="flex border-b border-zinc-800/80 bg-zinc-950/40 text-xs font-semibold px-4 sm:px-6">
        <button
          onClick={() => setActiveTab('visual')}
          className={`py-3 px-4 border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'visual'
              ? 'border-amber-500 text-amber-400 font-bold'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <span>📸</span>
          <span>Captura Visual & Zonas</span>
        </button>
        <button
          onClick={() => setActiveTab('steps')}
          className={`py-3 px-4 border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'steps'
              ? 'border-amber-500 text-amber-400 font-bold'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <span>🔢</span>
          <span>Paso a Paso ({item.steps.length})</span>
          {completedSteps.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 text-[10px]">
              {completedSteps.length}/{item.steps.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('considerations')}
          className={`py-3 px-4 border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'considerations'
              ? 'border-amber-500 text-amber-400 font-bold'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <span>⚠️</span>
          <span>Consideraciones & Tips</span>
        </button>
      </div>

      {/* Content body based on active tab */}
      <div className="p-5 sm:p-6">
        {activeTab === 'visual' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
              <span>Vista previa interactiva de la interfaz real:</span>
              <span className="text-amber-400 font-mono text-[11px]">Ruta: {item.route}</span>
            </div>
            <MockupViewer
              uiType={item.uiMockup.uiType}
              previewTitle={item.uiMockup.previewTitle}
              previewBadge={item.uiMockup.previewBadge}
              pins={item.uiMockup.pins}
            />
          </div>
        )}

        {activeTab === 'steps' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
              <p>Sigue la secuencia de pasos para completar esta operación con éxito:</p>
              <button
                onClick={() =>
                  setCompletedSteps(
                    completedSteps.length === item.steps.length
                      ? []
                      : item.steps.map((s) => s.stepNumber)
                  )
                }
                className="text-amber-400 hover:underline cursor-pointer font-medium text-[11px]"
              >
                {completedSteps.length === item.steps.length
                  ? 'Desmarcar todos'
                  : 'Marcar todos como realizados'}
              </button>
            </div>

            <div className="space-y-3">
              {item.steps.map((step) => {
                const done = completedSteps.includes(step.stepNumber)
                return (
                  <div
                    key={step.stepNumber}
                    onClick={() => toggleStep(step.stepNumber)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                      done
                        ? 'bg-emerald-950/20 border-emerald-500/40 text-zinc-300'
                        : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-700 text-zinc-200'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                        done
                          ? 'bg-emerald-500 text-zinc-950 font-black'
                          : 'bg-zinc-800 text-amber-400'
                      }`}
                    >
                      {done ? '✓' : step.stepNumber}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4
                        className={`text-sm font-bold ${
                          done ? 'text-emerald-300 line-through' : 'text-white'
                        }`}
                      >
                        {step.title}
                      </h4>
                      <p className="text-xs text-zinc-300 mt-1 leading-relaxed">{step.detail}</p>
                      {step.tip && (
                        <div className="mt-2 text-[11px] text-amber-300/90 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-md flex items-center gap-1.5">
                          <span>💡</span>
                          <span>{step.tip}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {activeTab === 'considerations' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Prerrequisitos */}
            <div className="p-4 rounded-xl bg-zinc-950/70 border border-zinc-800/90 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-sky-400">
                <span>⚡</span>
                <span>Prerrequisitos Operativos</span>
              </div>
              <ul className="space-y-1.5 text-xs text-zinc-300 pl-4 list-disc">
                {item.considerations.prerequisites.map((req, i) => (
                  <li key={i} className="leading-relaxed">
                    {req}
                  </li>
                ))}
              </ul>
            </div>

            {/* Advertencias */}
            <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-500/30 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-rose-400">
                <span>⚠️</span>
                <span>Advertencias & Errores Comunes</span>
              </div>
              <ul className="space-y-1.5 text-xs text-zinc-300 pl-4 list-disc">
                {item.considerations.warnings.map((warn, i) => (
                  <li key={i} className="leading-relaxed">
                    {warn}
                  </li>
                ))}
              </ul>
            </div>

            {/* Buenas Prácticas */}
            <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                <span>💡</span>
                <span>Buenas Prácticas de Expertos</span>
              </div>
              <ul className="space-y-1.5 text-xs text-zinc-300 pl-4 list-disc">
                {item.considerations.bestPractices.map((bp, i) => (
                  <li key={i} className="leading-relaxed">
                    {bp}
                  </li>
                ))}
              </ul>
            </div>

            {/* Impacto Cruzado */}
            <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/30 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-purple-400">
                <span>🔄</span>
                <span>Impacto en Otros Módulos</span>
              </div>
              <ul className="space-y-1.5 text-xs text-zinc-300 pl-4 list-disc">
                {item.considerations.crossModuleImpact.map((imp, i) => (
                  <li key={i} className="leading-relaxed">
                    {imp}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Footer bar */}
      <div className="px-5 py-3.5 bg-zinc-950/80 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onToggleComplete(item.id)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              isCompleted
                ? 'bg-emerald-500 text-zinc-950 shadow-md'
                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
            }`}
          >
            <span>{isCompleted ? '✓ Dominada' : '○ Marcar como dominada'}</span>
          </button>
          {allStepsCompleted && !isCompleted && (
            <span className="text-[11px] text-amber-400 font-medium animate-pulse">
              ¡Completaste todos los pasos! Marca la función como dominada.
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 text-zinc-500 text-[11px]">
          <span>ID: {item.id}</span>
          <span>•</span>
          <Link href={item.route} className="text-amber-400 hover:underline">
            Ir a {item.route}
          </Link>
        </div>
      </div>
    </article>
  )
}
