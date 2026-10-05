import planJson from '../../data/plan.json'
import type { Plan } from '../../data/types'
import { Icon } from '../../components/Icon'

const plan = planJson as unknown as Plan

/**
 * Ce que le programme fait de lui-même quand le tendon parle, et d'où vient
 * chaque règle (demande de Mathieu, 28 septembre 2026). Les sources sont les
 * références du calcul ; un chiffre sans source est dit comme tel.
 */
const REGLES: Array<{ titre: string; texte: string; source: string }> = [
  {
    titre: 'Après une alerte, l’intensité attend',
    texte:
      'Une alerte, c’est un réveil à 4, ou une douleur d’effort ou de fin de journée à 4 ou 5. La course facile reste, mais la qualité se court en endurance jusqu’à trois matins calmes d’affilée.',
    source: 'Cook et Purdam : l’intensité sort en premier et revient en dernier.',
  },
  {
    titre: 'Après une crise, la course attend',
    texte:
      'Une crise, c’est un réveil à 5 ou plus, ou une douleur à 6 ou plus. Pas de course avant deux matins calmes d’affilée, trois après un épisode noir. L’intensité revient après sept matins calmes, quatorze après un noir, et d’ici là un jour sans course sépare deux courses.',
    source:
      'Silbernagel et Crossley 2015 : douleur de la vie courante à 2 ou moins avant de reprendre la course. Magnusson, Langberg et Kjær 2010 : le collagène est en perte nette 24 à 36 heures après une charge.',
  },
  {
    titre: 'Un matin calme',
    texte:
      'Réveil à 2 ou moins, jusqu’à 2,5 si c’est ta raideur habituelle des quatre dernières semaines ; et la veille ni fin de journée au-dessus de 2 ni effort au-dessus de 3. Plus l’épisode dure, plus tard le compteur démarre : il part du dernier relevé douloureux.',
    source: 'Silbernagel 2007 : l’effort peut aller jusqu’à 5 si le lendemain matin est revenu au calme.',
  },
  {
    titre: 'Une douleur de fond retire l’intensité',
    texte:
      'Trois matins de suite qui ne sont pas calmes, même sans aucun relevé à 4, font une alerte : la course reste, la qualité se court en endurance jusqu’à trois matins calmes d’affilée.',
    source: 'Silbernagel et Crossley 2015 : douleur de la vie courante à 2 ou moins avant de reprendre la course et les sauts.',
  },
  {
    titre: 'Le volume remonte de 15 % par semaine',
    texte:
      'Une semaine ne dépasse pas de plus de 15 % la part du plan tenue la semaine d’avant. Les courses faciles raccourcissent d’abord, jusqu’à vingt minutes, puis la sortie longue ; le nombre de courses reste.',
    source: 'Nielsen 2014 : plus de 30 % de hausse sur deux semaines s’accompagne de davantage de blessures. Running Addict : garder la fréquence, baisser le volume.',
  },
  {
    titre: 'Une sortie ne dépasse pas la plus longue du mois de plus de 10 %',
    texte: 'Après une longue coupée ou sautée, la suivante reprend par marches de 10 % au lieu de sauter d’un coup.',
    source: 'Frandsen et al. 2025, 5 200 coureurs : c’est le signal de risque le plus net.',
  },
  {
    titre: 'La progression gèle si le tendon n’a pas encaissé',
    texte:
      'La sortie longue et la séance spécifique ne montent pas tant que la précédente n’est pas passée : douleur de séance sous 6, raideur du lendemain saisie, sous 4, et pas plus de 1,5 au-dessus de ta raideur habituelle.',
    source: 'Silbernagel 2007 : la douleur doit être retombée le lendemain matin.',
  },
  {
    titre: 'Le volume s’ouvre après huit semaines calmes',
    texte:
      'Huit semaines sans un jour à 50 ou plus sur l’indice, avec 42 réveils notés et une raideur qui ne monte pas d’une semaine à l’autre : le vélo du mercredi devient une course facile. Un mauvais matin isolé ne remet rien à zéro, l’orange si.',
    source: 'Bohm, Mersmann et Arampatzis 2015 : un tendon adulte change sur des programmes de huit semaines au moins.',
  },
]

const texteDiscret = { color: 'var(--ink-2)', fontSize: 'var(--fs-meta)', lineHeight: 1.5 } as const

/** Les contraintes du plan, vérifiées par reference/check_plan_v2.py, puis les règles de reprise. */
export function Constraints() {
  const contraintes = plan.meta.constraints
  return (
    <>
      <div className="glass" style={{ borderRadius: 'var(--radius)', padding: '16px 17px', marginBottom: 14 }}>
        <p style={{ ...texteDiscret, margin: '0 0 4px' }}>
          Inscrites dans le plan pour protéger le tendon, et vérifiées sur ses 275 séances.
        </p>
        {contraintes.map((c, i) => {
          const retiree = c.startsWith('Retirée')
          return (
            <div
              key={i}
              style={{
                display: 'flex',
                gap: 10,
                padding: '13px 0',
                borderBottom: i < contraintes.length - 1 ? '1px solid var(--border)' : undefined,
                fontSize: 'var(--fs-texte)',
                lineHeight: 1.45,
                color: retiree ? 'var(--ink-3, var(--ink-2))' : undefined,
              }}
            >
              <span style={{ flex: 'none', width: 18, fontVariantNumeric: 'tabular-nums', color: 'var(--ink-2)' }}>{i + 1}</span>
              <span>{c}</span>
            </div>
          )
        })}
      </div>

      <div className="glass" style={{ borderRadius: 'var(--radius)', padding: '16px 17px' }}>
        <b style={{ fontSize: 'var(--fs-body)', display: 'block', marginBottom: 4 }}>Reprise et progression</b>
        <p style={{ ...texteDiscret, margin: '6px 0 4px' }}>
          Ce que le programme fait de lui-même quand le tendon parle. Chaque règle cite sa source ;
          les nombres de matins sont un choix de l’app, les sources donnant le critère et pas le délai.
        </p>
        {REGLES.map((r, i) => (
          <div key={r.titre} style={{ display: 'flex', gap: 10, padding: '13px 0', borderBottom: i < REGLES.length - 1 ? '1px solid var(--border)' : undefined }}>
            <span style={{ color: 'var(--good)', flex: 'none', marginTop: 2 }}>
              <Icon name="check" size={16} />
            </span>
            <div>
              <div style={{ fontSize: 'var(--fs-texte)', fontWeight: 700 }}>{r.titre}</div>
              <div style={{ ...texteDiscret, marginTop: 3 }}>{r.texte}</div>
              <div style={{ ...texteDiscret, marginTop: 4, fontStyle: 'italic' }}>{r.source}</div>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
