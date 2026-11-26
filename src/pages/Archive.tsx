import { Link } from 'react-router-dom'
import { MODE_LABEL, type Mode } from '../api'
import { Failure, Loading } from '../components/Status'
import { usePuzzleList } from '../puzzleList'

const LABEL = { new: 'À jouer', won: 'Trouvé', lost: 'Raté' } as const
const ICON = { new: '', won: '✓', lost: '✕' } as const
const MODES: Mode[] = ['manga', 'character']

export default function Archive() {
  const { list, results, reload } = usePuzzleList()
  if (list.status === 'loading') return <Loading />
  if (list.status === 'error') return <Failure error={list.error} onRetry={reload} />
  return (
    <div>
      <h1 className="display page-title">Archives</h1>
      {list.data.length === 0 ? (
        <p className="muted">Aucun Koma publié pour l’instant.</p>
      ) : (
        MODES.map((mode) => {
          const items = list.data.filter((p) => p.mode === mode)
          if (items.length === 0) return null
          return (
            <section key={mode} className="archive-group">
              <h2 className="display archive-title">{MODE_LABEL[mode]}</h2>
              <ul className="archive">
                {items.map((p, i) => {
                  const st = results[p.id] ?? 'new'
                  return (
                    <li key={p.id} style={{ animationDelay: `${Math.min(i, 20) * 35}ms` }}>
                      <Link to={`/p/${p.id}`} className={`tile tile-${st}`}>
                        <span className="tile-num">#{p.number}</span>
                        <span className="tile-date">{mode === 'character' ? 'Personnage' : 'Manga'}</span>
                        <span className="tile-status">
                          <span aria-hidden="true">{ICON[st]} </span>
                          {LABEL[st]}
                        </span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </section>
          )
        })
      )}
    </div>
  )
}
