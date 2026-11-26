export type Mode = 'manga' | 'character'

export interface Manga {
  id: number
  title: string
  titleNative: string | null
  titleEnglish: string | null
  year: number | null
  coverUrl: string | null
}
export interface AdminManga extends Manga {
  aliases: string[]
  author: string | null
  link: string | null
  puzzleCount?: number
}
export type MangaInput = Partial<Omit<AdminManga, 'id' | 'coverUrl' | 'puzzleCount'>>

/** Contenu de l'écran de révélation. */
export interface Answer {
  name: string | null // mode personnage
  titleNative: string | null
  title: string | null
  titleEnglish: string | null
  author: string | null
  year: number | null
  link: string | null
  imageUrl: string | null
}
export interface Guess {
  type: 'guess' | 'skip'
  manga?: Manga | null // mode manga
  text?: string // mode personnage
  correct: boolean
}
export interface PuzzleMeta {
  id: number
  number: number
  mode: Mode
}
export type GameStatus = 'playing' | 'won' | 'lost'
export interface GameState extends PuzzleMeta {
  status: GameStatus
  maxAttempts: number
  frameCount: number
  guesses: Guess[]
  frames: string[]
  answer: Answer | null
}
export interface Stats {
  plays: number
  wins: number
  distribution: Record<string, number>
}
export interface AdminFrame {
  id: number
  position: number
  url: string
}
export interface AdminPuzzle {
  id: number
  mode: Mode
  position: number
  published: boolean
  ready: boolean
  maxFrames: number
  manga: AdminManga | null
  answerName: string | null
  answerAliases: string[]
  answerImageUrl: string | null
  frames: AdminFrame[]
}
export interface PuzzleInput {
  mangaId?: number | null
  answerName?: string
  answerAliases?: string[]
  published?: boolean
}

export const MODE_LABEL: Record<Mode, string> = { manga: 'Devine le manga', character: 'Devine le personnage' }
export const MODE_SHORT: Record<Mode, string> = { manga: 'Manga', character: 'Perso' }

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

const image = (blob: Blob, extra: Record<string, string> = {}): RequestInit => {
  const fd = new FormData()
  fd.append('image', blob, 'image.jpg')
  for (const [k, v] of Object.entries(extra)) fd.append(k, v)
  return { method: 'POST', body: fd }
}

export const api = {
  /** Mode quotidien : désactivé côté API pour l'instant (cf. DAILY_ENABLED). */
  today: (playerId: string) => request<GameState>(`/puzzles/today?playerId=${q(playerId)}`),
  puzzles: () => request<PuzzleMeta[]>('/puzzles'),
  puzzle: (id: number, playerId: string) => request<GameState>(`/puzzles/${id}?playerId=${q(playerId)}`),
  guess: (id: number, playerId: string, answer: { mangaId: number } | { text: string }) =>
    request<GameState>(`/puzzles/${id}/guess`, json('POST', { playerId, ...answer })),
  skip: (id: number, playerId: string) => request<GameState>(`/puzzles/${id}/skip`, json('POST', { playerId })),
  stats: (id: number) => request<Stats>(`/puzzles/${id}/stats`),
  search: (query: string, limit = 10, signal?: AbortSignal) =>
    request<Manga[]>(`/mangas/search?q=${q(query)}&limit=${limit}`, { signal }),

  admin: {
    login: (password: string) => request<{ token: string }>('/admin/login', json('POST', { password })),
    puzzles: () => request<AdminPuzzle[]>('/admin/puzzles', {}, true),
    puzzle: (id: number) => request<AdminPuzzle>(`/admin/puzzles/${id}`, {}, true),
    create: (mode: Mode, input: PuzzleInput) =>
      request<AdminPuzzle>('/admin/puzzles', json('POST', { mode, ...input }), true),
    update: (id: number, patch: PuzzleInput) => request<AdminPuzzle>(`/admin/puzzles/${id}`, json('PUT', patch), true),
    remove: (id: number) => request<void>(`/admin/puzzles/${id}`, { method: 'DELETE' }, true),
    order: (mode: Mode, ids: number[]) =>
      request<AdminPuzzle[]>('/admin/puzzles/order', json('PUT', { mode, ids }), true),
    uploadFrame: (id: number, position: number, blob: Blob) =>
      request<AdminFrame>(`/admin/puzzles/${id}/frames`, image(blob, { position: String(position) }), true),
    removeFrame: (id: number, position: number) =>
      request<void>(`/admin/puzzles/${id}/frames/${position}`, { method: 'DELETE' }, true),
    reorder: (id: number, frameIds: number[]) =>
      request<AdminFrame[]>(`/admin/puzzles/${id}/frames/order`, json('PUT', { frameIds }), true),
    uploadAnswerImage: (id: number, blob: Blob) =>
      request<AdminPuzzle>(`/admin/puzzles/${id}/answer-image`, image(blob), true),
    removeAnswerImage: (id: number) =>
      request<AdminPuzzle>(`/admin/puzzles/${id}/answer-image`, { method: 'DELETE' }, true),

    mangas: () => request<AdminManga[]>('/admin/mangas', {}, true),
    createManga: (input: MangaInput) => request<AdminManga>('/admin/mangas', json('POST', input), true),
    updateManga: (id: number, input: MangaInput) => request<AdminManga>(`/admin/mangas/${id}`, json('PUT', input), true),
    removeManga: (id: number) => request<void>(`/admin/mangas/${id}`, { method: 'DELETE' }, true),
    uploadCover: (id: number, blob: Blob) => request<AdminManga>(`/admin/mangas/${id}/cover`, image(blob), true),
    removeCover: (id: number) => request<AdminManga>(`/admin/mangas/${id}/cover`, { method: 'DELETE' }, true),
  },
}
