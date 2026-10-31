import assert from 'node:assert/strict'
import { test } from 'node:test'
import { assignPositions, parseHand } from '../src/index.ts'
import { BETCLIC_3BET, WINAMAX_CBET, WINAMAX_SHOWDOWN } from './fixtures.ts'

test('Winamax : sièges, rôles, actions normalisées et méta', () => {
  const h = parseHand(WINAMAX_CBET)
  assert.ok(h)
  assert.equal(h.room, 'winamax')
  assert.equal(h.bb, 20)
  assert.equal(h.hero, 'Alice')
  assert.deepEqual(h.meta, {
    handId: '123-1-1',
    playedAt: '2026-01-05T12:00:00Z',
    tournament: 'Test',
    buyInCents: 200,
    bb: 20
  })
  assert.deepEqual(
    h.seats.map((s) => s.tags),
    [['BTN', 'Hero'], ['SB'], ['BB']]
  )
  assert.deepEqual(
    h.actions.map((a) => `${a.street}:${a.player}:${a.kind}:${a.amount}`),
    [
      'preflop:Bob:post:10',
      'preflop:Carl:post:20',
      'preflop:Alice:raise:60',
      'preflop:Bob:fold:0',
      'preflop:Carl:call:40',
      'flop:Carl:check:0',
      'flop:Alice:bet:80',
      'flop:Carl:fold:0'
    ]
  )
  assert.deepEqual(h.boards.flop, ['2c', '7d', '9h'])
})

test('Winamax : showdown, cartes connues et board par rue', () => {
  const h = parseHand(WINAMAX_SHOWDOWN)
  assert.ok(h)
  assert.deepEqual(h.showdown, ['Alice', 'Bob'])
  assert.deepEqual(h.holes.get('Bob'), ['Qc', 'Qd'])
  assert.ok(h.boards.turn && h.boards.river)
})

test('Betclic : héros, blindes, actions', () => {
  const h = parseHand(BETCLIC_3BET)
  assert.ok(h)
  assert.equal(h.room, 'betclic')
  assert.equal(h.hero, 'Fay')
  assert.equal(h.bb, 20)
  assert.deepEqual(h.holes.get('Fay'), ['Qs', 'Qd'])
  assert.equal(h.actions.filter((a) => a.kind === 'raise').length, 2)
})

test('un historique illisible retourne null', () => {
  assert.equal(parseHand('Winamax Poker - autre chose'), null)
  assert.equal(parseHand('du texte'), null)
})

test('positions : BTN, SB, BB, puis EP / LJ / HJ / CO jusqu au bouton', () => {
  const names = ['a', 'b', 'c', 'd', 'e', 'f', 'g']
  const hand = parseHand(WINAMAX_CBET)!
  hand.seats = names.map((name, i) => ({
    seat: i + 1,
    name,
    tags: i === 0 ? ['BTN'] : [],
    stack: 1
  }))
  hand.actions = names.map((player) => ({
    street: 'preflop',
    player,
    kind: 'fold',
    allIn: false,
    text: 'Folds',
    amount: 0
  }))
  const { positions } = assignPositions(hand)
  assert.deepEqual(
    names.map((n) => positions.get(n)),
    ['BTN', 'SB', 'BB', 'EP', 'LJ', 'HJ', 'CO']
  )
})
