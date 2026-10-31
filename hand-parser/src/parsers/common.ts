import type { Action, ActionKind, ParsedHand, Seat, Street } from '../types.ts'

/** Sections d'historique qui ouvrent une rue d'action. */
export type BoardStreet = Exclude<Street, 'preflop'>

export const splitCards = (text: string): string[] => text.trim().split(/\s+/).filter(Boolean)

/** Cartes entre crochets d'une ligne de section (`*** FLOP *** [Ah Kd 2c]`). */
export const cardsOfLine = (line: string): string[] =>
  [...line.matchAll(/\[([^\]]+)\]/g)].flatMap((m) => splitCards(m[1]))

/** Accumule le résultat du parsing, partagé par les parseurs de chaque room. */
export class HandBuilder {
  readonly seats: Seat[] = []
  readonly actions: Action[] = []
  readonly showdown: string[] = []
  readonly holes = new Map<string, string[]>()
  readonly boards: ParsedHand['boards'] = {}
  hero: string | null = null
  bb = 0
  street: Street | null = null

  /** Enregistre une action sur la rue courante (ignorée hors rue). */
  push(player: string, kind: ActionKind, text: string, allIn: boolean): void {
    if (!this.street) return
    const amount = Number(/(\d+(?:\.\d+)?)/.exec(text)?.[1] ?? 0)
    this.actions.push({ street: this.street, player, kind, allIn, text, amount })
  }

  /** Démarre une rue ; le board est enregistré pour flop / turn / river. */
  openStreet(street: Street, cards: string[]): void {
    this.street = street
    if (street !== 'preflop') this.boards[street] = cards
  }

  addShowdown(player: string, cards: string[]): void {
    this.showdown.push(player)
    this.holes.set(player, cards)
  }
}
