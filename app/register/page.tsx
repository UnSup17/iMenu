'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { registerRestaurant, type RegisterResult } from './actions'

const CURRENCIES = [
  { code: 'COP', label: 'COP — Peso colombiano' },
  { code: 'MXN', label: 'MXN — Peso mexicano' },
  { code: 'CLP', label: 'CLP — Peso chileno' },
  { code: 'USD', label: 'USD — Dólar estadounidense' },
  { code: 'EUR', label: 'EUR — Euro' },
]

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 40)
}

export default function RegisterPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [pending, startTransition] = useTransition()
  const [result, setResult] = useState<RegisterResult | null>(null)

  // Step 1 fields
  const [restaurantName, setRestaurantName] = useState('')
  const [slug, setSlug] = useState('')
  const [currency, setCurrency] = useState('COP')
  const [slugEdited, setSlugEdited] = useState(false)

  // Step 2 fields
  const [adminName, setAdminName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)

  function handleNameChange(val: string) {
    setRestaurantName(val)
    if (!slugEdited) setSlug(slugify(val))
  }

  function handleSlugChange(val: string) {
    setSlug(slugify(val))
    setSlugEdited(true)
  }

  function handleStep1Submit(e: React.FormEvent) {
    e.preventDefault()
    if (!restaurantName.trim() || slug.length < 3) return
    setResult(null)
    setStep(2)
  }

  function handleStep2Submit(e: React.FormEvent) {
    e.preventDefault()
    if (!adminName.trim() || !email.trim() || password.length < 8) return
    setResult(null)
    setStep(3)
  }

  function handleFinalSubmit(e: React.FormEvent) {
    e.preventDefault()
    setResult(null)
    const fd = new FormData()
    fd.append('restaurantName', restaurantName)
    fd.append('slug', slug)
    fd.append('currency', currency)
    fd.append('adminName', adminName)
    fd.append('email', email)
    fd.append('password', password)

    startTransition(async () => {
      const res = await registerRestaurant(fd)
      if (res?.error) setResult(res)
    })
  }

  const steps = [
    { n: 1, label: 'Tu restaurante' },
    { n: 2, label: 'Tu cuenta' },
    { n: 3, label: 'Confirmar' },
  ]

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-8">

        {/* Logo */}
        <div className="text-center">
          <Link href="/" className="text-3xl font-extrabold text-white tracking-tight">
            i<span className="text-amber-500">Menu</span>
          </Link>
          <p className="text-zinc-500 text-sm mt-1">Crea tu cuenta gratis</p>
        </div>

        {/* Stepper */}
        <div className="flex items-center gap-0">
          {steps.map((s, i) => (
            <div key={s.n} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all
                  ${step > s.n ? 'bg-emerald-500 text-white' : step === s.n ? 'bg-amber-500 text-zinc-950' : 'bg-zinc-800 text-zinc-500'}`}>
                  {step > s.n ? '✓' : s.n}
                </div>
                <span className={`text-[10px] mt-1 font-medium transition-colors
                  ${step === s.n ? 'text-amber-400' : step > s.n ? 'text-emerald-400' : 'text-zinc-600'}`}>
                  {s.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div className={`h-px flex-1 mb-4 transition-all ${step > s.n ? 'bg-emerald-500' : 'bg-zinc-800'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 space-y-6">

          {/* ── Step 1: Restaurante ── */}
          {step === 1 && (
            <form onSubmit={handleStep1Submit} className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-white">Tu restaurante</h2>
                <p className="text-zinc-500 text-sm mt-1">¿Cómo se llama y cómo lo identificamos?</p>
              </div>

              <Field label="Nombre del restaurante" id="restaurantName">
                <input
                  id="restaurantName"
                  value={restaurantName}
                  onChange={e => handleNameChange(e.target.value)}
                  placeholder="La Hamburguesería"
                  required
                  minLength={2}
                  className={inputCls}
                />
              </Field>

              <Field label="Identificador único (slug)" id="slug"
                hint={`Tu menú estará en: imenu.app/menu/${slug || 'tu-restaurante'}`}>
                <input
                  id="slug"
                  value={slug}
                  onChange={e => handleSlugChange(e.target.value)}
                  placeholder="la-hamburgueseria"
                  required
                  minLength={3}
                  className={inputCls}
                />
              </Field>

              <Field label="Moneda" id="currency">
                <select
                  id="currency"
                  value={currency}
                  onChange={e => setCurrency(e.target.value)}
                  className={inputCls}
                >
                  {CURRENCIES.map(c => (
                    <option key={c.code} value={c.code}>{c.label}</option>
                  ))}
                </select>
              </Field>

              <button type="submit" className={btnCls}>
                Continuar →
              </button>
            </form>
          )}

          {/* ── Step 2: Cuenta ── */}
          {step === 2 && (
            <form onSubmit={handleStep2Submit} className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-white">Tu cuenta de administrador</h2>
                <p className="text-zinc-500 text-sm mt-1">Serás el admin principal del restaurante.</p>
              </div>

              <Field label="Tu nombre" id="adminName">
                <input
                  id="adminName"
                  value={adminName}
                  onChange={e => setAdminName(e.target.value)}
                  placeholder="Juan García"
                  required
                  minLength={2}
                  className={inputCls}
                />
              </Field>

              <Field label="Email" id="email">
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="juan@mirestaurante.com"
                  required
                  autoComplete="email"
                  className={inputCls}
                />
              </Field>

              <Field label="Contraseña" id="password" hint="Mínimo 8 caracteres">
                <div className="relative">
                  <input
                    id="password"
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••••"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    className={inputCls + ' pr-12'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 text-xs"
                  >
                    {showPass ? 'Ocultar' : 'Ver'}
                  </button>
                </div>
                {password.length > 0 && (
                  <div className="mt-1.5 flex gap-1">
                    {[8, 12, 16].map(len => (
                      <div key={len}
                        className={`h-1 flex-1 rounded-full transition-all ${password.length >= len
                          ? len === 8 ? 'bg-red-500' : len === 12 ? 'bg-amber-500' : 'bg-emerald-500'
                          : 'bg-zinc-800'}`} />
                    ))}
                  </div>
                )}
              </Field>

              <div className="flex gap-3">
                <button type="button" onClick={() => setStep(1)} className={btnSecCls}>
                  ← Atrás
                </button>
                <button type="submit" className={btnCls}>
                  Continuar →
                </button>
              </div>
            </form>
          )}

          {/* ── Step 3: Confirmar ── */}
          {step === 3 && (
            <form onSubmit={handleFinalSubmit} className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-white">Todo listo 🎉</h2>
                <p className="text-zinc-500 text-sm mt-1">Revisa y confirma tu información.</p>
              </div>

              <div className="bg-zinc-950 border border-zinc-800 rounded-xl divide-y divide-zinc-800">
                {[
                  ['Restaurante', restaurantName],
                  ['Identificador', slug],
                  ['Moneda', currency],
                  ['Administrador', adminName],
                  ['Email', email],
                  ['Contraseña', '••••••••'],
                  ['Plan', '✅ BASIC — 14 días gratis'],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-xs text-zinc-500">{k}</span>
                    <span className="text-sm text-zinc-200 font-medium">{v}</span>
                  </div>
                ))}
              </div>

              {result?.error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
                  <p className="text-sm text-red-400">{result.error}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button type="button" onClick={() => setStep(2)} className={btnSecCls} disabled={pending}>
                  ← Atrás
                </button>
                <button type="submit" disabled={pending} className={btnCls}>
                  {pending ? 'Creando cuenta...' : 'Crear mi restaurante →'}
                </button>
              </div>

              <p className="text-center text-xs text-zinc-600">
                Al registrarte aceptas los{' '}
                <span className="text-zinc-400">términos de uso</span> de iMenu.
              </p>
            </form>
          )}
        </div>

        <p className="text-center text-sm text-zinc-500">
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="text-amber-400 hover:text-amber-300 font-medium transition-colors">
            Iniciar sesión →
          </Link>
        </p>
      </div>
    </div>
  )
}

/* ── Shared styles ────────────────────────────────────────────────────── */

const inputCls = `w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3
  text-white placeholder:text-zinc-600 text-sm
  focus:outline-none focus:border-amber-500/60 transition-colors`

const btnCls = `flex-1 py-3 bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-700
  disabled:text-zinc-500 text-zinc-950 font-bold rounded-xl
  transition-all duration-200 active:scale-95 text-sm`

const btnSecCls = `py-3 px-5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300
  font-semibold rounded-xl transition-all duration-200 text-sm`

function Field({
  label,
  id,
  hint,
  children,
}: {
  label: string
  id: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-xs font-semibold text-zinc-400">
        {label}
      </label>
      {children}
      {hint && <p className="text-[11px] text-zinc-600">{hint}</p>}
    </div>
  )
}
