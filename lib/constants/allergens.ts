export interface Allergen {
  id: string
  name: string
  icon: string
  color: string
}

export const ALLERGENS: Allergen[] = [
  { id: 'gluten', name: 'Gluten / Cereales', icon: '🌾', color: 'border-amber-700/50 bg-amber-950/40 text-amber-300' },
  { id: 'crustaceos', name: 'Crustáceos', icon: '🦐', color: 'border-red-700/50 bg-red-950/40 text-red-300' },
  { id: 'huevos', name: 'Huevos', icon: '🥚', color: 'border-yellow-700/50 bg-yellow-950/40 text-yellow-300' },
  { id: 'pescado', name: 'Pescado', icon: '🐟', color: 'border-blue-700/50 bg-blue-950/40 text-blue-300' },
  { id: 'cacahuates', name: 'Cacahuates / Maní', icon: '🥜', color: 'border-orange-700/50 bg-orange-950/40 text-orange-300' },
  { id: 'soja', name: 'Soja', icon: '🌱', color: 'border-emerald-700/50 bg-emerald-950/40 text-emerald-300' },
  { id: 'lacteos', name: 'Lácteos', icon: '🥛', color: 'border-sky-700/50 bg-sky-950/40 text-sky-300' },
  { id: 'frutos_secos', name: 'Frutos de Cáscara', icon: '🌰', color: 'border-amber-800/50 bg-amber-950/40 text-amber-200' },
  { id: 'apio', name: 'Apio', icon: '🥬', color: 'border-lime-700/50 bg-lime-950/40 text-lime-300' },
  { id: 'mostaza', name: 'Mostaza', icon: '🟡', color: 'border-yellow-600/50 bg-yellow-950/40 text-yellow-200' },
  { id: 'sesamo', name: 'Sésamo', icon: '🥯', color: 'border-amber-600/50 bg-amber-950/40 text-amber-300' },
  { id: 'sulfitos', name: 'Sulfitos / Vino', icon: '🍷', color: 'border-purple-700/50 bg-purple-950/40 text-purple-300' },
  { id: 'altramuces', name: 'Altramuces', icon: '🌼', color: 'border-rose-700/50 bg-rose-950/40 text-rose-300' },
  { id: 'moluscos', name: 'Moluscos', icon: '🦪', color: 'border-teal-700/50 bg-teal-950/40 text-teal-300' },
]

export function getAllergenById(id: string): Allergen | undefined {
  return ALLERGENS.find((a) => a.id.toLowerCase() === id.toLowerCase())
}
