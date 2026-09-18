/**
 * La carte du bilan de la semaine, au-dessus du mot du coach, le dimanche et
 * le lundi. Le dimanche soir parce que c'est là que la semaine se referme ; le
 * lundi matin parce qu'on ne relit pas toujours l'app le dimanche, et que la
 * semaine qui commence est justement celle dont la carte parle.
 *
 * Trois temps, validés en maquette le 18 septembre 2026 : ce que tu as fait, ce
 * que ton corps en dit, ce que ça vaut pour les deux échéances. Puis les
 * erreurs de la semaine, les adaptations proposées, et le mot mental.
 *
 * Une ligne ne s'affiche jamais avec un chiffre que le modèle n'a pas : sans
 * mesure, elle dit ce qui manque.
 */
import type { CSSProperties, ReactNode } from 'react'
import { PART_LONGUE_MAX, SEUIL_CIBLE, type BilanSemaine } from '../lib/bilan'
import { DAYS_LONG, formatDay, formatNumber, weekdayIndex } from '../lib/dates'
import { MARATHON_KM, formatDuration, formatPace } from '../lib/paces'

const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? 's' : ''}`

const styleBloc: CSSProperties = {
  fontSize: 11,
  fontWeight: 750,
  letterSpacing: '1.1px',
  textTransform: 'uppercase',
  color: 'var(--ink-3)',
  margin: '18px 0 2px',
}

function Ligne({
  libelle,
  children,
  pastille,
}: {
  libelle: string
  children: ReactNode
  pastille?: { texte: string; bonne: boolean }
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        gap: 12,
        padding: '10px 0',
        borderBottom: '1px solid var(--border)',
        fontSize: 14.5,
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      <span style={{ color: 'var(--ink-2)', flex: 'none' }}>{libelle}</span>
      <span style={{ fontWeight: 650, textAlign: 'right' }}>
        {children}
        {pastille && (
          <span
            style={{
              display: 'inline-block',
              fontSize: 9.5,
              fontWeight: 800,
              letterSpacing: '.9px',
              textTransform: 'uppercase',
              padding: '3px 8px',
              borderRadius: 'var(--pill)',
              marginLeft: 8,
              whiteSpace: 'nowrap',
              background: pastille.bonne ? 'rgba(52,211,153,.18)' : 'rgba(251,191,36,.16)',
              border: `1px solid ${pastille.bonne ? 'rgba(52,211,153,.3)' : 'rgba(251,191,36,.32)'}`,
              color: pastille.bonne ? '#6ee7b7' : '#fcd34d',
            }}
          >
            {pastille.texte}
          </span>
        )}
      </span>
    </div>
  )
}

const Secondaire = ({ children }: { children: ReactNode }) => (
  <span style={{ color: 'var(--ink-2)', fontWeight: 500 }}> {children}</span>
)

function Liste({ titre, items }: { titre: string; items: string[] }) {
  if (items.length === 0) return null
  return (
    <>
      <div style={styleBloc}>{titre}</div>
      <ul style={{ margin: '6px 0 0', paddingLeft: 18, fontSize: 14.5, lineHeight: 1.55, color: 'var(--ink-2)' }}>
        {items.map((x) => (
          <li key={x} style={{ marginBottom: 5 }}>
            {x}
          </li>
        ))}
      </ul>
    </>
  )
}

export function CarteBilan({ bilan: b, style }: { bilan: BilanSemaine; style?: CSSProperties }) {
  const chrono = b.forme ? formatDuration(Math.round((b.forme.allure * MARATHON_KM) / 60)) : null

  return (
    <div className="glass" style={{ borderRadius: 'var(--radius)', padding: '15px 16px', ...style }}>
      <div style={{ fontSize: 11, fontWeight: 750, letterSpacing: '1.1px', textTransform: 'uppercase', color: 'var(--ink-3)' }}>
        Bilan de la semaine {b.n}
      </div>
      <div style={{ fontSize: 13, color: 'var(--ink-2)', margin: '3px 0 4px' }}>
        du {formatDay(b.du)} au {formatDay(b.au)}
      </div>

      <div style={styleBloc}>Ce que tu as fait</div>
      <Ligne
        libelle="Séances"
        pastille={b.nonNotees ? { texte: `${b.nonNotees} à noter`, bonne: false } : undefined}
      >
        {b.faites} sur {b.prevues}
        {b.sautees > 0 && <Secondaire>{pluriel(b.sautees, 'sautée')}</Secondaire>}
      </Ligne>
      <Ligne libelle="Course">
        {formatNumber(b.kmRealises)} km<Secondaire>sur {formatNumber(b.kmPrevus)} prévus</Secondaire>
      </Ligne>
      <Ligne libelle="Sur 28 jours">
        {formatNumber(b.volume28)} km<Secondaire>{formatNumber(b.volume28 / 4)} par semaine</Secondaire>
      </Ligne>
      {b.partLongue != null && (
        <Ligne
          libelle="Sortie longue"
          pastille={{
            texte: b.partLongue <= PART_LONGUE_MAX ? `sous ${PART_LONGUE_MAX} %` : 'trop lourde',
            bonne: b.partLongue <= PART_LONGUE_MAX,
          }}
        >
          {Math.round(b.partLongue)} %<Secondaire>du volume</Secondaire>
        </Ligne>
      )}
      <Ligne
        libelle="Seuil cumulé"
        pastille={
          b.seuilMin >= SEUIL_CIBLE[0]
            ? { texte: 'dans la cible', bonne: true }
            : { texte: `${SEUIL_CIBLE[0] - b.seuilMin} min de moins`, bonne: false }
        }
      >
        {b.seuilMin} min<Secondaire>cible {SEUIL_CIBLE[0]} à {SEUIL_CIBLE[1]}</Secondaire>
      </Ligne>
      <Ligne libelle="Seuil pour vitesse">
        {b.dosage.seuil} pour {b.dosage.vitesse}
        <Secondaire>sur 28 jours, cible 3 pour 1</Secondaire>
      </Ligne>

      <div style={styleBloc}>Ce que ton corps en dit</div>
      {b.indice.moyen != null && (
        <Ligne libelle="Indice de charge">
          {b.indice.moyen} en moyenne<Secondaire>pic {b.indice.pic}</Secondaire>
        </Ligne>
      )}
      {b.indice.emballement != null && (
        <Ligne libelle="Emballement">
          {Math.round(b.indice.emballement)} points<Secondaire>sur 30</Secondaire>
        </Ligne>
      )}
      {b.indice.monotonie != null && (
        <Ligne libelle="Monotonie">
          {Math.round(b.indice.monotonie)} points<Secondaire>sur 8</Secondaire>
        </Ligne>
      )}
      <Ligne
        libelle="Raideur au réveil"
        pastille={
          b.raideur != null && b.raideurPrecedente != null
            ? {
                texte: `${b.raideur - b.raideurPrecedente > 0 ? '+' : ''}${formatNumber(b.raideur - b.raideurPrecedente)}`,
                bonne: b.raideur <= b.raideurPrecedente,
              }
            : undefined
        }
      >
        {b.raideur == null ? (
          <Secondaire>moins de trois matins notés</Secondaire>
        ) : (
          <>
            {formatNumber(b.raideur)}
            {b.raideurPrecedente != null && <Secondaire>contre {formatNumber(b.raideurPrecedente)}</Secondaire>}
          </>
        )}
      </Ligne>
      <Ligne libelle="Pic de douleur">
        {b.pic ? (
          <>
            {formatNumber(b.pic.valeur)}
            <Secondaire>
              {b.pic.moment === 'soir' ? 'le soir' : b.pic.moment === 'réveil' ? 'au réveil' : 'à l’effort'},{' '}
              {DAYS_LONG[weekdayIndex(b.pic.day)].toLowerCase()}
            </Secondaire>
          </>
        ) : (
          <Secondaire>aucune saisie</Secondaire>
        )}
      </Ligne>
      <Ligne libelle="Sans douleur > 2">
        {pluriel(b.sansDouleur.jours, 'jour')}
        <Secondaire>{b.sansDouleur.releves} relevés</Secondaire>
      </Ligne>
      <Ligne libelle="Excentrique">
        {pluriel(b.excentrique, 'jour')} sur 7
        {b.excentriqueSerie > 1 && <Secondaire>série de {b.excentriqueSerie}</Secondaire>}
      </Ligne>
      <Ligne
        libelle="Journées attestées"
        pastille={b.attestes >= 6 ? undefined : { texte: 'l’indice suppose', bonne: false }}
      >
        {b.attestes} sur 7
      </Ligne>

      <div style={styleBloc}>Ce que ça vaut pour le 4 avril</div>
      {b.forme && (
        <>
          <Ligne libelle="Forme projetée">
            {formatPace(b.forme.allure)}/km<Secondaire>soit {chrono}</Secondaire>
          </Ligne>
          {b.forme.seances >= 3 && b.forme.ecart !== 0 && (
            <Ligne libelle="Ressenti">
              {Math.abs(Math.round(b.forme.ecart))} s/km {b.forme.ecart < 0 ? 'plus vite' : 'plus lent'}
              <Secondaire>que ton dernier test</Secondaire>
            </Ligne>
          )}
        </>
      )}
      {b.rpeMoyen != null && (
        <Ligne libelle="Effort perçu moyen">
          {formatNumber(b.rpeMoyen)}<Secondaire>sur dix</Secondaire>
        </Ligne>
      )}
      <Ligne libelle="Semaines d’affilée">
        {b.semainesDAffilee}<Secondaire>sans interruption</Secondaire>
      </Ligne>
      <Ligne libelle="Échéance">
        J−{b.echeances.marathon}<Secondaire>marathon de Paris</Secondaire>
      </Ligne>

      {b.echeances.dixKm != null && (
        <>
          <div style={styleBloc}>Ce que ça vaut pour le 15 novembre</div>
          <Ligne libelle="Échéance">
            J−{b.echeances.dixKm}<Secondaire>10 km Hoka</Secondaire>
          </Ligne>
          <Ligne libelle="Séances spécifiques">
            {b.dosage.vitesse}<Secondaire>sur 28 jours</Secondaire>
          </Ligne>
        </>
      )}

      <Liste titre={`Tes erreurs de la semaine · ${b.erreurs.length}`} items={b.erreurs} />
      <Liste titre="Ce que je te propose de changer" items={b.adaptations} />
      <Liste titre="La semaine prochaine" items={b.suivante} />

      <div
        style={{
          marginTop: 18,
          borderRadius: 16,
          padding: '14px 15px',
          background: 'rgba(110,231,183,.07)',
          border: '1px solid rgba(52,211,153,.22)',
        }}
      >
        <div style={{ ...styleBloc, margin: '0 0 8px' }}>Dans la tête, la semaine qui vient</div>
        <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.55 }}>{b.mental}</p>
      </div>
    </div>
  )
}
