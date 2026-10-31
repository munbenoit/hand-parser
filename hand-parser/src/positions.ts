import type { ParsedHand, Position } from './types.ts'

export interface Table {
  /** joueurs distribués, dans l'ordre des sièges */
  players: string[]
  /** position de chaque joueur (vide si le bouton est introuvable) */
  positions: Map<string, Position>
}

/** Positions de steal : ouvrir une première fois depuis le bouton, le cutoff ou la small blind. */
export const STEAL_POSITIONS: readonly Position[] = ['BTN', 'CO', 'SB']

/** Positions des blindes, qui défendent contre un steal. */
export const BLIND_POSITIONS: readonly Position[] = ['SB', 'BB']

function labelFor(offsetFromButton: number, tableSize: number): Position {
  if (tableSize === 2) return offsetFromButton === 0 ? 'SB' : 'BB' // heads-up : le bouton est SB
  if (offsetFromButton === 0) return 'BTN'
  if (offsetFromButton === 1) return 'SB'
  if (offsetFromButton === 2) return 'BB'
  const fromEnd = tableSize - offsetFromButton // 1 = CO, 2 = HJ, 3 = LJ
  return fromEnd === 1 ? 'CO' : fromEnd === 2 ? 'HJ' : fromEnd === 3 ? 'LJ' : 'EP'
}

/**
 * Joueurs distribués (ont posté ou agi au préflop : les sièges vides ou sit-out sont écartés)
 * et leur position. Le bouton vient du tag BTN ; à défaut il est déduit de la small blind.
 */
export function assignPositions(hand: ParsedHand): Table {
  const active = new Set(
    hand.actions.filter((a) => a.street === 'preflop' && a.kind !== 'other').map((a) => a.player)
  )
  const seated = hand.seats.filter((s) => active.has(s.name)).sort((a, b) => a.seat - b.seat)
  const players = seated.map((s) => s.name)
  const positions = new Map<string, Position>()
  const n = seated.length
  if (n < 2) return { players, positions }

  let button = seated.findIndex((s) => s.tags.includes('BTN'))
  if (button < 0) {
    const sb = seated.findIndex((s) => s.tags.includes('SB'))
    if (sb < 0) return { players, positions }
    button = (sb - 1 + n) % n
  }
  for (let offset = 0; offset < n; offset++) {
    positions.set(seated[(button + offset) % n].name, labelFor(offset, n))
  }
  return { players, positions }
}
