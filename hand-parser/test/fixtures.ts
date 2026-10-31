// Mains synthétiques (aucune donnée réelle). Le format Betclic est reconstitué d'après le parseur.

/** Winamax, 3 joueurs : Alice (BTN) ouvre, Carl (BB) paie, c-bet du flop, Carl fold. */
export const WINAMAX_CBET = `Winamax Poker - Tournament "Test" buyIn: 1.80€ + 0.20€ level: 1 - HandId: #123-1-1 - Holdem no limit (10/20) - 2026/01/05 12:00:00 UTC
Table: 'Test(1)#0' 3-max (real money) Seat #1 is the button
Seat 1: Alice (1500)
Seat 2: Bob (1500)
Seat 3: Carl (1500)
*** ANTE/BLINDS ***
Bob posts small blind 10
Carl posts big blind 20
Dealt to Alice [Ah Kd]
*** PRE-FLOP ***
Alice raises 40 to 60
Bob folds
Carl calls 40
*** FLOP *** [2c 7d 9h]
Carl checks
Alice bets 80
Carl folds
*** SUMMARY ***
Total pot 150
Seat 1: Alice (button) won 150`

/** Winamax, heads-up jusqu'au showdown. */
export const WINAMAX_SHOWDOWN = `Winamax Poker - Tournament "Test" buyIn: 1.80€ + 0.20€ level: 1 - HandId: #123-1-2 - Holdem no limit (10/20) - 2026/01/05 12:01:00 UTC
Table: 'Test(1)#0' 2-max (real money) Seat #1 is the button
Seat 1: Alice (1500)
Seat 2: Bob (1500)
*** ANTE/BLINDS ***
Alice posts small blind 10
Bob posts big blind 20
Dealt to Alice [Ah Kd]
*** PRE-FLOP ***
Alice raises 20 to 40
Bob calls 20
*** FLOP *** [2c 7d 9h]
Bob checks
Alice bets 40
Bob calls 40
*** TURN *** [2c 7d 9h][Js]
Bob checks
Alice checks
*** RIVER *** [2c 7d 9h Js][3s]
Bob checks
Alice checks
*** SHOW DOWN ***
Alice shows [Ah Kd] (High card)
Bob shows [Qc Qd] (Pair of Queens)
*** SUMMARY ***
Total pot 200`

/** Betclic, 3 joueurs : open de Dan (BTN), 3bet du héros (BB), Dan fold. */
export const BETCLIC_3BET = `Seat 1: Dan (1500) [BTN]
Seat 2: Eve (1500) [SB]
Seat 3: Fay (1500) [BB Hero]
Blinds: 10/20
*** HOLE CARDS ***
Fay: [Qs Qd]
*** PRE-FLOP ***
00:00:01 - Eve: Posts SB 10
00:00:01 - Fay: Posts BB 20
00:00:02 - Dan: Raises 60
00:00:03 - Eve: Folds
00:00:04 - Fay: Raises 180
00:00:05 - Dan: Folds`

/** Winamax, heads-up : Alice ouvre, Bob paie, c-bet, check-raise de Bob, Alice fold. */
export const WINAMAX_CHECK_RAISE = `Winamax Poker - Tournament "Test" buyIn: 1.80€ + 0.20€ level: 1 - HandId: #123-1-3 - Holdem no limit (10/20) - 2026/01/05 12:02:00 UTC
Table: 'Test(1)#0' 2-max (real money) Seat #1 is the button
Seat 1: Alice (1500)
Seat 2: Bob (1500)
*** ANTE/BLINDS ***
Alice posts small blind 10
Bob posts big blind 20
Dealt to Alice [Ah Kd]
*** PRE-FLOP ***
Alice raises 20 to 40
Bob calls 20
*** FLOP *** [2c 7d 9h]
Bob checks
Alice bets 40
Bob raises 80 to 120
Alice folds
*** SUMMARY ***
Total pot 200`
