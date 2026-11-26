import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getToken } from './api'

/** Redirige vers la connexion si besoin ; renvoie true si connecté. */
export function useAdminGuard(): boolean {
  const nav = useNavigate()
  const authed = !!getToken()
  useEffect(() => {
    if (!authed) nav('/admin/login', { replace: true })
  }, [authed, nav])
  return authed
}

export type Msg = { ok: boolean; text: string } | null

/** Exécute une action admin : occupe, affiche le message, recharge. */
export function useAdminAction(reload: () => void) {
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<Msg>(null)
  async function run(fn: () => Promise<unknown>, ok?: string): Promise<boolean> {
    setBusy(true)
    setMsg(null)
    try {
      await fn()
      if (ok) setMsg({ ok: true, text: ok })
      reload()
      return true
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message })
      return false
    } finally {
      setBusy(false)
    }
  }
  return { busy, msg, setMsg, run }
}

/** « a, b\nc » → ['a', 'b', 'c'] */
export const splitList = (s: string): string[] =>
  s.split(/[\n,;]/).map((x) => x.trim()).filter(Boolean)
