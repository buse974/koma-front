import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api, ApiError } from '../api'
import GameView from '../components/GameView'
import { Failure, Loading } from '../components/Status'
import { newSessionId } from '../player'
import { nextInMode, usePuzzleList } from '../puzzleList'
import { useLoad } from '../useLoad'

/** Remonte la page à chaque changement d'id : quitter un puzzle efface la partie. */
export default function PuzzleRoute() {
  const { id } = useParams()
  return <Puzzle key={id} id={Number(id)} />
}

/** Un puzzle. Chaque ouverture (ou « Rejouer ») démarre une partie vierge. */
function Puzzle({ id }: { id: number }) {
  const [session, setSession] = useState(newSessionId)
  const [s, reload] = useLoad(() => api.puzzle(id, session), session)
  const { list } = usePuzzleList()
  const nextId = list.status === 'ok' ? nextInMode(list.data, id) : null

  if (s.status === 'loading') return <Loading />
  if (s.status === 'error') {
    if (s.error instanceof ApiError && s.error.status === 404)
      return (
        <div className="empty">
          <h1 className="display">Koma introuvable</h1>
          <p>Ce puzzle n’existe pas ou n’est pas publié.</p>
          <Link to="/archive" className="btn btn-ink">Voir les archives</Link>
        </div>
      )
    return <Failure error={s.error} onRetry={reload} />
  }
  return <GameView key={session} initial={s.data} sessionId={session} nextId={nextId} onReplay={() => setSession(newSessionId())} />
}
