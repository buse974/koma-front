import { Navigate } from 'react-router-dom'
import { DAILY_ENABLED } from '../config'
import { Failure, Loading } from '../components/Status'
import { usePuzzleList } from '../puzzleList'
import Today from './Today'

/** Accueil : ouvre le premier puzzle pas encore trouvé (le mode quotidien est désactivé). */
export default function Home() {
  const { list, results, reload } = usePuzzleList()
  if (DAILY_ENABLED) return <Today />
  if (list.status === 'loading') return <Loading />
  if (list.status === 'error') return <Failure error={list.error} onRetry={reload} />
  if (list.data.length === 0)
    return (
      <div className="empty">
        <div className="panel panel-empty" aria-hidden="true">?</div>
        <h1 className="display">Pas encore de Koma</h1>
        <p>Les premiers puzzles arrivent bientôt.</p>
      </div>
    )
  const first = list.data.find((p) => results[p.id] !== 'won') ?? list.data[0]
  return <Navigate to={`/p/${first.id}`} replace />
}
