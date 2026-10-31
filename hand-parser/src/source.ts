import { createReadStream } from 'node:fs'
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createInterface } from 'node:readline'

/** Un historique brut, tel que le fournit n'importe quelle source (base, fichier, test). */
export interface RawHand {
  id: string | number
  hh: string
}

/** Tout ce qui sait fournir des mains : tableau, générateur, curseur de base de données… */
export type HandSource = Iterable<RawHand> | AsyncIterable<RawHand>

/** Source depuis un tableau d'historiques ; l'id est la position. Pratique pour les tests. */
export function fromStrings(hhs: readonly string[]): RawHand[] {
  return hhs.map((hh, i) => ({ id: i, hh }))
}

/**
 * Découpe un fichier texte en mains : une main finit par une ou plusieurs lignes vides
 * (au moins 2 d'affilée, le résumé d'une main pouvant contenir une ligne vide).
 */
export function splitHands(text: string): string[] {
  return text
    .replace(/\r\n/g, '\n')
    .split(/\n{3,}/)
    .map((h) => h.trim())
    .filter(Boolean)
}

/** Fichier texte brut (export de room) contenant plusieurs mains. */
export async function* fromTextFile(path: string): AsyncGenerator<RawHand> {
  const hands = splitHands(await readFile(path, 'utf8'))
  for (let i = 0; i < hands.length; i++) yield { id: `${path}#${i}`, hh: hands[i] }
}

/** Tous les fichiers `.txt` d'un dossier (non récursif). */
export async function* fromDirectory(dir: string): AsyncGenerator<RawHand> {
  const files = (await readdir(dir)).filter((f) => f.endsWith('.txt')).sort()
  for (const f of files) yield* fromTextFile(join(dir, f))
}

/**
 * Fichier JSON Lines : une ligne = soit une chaîne (l'historique), soit `{ "id", "hh" }`.
 * Même format que le stockage des mains importées de l'application (déjà décompressé).
 */
export async function* fromJsonl(path: string): AsyncGenerator<RawHand> {
  const lines = createInterface({ input: createReadStream(path, 'utf8'), crlfDelay: Infinity })
  let n = 0
  for await (const line of lines) {
    if (!line.trim()) continue
    const value = JSON.parse(line) as string | { id?: string | number; hh: string }
    yield typeof value === 'string' ? { id: n, hh: value } : { id: value.id ?? n, hh: value.hh }
    n++
  }
}
