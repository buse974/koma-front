import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, ApiError, assetUrl, MODE_LABEL, type GameState, type Manga, type Stats } from '../api'
import { loadStats, recordResult, type LocalStats } from '../stats'
import AnswerInput from './AnswerInput'
import FrameViewer, { type Fx } from './FrameViewer'
import GuessInput from './GuessInput'
import RevealScreen from './RevealScreen'
import ShareButton from './ShareButton'
import StatsBlock from './StatsBlock'

const WORDS = {
  ko: ['ドン!', 'RATÉ!', 'ガーン', 'BZZT!'],
  skip: ['シュッ', 'ZOOM!', 'SKIP!'],
  ok: ['ズバッ!', 'BINGO!', 'YES!'],
} as const
const pickWord = (k: Fx['kind']) => WORDS[k][Math.floor(Math.random() * WORDS[k].length)]

interface Props {
  initial: GameState
  /** identifiant de cette partie (nouveau à chaque ouverture) */
  sessionId: string
  /** relance une partie vierge */
  onReplay: () => void
  nextId: number | null
}

export default function GameView({ initial, sessionId, onReplay, nextId }: Props) {
  const [state, setState] = useState(initial)
  const [index, setIndex] = useState(Math.max(0, initial.frames.length - 1))
  const [picked, setPicked] = useState<Manga | null>(null)
  const [text, setText] = useState('')
  const [inputKey, setInputKey] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [local, setLocal] = useState<LocalStats>(loadStats)
  const [global, setGlobal] = useState<Stats | null>(null)
  const [fx, setFx] = useState<Fx | null>(null)
  const [revealOpen, setRevealOpen] = useState(false)

  const character = state.mode === 'character'
  const over = state.status !== 'playing'
  const closeReveal = useCallback(() => setRevealOpen(false), [])

  useEffect(() => {
    if (!over) return
    let live = true
    api
      .stats(state.id)
      .then((s) => live && setGlobal(s))
      .catch(() => undefined)
    return () => {
      live = false
    }
  }, [over, state.id])

  async function act(run: () => Promise<GameState>) {
    setBusy(true)
    setError(null)
    try {
      const next = await run()
      setState(next)
      const last = next.guesses[next.guesses.length - 1]
      if (last) {
        const kind: Fx['kind'] = last.correct ? 'ok' : last.type === 'skip' ? 'skip' : 'ko'
        setFx({ kind, word: pickWord(kind), n: next.guesses.length })
      }
      if (next.status !== 'playing') {
        setLocal(recordResult(next))
        // laisse l'effet de la case se jouer avant la révélation
        window.setTimeout(() => setRevealOpen(true), last?.correct ? 900 : 500)
      }
      setIndex(Math.max(0, next.frames.length - 1))
      setPicked(null)
      setText('')
      setInputKey((k) => k + 1)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Une erreur est survenue.')
    } finally {
      setBusy(false)
    }
  }

  const canSubmit = character ? text.trim().length > 0 : !!picked
  const submit = () => {
    if (!canSubmit) return
    void act(() => api.guess(state.id, sessionId, character ? { text: text.trim() } : { mangaId: picked!.id }))
  }
  const skip = () => act(() => api.skip(state.id, sessionId))
  const tried = state.guesses.flatMap((g) => (g.manga ? [g.manga.id] : []))
  const attemptsLeft = state.maxAttempts - state.guesses.length
  const a = state.answer

  return (
    <div className="game">
      <header className="game-head">
        <h1 className="display">
          Koma <span className="num">#{state.number}</span>
        </h1>
        <p className="mode-tag">{MODE_LABEL[state.mode]}</p>
      </header>

      <FrameViewer
        frames={state.frames}
        index={index}
        onIndex={setIndex}
        total={state.frameCount}
        fx={fx}
        single={character}
      />

      {!over && (
        <form
          className="guess-form"
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
        >
          <p className="attempts" aria-live="polite">
            {attemptsLeft} essai{attemptsLeft > 1 ? 's' : ''} restant{attemptsLeft > 1 ? 's' : ''}
          </p>
          {character ? (
            <AnswerInput value={text} onChange={setText} disabled={busy} />
          ) : (
            <GuessInput key={inputKey} value={picked} onChange={setPicked} disabled={busy} excludeIds={tried} />
          )}
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <div className="actions">
            <button type="submit" className="btn btn-ink" disabled={!canSubmit || busy}>
              Valider
            </button>
            <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => void skip()}>
              {character ? 'Abandonner' : 'Passer'}
            </button>
          </div>
          <p className="hint">
            {character
              ? 'Majuscules, accents et ponctuation ne comptent pas.'
              : '« Passer » révèle la case suivante mais coûte un essai.'}
          </p>
        </form>
      )}

      {state.guesses.length > 0 && (
        <ol className="history" aria-label="Historique des essais">
          {state.guesses.map((g, i) => (
            <li key={i} style={{ animationDelay: `${Math.max(0, i - state.guesses.length + 1) * 60}ms` }} className={g.correct ? 'is-ok' : g.type === 'skip' ? 'is-skip' : 'is-ko'}>
              <span className="mark" aria-hidden="true">
                {g.correct ? '✓' : g.type === 'skip' ? '–' : '✕'}
              </span>
              {g.type === 'skip' ? (
                <span>{character ? 'Abandon' : 'Passé'}</span>
              ) : g.manga ? (
                <span className="guess-card">
                  {g.manga.coverUrl ? (
                    <img src={assetUrl(g.manga.coverUrl)} alt="" loading="lazy" />
                  ) : (
                    <span className="guess-nocover" aria-hidden="true" />
                  )}
                  <span className="guess-info">
                    <span className="guess-title">{g.manga.title}</span>
                    <small>
                      {[g.manga.titleEnglish && g.manga.titleEnglish !== g.manga.title ? g.manga.titleEnglish : null, g.manga.year]
                        .filter(Boolean)
                        .join(' · ')}
                    </small>
                  </span>
                </span>
              ) : (
                <span className="guess-title">{g.text}</span>
              )}
              <span className="sr-only">{g.correct ? ', bonne réponse' : g.type === 'skip' ? '' : ', raté'}</span>
            </li>
          ))}
        </ol>
      )}

      {over && a && (
        <section className={`end end-${state.status}`} aria-live="polite">
          <h2 className="display">{state.status === 'won' ? 'Trouvé !' : 'Raté…'}</h2>
          <button type="button" className="answer answer-btn" onClick={() => setRevealOpen(true)}>
            {a.imageUrl && <img src={assetUrl(a.imageUrl)} alt="" />}
            <span>
              <span className="answer-title">{a.name ?? a.titleNative ?? a.title}</span>
              {(a.name ? a.titleNative ?? a.title : a.titleNative && a.title) && (
                <span className="muted">{a.name ? a.titleNative ?? a.title : a.title}</span>
              )}
              {a.titleEnglish && <span className="muted">{a.titleEnglish}</span>}
              <span className="link">Revoir la révélation</span>
            </span>
          </button>
          <div className="actions">
            {nextId && (
              <Link to={`/p/${nextId}`} className="btn btn-red">
                Suivant →
              </Link>
            )}
            <button type="button" className="btn btn-ghost" onClick={onReplay}>
              Rejouer
            </button>
            <ShareButton state={state} />
          </div>
          <StatsBlock local={local} global={global} />
        </section>
      )}

      {revealOpen && a && <RevealScreen state={state} onClose={closeReveal} onReplay={onReplay} nextId={nextId} />}
    </div>
  )
}
