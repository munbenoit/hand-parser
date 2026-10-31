import { assignPositions } from '../positions.ts'
import type { Counters, ParsedHand } from '../types.ts'
import { analyzeFlop } from './flop.ts'
import { analyzePreflop } from './preflop.ts'
import { createSink } from './sink.ts'

export interface AccumulateOptions {
  /** clés `room|pseudo` : si défini, seuls ces joueurs sont comptabilisés */
  only?: ReadonlySet<string>
}

/**
 * Ajoute une main aux compteurs de chaque joueur (`into`, indexé par `room|pseudo`).
 * Les mains à moins de 2 joueurs distribués sont ignorées.
 */
export function accumulate(
  hand: ParsedHand,
  into: Map<string, Counters>,
  opts: AccumulateOptions = {}
): void {
  const table = assignPositions(hand)
  if (table.players.length < 2) return
  const sink = createSink(hand.room, into, opts.only)
  const { aggressor } = analyzePreflop(hand.actions, table, sink)
  analyzeFlop(hand.actions, aggressor, sink)
}
