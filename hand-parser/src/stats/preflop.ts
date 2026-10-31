import { BLIND_POSITIONS, STEAL_POSITIONS } from '../positions.ts'
import type { Table } from '../positions.ts'
import type { Action, Position } from '../types.ts'
import type { StatSink } from './sink.ts'

export interface PreflopOutcome {
  /** dernier relanceur préflop (l'agresseur : c'est lui qui c-bet) */
  aggressor: string | null
}

const isRaise = (a: Action): boolean => a.kind === 'raise' || a.kind === 'bet'

/**
 * Stats préflop : VPIP, PFR, RFI, 3bet, fold to 3bet, steal, fold to steal.
 *
 * `level` suit la hauteur de l'enchère : 0 = pas de relance, 1 = open, 2 = 3bet, etc.
 * Chaque occasion n'est comptée qu'une fois par joueur et par stat (`once`).
 */
export function analyzePreflop(actions: Action[], table: Table, sink: StatSink): PreflopOutcome {
  const { players, positions } = table
  const vpip = new Set<string>()
  const pfr = new Set<string>()
  const acted = new Set<string>()
  const counted = new Set<string>()
  const once = (stat: string, player: string): boolean => {
    const key = stat + '\u0000' + player
    if (counted.has(key)) return false
    counted.add(key)
    return true
  }

  let level = 0
  let limpers = 0
  let opener: string | null = null
  let openerPosition: Position | undefined
  let aggressor: string | null = null

  for (const a of actions) {
    if (a.street !== 'preflop' || a.kind === 'post' || a.kind === 'other') continue
    const p = a.player
    const position = positions.get(p)
    const raises = isRaise(a)
    const inBlind = position !== undefined && BLIND_POSITIONS.includes(position)

    // RFI : première occasion d'ouvrir, sans relance ni limp devant ; steal = RFI depuis BTN / CO / SB
    if (level === 0 && limpers === 0 && !acted.has(p)) {
      sink.record(p, 'rfi', raises)
      if (position && STEAL_POSITIONS.includes(position)) sink.record(p, 'steal', raises)
    }
    if (level === 0 && a.kind === 'call') limpers++

    if (level === 1 && p !== opener) {
      if (once('threebet', p)) sink.record(p, 'threebet', raises)
      const facesSteal = openerPosition && STEAL_POSITIONS.includes(openerPosition)
      if (inBlind && facesSteal && once('foldToSteal', p)) {
        sink.record(p, 'foldToSteal', a.kind === 'fold')
      }
    }
    if (level >= 2 && p === opener && once('fold3bet', p)) {
      sink.record(p, 'fold3bet', a.kind === 'fold')
    }

    if (a.kind === 'call' || raises) vpip.add(p)
    if (raises) {
      pfr.add(p)
      if (level === 0) {
        opener = p
        openerPosition = position
      }
      level++
      aggressor = p
    }
    acted.add(p)
  }

  for (const p of players) {
    sink.count(p, 'hands')
    // une main sans action (walk du BB) n'est pas une occasion
    if (acted.has(p)) {
      sink.record(p, 'vpip', vpip.has(p))
      sink.record(p, 'pfr', pfr.has(p))
    }
  }
  return { aggressor }
}
