import type { GameState, GameStatus } from './api'

export interface LocalStats {
  plays: number
  wins: number
  streak: number // victoires d'affilée
  maxStreak: number
  distribution: Record<string, number>
  /** dernier résultat par puzzle (id → won/lost), affiché dans la liste */
  results: Record<string, Exclude<GameStatus, 'playing'>>
}

const KEY = 'koma:stats:v2'

export const emptyStats = (): LocalStats => ({
  plays: 0,
  wins: 0,
  streak: 0,
  maxStreak: 0,
  distribution: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0, '6': 0, lost: 0 },
  results: {},
})

const listeners = new Set<() => void>()
/** Prévient la sidebar quand un résultat change. */
export function onStatsChange(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function loadStats(): LocalStats {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { ...emptyStats(), ...(JSON.parse(raw) as Partial<LocalStats>) }
  } catch {
    /* ignore */
  }
  return emptyStats()
}

/** Comptabilise une partie terminée. Chaque visite est une nouvelle partie. */
export function recordResult(state: GameState): LocalStats {
  const s = loadStats()
  if (state.status === 'playing') return s
  s.plays += 1
  if (state.status === 'won') {
    s.wins += 1
    s.streak += 1
    s.maxStreak = Math.max(s.maxStreak, s.streak)
    const tries = String(state.guesses.length)
    s.distribution[tries] = (s.distribution[tries] ?? 0) + 1
  } else {
    s.streak = 0
    s.distribution.lost = (s.distribution.lost ?? 0) + 1
  }
  s.results[state.id] = state.status
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    /* ignore */
  }
  listeners.forEach((fn) => fn())
  return s
}

export function shareText(state: GameState, url: string): string {
  const cells = Array.from({ length: state.maxAttempts }, (_, i) => {
    const g = state.guesses[i]
    if (!g) return '⬜'
    if (g.correct) return '🟩'
    return g.type === 'skip' ? '⬛' : '🟥'
  }).join('')
  const score = state.status === 'won' ? `${state.guesses.length}/${state.maxAttempts}` : `X/${state.maxAttempts}`
  const label = state.mode === 'character' ? 'Perso' : 'Manga'
  return `Koma ${label} #${state.number} ${score}\n${cells}\n${url}`
}
