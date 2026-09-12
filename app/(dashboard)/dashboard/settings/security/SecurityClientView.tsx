'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

export default function SecurityClientView({
  initialEnabled,
  email,
}: {
  initialEnabled: boolean
  email: string
}) {
  const router = useRouter()
  const [enabled, setEnabled] = useState(initialEnabled)
  const [loading, setLoading] = useState(false)
  const [setupData, setSetupData] = useState<{
    secret: string
    qrCodeDataUrl: string
    uri: string
  } | null>(null)
  const [verificationCode, setVerificationCode] = useState('')
  const [disableCode, setDisableCode] = useState('')
  const [isDisableOpen, setIsDisableOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  async function startSetup() {
    setError(null)
    setSuccessMsg(null)
    setLoading(true)
    try {
      const res = await fetch('/api/auth/2fa/setup')
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Error al iniciar configuración')
        setLoading(false)
        return
      }
      setSetupData(data)
    } catch {
      setError('Error al conectar con el servidor')
    } finally {
      setLoading(false)
    }
  }

  async function confirmEnable(e: React.FormEvent) {
    e.preventDefault()
    if (!setupData) return
    setError(null)
    setLoading(true)

    try {
      const res = await fetch('/api/auth/2fa/enable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret: setupData.secret,
          code: verificationCode,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Código inválido')
        setLoading(false)
        return
      }

      setEnabled(true)
      setSetupData(null)
      setVerificationCode('')
      setSuccessMsg('¡Autenticación en dos pasos activada exitosamente!')
      router.refresh()
    } catch {
      setError('Error al verificar el código')
    } finally {
      setLoading(false)
    }
  }

  async function confirmDisable(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await fetch('/api/auth/2fa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: disableCode,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Código incorrecto')
        setLoading(false)
        return
      }

      setEnabled(false)
      setIsDisableOpen(false)
      setDisableCode('')
      setSuccessMsg('2FA desactivado correctamente.')
      router.refresh()
    } catch {
      setError('Error al desactivar 2FA')
    } finally {
      setLoading(false)
    }
  }

  function copySecret() {
    if (setupData?.secret) {
      navigator.clipboard.writeText(setupData.secret)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="space-y-6">
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center justify-between">
          <span>✓ {successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="opacity-70 hover:opacity-100 text-xs">
            ✕
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center justify-between">
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)} className="opacity-70 hover:opacity-100 text-xs">
            ✕
          </button>
        </div>
      )}

      {/* Main 2FA Card */}
      <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center text-2xl shrink-0">
              🔐
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-bold text-white">Autenticación en dos pasos (TOTP)</h3>
                {enabled ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Activado
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-800 text-zinc-400 border border-zinc-700">
                    Desactivado
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-xl leading-relaxed">
                Añade una capa adicional de seguridad a tu cuenta requiriendo un código de 6 dígitos generado por una aplicación móvil (Google Authenticator, Authy, etc.) cada vez que inicies sesión.
              </p>
            </div>
          </div>

          <div>
            {enabled ? (
              <button
                onClick={() => {
                  setError(null)
                  setIsDisableOpen(true)
                }}
                type="button"
                className="px-4 py-2.5 rounded-xl border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 font-semibold text-xs transition-colors cursor-pointer"
              >
                Desactivar 2FA
              </button>
            ) : (
              !setupData && (
                <button
                  onClick={startSetup}
                  disabled={loading}
                  type="button"
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
                >
                  {loading ? 'Cargando...' : 'Configurar 2FA'}
                </button>
              )
            )}
          </div>
        </div>

        {/* Setup Wizard In Place */}
        {setupData && !enabled && (
          <div className="mt-8 pt-8 border-t border-zinc-800 space-y-6">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold uppercase tracking-wider text-amber-400">
                Paso a paso para vincular tu app
              </h4>
              <button
                onClick={() => setSetupData(null)}
                className="text-xs text-zinc-500 hover:text-zinc-300"
              >
                Cancelar configuración
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center bg-zinc-950/60 p-6 rounded-2xl border border-zinc-800">
              {/* QR Code Column */}
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="p-3 bg-white rounded-2xl shadow-xl">
                  <Image
                    src={setupData.qrCodeDataUrl}
                    alt="QR Code 2FA"
                    width={192}
                    height={192}
                    unoptimized
                    className="w-48 h-48 rounded-lg"
                  />
                </div>
                <p className="text-xs text-zinc-400">
                  Escanea este código con <strong className="text-zinc-200">Google Authenticator</strong> o <strong className="text-zinc-200">Authy</strong>.
                </p>
              </div>

              {/* Code Input Column */}
              <div className="space-y-4">
                <div>
                  <span className="text-xs text-zinc-400 block mb-1">O ingresa esta clave manualmente:</span>
                  <div className="flex items-center gap-2">
                    <code className="bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-lg text-xs font-mono text-amber-300 tracking-wider select-all">
                      {setupData.secret}
                    </code>
                    <button
                      onClick={copySecret}
                      type="button"
                      className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-300 transition-colors"
                    >
                      {copied ? '¡Copiado!' : 'Copiar'}
                    </button>
                  </div>
                </div>

                <form onSubmit={confirmEnable} className="space-y-3 pt-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300">
                    Ingresa el código de 6 dígitos que muestra tu app
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    required
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-center tracking-[0.5em] text-xl font-mono text-amber-400 placeholder:text-zinc-700 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                  <button
                    type="submit"
                    disabled={loading || verificationCode.length !== 6}
                    className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs shadow-lg shadow-amber-500/20 disabled:opacity-50 transition-all cursor-pointer"
                  >
                    {loading ? 'Verificando...' : 'Confirmar y Activar 2FA'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Disable Modal */}
      {isDisableOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">Desactivar 2FA</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Para confirmar que eres tú y evitar desactivaciones no autorizadas, ingresa el código de 6 dígitos de tu app de autenticación.
            </p>

            <form onSubmit={confirmDisable} className="space-y-4">
              <div>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  required
                  autoFocus
                  value={disableCode}
                  onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-center tracking-[0.5em] text-xl font-mono text-amber-400 placeholder:text-zinc-700 focus:outline-none focus:ring-2 focus:ring-rose-500/50"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsDisableOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading || disableCode.length !== 6}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-rose-500 hover:bg-rose-400 text-white shadow-lg shadow-rose-500/20 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? 'Desactivando...' : 'Confirmar desactivación'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
