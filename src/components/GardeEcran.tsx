/**
 * Le garde-fou contre la page blanche.
 *
 * Une erreur de rendu dans un écran démontait l'app entière : page blanche,
 * barre de navigation comprise, et plus aucun moyen de changer d'onglet
 * (retour du laboratoire, 28 septembre 2026, sur Suivi). React ne rattrape
 * une erreur de rendu que par une limite d'erreur, qui ne s'écrit qu'en
 * classe.
 *
 * Le garde-fou entoure chaque écran et la feuille de séance, jamais la barre
 * de navigation : l'écran fautif affiche ce qui s'est passé, les autres
 * restent accessibles. Changer d'onglet le remet à zéro (`key`). Le détail de
 * l'erreur se copie, pour qu'un plantage devienne un bug qu'on peut corriger
 * plutôt qu'un écran blanc qu'on décrit.
 */
import { Component, type ErrorInfo, type ReactNode } from 'react'

/** Les deux gestes de la carte : même pilule, le néon pour l'action principale. */
const PILULE = {
  padding: '11px 20px',
  borderRadius: 'var(--pill)',
  fontSize: 'var(--fs-body)',
  fontWeight: 600,
  cursor: 'pointer',
} as const

interface Props {
  /** Nom de l'écran, pour le message et le détail copié. */
  ecran: string
  children: ReactNode
}

interface Etat {
  erreur: Error | null
  pile: string
  copie: boolean
}

export class GardeEcran extends Component<Props, Etat> {
  state: Etat = { erreur: null, pile: '', copie: false }

  static getDerivedStateFromError(erreur: Error): Partial<Etat> {
    return { erreur }
  }

  componentDidCatch(erreur: Error, info: ErrorInfo) {
    this.setState({ pile: info.componentStack ?? '' })
    console.error(`Écran ${this.props.ecran} :`, erreur, info.componentStack)
  }

  private detail(): string {
    const { erreur, pile } = this.state
    return [
      `Écran : ${this.props.ecran}`,
      `Date : ${new Date().toISOString()}`,
      `Adresse : ${window.location.href}`,
      `Erreur : ${erreur?.name} : ${erreur?.message}`,
      '',
      erreur?.stack ?? '',
      pile,
    ].join('\n')
  }

  private copier = async () => {
    try {
      await navigator.clipboard.writeText(this.detail())
      this.setState({ copie: true })
    } catch {
      // Presse-papiers refusé : le détail reste lisible à l'écran.
    }
  }

  render() {
    const { erreur, copie } = this.state
    if (!erreur) return this.props.children
    return (
      <div style={{ maxWidth: 'var(--shell-max)', margin: '0 auto', padding: 'calc(24px + env(safe-area-inset-top)) var(--page-x) 120px' }}>
        <section className="carte" style={{ padding: '20px 20px' }}>
          <h2 className="display" style={{ margin: 0, fontSize: 'var(--fs-t-carte)' }}>
            {this.props.ecran} n’a pas pu s’afficher
          </h2>
          <p style={{ margin: '10px 0 0', color: 'var(--ink-2)', fontSize: 'var(--fs-texte)', lineHeight: 1.5 }}>
            Tes saisies sont intactes. Les autres onglets restent accessibles en bas. Copie le détail et
            envoie-le : c’est ce qui permet de corriger ce plantage.
          </p>
          <pre
            style={{
              margin: '14px 0 0',
              padding: 12,
              borderRadius: 10,
              background: 'var(--surface-2)',
              fontSize: 'var(--fs-detail)',
              lineHeight: 1.4,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              maxHeight: 180,
              overflow: 'auto',
            }}
          >
            {erreur.name} : {erreur.message}
          </pre>
          <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
            <button type="button" onClick={this.copier} style={{ ...PILULE, background: 'var(--neon)', color: '#142800', border: 'none' }}>
              {copie ? 'Détail copié' : 'Copier le détail'}
            </button>
            <button type="button" onClick={() => this.setState({ erreur: null, pile: '', copie: false })} style={{ ...PILULE, background: 'transparent', color: 'var(--ink)', border: '1px solid var(--border-2)' }}>
              Réessayer
            </button>
          </div>
        </section>
      </div>
    )
  }
}
