'use client'

import { useState, useTransition, use } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { resetPassword } from './actions'

export default function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const resolvedParams = use(searchParams)
  const token = resolvedParams.token || ''
  const router = useRouter()

  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  if (!token) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex flex-col justify-center py-12 px-4 relative overflow-hidden">
        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
          <div className="w-14 h-14 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl flex items-center justify-center mx-auto text-2xl mb-4">
            ⚠️
          </div>
          <h2 className="text-2xl font-bold text-zinc-100">Enlace incompleto</h2>
          <p className="mt-2 text-sm text-zinc-400">
            No se encontró el token de restablecimiento en la URL. Por favor solicita un nuevo enlace.
          </p>
          <div className="mt-6">
            <Link
              href="/forgot-password"
              className="inline-flex px-5 py-2.5 rounded-xl text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-zinc-950 transition-colors"
            >
              Solicitar nuevo enlace
            </Link>
          </div>
        </div>
      </div>
    )
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    formData.set('token', token)

    startTransition(async () => {
      const res = await resetPassword(formData)
      if (res?.error) {
        setError(res.error)
      } else {
        setSuccess(true)
        setTimeout(() => {
          router.push('/login?reset=success')
        }, 2000)
      }
    })
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-2xl font-bold tracking-tight">
            <span className="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center text-zinc-950 font-black shadow-lg shadow-amber-500/20">
              iM
            </span>
            <span className="bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
              iMenu
            </span>
          </Link>
          <h2 className="mt-6 text-3xl font-extrabold tracking-tight text-zinc-100">
            Crea tu nueva contraseña
          </h2>
          <p className="mt-2 text-sm text-zinc-400">
            Ingresa y confirma tu nueva contraseña de acceso.
          </p>
        </div>

        <div className="bg-zinc-900/70 backdrop-blur-xl border border-zinc-800/80 shadow-2xl rounded-2xl p-8 sm:p-10">
          {success ? (
            <div className="text-center space-y-4">
              <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto text-2xl">
                ✓
              </div>
              <h3 className="text-lg font-semibold text-zinc-100">
                ¡Contraseña actualizada con éxito!
              </h3>
              <p className="text-sm text-zinc-400">
                Redirigiendo automáticamente a la pantalla de inicio de sesión...
              </p>
              <div className="pt-2">
                <Link
                  href="/login?reset=success"
                  className="inline-flex justify-center items-center w-full px-4 py-2.5 rounded-xl text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-zinc-950 transition-colors"
                >
                  Iniciar sesión ahora
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-start gap-2">
                  <span className="text-base leading-none">⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label
                  htmlFor="password"
                  className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-2"
                >
                  Nueva contraseña
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  placeholder="Mínimo 8 caracteres"
                  className="w-full px-4 py-3 rounded-xl bg-zinc-950/60 border border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all text-sm"
                />
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-2"
                >
                  Confirmar contraseña
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  placeholder="Repite la contraseña"
                  className="w-full px-4 py-3 rounded-xl bg-zinc-950/60 border border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-full py-3 px-4 rounded-xl font-semibold text-sm bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 shadow-lg shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {isPending ? (
                  <>
                    <span className="w-4 h-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                    Actualizando...
                  </>
                ) : (
                  'Restablecer contraseña'
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
