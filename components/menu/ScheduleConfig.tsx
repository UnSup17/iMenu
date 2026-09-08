'use client'

const DAYS = [
  { value: 0, label: 'Dom' },
  { value: 1, label: 'Lun' },
  { value: 2, label: 'Mar' },
  { value: 3, label: 'Mié' },
  { value: 4, label: 'Jue' },
  { value: 5, label: 'Vie' },
  { value: 6, label: 'Sáb' },
]

export interface ScheduleValue {
  offerStartDate: string | null
  offerEndDate: string | null
  offerActiveDays: number[] | null  // null = todos
  offerStartTime: string | null
  offerEndTime: string | null
}

interface Props {
  value: ScheduleValue
  onChange: (v: ScheduleValue) => void
}

export function ScheduleConfig({ value, onChange }: Props) {
  const activeDays = value.offerActiveDays ?? []
  const allDays = value.offerActiveDays === null

  function toggleAllDays(checked: boolean) {
    onChange({ ...value, offerActiveDays: checked ? null : [] })
  }

  function toggleDay(day: number) {
    const current = value.offerActiveDays ?? []
    const next = current.includes(day) ? current.filter((d) => d !== day) : [...current, day]
    onChange({ ...value, offerActiveDays: next.length === 7 ? null : next })
  }

  return (
    <div className="space-y-5 p-4 rounded-xl bg-zinc-950 border border-zinc-800">
      <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
        ⏰ Programación de Disponibilidad
      </p>

      {/* Rango de fechas */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[11px] text-zinc-500 mb-1.5 uppercase tracking-wider">
            Fecha de inicio
          </label>
          <input
            type="date"
            value={value.offerStartDate ? value.offerStartDate.slice(0, 10) : ''}
            onChange={(e) =>
              onChange({
                ...value,
                offerStartDate: e.target.value ? `${e.target.value}T00:00:00.000Z` : null,
              })
            }
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30"
          />
        </div>
        <div>
          <label className="block text-[11px] text-zinc-500 mb-1.5 uppercase tracking-wider">
            Fecha de fin
          </label>
          <input
            type="date"
            value={value.offerEndDate ? value.offerEndDate.slice(0, 10) : ''}
            onChange={(e) =>
              onChange({
                ...value,
                offerEndDate: e.target.value ? `${e.target.value}T23:59:59.999Z` : null,
              })
            }
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30"
          />
        </div>
      </div>

      {/* Días de la semana */}
      <div>
        <div className="flex items-center gap-3 mb-2.5">
          <label className="block text-[11px] text-zinc-500 uppercase tracking-wider">
            Días activos
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer text-xs text-zinc-400">
            <input
              type="checkbox"
              checked={allDays}
              onChange={(e) => toggleAllDays(e.target.checked)}
              className="rounded border-zinc-600 bg-zinc-800 text-amber-500 focus:ring-amber-500"
            />
            Todos los días
          </label>
        </div>
        <div className="flex gap-2 flex-wrap">
          {DAYS.map((d) => {
            const isActive = allDays || activeDays.includes(d.value)
            return (
              <button
                key={d.value}
                type="button"
                onClick={() => toggleDay(d.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-amber-500 text-zinc-950 shadow-sm shadow-amber-500/30'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                }`}
              >
                {d.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Rango de horas */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[11px] text-zinc-500 mb-1.5 uppercase tracking-wider">
            Hora de inicio
          </label>
          <input
            type="time"
            value={value.offerStartTime ?? ''}
            onChange={(e) =>
              onChange({ ...value, offerStartTime: e.target.value || null })
            }
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30"
          />
        </div>
        <div>
          <label className="block text-[11px] text-zinc-500 mb-1.5 uppercase tracking-wider">
            Hora de fin
          </label>
          <input
            type="time"
            value={value.offerEndTime ?? ''}
            onChange={(e) =>
              onChange({ ...value, offerEndTime: e.target.value || null })
            }
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30"
          />
        </div>
      </div>

      <p className="text-[11px] text-zinc-600 leading-relaxed">
        Las horas se evalúan en UTC. Deja los campos vacíos para que la oferta esté disponible sin restricción de fecha u hora.
      </p>
    </div>
  )
}
