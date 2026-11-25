import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, getToken, type Manga } from '../api'
import GuessInput from '../components/GuessInput'
import { formatDate } from '../format'
import { Failure, Loading } from '../components/Status'
import { useLoad } from '../useLoad'

export default function AdminHome() {
  const nav = useNavigate()
  const authed = !!getToken()
  useEffect(() => {
    if (!authed) nav('/admin/login', { replace: true })
  }, [authed, nav])

  const [s, reload] = useLoad(async () => {
    if (!getToken()) return { puzzles: [], cal: null }
    const [puzzles, cal] = await Promise.all([api.admin.puzzles(), api.admin.calendar()])
    return { puzzles, cal }
  })
  const [date, setDate] = useState('')
  const [manga, setManga] = useState<Manga | null>(null)
  const [formKey, setFormKey] = useState(0)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [busy, setBusy] = useState(false)

  if (!authed) return null
  if (s.status === 'loading') return <Loading />
  if (s.status === 'error') return <Failure error={s.error} onRetry={reload} />
  const { puzzles, cal } = s.data

  async function create(e: React.FormEvent) {
    e.preventDefault()
    if (!manga || !date) return
    setBusy(true)
    setMsg(null)
    try {
      const p = await api.admin.create(manga.id, date)
      nav(`/admin/puzzles/${p.id}`)
    } catch (err) {
      setMsg({ ok: false, text: (err as Error).message })
    } finally {
      setBusy(false)
    }
  }

  async function importMangas() {
    setBusy(true)
    setMsg({ ok: true, text: 'Import AniList en cours (peut prendre une minute)…' })
    try {
      const r = await api.admin.importMangas()
      setMsg({ ok: true, text: `${r.imported} mangas importés.` })
    } catch (err) {
      setMsg({ ok: false, text: (err as Error).message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="admin">
      <h1 className="display page-title">Puzzles</h1>

      {cal && (
        <div className={`banner ${cal.alert ? 'banner-alert' : ''}`} role={cal.alert ? 'alert' : 'status'}>
          <strong>{cal.alert ? 'Stock bas : ' : 'Calendrier : '}</strong>
          {cal.scheduledAhead} jour{cal.scheduledAhead > 1 ? 's' : ''} planifié{cal.scheduledAhead > 1 ? 's' : ''} d’avance
          {cal.nextEmptyDate && <> · prochaine date libre : {formatDate(cal.nextEmptyDate)}</>}
          {cal.nextEmptyDate && (
            <button type="button" className="linklike" onClick={() => setDate(cal.nextEmptyDate ?? '')}>
              utiliser
            </button>
          )}
        </div>
      )}

      <form className="card" onSubmit={create}>
        <h2 className="display">Nouveau puzzle</h2>
        <label className="field-label" htmlFor="date">Date</label>
        <input id="date" className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        <GuessInput key={formKey} value={manga} onChange={setManga} label="Manga à deviner" />
        <button type="submit" className="btn btn-ink" disabled={busy || !manga || !date}>Créer</button>
        <button
          type="button"
          className="linklike"
          onClick={() => {
            setManga(null)
            setFormKey((k) => k + 1)
          }}
        >
          Effacer le manga
        </button>
      </form>

      <div className="card">
        <h2 className="display">Catalogue</h2>
        <p className="muted">Importe les mangas populaires depuis AniList (alimente l’autocomplétion).</p>
        <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => void importMangas()}>Importer depuis AniList</button>
      </div>

      {msg && <p className={msg.ok ? 'ok' : 'error'} role="status">{msg.text}</p>}

      <ul className="plist">
        {puzzles.map((p) => (
          <li key={p.id}>
            <Link to={`/admin/puzzles/${p.id}`} className={`prow${p.frames.length < 6 ? ' is-incomplete' : ''}`}>
              <span className="tile-num">#{p.number}</span>
              <span>
                <strong>{p.manga.title}</strong>
                <small>{formatDate(p.date)}</small>
              </span>
              <span className="count">{p.frames.length}/6</span>
            </Link>
          </li>
        ))}
        {puzzles.length === 0 && <li className="muted">Aucun puzzle.</li>}
      </ul>
    </div>
  )
}
