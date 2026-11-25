import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, ApiError, type GameState, type Manga, type Stats } from '../api'
import { formatDate } from '../format'
import { getPlayerId } from '../player'
import { loadStats, recordResult, type LocalStats } from '../stats'
import FrameViewer, { type Fx } from './FrameViewer'
import GuessInput from './GuessInput'
import ShareButton from './ShareButton'
import StatsBlock from './StatsBlock'

const WORDS = {
  ko: ['ドン!', 'RATÉ!', 'ガーン', 'BZZT!'],
  skip: ['シュッ', 'ZOOM!', 'SKIP!'],
  ok: ['ズバッ!', 'BINGO!', 'YES!'],
} as const
const pickWord = (k: Fx['kind']) => WORDS[k][Math.floor(Math.random() * WORDS[k].length)]

export default function GameView({ initial }: { initial: GameState }) {
  const [state, setState] = useState(initial)
  const [index, setIndex] = useState(Math.max(0, initial.frames.length - 1))
  const [picked, setPicked] = useState<Manga | null>(null)
  const [inputKey, setInputKey] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [local, setLocal] = useState<LocalStats>(() => (initial.status === 'playing' ? loadStats() : recordResult(initial)))
  const [global, setGlobal] = useState<Stats | null>(null)
  const [fx, setFx] = useState<Fx | null>(null)

  const over = state.status !== 'playing'

  useEffect(() => {
    if (!over) return
    let live = true
    api
      .stats(state.number)
      .then((s) => live && setGlobal(s))
      .catch(() => undefined)
    return () => {
      live = false
    }
  }, [over, state.number])

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
      // stats locales : une seule fois par puzzle (recordResult est idempotent)
      if (next.status !== 'playing') setLocal(recordResult(next))
      setIndex(Math.max(0, next.frames.length - 1))
      setPicked(null)
      setInputKey((k) => k + 1)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Une erreur est survenue.')
    } finally {
      setBusy(false)
    }
  }

  const submit = () => picked && act(() => api.guess(state.number, getPlayerId(), picked.id))
  const skip = () => act(() => api.skip(state.number, getPlayerId()))
  const tried = state.guesses.flatMap((g) => (g.manga ? [g.manga.id] : []))
  const attemptsLeft = state.maxAttempts - state.guesses.length

  return (
    <div className="game">
      <header className="game-head">
        <h1 className="display">
          Koma <span className="num">#{state.number}</span>
        </h1>
        <p className="muted">{formatDate(state.date)}</p>
      </header>

      <FrameViewer frames={state.frames} index={index} onIndex={setIndex} fx={fx} />

      {!over && (
        <form
          className="guess-form"
          onSubmit={(e) => {
            e.preventDefault()
            void submit()
          }}
        >
          <p className="attempts" aria-live="polite">
            {attemptsLeft} essai{attemptsLeft > 1 ? 's' : ''} restant{attemptsLeft > 1 ? 's' : ''}
          </p>
          <GuessInput key={inputKey} value={picked} onChange={setPicked} disabled={busy} excludeIds={tried} />
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <div className="actions">
            <button type="submit" className="btn btn-ink" disabled={!picked || busy}>
              Valider
            </button>
            <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => void skip()}>
              Passer
            </button>
          </div>
          <p className="hint">« Passer » révèle la case suivante mais coûte un essai.</p>
        </form>
      )}

      {state.guesses.length > 0 && (
        <ol className="history" aria-label="Historique des essais">
          {state.guesses.map((g, i) => (
            <li key={i} style={{ animationDelay: `${Math.max(0, i - state.guesses.length + 1) * 60}ms` }} className={g.correct ? 'is-ok' : g.type === 'skip' ? 'is-skip' : 'is-ko'}>
              <span className="mark" aria-hidden="true">
                {g.correct ? '✓' : g.type === 'skip' ? '–' : '✕'}
              </span>
              <span>{g.type === 'skip' ? 'Passé' : g.manga?.title}</span>
              <span className="sr-only">{g.correct ? ', bonne réponse' : g.type === 'skip' ? '' : ', raté'}</span>
            </li>
          ))}
        </ol>
      )}

      {over && state.answer && (
        <section className={`end end-${state.status}`} aria-live="polite">
          <span className="end-burst" aria-hidden="true" />
          <h2 className="display">{state.status === 'won' ? 'Trouvé !' : 'Raté…'}</h2>
          <p className="end-sub">
            {state.status === 'won'
              ? `En ${state.guesses.length} essai${state.guesses.length > 1 ? 's' : ''}.`
              : 'Les 6 essais sont épuisés. C’était :'}
          </p>
          <div className="answer">
            {state.answer.coverUrl && <img src={state.answer.coverUrl} alt={`Couverture de ${state.answer.title}`} />}
            <div>
              <p className="answer-title">{state.answer.title}</p>
              {state.answer.titleEnglish && state.answer.titleEnglish !== state.answer.title && (
                <p className="muted">{state.answer.titleEnglish}</p>
              )}
              <p className="muted">
                {[state.answer.author, state.answer.year].filter(Boolean).join(' · ')}
              </p>
              <a href={state.answer.anilistUrl} target="_blank" rel="noreferrer noopener" className="link">
                Voir sur AniList ↗
              </a>
            </div>
          </div>
          <div className="actions">
            <ShareButton state={state} />
            <Link to="/archive" className="btn btn-ghost">
              Archives
            </Link>
          </div>
          <StatsBlock local={local} global={global} />
        </section>
      )}
    </div>
  )
}

