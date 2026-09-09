'use client'

interface TableParticipantsBadgeProps {
  participants: Array<{ socketId: string; userName: string }>
  currentUserAlias: string
  onEditAlias: () => void
}

export function TableParticipantsBadge({
  participants,
  currentUserAlias,
  onEditAlias,
}: TableParticipantsBadgeProps) {
  // Sacar nombres únicos de participantes
  const names = Array.from(
    new Set(participants.map((p) => p.userName).filter(Boolean)),
  )

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onEditAlias}
        className="flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs transition-all duration-200 group border"
        style={{
          backgroundColor: 'var(--brand-surface)',
          borderColor: 'color-mix(in srgb, var(--brand-surface) 60%, var(--brand-text) 15%)',
        }}
        title="Haz clic para cambiar tu nombre en la mesa"
      >
        <span className="flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>

        <span className="text-[11px] font-bold" style={{ color: 'var(--brand-muted)' }}>Mesa:</span>

        <span className="font-bold truncate max-w-[120px] sm:max-w-[180px]" style={{ color: 'var(--brand-primary)' }}>
          {currentUserAlias ? currentUserAlias : 'Sin nombre'}
        </span>

        {names.length > 1 && (
          <span
            className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md border"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--brand-primary) 18%, transparent)',
              color: 'var(--brand-primary)',
              borderColor: 'color-mix(in srgb, var(--brand-primary) 35%, transparent)',
            }}
          >
            +{names.length - 1} en mesa
          </span>
        )}

        <span style={{ color: 'var(--brand-muted)' }} className="text-[10px]">✏️</span>
      </button>
    </div>
  )
}
