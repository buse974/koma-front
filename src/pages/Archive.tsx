import { Link } from 'react-router-dom'
import { api } from '../api'
import { formatDate } from '../format'
import { Failure, Loading } from '../components/Status'
import { getPlayerId } from '../player'
import { useLoad } from '../useLoad'

const LABEL = { new: 'À jouer', playing: 'En cours', won: 'Trouvé', lost: 'Raté' } as const
const ICON = { new: '', playing: '…', won: '✓', lost: '✕' } as const

export default function Archive() {
  const [s, reload] = useLoad(() => api.puzzles(getPlayerId()))
  if (s.status === 'loading') return <Loading />
  if (s.status === 'error') return <Failure error={s.error} onRetry={reload} />
  return (
    <div>
      <h1 className="display page-title">Archives</h1>
      {s.data.length === 0 ? (
        <p className="muted">Aucun Koma publié pour l’instant.</p>
      ) : (
        <ul className="archive">
          {s.data.map((p) => (
            <li key={p.id}>
              <Link to={`/p/${p.number}`} className={`tile tile-${p.status}`}>
                <span className="tile-num">#{p.number}</span>
                <span className="tile-date">{formatDate(p.date)}</span>
                <span className="tile-status">
                  <span aria-hidden="true">{ICON[p.status]} </span>
                  {LABEL[p.status]}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
