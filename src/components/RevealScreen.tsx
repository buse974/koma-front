import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { assetUrl, type GameState } from '../api'
import ShareButton from './ShareButton'

interface Props {
  state: GameState
  onClose: () => void
  onReplay: () => void
  nextId: number | null
}

/** Écran plein page de fin de partie : grande image, titres japonais et anglais. */
export default function RevealScreen({ state, onClose, onReplay, nextId }: Props) {
  const a = state.answer!
  const won = state.status === 'won'
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    closeRef.current?.focus({ preventScroll: true })
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
    }
  }, [onClose])

  const jp = a.titleNative || a.title
  const romaji = a.titleNative && a.title !== a.titleNative ? a.title : null
  const en = a.titleEnglish && a.titleEnglish !== a.title ? a.titleEnglish : null
  const heading = a.name ?? jp ?? '—'
  const tries = state.guesses.length

  return (
    <div className={`reveal reveal-${state.status}`} role="dialog" aria-modal="true" aria-labelledby="reveal-title">
      <div className="reveal-lines" aria-hidden="true" />
      <div className="reveal-inner">
        <p className="reveal-stamp display">{won ? '正解! Trouvé !' : '残念… Raté'}</p>
        <p className="reveal-score">
          {won ? `En ${tries} essai${tries > 1 ? 's' : ''}` : 'C’était :'}
        </p>

        <figure className="reveal-figure">
          {a.imageUrl ? (
            <img src={assetUrl(a.imageUrl)} alt={a.name ? `${a.name}` : `Illustration de ${a.title ?? 'la réponse'}`} />
          ) : (
            <div className="reveal-noimg" aria-hidden="true">?</div>
          )}
        </figure>

        <div className="reveal-titles">
          {a.name && (
            <h2 id="reveal-title" className="reveal-name display">
              {a.name}
            </h2>
          )}
          {jp && (
            <p className="reveal-jp" lang="ja" {...(!a.name && { id: 'reveal-title', role: 'heading', 'aria-level': 2 })}>
              {jp}
            </p>
          )}
          {romaji && <p className="reveal-romaji">{romaji}</p>}
          {en && <p className="reveal-en">{en}</p>}
          {!a.name && !jp && <h2 id="reveal-title" className="reveal-name display">{heading}</h2>}
          {(a.author || a.year) && <p className="reveal-meta">{[a.author, a.year].filter(Boolean).join(' · ')}</p>}
          {a.link && (
            <a href={a.link} target="_blank" rel="noreferrer noopener" className="reveal-link">
              En savoir plus ↗
            </a>
          )}
        </div>

        <div className="reveal-actions">
          {nextId ? (
            <Link to={`/p/${nextId}`} className="btn btn-red">
              Puzzle suivant →
            </Link>
          ) : null}
          <button type="button" className="btn btn-ghost" onClick={onReplay}>
            Rejouer
          </button>
          <ShareButton state={state} />
          <button ref={closeRef} type="button" className="btn btn-ink" onClick={onClose}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}
