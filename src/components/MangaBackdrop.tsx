import type { CSSProperties } from 'react'

/**
 * Fond animé de <main> : trame, étincelles, nuages encrés, pétales de sakura,
 * onomatopées en katakana, tampon hanko et vagues seigaiha.
 * Purement décoratif : derrière le contenu, sans clic, coupé en reduced-motion.
 */

type Vars = CSSProperties & Record<`--${string}`, string | number>

// positions fixes (pas d'aléatoire : rendu stable d'un chargement à l'autre)
const PETALS: Vars[] = [
  { '--x': '6%', '--d': '19s', '--w': '-2s', '--s': 1 },
  { '--x': '17%', '--d': '24s', '--w': '-11s', '--s': 0.8 },
  { '--x': '29%', '--d': '21s', '--w': '-6s', '--s': 1.1 },
  { '--x': '41%', '--d': '27s', '--w': '-17s', '--s': 0.7 },
  { '--x': '55%', '--d': '22s', '--w': '-9s', '--s': 0.9 },
  { '--x': '66%', '--d': '25s', '--w': '-1s', '--s': 1.2 },
  { '--x': '78%', '--d': '20s', '--w': '-14s', '--s': 0.8 },
  { '--x': '88%', '--d': '26s', '--w': '-7s', '--s': 1 },
  { '--x': '95%', '--d': '23s', '--w': '-19s', '--s': 0.7 },
  { '--x': '48%', '--d': '29s', '--w': '-24s', '--s': 1 },
]

const SPARKS: Vars[] = [
  { left: '8%', top: '14%', '--w': '0s', '--s': 1 },
  { left: '91%', top: '22%', '--w': '-1.3s', '--s': 0.7 },
  { left: '4%', top: '58%', '--w': '-2.1s', '--s': 0.8 },
  { left: '94%', top: '64%', '--w': '-0.6s', '--s': 1.1 },
  { left: '18%', top: '86%', '--w': '-2.8s', '--s': 0.6 },
  { left: '82%', top: '90%', '--w': '-1.8s', '--s': 0.9 },
  { left: '50%', top: '6%', '--w': '-3.3s', '--s': 0.6 },
]

// coups de sabre : rares, décalés, à des angles différents
const SLASHES: Vars[] = [
  { left: '-5%', top: '22%', width: '62%', '--a': '-14deg', '--d': '11s', '--w': '1.5s' },
  { right: '-6%', top: '58%', width: '58%', '--a': '18deg', '--d': '13s', '--w': '6s' },
  { left: '12%', top: '84%', width: '48%', '--a': '-6deg', '--d': '17s', '--w': '10s' },
]

const CLOUDS: Vars[] = [
  { top: '9%', '--d': '110s', '--w': '-20s', '--s': 1 },
  { top: '46%', '--d': '140s', '--w': '-85s', '--s': 0.75 },
  { top: '74%', '--d': '125s', '--w': '-50s', '--s': 0.9 },
]

const SFX: { text: string; style: Vars }[] = [
  { text: 'キラッ', style: { left: '3%', top: '28%', '--r': '-10deg', '--w': '0s' } },
  { text: 'ワクワク', style: { right: '2%', top: '40%', '--r': '8deg', '--w': '-3s' } },
  { text: 'ドキドキ', style: { left: '5%', bottom: '14%', '--r': '6deg', '--w': '-5s' } },
]

function Cloud() {
  return (
    <svg viewBox="0 0 120 50" aria-hidden="true">
      <path
        d="M14 42 Q2 42 4 32 Q6 22 18 24 Q20 10 36 12 Q44 2 60 8 Q74 0 84 12 Q100 8 102 22 Q118 22 116 34 Q114 44 100 42 Z"
        fill="var(--paper)"
        stroke="var(--ink)"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path d="M30 30 Q38 24 46 30 M66 26 Q74 20 82 26" fill="none" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export default function MangaBackdrop() {
  return (
    <div className="backdrop" aria-hidden="true">
      <div className="bd-tone" />
      <div className="bd-waves" />
      {CLOUDS.map((style, i) => (
        <div key={`c${i}`} className="bd-cloud" style={style}>
          <Cloud />
        </div>
      ))}
      {SPARKS.map((style, i) => (
        <span key={`s${i}`} className="bd-spark" style={style} />
      ))}
      {SFX.map(({ text, style }) => (
        <span key={text} className="bd-sfx" style={style}>
          {text}
        </span>
      ))}
      {SLASHES.map((style, i) => (
        <span key={`k${i}`} className="bd-slash" style={style} />
      ))}
      {PETALS.map((style, i) => (
        <div key={`p${i}`} className="bd-petal" style={style}>
          <span />
        </div>
      ))}
      <span className="bd-hanko">
        <i>コ</i>
        <i>マ</i>
      </span>
    </div>
  )
}
