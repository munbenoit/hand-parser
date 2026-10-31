import type { Counters } from './types.ts'

/**
 * Un pourcentage = deux compteurs : `<stat>_n` (fait) et `<stat>_d` (occasions).
 * Le compteur simple `hands` (mains distribuées) n'a pas de suffixe.
 */
export const madeKey = (stat: string): string => stat + '_n'
export const oppKey = (stat: string): string => stat + '_d'

export function add(c: Counters, key: string, by = 1): void {
  c[key] = (c[key] ?? 0) + by
}

/** Enregistre une occasion pour `stat`, et un « fait » si `made`. */
export function record(c: Counters, stat: string, made: boolean): void {
  add(c, oppKey(stat))
  if (made) add(c, madeKey(stat))
}

export interface Ratio {
  made: number
  opp: number
  /** null tant qu'il n'y a aucune occasion */
  pct: number | null
}

export function ratio(c: Counters, stat: string): Ratio {
  const made = c[madeKey(stat)] ?? 0
  const opp = c[oppKey(stat)] ?? 0
  return { made, opp, pct: opp > 0 ? (made / opp) * 100 : null }
}

/** Additionne plusieurs jeux de compteurs (plusieurs joueurs, ou plusieurs sessions). */
export function merge(list: Counters[]): Counters {
  const out: Counters = {}
  for (const c of list) for (const k in c) out[k] = (out[k] ?? 0) + c[k]
  return out
}
