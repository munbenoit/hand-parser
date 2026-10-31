import { add, record } from '../counters.ts'
import type { Counters, Room } from '../types.ts'
import { playerKey } from '../types.ts'

/** Où les analyses écrivent : cache le choix du joueur, de la room et le filtre `only`. */
export interface StatSink {
  /** une occasion de `stat` pour ce joueur, réalisée ou non */
  record(player: string, stat: string, made: boolean): void
  /** incrémente un compteur simple (sans ratio) */
  count(player: string, key: string): void
}

/**
 * Sink qui alimente `into` (clé `room|pseudo`). Si `only` est défini, les autres joueurs sont
 * ignorés : un compteur jetable absorbe leurs écritures.
 */
export function createSink(
  room: Room,
  into: Map<string, Counters>,
  only?: ReadonlySet<string>
): StatSink {
  const discarded: Counters = {}
  const of = (player: string): Counters => {
    const key = playerKey(room, player)
    if (only && !only.has(key)) return discarded
    let c = into.get(key)
    if (!c) into.set(key, (c = {}))
    return c
  }
  return {
    record: (player, stat, made) => record(of(player), stat, made),
    count: (player, key) => add(of(player), key)
  }
}
