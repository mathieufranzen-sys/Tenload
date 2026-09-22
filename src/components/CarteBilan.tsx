/**
 * Le bilan de la semaine, en page ouverte depuis l'écran Aujourd'hui, le
 * dimanche et le lundi. Le dimanche soir parce que c'est là que la semaine se referme ; le
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
import { DAYS_LONG, formatNumber, weekdayIndex } from '../lib/dates'
import type { BandKey } from '../lib/tendonIndex'
import { TEINTE_BANDE } from '../lib/teintes'
import { MARATHON_KM, formatDuration, formatPace } from '../lib/paces'

const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? 's' : ''}`

/** Une carte par temps du bilan, l'étiquette d'accent en tête. */
function Bloc({ titre, children }: { titre: string; children: ReactNode }) {
  return (
    <section className="carte" style={{ padding: '16px 18px 8px' }}>
      <p className="etiquette" style={{ marginBottom: 4 }}>
        {titre}
      </p>
      {children}
    </section>
  )
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
        borderTop: '1px solid var(--border)',
        fontSize: 14.5,
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      <span style={{ color: 'var(--ink-2)', flex: 'none' }}>{libelle}</span>
      <span style={{ fontWeight: 600, textAlign: 'right' }}>
        {children}
        {pastille && (
          <span
            style={{
              display: 'inline-block',
              fontSize: 12,
              fontWeight: 600,
              padding: '3px 9px',
              borderRadius: 'var(--pill)',
              marginLeft: 8,
              whiteSpace: 'nowrap',
              background: pastille.bonne ? 'rgba(111,224,176,.16)' : 'rgba(242,207,107,.14)',
              color: pastille.bonne ? 'var(--good)' : 'var(--warning)',
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

/** Une liste en filets verticaux, comme « ce que la semaine change » de la maquette. */
function Liste({ titre, items, teintes }: { titre: string; items: string[]; teintes?: string[] }) {
  if (items.length === 0) return null
  return (
    <section className="carte" style={{ padding: '16px 18px' }}>
      <p className="etiquette">{titre}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
        {items.map((x, i) => (
          <div key={x} style={{ display: 'flex', gap: 12 }}>
            <span
              aria-hidden
              style={{
                width: 4,
                flex: 'none',
                borderRadius: 2,
                background: teintes?.[i % teintes.length] ?? 'var(--accent-doux)',
              }}
            />
            <span style={{ fontSize: 15, lineHeight: 1.5 }}>{x}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

export function CarteBilan({
  bilan: b,
  jours,
  style,
}: {
  bilan: BilanSemaine
  /**
   * L'indice de chaque jour de la semaine bilanée, du lundi au dimanche. Null
   * pour un jour sans indice lisible : il reste en pointillés, sans hauteur.
   */
  jours?: Array<{ idx: number; bande: BandKey } | null>
  style?: CSSProperties
}) {
  const chrono = b.forme ? formatDuration(Math.round((b.forme.allure * MARATHON_KM) / 60)) : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, ...style }}>
      {/* La tête de la maquette : les kilomètres en grand, puis la semaine en
          sept pastilles de bande, dont la hauteur suit l'indice du jour. */}
      <section className="carte" style={{ padding: '20px 20px 18px', borderRadius: 'var(--radius-lg)' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
          <span className="chiffre" style={{ fontSize: 76, lineHeight: 0.95 }}>
            {formatNumber(b.kmRealises)}
          </span>
          <span style={{ fontSize: 17, color: 'var(--sur-ink-2)' }}>km sur {formatNumber(b.kmPrevus)} prévus</span>
        </div>
        <p style={{ margin: '10px 0 0', fontSize: 15, color: 'var(--accent)' }}>
          {b.faites} séance{b.faites > 1 ? 's' : ''} sur {b.prevues}
          {b.nonNotees === 0 ? ', toutes notées' : `, ${b.nonNotees} à noter`}
        </p>
        {jours && (
          <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', marginTop: 22, height: 90 }}>
            {jours.map((j, i) => (
              <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                <span
                  title={j ? `indice ${j.idx}` : 'indice inconnu'}
                  style={{
                    display: 'block',
                    // Un plancher de 26 px : un jour à 3 sur 100 reste une
                    // pastille, pas un trait qu'on prend pour un manque.
                    height: j == null ? 26 : 26 + Math.min(1, j.idx / 70) * 40,
                    borderRadius: 20,
                    background: j == null ? 'transparent' : TEINTE_BANDE[j.bande],
                    border: j == null ? '1.5px dashed var(--border-2)' : undefined,
                  }}
                />
                <span style={{ display: 'block', marginTop: 8, fontSize: 12.5, color: 'var(--sur-ink-3)' }}>
                  {'LMMJVSD'[i]}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Tuile valeur={b.indice.moyen != null ? String(b.indice.moyen) : '—'} libelle="Indice moyen" />
        <Tuile
          valeur={b.pic ? formatNumber(b.pic.valeur) : '—'}
          libelle={
            b.pic
              ? `Douleur max · ${DAYS_LONG[weekdayIndex(b.pic.day)].toLowerCase()} ${b.pic.moment === 'soir' ? 'soir' : b.pic.moment === 'réveil' ? 'matin' : 'à l’effort'}`
              : 'Douleur max'
          }
        />
        <Tuile valeur={`${b.excentrique}`} unite="/7" libelle="Jours d'excentrique" />
        <Tuile valeur={`${b.sautees}`} libelle={b.sautees > 1 ? 'Séances sautées' : 'Séance sautée'} bonne={b.sautees === 0} />
      </div>

      <Bloc titre="Ce que tu as fait">
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

      </Bloc>

      <Bloc titre="Ce que ton corps en dit">
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

      </Bloc>

      <Bloc titre="Ce que ça vaut pour le 4 avril">
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

      </Bloc>

      {b.echeances.dixKm != null && (
        <Bloc titre="Ce que ça vaut pour le 15 novembre">
          <Ligne libelle="Échéance">
            J−{b.echeances.dixKm}<Secondaire>10 km Hoka</Secondaire>
          </Ligne>
          <Ligne libelle="Séances spécifiques">
            {b.dosage.vitesse}<Secondaire>sur 28 jours</Secondaire>
          </Ligne>
        </Bloc>
      )}

      <Liste
        titre={`Tes erreurs de la semaine · ${b.erreurs.length}`}
        items={b.erreurs}
        teintes={['var(--warning)']}
      />
      <Liste titre="Ce que je te propose de changer" items={b.adaptations} teintes={['var(--accent)']} />
      <Liste
        titre={`Ce que la semaine ${b.n + 1} change`}
        items={b.suivante}
        teintes={['var(--pale)', 'var(--accent)', 'var(--accent-doux)']}
      />

      <section className="carte-braise" style={{ padding: '20px 20px 22px' }}>
        <p className="etiquette" style={{ color: 'var(--pale)', opacity: 0.85 }}>
          Dans la tête, la semaine qui vient
        </p>
        <p className="display-it" style={{ margin: '10px 0 0', fontSize: 22, lineHeight: 1.35 }}>
          {b.mental}
        </p>
      </section>
    </div>
  )
}

function Tuile({
  valeur,
  unite,
  libelle,
  bonne,
}: {
  valeur: string
  unite?: string
  libelle: string
  bonne?: boolean
}) {
  return (
    <div
      className="carte"
      style={{
        padding: '16px 16px 15px',
        borderColor: bonne ? 'rgba(111,224,176,.4)' : undefined,
        background: bonne ? 'rgba(111,224,176,.05)' : undefined,
      }}
    >
      <span className="chiffre" style={{ fontSize: 38, lineHeight: 1, color: bonne ? 'var(--good)' : undefined }}>
        {valeur}
      </span>
      {unite && <span style={{ fontSize: 15, color: 'var(--accent)' }}> {unite}</span>}
      <div style={{ fontSize: 13.5, marginTop: 8, color: bonne ? 'var(--good)' : 'var(--accent)', lineHeight: 1.3 }}>
        {libelle}
      </div>
    </div>
  )
}
