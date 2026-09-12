'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { loginWithCredentials } from './actions'
import { signIn } from 'next-auth/react'

function LoginForm() {
  const searchParams = useSearchParams()
  const resetSuccess = searchParams.get('reset') === 'success'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [totp, setTotp] = useState('')
  const [step2FA, setStep2FA] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const googleEnabled = process.env.NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED === 'true'

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const formData = new FormData()
    formData.append('email', email)
    formData.append('password', password)
    if (step2FA) {
      formData.append('totp', totp)
    }

    try {
      const res = await loginWithCredentials(formData)
      if (res?.requires2FA) {
        setStep2FA(true)
        setLoading(false)
        return
      }
      if (res?.error) {
        setError(res.error)
        setLoading(false)
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al iniciar sesión'
      if (!message.includes('NEXT_REDIRECT')) {
        setError(message)
        setLoading(false)
      }
    }
  }

  return (
    <div className="w-full max-w-md space-y-6">
      {/* Header */}
      <div className="text-center">
        <Link href="/" className="inline-flex items-center gap-2 mb-4 group">
          <span className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-zinc-950 font-black text-xl shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform">
            iM
          </span>
          <span className="text-2xl font-black tracking-tight text-white">
            iMenu
          </span>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
          {step2FA ? 'Verificación de dos pasos' : 'Bienvenido de nuevo'}
        </h1>
        <p className="text-zinc-400 text-sm mt-1.5">
          {step2FA
            ? 'Ingresa el código de 6 dígitos de tu app de autenticación'
            : 'Ingresa tus credenciales para acceder al panel'}
        </p>
      </div>

      {resetSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2.5">
          <span className="text-base">✓</span>
          <span>Tu contraseña ha sido restablecida con éxito. Ya puedes ingresar.</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2.5">
          <span className="text-base">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      <div className="bg-zinc-900/70 backdrop-blur-xl border border-zinc-800/80 shadow-2xl rounded-2xl p-7 sm:p-8">
        <form onSubmit={handleSubmit} className="space-y-4">
          {!step2FA ? (
            <>
              <div>
                <label
                  htmlFor="email"
                  className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-1.5"
                >
                  Correo electrónico
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@turestaurante.com"
                  className="w-full bg-zinc-950/60 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="password"
                    className="block text-xs font-semibold uppercase tracking-wider text-zinc-300"
                  >
                    Contraseña
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-xs text-amber-400/90 hover:text-amber-300 transition-colors"
                  >
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-zinc-950/60 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all"
                />
              </div>
            </>
          ) : (
            <div>
              <label
                htmlFor="totp"
                className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-1.5"
              >
                Código TOTP (Google Authenticator / Authy)
              </label>
              <input
                id="totp"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                required
                autoFocus
                value={totp}
                onChange={(e) => setTotp(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                className="w-full bg-zinc-950/60 border border-zinc-800 rounded-xl px-4 py-3 text-center tracking-[0.5em] text-2xl font-mono text-amber-400 placeholder:text-zinc-700 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all"
              />
              <button
                type="button"
                onClick={() => {
                  setStep2FA(false)
                  setTotp('')
                }}
                className="mt-2 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                ← Cambiar credenciales
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 text-zinc-950 font-bold rounded-xl transition-all duration-200 shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer text-sm"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                <span>Verificando...</span>
              </>
            ) : step2FA ? (
              'Confirmar código 2FA'
            ) : (
              'Iniciar Sesión'
            )}
          </button>
        </form>

        {googleEnabled && !step2FA && (
          <>
            <div className="relative my-6 text-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-800" />
              </div>
              <span className="relative bg-zinc-900 px-3 text-xs uppercase tracking-wider text-zinc-500">
                o continúa con
              </span>
            </div>

            <button
              type="button"
              onClick={() => signIn('google', { redirectTo: '/dashboard/orders' })}
              className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border border-zinc-700 bg-zinc-950 hover:bg-zinc-800 text-zinc-200 text-sm font-semibold transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Google</span>
            </button>
          </>
        )}

        <div className="mt-6 pt-5 border-t border-zinc-800/80 text-center">
          <p className="text-xs text-zinc-400">
            ¿Aún no tienes cuenta?{' '}
            <Link
              href="/register"
              className="text-amber-400 hover:text-amber-300 font-semibold transition-colors"
            >
              Registra tu restaurante gratis →
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <Suspense fallback={<div className="text-zinc-500 text-sm">Cargando...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  )
}
