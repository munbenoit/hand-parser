import { ratio } from '../counters.ts'
import type { Ratio } from '../counters.ts'
import type { Counters } from '../types.ts'

export interface StatDefinition {
  id: string
  label: string
  street: 'preflop' | 'flop'
  /** ce qui compte comme « fait » */
  numerator: string
  /** ce qui compte comme une occasion */
  denominator: string
}

/** Les stats de base : source de vérité pour l'affichage et la documentation. */
export const STATS = [
  {
    id: 'vpip',
    label: 'VPIP',
    street: 'preflop',
    numerator: 'a payé ou relancé volontairement au préflop (blindes postées exclues)',
    denominator: 'mains où le joueur a eu une action préflop (hors walk du BB)'
  },
  {
    id: 'pfr',
    label: 'PFR',
    street: 'preflop',
    numerator: 'a relancé au préflop',
    denominator: 'mains où le joueur a eu une action préflop (hors walk du BB)'
  },
  {
    id: 'rfi',
    label: 'RFI',
    street: 'preflop',
    numerator: 'a ouvert en relance',
    denominator: 'première action avec personne devant (ni relance ni limp), toutes positions'
  },
  {
    id: 'threebet',
    label: '3bet',
    street: 'preflop',
    numerator: 'a relancé face à une seule relance (open)',
    denominator: 'première action face à une open-raise (une occasion par main)'
  },
  {
    id: 'fold3bet',
    label: 'Fold to 3bet',
    street: 'preflop',
    numerator: "l'ouvreur a foldé face à la 3bet",
    denominator: "l'ouvreur a eu une action face à une 3bet (une occasion par main)"
  },
  {
    id: 'steal',
    label: 'Steal',
    street: 'preflop',
    numerator: 'a ouvert en relance',
    denominator: 'première action depuis BTN / CO / SB, sans relance ni limp devant'
  },
  {
    id: 'foldToSteal',
    label: 'Fold to steal',
    street: 'preflop',
    numerator: 'a foldé',
    denominator: 'blindes (SB / BB) face à une open-raise de BTN / CO / SB'
  },
  {
    id: 'cbet',
    label: 'C-bet flop',
    street: 'flop',
    numerator: 'a misé au flop',
    denominator: 'dernier relanceur préflop, premier à parler d’une mise au flop'
  },
  {
    id: 'foldToCbet',
    label: 'Fold to c-bet',
    street: 'flop',
    numerator: 'a foldé',
    denominator: 'première réponse à un c-bet du flop'
  },
  {
    id: 'checkRaiseFlop',
    label: 'Check-raise flop',
    street: 'flop',
    numerator: 'a relancé',
    denominator:
      'a checké avant la première mise du flop ; première action après cette mise (une occasion par main)'
  }
] as const satisfies readonly StatDefinition[]

export type StatId = (typeof STATS)[number]['id']

export interface StatValue extends Ratio {
  id: StatId
  label: string
}

export interface PlayerStats {
  hands: number
  stats: StatValue[]
}

/** Compteurs bruts → stats prêtes à afficher, dans l'ordre de `STATS`. */
export function computeStats(c: Counters): PlayerStats {
  return {
    hands: c.hands ?? 0,
    stats: STATS.map((s) => ({ id: s.id, label: s.label, ...ratio(c, s.id) }))
  }
}
