import type { GameState } from './api'

export interface LocalStats {
  plays: number
  wins: number
  streak: number
  maxStreak: number
  lastDate: string | null
  distribution: Record<string, number>
  recorded: number[] // ids de puzzles déjà comptabilisés
}

const KEY = 'koma:stats'

export const emptyStats = (): LocalStats => ({
  plays: 0,
  wins: 0,
  streak: 0,
  maxStreak: 0,
  lastDate: null,
  distribution: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0, '6': 0, lost: 0 },
  recorded: [],
})

export function loadStats(): LocalStats {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { ...emptyStats(), ...(JSON.parse(raw) as Partial<LocalStats>) }
  } catch {
    /* ignore */
  }
  return emptyStats()
}

function dayBefore(date: string): string {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}

/** Comptabilise une partie terminée, une seule fois par puzzle. */
export function recordResult(state: GameState): LocalStats {
  const s = loadStats()
  if (state.status === 'playing' || s.recorded.includes(state.id)) return s
  s.recorded.push(state.id)
  s.plays += 1
  if (state.status === 'won') {
    s.wins += 1
    const tries = String(state.guesses.length)
    s.distribution[tries] = (s.distribution[tries] ?? 0) + 1
  } else {
    s.distribution.lost = (s.distribution.lost ?? 0) + 1
  }
  // série : seulement pour des puzzles plus récents que le dernier compté
  if (!s.lastDate || state.date > s.lastDate) {
    if (state.status === 'won') {
      s.streak = s.lastDate && dayBefore(state.date) === s.lastDate ? s.streak + 1 : 1
      s.maxStreak = Math.max(s.maxStreak, s.streak)
    } else {
      s.streak = 0
    }
    s.lastDate = state.date
  }
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    /* ignore */
  }
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
  return `Koma #${state.number} ${score}\n${cells}\n${url}`
}
