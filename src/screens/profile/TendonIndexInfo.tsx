import { BANDS, type Band } from '../../lib/tendonIndex'

const TERMES: Array<{ nom: string; poids: string; texte: string }> = [
  {
    nom: 'Douleur déclarée',
    poids: "jusqu'à 85 points",
    texte:
      "La raideur au réveil pèse 45 %, la douleur en fin de journée 35 %, le ressenti pendant l'effort 20 %. Un pic isolé n'est jamais dilué par une moyenne. La réponse est volontairement convexe : une gêne de fond à 2 sur 10 ne t'alarme pas, un vrai 6 arrête tout.",
  },
  {
    nom: 'Emballement de la charge',
    poids: "jusqu'à 30 points",
    texte:
      'Le rapport entre ta charge des derniers jours et ta charge de fond. Au-delà de 1,3, le tendon encaisse plus que son habitude.',
  },
  {
    nom: 'Fraîcheur immédiate',
    poids: "jusqu'à 20 points",
    texte: "Ce que tu as encaissé hier et avant-hier, rapporté à ton niveau habituel. Un tendon met 48 heures à se réparer.",
  },
  {
    nom: 'Tendance',
    poids: "jusqu'à 6 points",
    texte: 'La pente de ta raideur matinale sur quatre jours. Seule une hausse compte.',
  },
  {
    nom: 'Monotonie',
    poids: "jusqu'à 8 points",
    texte: 'Une semaine sans aucun jour vraiment léger use le tendon, même à volume constant.',
  },
  {
    nom: 'Gestes protecteurs',
    poids: 'jusqu’à −15 points',
    texte:
      'Le protocole excentrique de la veille vaut −6, une vraie journée de repos −5, le glaçage −2, les sauts −2. Faire ta muscu fait baisser ton indice : c’est le traitement, pas une agression.',
  },
]

/** Bandes et détail du calcul — fusionnés en une seule sous-page, même sujet. */
export function TendonIndexInfo({ idx, band }: { idx: number; band: Band }) {
  return (
    <>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px 17px', marginBottom: 14 }}>
        <p style={{ color: 'var(--ink-2)', fontSize: 14, lineHeight: 1.5, margin: '0 0 14px' }}>
          Une note de 0 à 100 recalculée à chaque saisie. Elle pilote le programme toute seule : les
          séances se transforment sans que tu aies à demander. Aujourd'hui :{' '}
          <b style={{ color: band.color }}>
            {idx} sur 100, {band.name.toLowerCase()}
          </b>
          .
        </p>
        {BANDS.map((b, i) => (
          <div key={b.key} style={{ display: 'flex', gap: 12, padding: '11px 0', borderBottom: i < BANDS.length - 1 ? '1px solid var(--border)' : undefined }}>
            <div style={{ width: 5, borderRadius: 3, background: b.color, flex: 'none' }} />
            <div>
              <div style={{ fontSize: 14.5, fontWeight: 700 }}>
                {i === 0 ? 0 : BANDS[i - 1].max + 1} à {b.max} · {b.name} — {b.headline}
              </div>
              <div style={{ color: 'var(--ink-2)', fontSize: 13.5, lineHeight: 1.45, marginTop: 2 }}>{b.detail}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px 17px' }}>
        <b style={{ fontSize: 16, display: 'block', marginBottom: 4 }}>Comment il est calculé</b>
        <p style={{ color: 'var(--ink-2)', fontSize: 14, lineHeight: 1.5, margin: '6px 0 12px' }}>
          Cinq termes qui s'additionnent, moins ce qui protège. Le modèle est calibré sur 45 jours
          réels : il donne une médiane de 23 et il est monté à 59 le 3 août, la veille d'une
          entorse de cheville.
        </p>
        {TERMES.map((t) => (
          <div key={t.nom} style={{ padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline' }}>
              <b style={{ fontSize: 14.5 }}>{t.nom}</b>
              <span style={{ color: 'var(--ink-2)', fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap' }}>{t.poids}</span>
            </div>
            <div style={{ color: 'var(--ink-2)', fontSize: 13.5, lineHeight: 1.45, marginTop: 3 }}>{t.texte}</div>
          </div>
        ))}
        <p style={{ color: 'var(--ink-2)', fontSize: 13.5, lineHeight: 1.5, margin: '14px 0 0' }}>
          Deux garde-fous s'ajoutent. Une douleur déclarée à 4 impose un plancher orange, à 6 un
          plancher rouge, à 8 un plancher noir : ces seuils ne peuvent pas être contournés par un
          indice bas ailleurs. Et après un pic au-dessus de 60, un plancher décroissant tient
          quelques jours, parce qu'un tendon réactif reste fragile même quand la douleur est
          retombée.
        </p>
      </div>
    </>
  )
}
