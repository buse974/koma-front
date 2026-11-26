import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { api, type PuzzleMeta } from './api'
import { useLoad, type Loaded } from './useLoad'
import { loadStats, onStatsChange, type LocalStats } from './stats'

interface Ctx {
  list: Loaded<PuzzleMeta[]>
  reload: () => void
  /** résultats locaux (id → won/lost) */
  results: LocalStats['results']
}

const PuzzleListContext = createContext<Ctx | null>(null)

/** Charge une fois la liste publique des puzzles, partagée par la sidebar, l'accueil et les archives. */
export function PuzzleListProvider({ children }: { children: ReactNode }) {
  const [list, reload] = useLoad(() => api.puzzles())
  const [results, setResults] = useState(() => loadStats().results)
  useEffect(() => onStatsChange(() => setResults(loadStats().results)), [])
  return <PuzzleListContext.Provider value={{ list, reload, results }}>{children}</PuzzleListContext.Provider>
}

export function usePuzzleList(): Ctx {
  const ctx = useContext(PuzzleListContext)
  if (!ctx) throw new Error('usePuzzleList hors de PuzzleListProvider')
  return ctx
}

/** Puzzle suivant dans le même mode (null si dernier). */
export function nextInMode(list: PuzzleMeta[], id: number): number | null {
  const cur = list.find((p) => p.id === id)
  if (!cur) return null
  const same = list.filter((p) => p.mode === cur.mode)
  return same[same.indexOf(cur) + 1]?.id ?? null
}
