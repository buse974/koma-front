import { useState } from 'react'
import { assetUrl } from '../api'

export interface Fx {
  kind: 'ko' | 'skip' | 'ok'
  word: string
  n: number
}

interface Props {
  frames: string[]
  /** index de la case affichée (contrôlé) */
  index: number
  onIndex: (i: number) => void
  total?: number
  /** effet à jouer sur la case (change de `n` à chaque essai) */
  fx?: Fx | null
}

export default function FrameViewer({ frames, index, onIndex, total = 6, fx }: Props) {
  const [loaded, setLoaded] = useState<string | null>(null)
  const src = frames[index] ? assetUrl(frames[index]) : null
  return (
    <section className="viewer" aria-label="Cases du manga">
      <div key={fx?.n ?? 0} className={`panel${fx ? ` fx-${fx.kind}` : ''}`}>
        <span className="panel-no" aria-hidden="true">
          {index + 1}
        </span>
        {src && (
          <img
            key={src}
            src={src}
            alt={`Case ${index + 1} sur ${total}, bulles de texte floutées`}
            className={loaded === src ? 'is-in' : ''}
            onLoad={() => setLoaded(src)}
            draggable={false}
          />
        )}
        {src && loaded !== src && <div className="panel-loading">Encrage…</div>}
        {fx && (
          <span className={`sfx sfx-${fx.kind}`} aria-hidden="true">
            {fx.word}
          </span>
        )}
      </div>
      <div className="dots" role="group" aria-label="Choisir une case">
        {Array.from({ length: total }, (_, i) => {
          const open = i < frames.length
          return (
            <button
              key={i}
              type="button"
              className={`dot${i === index ? ' is-current' : ''}${open ? '' : ' is-locked'}`}
              style={{ animationDelay: `${i * 40}ms` }}
              disabled={!open}
              aria-label={open ? `Case ${i + 1}` : `Case ${i + 1} verrouillée`}
              aria-current={i === index ? 'true' : undefined}
              onClick={() => onIndex(i)}
            >
              {open ? i + 1 : '🔒'}
            </button>
          )
        })}
      </div>
    </section>
  )
}
