import type { ParsedHand, RoomParser } from '../types.ts'
import { betclicParser } from './betclic.ts'
import { winamaxParser } from './winamax.ts'

export { betclicParser, winamaxParser }

/**
 * Parseurs essayés dans l'ordre : le premier dont `detect` répond oui parse la main.
 * Winamax avant Betclic, qui accepte tout ce qui n'est pas Winamax.
 */
export const DEFAULT_PARSERS: readonly RoomParser[] = [winamaxParser, betclicParser]

/** Parse un historique brut ; null si aucun parseur ne le reconnaît ou s'il est inexploitable. */
export function parseHand(
  hh: string,
  parsers: readonly RoomParser[] = DEFAULT_PARSERS
): ParsedHand | null {
  const parser = parsers.find((p) => p.detect(hh))
  return parser ? parser.parse(hh) : null
}
