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
        className="flex items-center gap-1.5 bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 hover:border-amber-500/30 rounded-xl px-2.5 py-1.5 text-xs transition-all duration-200 group"
        title="Haz clic para cambiar tu nombre en la mesa"
      >
        <span className="flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        
        <span className="text-zinc-400 text-[11px] font-bold">Mesa:</span>
        
        <span className="font-bold text-amber-400 truncate max-w-[120px] sm:max-w-[180px]">
          {currentUserAlias ? currentUserAlias : 'Sin nombre'}
        </span>

        {names.length > 1 && (
          <span className="bg-amber-500/20 text-amber-300 text-[10px] font-extrabold px-1.5 py-0.5 rounded-md border border-amber-500/30">
            +{names.length - 1} en mesa
          </span>
        )}

        <span className="text-zinc-500 group-hover:text-zinc-300 text-[10px]">✏️</span>
      </button>
    </div>
  )
}
