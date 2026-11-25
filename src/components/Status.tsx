export function Loading() {
  return (
    <p className="loading" role="status">
      Chargement…
    </p>
  )
}

export function Failure({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <div className="empty" role="alert">
      <h1 className="display">Oups</h1>
      <p>{error.message}</p>
      <button type="button" className="btn btn-ink" onClick={onRetry}>
        Réessayer
      </button>
    </div>
  )
}
