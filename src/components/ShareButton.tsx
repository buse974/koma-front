import { useEffect, useRef, useState } from 'react'
import type { GameState } from '../api'
import { shareText } from '../stats'

export default function ShareButton({ state }: { state: GameState }) {
  const [toast, setToast] = useState(false)
  const t = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(t.current), [])

  async function share() {
    const text = shareText(state, window.location.origin)
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ text })
        return
      } catch (e) {
        if ((e as Error).name === 'AbortError') return
      }
    }
    try {
      await navigator.clipboard.writeText(text)
      setToast(true)
      window.clearTimeout(t.current)
      t.current = window.setTimeout(() => setToast(false), 2200)
    } catch {
      window.prompt('Copie ton résultat :', text)
    }
  }

  return (
    <>
      <button type="button" className="btn btn-red" onClick={share}>
        Partager
      </button>
      <div className="toast" role="status" aria-live="polite">
        {toast ? 'Copié' : ''}
      </div>
    </>
  )
}
