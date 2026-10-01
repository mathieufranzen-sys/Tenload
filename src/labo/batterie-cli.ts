/**
 * Passe la batterie de scénarios et fige les résultats d'une version du
 * calcul dans `batterie-resultats.json`, à côté des autres versions.
 *
 *   npx vite-node src/labo/batterie-cli.ts <version>
 *
 * La page des sources (`/calcul.html`) lit ce fichier : chaque version du
 * calcul y garde sa colonne, pour voir ce qu'un changement a amélioré ou
 * cassé.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { SCENARIOS, type Resultat } from './batterie'

const version = process.argv[2]
if (!version) throw new Error('Usage : batterie-cli.ts <version>')

const fichier = new URL('./batterie-resultats.json', import.meta.url).pathname
const tout: Record<string, Record<string, Resultat>> = existsSync(fichier) ? JSON.parse(readFileSync(fichier, 'utf8')) : {}

const resultats: Record<string, Resultat> = {}
for (const s of SCENARIOS) {
  const t0 = Date.now()
  let r: Resultat
  try {
    r = s.mesurer()
  } catch (e) {
    r = { valeur: `erreur : ${(e as Error).message}`, ok: false }
  }
  resultats[s.code] = r
  console.log(`${s.code.padEnd(4)} ${r.ok ? 'OK  ' : 'NON '} ${r.valeur}  (${Date.now() - t0} ms)`)
}
tout[version] = resultats
writeFileSync(fichier, JSON.stringify(tout, null, 2) + '\n')
const ok = Object.values(resultats).filter((r) => r.ok).length
console.log(`\n${version} : ${ok} / ${SCENARIOS.length} attentes tenues`)
