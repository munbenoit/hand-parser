export type Room = 'betclic' | 'winamax'

export const ROOMS: readonly Room[] = ['betclic', 'winamax']

export type Street = 'preflop' | 'flop' | 'turn' | 'river'

export type ActionKind = 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'post' | 'other'

/** Positions calculées par `assignPositions` (BB = référence, SB/BB seuls en heads-up). */
export type Position = 'BTN' | 'SB' | 'BB' | 'CO' | 'HJ' | 'LJ' | 'EP'

export interface Seat {
  seat: number
  name: string
  /** rôles lus ou déduits : BTN, SB, BB, Hero */
  tags: string[]
  /** stack de départ, en jetons */
  stack: number
}

export interface Action {
  street: Street
  player: string
  kind: ActionKind
  allIn: boolean
  /** texte normalisé, identique pour les deux rooms (ex. « Raises to 300 ») */
  text: string
  /** premier nombre du texte : montant misé, ou « raise to » pour les relances */
  amount: number
}

/** Infos de la main, renseignées quand l'historique les contient (Winamax). */
export interface HandMeta {
  handId: string
  playedAt: string
  tournament: string
  buyInCents: number
  bb: number
}

export interface ParsedHand {
  room: Room
  meta?: HandMeta
  seats: Seat[]
  actions: Action[]
  /** joueurs ayant montré leurs cartes au showdown */
  showdown: string[]
  /** pseudo du héros (cartes toujours connues), null si absent de l'historique */
  hero: string | null
  /** big blind, en jetons (0 si inconnu) */
  bb: number
  /** cartes connues par joueur : héros + showdown */
  holes: Map<string, string[]>
  /** board cumulé par rue */
  boards: Partial<Record<Exclude<Street, 'preflop'>, string[]>>
}

/** Un parseur par room : `detect` choisit, `parse` retourne null si l'historique est inexploitable. */
export interface RoomParser {
  room: Room
  detect(hh: string): boolean
  parse(hh: string): ParsedHand | null
}

/** Compteurs d'un joueur : table plate clé → nombre (voir `counters.ts`). */
export type Counters = Record<string, number>

/** Le pseudo n'est unique que dans une room : les stats sont indexées par `room|pseudo`. */
export const playerKey = (room: Room, name: string): string => room + '|' + name

export function splitPlayerKey(key: string): { room: Room; name: string } {
  const i = key.indexOf('|')
  return { room: key.slice(0, i) as Room, name: key.slice(i + 1) }
}
