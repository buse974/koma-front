import { useEffect, useRef, useState } from 'react'
import type { ApiError } from './api'

export type Loaded<T> =
  | { status: 'loading' }
  | { status: 'ok'; data: T }
  | { status: 'error'; error: ApiError | Error }

/**
 * Charge une ressource ; se recharge quand `key` change ; `reload` relance.
 * Pendant un `reload` (même clé), les données précédentes restent affichées.
 */
export function useLoad<T>(fn: () => Promise<T>, key: string = ''): [Loaded<T>, () => void] {
  const [tick, setTick] = useState(0)
  const current = `${key}#${tick}`
  const [res, setRes] = useState<{ for: string; value: Loaded<T> } | null>(null)
  const fnRef = useRef(fn)
  useEffect(() => {
    fnRef.current = fn
  })

  useEffect(() => {
    let live = true
    fnRef.current().then(
      (data) => live && setRes({ for: current, value: { status: 'ok', data } }),
      (error: Error) => live && setRes({ for: current, value: { status: 'error', error } }),
    )
    return () => {
      live = false
    }
  }, [current])

  const sameKey = res !== null && res.for.slice(0, res.for.lastIndexOf('#')) === key
  const state: Loaded<T> =
    res && (res.for === current || (sameKey && res.value.status === 'ok')) ? res.value : { status: 'loading' }
  return [state, () => setTick((t) => t + 1)]
}
