import type { Action } from '../types.ts'
import type { StatSink } from './sink.ts'

const isBet = (a: Action): boolean => a.kind === 'bet' || a.kind === 'raise'

/** Actions de jeu au flop : sans blindes, antes ni lignes non reconnues. */
const isFlopPlay = (a: Action): boolean =>
  a.street === 'flop' && a.kind !== 'other' && a.kind !== 'post'

/**
 * C-bet : l'agresseur préflop est le premier à miser au flop (personne n'a misé avant lui).
 * Fold to c-bet : première action de chaque autre joueur après ce c-bet.
 */
function analyzeCbet(flop: Action[], aggressor: string | null, sink: StatSink): void {
  let betSeen = false
  let cbetChecked = false
  let cbetMade = false
  const responded = new Set<string>()

  for (const a of flop) {
    const p = a.player
    if (!betSeen && p === aggressor && !cbetChecked) {
      cbetChecked = true
      cbetMade = isBet(a)
      sink.record(p, 'cbet', cbetMade)
    } else if (cbetMade && p !== aggressor && !responded.has(p)) {
      responded.add(p)
      sink.record(p, 'foldToCbet', a.kind === 'fold')
    }
    if (isBet(a)) betSeen = true
  }
}

/**
 * Check-raise : un joueur qui a checké avant la première mise du flop, puis, face à une mise,
 * relance (occasion = sa première action après la mise).
 */
function analyzeCheckRaise(flop: Action[], sink: StatSink): void {
  const checked = new Set<string>()
  const done = new Set<string>()
  let betSeen = false

  for (const a of flop) {
    const p = a.player
    if (betSeen && checked.has(p) && !done.has(p)) {
      done.add(p)
      sink.record(p, 'checkRaiseFlop', a.kind === 'raise')
    }
    if (a.kind === 'check' && !betSeen) checked.add(p)
    if (isBet(a)) betSeen = true
  }
}

/** Stats du flop : c-bet, fold to c-bet, check-raise. Rien si la main n'a pas d'action au flop. */
export function analyzeFlop(actions: Action[], aggressor: string | null, sink: StatSink): void {
  const flop = actions.filter(isFlopPlay)
  if (flop.length === 0) return
  analyzeCbet(flop, aggressor, sink)
  analyzeCheckRaise(flop, sink)
}
