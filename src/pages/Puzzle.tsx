import { Link, useParams } from 'react-router-dom'
import { api, ApiError } from '../api'
import GameView from '../components/GameView'
import { Failure, Loading } from '../components/Status'
import { getPlayerId } from '../player'
import { useLoad } from '../useLoad'

export default function Puzzle() {
  const { number } = useParams()
  const n = Number(number)
  const [s, reload] = useLoad(() => api.puzzle(n, getPlayerId()), String(n))
  if (s.status === 'loading') return <Loading />
  if (s.status === 'error') {
    if (s.error instanceof ApiError && s.error.status === 404)
      return (
        <div className="empty">
          <h1 className="display">Koma introuvable</h1>
          <p>Ce puzzle n’existe pas ou n’est pas encore disponible.</p>
          <Link to="/archive" className="btn btn-ink">Voir les archives</Link>
        </div>
      )
    return <Failure error={s.error} onRetry={reload} />
  }
  return <GameView key={s.data.id} initial={s.data} />
}
