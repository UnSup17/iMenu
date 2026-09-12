'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

interface Member {
  id: string
  name: string | null
  email: string
  role: string
  inviteAccepted: boolean
  inviteExpiry: string | null
  twoFactorEnabled: boolean
  createdAt: string
}

const ROLES = [
  { value: 'WAITER', label: 'Mesero', desc: 'Atención a mesas, toma de pedidos y cobros' },
  { value: 'KITCHEN', label: 'Cocina (KDS)', desc: 'Visualización y preparación de comandas' },
  { value: 'MANAGER', label: 'Gerente / Manager', desc: 'Operación completa, inventario y menú' },
  { value: 'ACCOUNTANT', label: 'Contador', desc: 'Acceso exclusivo a facturación y reportes' },
  { value: 'RESTAURANT_ADMIN', label: 'Administrador de Restaurante', desc: 'Acceso total y configuración' },
]

export default function TeamClientView({
  initialMembers,
  restaurantId,
}: {
  initialMembers: Member[]
  restaurantId: string
}) {
  const router = useRouter()
  const [members, setMembers] = useState<Member[]>(initialMembers)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('WAITER')
  const [isPending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  )

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setFeedback(null)

    startTransition(async () => {
      try {
        const res = await fetch('/api/auth/invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            role,
            restaurantId,
          }),
        })

        const data = await res.json()
        if (!res.ok) {
          setFeedback({ type: 'error', message: data.error || 'Error al enviar invitación' })
          return
        }

        setFeedback({ type: 'success', message: '¡Invitación enviada exitosamente!' })
        setIsModalOpen(false)
        setEmail('')
        setRole('WAITER')
        router.refresh()
      } catch (err: unknown) {
        setFeedback({
          type: 'error',
          message: err instanceof Error ? err.message : 'Error de conexión',
        })
      }
    })
  }

  async function handleRevoke(userId: string) {
    if (!confirm('¿Estás seguro de que deseas revocar esta invitación?')) return

    try {
      const res = await fetch(`/api/auth/invite?userId=${userId}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error || 'Error al revocar')
        return
      }

      setMembers((prev) => prev.filter((m) => m.id !== userId))
      setFeedback({ type: 'success', message: 'Invitación revocada correctamente' })
      router.refresh()
    } catch {
      alert('Error al revocar la invitación')
    }
  }

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5">
        <div>
          <h2 className="text-base font-semibold text-zinc-100">Miembros del equipo ({members.length})</h2>
          <p className="text-xs text-zinc-400">Controla quién tiene acceso a la operativa y administración.</p>
        </div>

        <button
          onClick={() => {
            setFeedback(null)
            setIsModalOpen(true)
          }}
          type="button"
          className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-sm shadow-lg shadow-amber-500/20 transition-all cursor-pointer flex items-center gap-2"
        >
          <span>+</span> Invitar nuevo miembro
        </button>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl border text-sm flex items-center justify-between gap-3 ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
          }`}
        >
          <span>{feedback.message}</span>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs opacity-70 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950/40 text-[11px] uppercase tracking-wider text-zinc-400">
                <th className="py-3.5 px-6 font-semibold">Usuario</th>
                <th className="py-3.5 px-6 font-semibold">Rol</th>
                <th className="py-3.5 px-6 font-semibold">Estado</th>
                <th className="py-3.5 px-6 font-semibold">2FA</th>
                <th className="py-3.5 px-6 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-sm">
              {members.map((member) => (
                <tr key={member.id} className="hover:bg-zinc-800/30 transition-colors">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-zinc-300 text-xs">
                        {member.name ? member.name.charAt(0).toUpperCase() : member.email.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-zinc-200">
                          {member.name || 'Sin nombre'}
                        </div>
                        <div className="text-xs text-zinc-500">{member.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-800 text-zinc-300 border border-zinc-700">
                      {member.role}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    {member.inviteAccepted ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        Activo
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                        Invitación pendiente
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-6">
                    {member.twoFactorEnabled ? (
                      <span className="text-xs text-emerald-400 font-medium">Activado 🔒</span>
                    ) : (
                      <span className="text-xs text-zinc-600">Desactivado</span>
                    )}
                  </td>
                  <td className="py-4 px-6 text-right">
                    {!member.inviteAccepted && (
                      <button
                        onClick={() => handleRevoke(member.id)}
                        className="text-xs font-medium text-rose-400 hover:text-rose-300 px-3 py-1.5 rounded-lg border border-rose-500/20 hover:bg-rose-500/10 transition-colors cursor-pointer"
                      >
                        Revocar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Invitar al equipo</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-500 hover:text-white text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-1.5">
                  Correo electrónico del usuario
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="mesero@turestaurante.com"
                  className="w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-1.5">
                  Rol asignado
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 text-sm"
                >
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label} — {r.desc}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-lg shadow-amber-500/20 disabled:opacity-50 cursor-pointer"
                >
                  {isPending ? 'Enviando...' : 'Enviar invitación'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
