import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, ApiError, setToken } from '../api'

export default function AdminLogin() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const nav = useNavigate()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const { token } = await api.admin.login(password)
      setToken(token)
      nav('/admin')
    } catch (err) {
      setError(err instanceof ApiError && err.status === 401 ? 'Mot de passe incorrect.' : (err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="card login" onSubmit={submit}>
      <h1 className="display">Connexion</h1>
      <label className="field-label" htmlFor="pw">Mot de passe</label>
      <input id="pw" className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      {error && <p className="error" role="alert">{error}</p>}
      <button type="submit" className="btn btn-ink" disabled={busy || !password}>Entrer</button>
    </form>
  )
}
