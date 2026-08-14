import { HR_MAX, HR_ZONES, hrRange } from '../../lib/paces'

export function HeartRateZones() {
  return (
    <div className="glass" style={{ borderRadius: 'var(--radius)', padding: '16px 17px' }}>
      <p style={{ color: 'var(--ink-2)', fontSize: 14, lineHeight: 1.5, margin: '0 0 12px' }}>
        Strava calcule tes zones sur une fréquence maximale d'environ 193, alors que tu plafonnes à{' '}
        {HR_MAX}. Résultat : ce que tu crois être de l'endurance est en réalité un cran plus haut.
        Voici les zones recalculées sur {HR_MAX}.
      </p>
      {HR_ZONES.map((z, i) => {
        const [lo, hi] = hrRange(z)
        const bpm = i === 0 ? `moins de ${hi}` : i === HR_ZONES.length - 1 ? `plus de ${lo}` : `${lo} à ${hi}`
        const pct =
          i === 0
            ? `moins de ${Math.round(z.pct[1] * 100)} %`
            : i === HR_ZONES.length - 1
              ? `plus de ${Math.round(z.pct[0] * 100)} %`
              : `${Math.round(z.pct[0] * 100)} à ${Math.round(z.pct[1] * 100)} %`
        return (
          <div key={z.key} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)', fontSize: 14.5 }}>
            <span>
              {z.key} {z.label}
            </span>
            <span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>
              {bpm} <span style={{ color: 'var(--ink-3)', fontWeight: 500, fontSize: 12.5 }}>{pct}</span>
            </span>
          </div>
        )
      })}
      <p style={{ color: 'var(--ink-2)', fontSize: 13.5, lineHeight: 1.5, margin: '14px 0 0' }}>
        Ton 25 km du 9 août à 140 de moyenne est du haut de Z2, pas du milieu : tu cours ton
        endurance un peu trop vite. Ton test de 3 km à 174 de moyenne était bien en Z5, donc
        maximal, et le 12:02 est une vraie valeur.
      </p>
    </div>
  )
}
