import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  analyze,
  computeStats,
  fromStrings,
  mergePlayers,
  ratio,
  type Counters
} from '../src/index.ts'
import { BETCLIC_3BET, WINAMAX_CBET, WINAMAX_CHECK_RAISE, WINAMAX_SHOWDOWN } from './fixtures.ts'

/** [fait, occasions] */
const made = (c: Counters | undefined, stat: string): [number, number] => {
  const r = ratio(c ?? {}, stat)
  return [r.made, r.opp]
}

test('Winamax c-bet : RFI, steal, c-bet, fold to c-bet, fold to steal', async () => {
  const { players } = await analyze(fromStrings([WINAMAX_CBET]))
  const alice = players.get('winamax|Alice')
  const bob = players.get('winamax|Bob')
  const carl = players.get('winamax|Carl')

  assert.deepEqual(made(alice, 'vpip'), [1, 1])
  assert.deepEqual(made(alice, 'pfr'), [1, 1])
  assert.deepEqual(made(alice, 'rfi'), [1, 1])
  assert.deepEqual(made(alice, 'steal'), [1, 1])
  assert.deepEqual(made(alice, 'cbet'), [1, 1])

  assert.deepEqual(made(bob, 'vpip'), [0, 1])
  assert.deepEqual(made(bob, 'rfi'), [0, 0]) // Alice a déjà ouvert
  assert.deepEqual(made(bob, 'foldToSteal'), [1, 1])

  assert.deepEqual(made(carl, 'vpip'), [1, 1])
  assert.deepEqual(made(carl, 'foldToSteal'), [0, 1])
  assert.deepEqual(made(carl, 'threebet'), [0, 1])
  assert.deepEqual(made(carl, 'foldToCbet'), [1, 1])
  assert.deepEqual(made(carl, 'checkRaiseFlop'), [0, 1]) // a checké puis foldé face à la mise
})

test('Betclic 3bet : 3bet et fold to 3bet', async () => {
  const { players, heroes } = await analyze(fromStrings([BETCLIC_3BET]))
  assert.deepEqual([...heroes], ['betclic|Fay'])
  assert.deepEqual(made(players.get('betclic|Fay'), 'threebet'), [1, 1])
  assert.deepEqual(made(players.get('betclic|Dan'), 'fold3bet'), [1, 1])
  assert.deepEqual(made(players.get('betclic|Dan'), 'rfi'), [1, 1])
  assert.deepEqual(made(players.get('betclic|Dan'), 'steal'), [1, 1])
  assert.deepEqual(made(players.get('betclic|Eve'), 'foldToSteal'), [1, 1])
  assert.equal(players.get('betclic|Dan')?.hands, 1)
})

test('check-raise : occasion à la première action après la mise', async () => {
  const { players } = await analyze(fromStrings([WINAMAX_CHECK_RAISE]))
  assert.deepEqual(made(players.get('winamax|Bob'), 'checkRaiseFlop'), [1, 1])
  assert.deepEqual(made(players.get('winamax|Alice'), 'checkRaiseFlop'), [0, 0])
  assert.deepEqual(made(players.get('winamax|Alice'), 'cbet'), [1, 1])
})

test('heads-up : pas de c-bet manqué ni de check-raise sans mise', async () => {
  const { players } = await analyze(fromStrings([WINAMAX_SHOWDOWN]))
  assert.deepEqual(made(players.get('winamax|Alice'), 'rfi'), [1, 1])
  assert.deepEqual(made(players.get('winamax|Bob'), 'foldToCbet'), [0, 1])
  // Bob a checké puis payé la mise : il n'a pas relancé
  assert.deepEqual(made(players.get('winamax|Bob'), 'checkRaiseFlop'), [0, 1])
})

test('analyze : mains illisibles comptées, filtre only, agrégation', async () => {
  const skippedIds: Array<string | number> = []
  const result = await analyze(fromStrings([WINAMAX_CBET, 'rien', WINAMAX_SHOWDOWN]), {
    only: new Set(['winamax|Alice']),
    onSkip: (h) => skippedIds.push(h.id)
  })
  assert.equal(result.skipped, 1)
  assert.deepEqual(skippedIds, [1])
  assert.deepEqual([...result.players.keys()], ['winamax|Alice'])
  assert.equal(result.handsByRoom.winamax, 2)

  const total = mergePlayers(result.players)
  assert.equal(total.hands, 2)
  assert.equal(computeStats(total).stats.find((s) => s.id === 'vpip')?.pct, 100)
})
