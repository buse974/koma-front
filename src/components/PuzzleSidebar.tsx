import { NavLink } from 'react-router-dom'
import { MODE_LABEL, type Mode } from '../api'
import { usePuzzleList } from '../puzzleList'

const ICON = { won: '✓', lost: '✕' } as const
const MODES: Mode[] = ['manga', 'character']

/** Liste des puzzles, à côté de la zone de jeu. */
export default function PuzzleSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { list, results, reload } = usePuzzleList()
  return (
    <nav className="side-nav" aria-label="Liste des puzzles">
      {list.status === 'loading' && <p className="muted side-msg">Chargement…</p>}
      {list.status === 'error' && (
        <p className="side-msg">
          <span className="error">Liste indisponible.</span>{' '}
          <button type="button" className="linklike" onClick={reload}>Réessayer</button>
        </p>
      )}
      {list.status === 'ok' && list.data.length === 0 && <p className="muted side-msg">Aucun puzzle publié pour l’instant.</p>}
      {list.status === 'ok' &&
        MODES.map((mode) => {
          const items = list.data.filter((p) => p.mode === mode)
          if (items.length === 0) return null
          return (
            <section key={mode} className="side-group">
              <h2 className="side-title">{MODE_LABEL[mode]}</h2>
              <ul>
                {items.map((p) => {
                  const r = results[p.id]
                  return (
                    <li key={p.id}>
                      <NavLink to={`/p/${p.id}`} className={`side-item${r ? ` is-${r}` : ''}`} onClick={onNavigate}>
                        <span className="side-num">#{p.number}</span>
                        <span className="side-status">
                          {r ? <><span aria-hidden="true">{ICON[r]}</span><span className="sr-only">{r === 'won' ? 'trouvé' : 'raté'}</span></> : null}
                        </span>
                      </NavLink>
                    </li>
                  )
                })}
              </ul>
            </section>
          )
        })}
    </nav>
  )
}
