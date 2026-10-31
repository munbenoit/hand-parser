import type { ActionKind, ParsedHand, RoomParser } from '../types.ts'
import { cardsOfLine, HandBuilder, splitCards } from './common.ts'

const HEADER =
  /^Winamax Poker - Tournament "(.*)" buyIn: (.*?) level: -?\d+ - HandId: #(\S+) - Holdem no limit \(([\d/]+)\) - (\d{4})\/(\d\d)\/(\d\d) (\d\d:\d\d:\d\d) UTC/
const SEAT = /^Seat (\d+): (.+) \((\d+)(?:, [^)]*)?\)\s*$/
const BUTTON = /Seat #(\d+) is the button/
const DEALT = /^Dealt to (.+) \[([^\]]+)\]/
const SHOWS = /^(.+?) shows \[([^\]]+)\]/
const SECTION = /^\*\*\* ([A-Z/ -]+?) \*\*\*/
const CALL_BET = /^(.+) (calls|bets) (\d+)( and is all-in)?$/
const RAISE = /^(.+) raises (\d+) to (\d+)( and is all-in)?$/
const POST = /^(.+) posts (ante|small blind|big blind) (\d+)( and is all-in)?$/
const FOLD_CHECK = /^(.+) (folds|checks)$/

const POST_LABEL = { ante: 'Ante', 'small blind': 'SB', 'big blind': 'BB' } as const

/**
 * Traduit une ligne d'action Winamax vers le vocabulaire normalisé (celui de Betclic), ou null.
 * Le montant d'une relance est son « to » : c'est le total misé sur la rue.
 */
function normalizeAction(
  line: string
): { player: string; kind: ActionKind; text: string; allIn: boolean } | null {
  let m: RegExpExecArray | null
  if ((m = POST.exec(line))) {
    const label = POST_LABEL[m[2] as keyof typeof POST_LABEL]
    return { player: m[1], kind: 'post', text: `Posts ${label} ${m[3]}`, allIn: !!m[4] }
  }
  if ((m = RAISE.exec(line))) {
    return { player: m[1], kind: 'raise', text: `Raises to ${m[3]}${m[4] ?? ''}`, allIn: !!m[4] }
  }
  if ((m = CALL_BET.exec(line))) {
    const call = m[2] === 'calls'
    return {
      player: m[1],
      kind: call ? 'call' : 'bet',
      text: `${call ? 'Calls' : 'Bets'} ${m[3]}${m[4] ?? ''}`,
      allIn: !!m[4]
    }
  }
  if ((m = FOLD_CHECK.exec(line))) {
    const fold = m[2] === 'folds'
    return {
      player: m[1],
      kind: fold ? 'fold' : 'check',
      text: fold ? 'Folds' : 'Checks',
      allIn: false
    }
  }
  return null
}

function parse(hh: string): ParsedHand | null {
  const lines = hh.split('\n')
  const header = HEADER.exec(lines[0])
  if (!header) return null

  const blinds = header[4].split('/').map(Number)
  const bb = blinds[blinds.length - 1] || 0
  const money = /([\d.]+)€ \+ ([\d.]+)€/.exec(header[2])
  const buyInCents = money ? Math.round((Number(money[1]) + Number(money[2])) * 100) : 0

  const b = new HandBuilder()
  b.bb = bb
  let button = -1
  let inShowdown = false
  let started = false // false tant qu'aucune section `***` n'a été vue : on lit alors les sièges

  for (const raw of lines.slice(1)) {
    const line = raw.trim()

    if (!started) {
      const btn = BUTTON.exec(line)
      if (btn) button = +btn[1]
      const seat = SEAT.exec(line)
      if (seat) b.seats.push({ seat: +seat[1], name: seat[2], tags: [], stack: +seat[3] })
    }

    if (line.startsWith('***')) {
      started = true
      inShowdown = false
      b.street = null
      const name = SECTION.exec(line)?.[1]
      if (name === 'SUMMARY') break // fin de l'historique utile
      switch (name) {
        case 'ANTE/BLINDS':
        case 'PRE-FLOP':
          b.openStreet('preflop', [])
          break
        case 'FLOP':
          b.openStreet('flop', cardsOfLine(line))
          break
        case 'TURN':
          b.openStreet('turn', cardsOfLine(line))
          break
        case 'RIVER':
          b.openStreet('river', cardsOfLine(line))
          break
        case 'SHOW DOWN':
          inShowdown = true
          break
      }
      continue
    }

    const dealt = DEALT.exec(line)
    if (dealt) {
      b.hero = dealt[1]
      b.holes.set(dealt[1], splitCards(dealt[2]))
      continue
    }

    if (inShowdown) {
      const shows = SHOWS.exec(line)
      if (shows) b.addShowdown(shows[1], splitCards(shows[2]))
      continue
    }

    if (!b.street) continue
    const act = normalizeAction(line)
    if (act) b.push(act.player, act.kind, act.text, act.allIn)
  }

  tagRoles(b, button)
  if (b.seats.length < 2) return null
  return {
    room: 'winamax',
    seats: b.seats,
    actions: b.actions,
    showdown: b.showdown,
    hero: b.hero,
    bb,
    holes: b.holes,
    boards: b.boards,
    meta: {
      handId: header[3],
      playedAt: `${header[5]}-${header[6]}-${header[7]}T${header[8]}Z`,
      tournament: header[1].trim(),
      buyInCents,
      bb
    }
  }
}

/** Winamax ne donne pas les rôles : BTN vient du bouton, SB / BB des blindes postées. */
function tagRoles(b: HandBuilder, button: number): void {
  for (const s of b.seats) {
    if (s.seat === button) s.tags.push('BTN')
    if (s.name === b.hero) s.tags.push('Hero')
  }
  for (const a of b.actions) {
    if (a.kind !== 'post') continue
    const role = a.text.startsWith('Posts SB') ? 'SB' : a.text.startsWith('Posts BB') ? 'BB' : ''
    const seat = role ? b.seats.find((s) => s.name === a.player) : undefined
    if (seat && !seat.tags.includes(role)) seat.tags.push(role)
  }
}

export const winamaxParser: RoomParser = {
  room: 'winamax',
  detect: (hh) => hh.startsWith('Winamax Poker'),
  parse
}
