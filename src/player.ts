const KEY = 'koma:playerId'
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function uuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  const b = crypto.getRandomValues(new Uint8Array(16))
  b[6] = (b[6] & 0x0f) | 0x40
  b[8] = (b[8] & 0x3f) | 0x80
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

let memory: string | null = null

export function getPlayerId(): string {
  if (memory) return memory
  try {
    const stored = localStorage.getItem(KEY)
    if (stored && UUID_RE.test(stored)) return (memory = stored)
  } catch {
    /* stockage indisponible : id éphémère */
  }
  const id = uuid()
  try {
    localStorage.setItem(KEY, id)
  } catch {
    /* ignore */
  }
  return (memory = id)
}

/**
 * Identifiant d'une partie : un nouveau à chaque ouverture d'un puzzle,
 * donc quitter un puzzle le remet à zéro (pas de progression conservée).
 */
export const newSessionId = (): string => uuid()
