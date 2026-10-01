import { TEINTE_BANDE } from '../../lib/teintes'
import { BANDS, type Band } from '../../lib/tendonIndex'

const TERMES: Array<{ nom: string; poids: string; texte: string }> = [
  {
    nom: 'Douleur déclarée',
    poids: "jusqu'à 85 points",
    texte:
      "La raideur au réveil pèse 45 %, la douleur en fin de journée 35 %, le ressenti pendant l'effort 20 %. Un pic isolé n'est jamais dilué par une moyenne. La réponse est volontairement convexe : une gêne de fond à 2 sur 10 ne t'alarme pas, un 3 te met en jaune à lui seul, un vrai 6 arrête tout.",
  },
  {
    nom: 'Emballement de la charge',
    poids: "jusqu'à 30 points",
    texte:
      'Le rapport entre ta charge des derniers jours et ta charge de fond. Il ne compte qu’au-delà de 1,3 : en dessous, c’est la zone où le risque de blessure est le plus bas.',
  },
  {
    nom: 'Fraîcheur immédiate',
    poids: "jusqu'à 20 points",
    texte: "Ce que tu as encaissé hier et avant-hier, au-delà d’une journée ordinaire. Le collagène du tendon est en perte nette 24 à 36 heures après une charge, puis il se reconstruit : une séance prévue ne compte pas, une journée hors norme oui.",
  },
  {
    nom: 'Tendance',
    poids: "jusqu'à 6 points",
    texte: 'Ta raideur au réveil de la semaine, comparée à la semaine d’avant. Seule une hausse compte.',
  },
  {
    nom: 'Monotonie',
    poids: "jusqu'à 8 points",
    texte: 'Une semaine où chaque jour ressemble au précédent use le tendon, même à volume constant. Ton dimanche de repos suffit à l’éviter.',
  },
  {
    nom: 'Gestes protecteurs',
    poids: 'jusqu’à −13 points',
    texte:
      'Le protocole excentrique de la veille vaut −6, une vraie journée de repos −5, boire au moins 2 litres −2. Les sauts sont saisis mais ne comptent plus : ils chargent le tendon plus que la course. Faire ta muscu fait baisser ton indice : c’est le traitement, pas une agression. Le glaçage est saisi mais ne pèse plus : pas d’effet démontré sur la charge mécanique.',
  },
]

/** Bandes et détail du calcul — fusionnés en une seule sous-page, même sujet. */
export function TendonIndexInfo({ idx, band }: { idx: number; band: Band }) {
  return (
    <>
      <div className="glass" style={{ borderRadius: 'var(--radius)', padding: '16px 17px', marginBottom: 14 }}>
        <p style={{ color: 'var(--ink-2)', fontSize: 'var(--fs-meta)', lineHeight: 1.5, margin: '0 0 14px' }}>
          Une note de 0 à 100 recalculée à chaque saisie. Elle pilote le programme toute seule : les
          séances se transforment sans que tu aies à demander. Aujourd'hui :{' '}
          <b>
            {idx} sur 100, {band.name.toLowerCase()}
          </b>
          .
        </p>
        {BANDS.map((b, i) => (
          <div key={b.key} style={{ display: 'flex', gap: 12, padding: '11px 0', borderBottom: i < BANDS.length - 1 ? '1px solid var(--border)' : undefined }}>
            <div style={{ width: 5, borderRadius: 3, background: TEINTE_BANDE[b.key], flex: 'none' }} />
            <div>
              <div style={{ fontSize: 'var(--fs-texte)', fontWeight: 700 }}>
                {i === 0 ? 0 : BANDS[i - 1].max + 1} à {b.max} · {b.name} — {b.headline}
              </div>
              <div style={{ color: 'var(--ink-2)', fontSize: 'var(--fs-meta)', lineHeight: 1.45, marginTop: 2 }}>{b.detail}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="glass" style={{ borderRadius: 'var(--radius)', padding: '16px 17px' }}>
        <b style={{ fontSize: 'var(--fs-body)', display: 'block', marginBottom: 4 }}>Comment il est calculé</b>
        <p style={{ color: 'var(--ink-2)', fontSize: 'var(--fs-meta)', lineHeight: 1.5, margin: '6px 0 12px' }}>
          Cinq termes qui s'additionnent, moins ce qui protège. Le modèle est calibré sur 45 jours
          réels : il donne une médiane de 23 et il est monté à 59 le 3 août, la veille d'une
          entorse de cheville.
        </p>
        {TERMES.map((t) => (
          <div key={t.nom} style={{ padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline' }}>
              <b style={{ fontSize: 'var(--fs-texte)' }}>{t.nom}</b>
              <span style={{ color: 'var(--ink-2)', fontSize: 'var(--fs-detail)', fontWeight: 700, whiteSpace: 'nowrap' }}>{t.poids}</span>
            </div>
            <div style={{ color: 'var(--ink-2)', fontSize: 'var(--fs-meta)', lineHeight: 1.45, marginTop: 3 }}>{t.texte}</div>
          </div>
        ))}
        <p style={{ color: 'var(--ink-2)', fontSize: 'var(--fs-meta)', lineHeight: 1.5, margin: '14px 0 0' }}>
          Deux garde-fous s'ajoutent. Les planchers, sur deux échelles : la raideur au réveil impose
          l'orange à 4, le rouge à 5, le noir à 7 ; la douleur d'effort ou du soir, l'orange à 4, le
          rouge à 6, le noir à 8. Ils tiennent pleins le jour même et le lendemain, et aucun indice
          bas ailleurs ne peut les contourner. Et après un pic au-dessus de 60, un plancher
          décroissant tient quelques jours. Ce que le programme fait ensuite, jusqu'au retour au
          calme, est dans Contraintes.
        </p>
      </div>
    </>
  )
}
