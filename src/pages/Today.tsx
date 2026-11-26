import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api, ApiError } from '../api'
import GameView from '../components/GameView'
import { newSessionId } from '../player'
import { useLoad } from '../useLoad'
import { Failure, Loading } from '../components/Status'

/**
 * Puzzle du jour. Inutilisé tant que DAILY_ENABLED (config.ts) est à false ;
 * conservé pour réactiver le mode quotidien plus tard.
 */
export default function Today() {
  const [session] = useState(newSessionId)
  const [s, reload] = useLoad(() => api.today(session))
  if (s.status === 'loading') return <Loading />
  if (s.status === 'error') {
    if (s.error instanceof ApiError && s.error.status === 404)
      return (
        <div className="empty">
          <div className="panel panel-empty" aria-hidden="true">?</div>
          <h1 className="display">Pas de Koma aujourd’hui</h1>
          <p>Le prochain puzzle arrive bientôt. En attendant, rattrape-toi dans les archives.</p>
          <Link to="/archive" className="btn btn-ink">Voir les archives</Link>
        </div>
      )
    return <Failure error={s.error} onRetry={reload} />
  }
  return <GameView key={s.data.id} initial={s.data} sessionId={session} nextId={null} onReplay={() => window.location.reload()} />
}
