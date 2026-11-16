export interface ShiftRow {
  id: string
  startedAt: string
  endedAt: string | null
  note: string | null
  branchId: string | null
  user?: { id: string; name: string | null; username: string | null }
}

export interface ShiftList {
  shifts: ShiftRow[]
  hours: number
}

export interface TipShare {
  userId: string
  name: string | null
  role: string
  hours: number
  weight: number
  share: number
}

export interface TipDistribution {
  from: string
  to: string
  pool: number
  totalWeight?: number
  participants: TipShare[]
}

/** Duración legible de un turno: `7h 25m`; los abiertos dicen "en curso". */
export function shiftDuration(start: string, end: string | null): string {
  const endMs = end ? new Date(end).getTime() : Date.now()
  const minutes = Math.max(0, Math.round((endMs - new Date(start).getTime()) / 60000))

  if (!end) return "en curso"

  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60

  return hours > 0 ? `${hours}h ${rest}m` : `${rest}m`
}
