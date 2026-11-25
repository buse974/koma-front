export interface Manga {
  id: number
  title: string
  titleEnglish: string | null
  year: number | null
  coverUrl: string | null
}
export interface Answer extends Manga {
  author: string | null
  anilistUrl: string
}
export interface Guess {
  type: 'guess' | 'skip'
  manga?: Manga & Partial<Pick<Answer, 'author' | 'anilistUrl'>>
  correct: boolean
}
export interface PuzzleMeta {
  id: number
  number: number
  date: string
}
export type GameStatus = 'playing' | 'won' | 'lost'
export interface GameState extends PuzzleMeta {
  status: GameStatus
  maxAttempts: 6
  guesses: Guess[]
  frames: string[]
  answer: Answer | null
}
export interface Stats {
  plays: number
  wins: number
  distribution: Record<string, number>
}
export interface PuzzleListItem extends PuzzleMeta {
  status: 'new' | 'playing' | 'won' | 'lost'
}
export interface AdminFrame {
  id: number
  position: number
  url: string
}
export interface AdminPuzzle extends PuzzleMeta {
  manga: Manga
  frames: AdminFrame[]
}
export interface Calendar {
  today: string
  scheduledAhead: number
  nextEmptyDate: string | null
  alert: boolean
}

export const API_URL: string = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000').replace(/\/$/, '')

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

/** Les chemins renvoyés par l'API sont relatifs : on les préfixe. */
export function assetUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path
  return API_URL + path
}

const TOKEN_KEY = 'koma:adminToken'
export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}
export function setToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* stockage indisponible */
  }
}

async function request<T>(path: string, init: RequestInit = {}, admin = false): Promise<T> {
  const headers = new Headers(init.headers)
  if (init.body && typeof init.body === 'string') headers.set('Content-Type', 'application/json')
  if (admin) {
    const t = getToken()
    if (t) headers.set('Authorization', `Bearer ${t}`)
  }
  let res: Response
  try {
    res = await fetch(`${API_URL}/api${path}`, { ...init, headers })
  } catch {
    throw new ApiError(0, 'Serveur injoignable. Réessaie dans un instant.')
  }
  if (admin && res.status === 401 && path !== '/admin/login') {
    setToken(null)
    window.location.assign('/admin/login')
    throw new ApiError(401, 'Session expirée')
  }
  if (res.status === 204) return undefined as T
  let data: unknown = null
  try {
    data = await res.json()
  } catch {
    /* corps vide */
  }
  if (!res.ok) {
    const msg = (data as { error?: string } | null)?.error ?? `Erreur ${res.status}`
    throw new ApiError(res.status, msg)
  }
  return data as T
}

const q = encodeURIComponent
const json = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) })

export const api = {
  today: (playerId: string) => request<GameState>(`/puzzles/today?playerId=${q(playerId)}`),
  puzzles: (playerId: string) => request<PuzzleListItem[]>(`/puzzles?playerId=${q(playerId)}`),
  puzzle: (n: number, playerId: string) => request<GameState>(`/puzzles/${n}?playerId=${q(playerId)}`),
  guess: (n: number, playerId: string, mangaId: number) =>
    request<GameState>(`/puzzles/${n}/guess`, json('POST', { playerId, mangaId })),
  skip: (n: number, playerId: string) => request<GameState>(`/puzzles/${n}/skip`, json('POST', { playerId })),
  stats: (n: number) => request<Stats>(`/puzzles/${n}/stats`),
  search: (query: string, limit = 10, signal?: AbortSignal) =>
    request<Manga[]>(`/mangas/search?q=${q(query)}&limit=${limit}`, { signal }),

  admin: {
    login: (password: string) => request<{ token: string }>('/admin/login', json('POST', { password })),
    puzzles: () => request<AdminPuzzle[]>('/admin/puzzles', {}, true),
    puzzle: (id: number) => request<AdminPuzzle>(`/admin/puzzles/${id}`, {}, true),
    create: (mangaId: number, date: string) =>
      request<AdminPuzzle>('/admin/puzzles', json('POST', { mangaId, date }), true),
    update: (id: number, patch: { mangaId?: number; date?: string }) =>
      request<AdminPuzzle>(`/admin/puzzles/${id}`, json('PUT', patch), true),
    remove: (id: number) => request<void>(`/admin/puzzles/${id}`, { method: 'DELETE' }, true),
    uploadFrame: (id: number, position: number, image: Blob) => {
      const fd = new FormData()
      fd.append('image', image, 'frame.jpg')
      fd.append('position', String(position))
      return request<AdminFrame>(`/admin/puzzles/${id}/frames`, { method: 'POST', body: fd }, true)
    },
    removeFrame: (id: number, position: number) =>
      request<void>(`/admin/puzzles/${id}/frames/${position}`, { method: 'DELETE' }, true),
    reorder: (id: number, frameIds: number[]) =>
      request<AdminFrame[]>(`/admin/puzzles/${id}/frames/order`, json('PUT', { frameIds }), true),
    calendar: () => request<Calendar>('/admin/calendar', {}, true),
    importMangas: (pages?: number) =>
      request<{ imported: number }>('/admin/mangas/import', json('POST', pages ? { pages } : {}), true),
  },
}
