# pokstats-hand-parser

Parseur d'historiques de mains de tournoi **Betclic** et **Winamax**, plus le calcul de **stats de base par joueur**. Extrait de l'application pokanalysis : aucune dépendance à Electron, à React ni à la base Postgres de Pokstats. On lui donne des historiques bruts (texte), il rend des compteurs.

## Démarrage rapide

Node ≥ 22.6, TypeScript exécuté directement (pas d'étape de build).

```bash
npm install        # typescript et @types/node uniquement
npm test           # 10 tests sur des mains synthétiques
npm run typecheck
```

```ts
import { analyze, computeStats, fromJsonl } from './src/index.ts'

const { players, skipped } = await analyze(fromJsonl('mains.jsonl'))
for (const [key, counters] of players) {
  const { hands, stats } = computeStats(counters)
  console.log(key, hands, stats.map((s) => `${s.label} ${s.pct?.toFixed(0) ?? '-'}%`).join(' | '))
}
```

## Comment ça marche

```
RawHand (texte)  →  parseHand  →  ParsedHand  →  accumulate  →  Counters  →  computeStats
 source.ts          parsers/        types.ts       stats/        counters.ts   stats/definitions.ts
```

1. **Source** (`source.ts`) : tout ce qui fournit des `RawHand { id, hh }` (un tableau, un générateur, un curseur SQL…). C'est **le point de branchement** pour un jeu de données de test.
2. **Parseur** (`parsers/`) : `parseHand(hh)` choisit la room d'après l'en-tête et retourne un `ParsedHand`, ou `null` si la main est inexploitable. Les deux rooms sont ramenées au même modèle : mêmes types d'action, mêmes textes normalisés (`Raises to 300`, `Folds`…).
3. **Analyse** (`stats/`) : `accumulate(hand, into)` ajoute la main aux compteurs de chaque joueur. `analyze(source)` fait toute la boucle (parse + accumulate) et rend les compteurs par joueur.
4. **Lecture** : `computeStats(counters)` transforme les compteurs en pourcentages prêts à afficher.

### Le modèle `ParsedHand`

| Champ         | Contenu                                                                                                                     |
| ------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `room`        | `'betclic'` ou `'winamax'`                                                                                                  |
| `seats`       | siège, pseudo, stack de départ, `tags` (`BTN`, `SB`, `BB`, `Hero`)                                                          |
| `actions`     | liste ordonnée : `street`, `player`, `kind` (`fold` `check` `call` `bet` `raise` `post` `other`), `allIn`, `text`, `amount` |
| `showdown`    | joueurs ayant montré leurs cartes                                                                                           |
| `holes`       | cartes connues : héros + showdown                                                                                           |
| `boards`      | board cumulé par rue (`flop`, `turn`, `river`)                                                                              |
| `hero` / `bb` | pseudo du héros (ou `null`), big blind                                                                                      |
| `meta`        | id de main, date, tournoi, buy-in : **Winamax uniquement** (Betclic les fournit via la base)                                |

`amount` est le premier nombre du texte de l'action. Pour une relance Winamax c'est le « to » (total misé sur la rue).

### Les compteurs

Un joueur = un objet plat `Record<string, number>`, indexé par `room|pseudo` (le pseudo n'est unique que dans une room, voir `playerKey`).

- Un pourcentage = deux clés : `<stat>_n` (fait) et `<stat>_d` (occasions). Lecture : `ratio(counters, 'vpip')`.
- Compteur simple : `hands` (mains distribuées au joueur).
- `merge([...])` additionne des compteurs (plusieurs joueurs, plusieurs sessions).

Garder des compteurs bruts plutôt que des pourcentages permet d'agréger sans perte et d'afficher la taille de l'échantillon.

## Les stats de base

Définies une seule fois dans `stats/definitions.ts` (`STATS`, qui sert aussi à l'affichage). Résumé :

| Stat                 | Fait                                        | Occasion                                                                   |
| -------------------- | ------------------------------------------- | -------------------------------------------------------------------------- |
| **VPIP**             | a payé ou relancé volontairement au préflop | a eu une action préflop (le walk du BB n'en est pas une)                   |
| **PFR**              | a relancé au préflop                        | idem                                                                       |
| **RFI**              | a ouvert en relance                         | première action sans relance ni limp devant, toutes positions              |
| **3bet**             | a relancé face à une seule relance          | première action face à une open-raise                                      |
| **Fold to 3bet**     | l'ouvreur a foldé                           | l'ouvreur a eu une action face à une 3bet                                  |
| **Steal**            | a ouvert en relance                         | RFI depuis BTN/CO/SB uniquement (sous-ensemble du RFI)                     |
| **Fold to steal**    | a foldé                                     | blinde (SB/BB) face à une open de BTN/CO/SB                                |
| **C-bet flop**       | a misé au flop                              | dernier relanceur préflop, premier à miser au flop                         |
| **Fold to c-bet**    | a foldé                                     | première réponse à un c-bet                                                |
| **Check-raise flop** | a relancé                                   | a checké avant la première mise du flop ; première action après cette mise |

Chaque occasion n'est comptée **qu'une fois par joueur et par main**. Les positions sont calculées par `assignPositions` : `BTN`, `SB`, `BB`, puis `CO`, `HJ`, `LJ`, `EP` (en heads-up le bouton est SB).

## Structure

```
src/
  index.ts            point d'entrée (tout est réexporté)
  types.ts            Room, Seat, Action, ParsedHand, RoomParser, Counters, playerKey
  source.ts           HandSource + fromStrings / fromJsonl / fromTextFile / fromDirectory
  analyze.ts          analyze(source) : boucle parse + accumulate ; mergePlayers
  counters.ts         record, ratio, merge
  positions.ts        assignPositions, STEAL_POSITIONS
  parsers/
    index.ts          parseHand + DEFAULT_PARSERS
    betclic.ts        parseur Betclic
    winamax.ts        parseur Winamax (normalise vers le vocabulaire Betclic)
    common.ts         HandBuilder : ce que partagent les deux parseurs
  stats/
    definitions.ts    STATS, computeStats
    accumulate.ts     accumulate(hand, into) : orchestre préflop puis postflop
    preflop.ts        VPIP, PFR, RFI, 3bet, fold to 3bet, steal, fold to steal
    flop.ts           c-bet, fold to c-bet, check-raise flop
    sink.ts           StatSink : où les stats sont écrites (joueur, room, filtre)
test/                 fixtures synthétiques + tests du parseur et des stats
```

## Brancher un jeu de données

- **Tableau de textes** : `analyze(fromStrings(['Winamax Poker - …', '…']))`.
- **JSON Lines** : `fromJsonl(path)`, une ligne = une chaîne, ou `{ "id": …, "hh": … }`.
- **Fichiers texte** d'export : `fromTextFile(path)` / `fromDirectory(dir)`. Les mains sont séparées par au moins 2 lignes vides (heuristique de `splitHands`).
- **Base de données ou autre** : écrire un générateur asynchrone.

```ts
async function* fromMyDb(): AsyncGenerator<RawHand> {
  for await (const row of cursor) yield { id: row.id_hand, hh: row.hh }
}
await analyze(fromMyDb())
```

Options d'`analyze` : `only` (ne compter que ces `room|pseudo`), `onSkip` (mains illisibles), `onHand` (accès à chaque `ParsedHand`), `parsers` (voir plus bas). Le résultat donne aussi `handsByRoom`, `skipped` et `heroes`.

## Étendre

- **Ajouter une stat** : 1) un bloc dans `stats/preflop.ts` ou `stats/flop.ts` qui appelle `sink.record(joueur, 'maStat', fait)` à chaque occasion ; 2) une entrée dans `STATS` (`definitions.ts`) ; 3) un test dans `test/analyze.test.ts`. Aucun autre fichier à modifier.
- **Ajouter une room** : implémenter `RoomParser` (`room`, `detect`, `parse`), ajouter la room à l'union `Room`, et passer `parsers: [monParseur, ...DEFAULT_PARSERS]` à `analyze` (ou l'ajouter à `DEFAULT_PARSERS`). Il suffit que `parse` rende un `ParsedHand` : les stats n'ont rien à savoir de la room. L'ordre compte : Betclic accepte tout ce qui n'est pas Winamax, il doit rester en dernier.
- **Parser une main seule** : `parseHand(hh)` puis `accumulate(parsed, into)`.

## Limites connues

- **Format Betclic** : reconstitué d'après le code du parseur d'origine (les historiques viennent de la base Pokstats) ; les fixtures Betclic sont donc synthétiques. Le montant d'une relance Betclic est lu comme le premier nombre du texte.
- **Tests sur mains synthétiques** : aucune main réelle n'est versionnée. Pour valider sur de vraies données, brancher une source et comparer avec un tracker.
- Tournois no-limit hold'em uniquement (c'est ce que les deux regex d'en-tête acceptent).
