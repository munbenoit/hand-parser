import { merge } from './counters.ts'
import { DEFAULT_PARSERS, parseHand } from './parsers/index.ts'
import type { HandSource, RawHand } from './source.ts'
import { accumulate } from './stats/accumulate.ts'
import type { AccumulateOptions } from './stats/accumulate.ts'
import type { Counters, ParsedHand, Room, RoomParser } from './types.ts'
import { playerKey } from './types.ts'

export interface AnalyzeOptions extends AccumulateOptions {
  /** parseurs à utiliser (défaut : Winamax + Betclic) ; ajouter une room = ajouter un parseur */
  parsers?: readonly RoomParser[]
  /** appelée pour chaque main illisible, pour la journaliser ou la compter */
  onSkip?: (hand: RawHand) => void
  /** appelée pour chaque main lue, avant l'ajout aux compteurs (ex. suivre le héros) */
  onHand?: (parsed: ParsedHand, raw: RawHand) => void
}

export interface AnalysisResult {
  /** compteurs par joueur, clé `room|pseudo` */
  players: Map<string, Counters>
  /** mains lues, par room */
  handsByRoom: Partial<Record<Room, number>>
  /** mains reçues mais illisibles */
  skipped: number
  /** clés `room|pseudo` des comptes du héros (cartes toujours connues) */
  heroes: Set<string>
}

/**
 * Lit toutes les mains d'une source et calcule les compteurs de chaque joueur.
 * C'est le point d'entrée : branchez ici votre jeu de données (`HandSource`).
 */
export async function analyze(
  source: HandSource,
  opts: AnalyzeOptions = {}
): Promise<AnalysisResult> {
  const players = new Map<string, Counters>()
  const handsByRoom: Partial<Record<Room, number>> = {}
  const heroes = new Set<string>()
  let skipped = 0

  for await (const raw of source) {
    const parsed = parseHand(raw.hh, opts.parsers ?? DEFAULT_PARSERS)
    if (!parsed) {
      skipped++
      opts.onSkip?.(raw)
      continue
    }
    handsByRoom[parsed.room] = (handsByRoom[parsed.room] ?? 0) + 1
    if (parsed.hero) heroes.add(playerKey(parsed.room, parsed.hero))
    opts.onHand?.(parsed, raw)
    accumulate(parsed, players, opts)
  }
  return { players, handsByRoom, skipped, heroes }
}

/** Agrège les compteurs de plusieurs joueurs (ex. tous les adversaires hors héros). */
export function mergePlayers(players: Map<string, Counters>, keys?: Iterable<string>): Counters {
  const list: Counters[] = []
  if (keys) {
    for (const k of keys) {
      const c = players.get(k)
      if (c) list.push(c)
    }
  } else {
    list.push(...players.values())
  }
  return merge(list)
}
