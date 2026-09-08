'use client'

import { useState, useEffect } from 'react'
import bcrypt from 'bcryptjs'
import { loginWithCredentials } from './actions'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [demoHash, setDemoHash] = useState<string>('Calculando hash...')

  useEffect(() => {
    bcrypt.hash('admin123', 10).then((hash) => {
      setDemoHash(hash)
    })
  }, [])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const formData = new FormData()
    formData.append('email', email)
    formData.append('password', password)

    try {
      const res = await loginWithCredentials(formData)
      if (res?.error) {
        setError(res.error)
        setLoading(false)
      }
    } catch (err: unknown) {
      console.error('[Login submit exception]:', err)
      const message = err instanceof Error ? err.message : 'Error al iniciar sesión'
      if (!message.includes('NEXT_REDIRECT')) {
        setError(message)
        setLoading(false)
      }
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="text-center">
          <p className="text-4xl mb-3">🍔</p>
          <h1 className="text-2xl font-bold text-white">iMenu</h1>
          <p className="text-zinc-500 text-sm mt-1">Panel de administración</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-zinc-400 mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@demo.com"
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3
                           text-white placeholder:text-zinc-600 text-sm
                           focus:outline-none focus:border-amber-500/60 transition-colors"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-zinc-400 mb-1.5">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3
                           text-white placeholder:text-zinc-600 text-sm
                           focus:outline-none focus:border-amber-500/60 transition-colors"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-2.5">
              <p className="text-xs text-red-400 text-center">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-700
                       disabled:text-zinc-500 text-white font-bold rounded-xl
                       transition-all duration-200 active:scale-95 shadow-lg shadow-amber-500/20"
          >
            {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </button>
        </form>

        <div className="space-y-2">
          <p className="text-center text-xs text-zinc-600">
            Demo: admin@demo.com / admin123
          </p>
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3 text-[11px] text-zinc-400 break-all font-mono">
            <span className="text-amber-400 font-semibold block mb-1">Hash bcrypt de &apos;admin123&apos;:</span>
            {demoHash}
          </div>
        </div>
      </div>
    </div>
  )
}
