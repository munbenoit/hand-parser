import type { ActionKind, ParsedHand, RoomParser } from '../types.ts'
import { HandBuilder, splitCards } from './common.ts'

const SEAT = /^Seat (\d+): (.+?) \(([^)]*)\)(?: \[([^\]]*)\])?\s*$/
const BLINDS = /^Blinds: (\d+)\/(\d+)/
const SECTION = /^\*\*\* ([A-Z-]+( CARDS)?)/
const ACTION = /^\d{2}:\d{2}:\d{2} - (.+?): (.+)$/
const HOLE_LINE = /^(.+?): \[([^\]]+)\]/
const SHOWS = /^(.+?) shows \[([^\]]+)\]/

/** Début du texte d'action → type. L'ordre n'importe pas : les préfixes sont disjoints. */
const KIND_PREFIX: Array<[string, ActionKind]> = [
  ['Folds', 'fold'],
  ['Checks', 'check'],
  ['Calls', 'call'],
  ['Raises', 'raise'],
  ['Bets', 'bet'],
  ['Posts', 'post']
]

const kindOf = (text: string): ActionKind =>
  KIND_PREFIX.find(([prefix]) => text.startsWith(prefix))?.[1] ?? 'other'

function parse(hh: string): ParsedHand | null {
  const b = new HandBuilder()
  let inShowdown = false
  let inHoleCards = false

  for (const raw of hh.split('\n')) {
    const line = raw.trim()

    const seat = SEAT.exec(line)
    if (seat) {
      const tags = (seat[4] ?? '').split(/\s+/).filter(Boolean)
      if (tags.includes('Hero')) b.hero = seat[2]
      b.seats.push({ seat: +seat[1], name: seat[2], tags, stack: parseInt(seat[3], 10) || 0 })
      continue
    }

    const blinds = BLINDS.exec(line)
    if (blinds) {
      b.bb = +blinds[2]
      continue
    }

    const section = SECTION.exec(line)
    if (section) {
      inShowdown = false
      inHoleCards = false
      b.street = null
      // le board est cumulé dans le premier crochet (les suivants, ex. la dernière carte, sont ignorés)
      const cards = splitCards(/\[([^\]]+)\]/.exec(line)?.[1] ?? '')
      switch (section[1]) {
        case 'PRE-FLOP':
          b.openStreet('preflop', [])
          break
        case 'FLOP':
          b.openStreet('flop', cards)
          break
        case 'TURN':
          b.openStreet('turn', cards)
          break
        case 'RIVER':
          b.openStreet('river', cards)
          break
        case 'SHOWDOWN':
          inShowdown = true
          break
        case 'HOLE CARDS':
          inHoleCards = true
          break
      }
      continue
    }

    if (inHoleCards) {
      // seules les cartes du héros sont données ici ; les autres apparaissent au showdown
      const hole = HOLE_LINE.exec(line)
      if (hole && hole[1] === b.hero) b.holes.set(hole[1], splitCards(hole[2]))
      continue
    }

    if (inShowdown) {
      const shows = SHOWS.exec(line)
      if (shows) b.addShowdown(shows[1], splitCards(shows[2]))
      continue
    }

    const act = ACTION.exec(line)
    if (!act || !b.street) continue
    b.push(act[1], kindOf(act[2]), act[2], /all-in/i.test(act[2]))
  }

  if (b.seats.length < 2) return null
  return {
    room: 'betclic',
    seats: b.seats,
    actions: b.actions,
    showdown: b.showdown,
    hero: b.hero,
    bb: b.bb,
    holes: b.holes,
    boards: b.boards
  }
}

export const betclicParser: RoomParser = {
  room: 'betclic',
  // Betclic n'a pas d'en-tête propre : c'est le format par défaut (voir `parseHand`)
  detect: (hh) => !hh.startsWith('Winamax Poker'),
  parse
}
