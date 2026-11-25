import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api, assetUrl, getToken, type Manga } from '../api'
import FrameEditor from '../components/FrameEditor'
import GuessInput from '../components/GuessInput'
import { formatDate } from '../format'
import { Failure, Loading } from '../components/Status'
import { useLoad } from '../useLoad'

export default function AdminPuzzle() {
  const id = Number(useParams().id)
  const nav = useNavigate()
  const authed = !!getToken()
  useEffect(() => {
    if (!authed) nav('/admin/login', { replace: true })
  }, [authed, nav])

  const [s, reload] = useLoad(() => (getToken() ? api.admin.puzzle(id) : Promise.reject(new Error('non connecté'))), String(id))
  const [pos, setPos] = useState(1)
  const [date, setDate] = useState<string | null>(null)
  const [manga, setManga] = useState<Manga | null>(null)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [busy, setBusy] = useState(false)

  if (!authed) return null
  if (s.status === 'loading') return <Loading />
  if (s.status === 'error') return <Failure error={s.error} onRetry={reload} />
  const p = s.data
  const frames = [...p.frames].sort((a, b) => a.position - b.position)
  const byPos = new Map(frames.map((f) => [f.position, f]))

  async function run(fn: () => Promise<unknown>, ok?: string) {
    setBusy(true)
    setMsg(null)
    try {
      await fn()
      if (ok) setMsg({ ok: true, text: ok })
      reload()
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message })
    } finally {
      setBusy(false)
    }
  }

  const saveMeta = () =>
    run(
      () => api.admin.update(p.id, { ...(manga ? { mangaId: manga.id } : {}), ...(date ? { date } : {}) }),
      'Puzzle mis à jour.',
    )

  function move(i: number, d: -1 | 1) {
    const ids = frames.map((f) => f.id)
    const j = i + d
    ;[ids[i], ids[j]] = [ids[j], ids[i]]
    void run(() => api.admin.reorder(p.id, ids), 'Ordre mis à jour.')
  }

  async function remove() {
    if (!window.confirm(`Supprimer le puzzle #${p.number} et ses images ?`)) return
    await run(async () => {
      await api.admin.remove(p.id)
      nav('/admin')
    })
  }

  return (
    <div className="admin">
      <p><Link to="/admin" className="link">← Puzzles</Link></p>
      <h1 className="display page-title">
        #{p.number} <span className="muted-title">{p.manga.title}</span>
      </h1>
      <p className="muted">{formatDate(p.date)} · {frames.length}/6 cases</p>
      {msg && <p className={msg.ok ? 'ok' : 'error'} role="status">{msg.text}</p>}

      <section className="card">
        <h2 className="display">Cases</h2>
        <ol className="slots">
          {Array.from({ length: 6 }, (_, i) => {
            const f = byPos.get(i + 1)
            return (
              <li key={i} className={pos === i + 1 ? 'slot is-sel' : 'slot'}>
                <button type="button" className="slot-pick" onClick={() => setPos(i + 1)} aria-pressed={pos === i + 1} aria-label={`Case ${i + 1}${f ? '' : ', vide'}`}>
                  {f ? <img src={assetUrl(f.url)} alt="" /> : <span className="slot-empty">vide</span>}
                  <span className="slot-no">{i + 1}</span>
                </button>
                {f && (
                  <div className="slot-tools">
                    <button type="button" className="chip" disabled={busy || i === 0 || frames.length < 6} onClick={() => move(i, -1)} aria-label={`Déplacer la case ${i + 1} avant`}>←</button>
                    <button type="button" className="chip" disabled={busy || i === 5 || frames.length < 6} onClick={() => move(i, 1)} aria-label={`Déplacer la case ${i + 1} après`}>→</button>
                    <button type="button" className="chip" disabled={busy} onClick={() => { if (window.confirm(`Supprimer la case ${i + 1} ?`)) void run(() => api.admin.removeFrame(p.id, i + 1)) }} aria-label={`Supprimer la case ${i + 1}`}>✕</button>
                  </div>
                )}
              </li>
            )
          })}
        </ol>
        {frames.length < 6 && <p className="hint">Le réordonnancement est possible quand les 6 cases sont présentes.</p>}
      </section>

      <section className="card">
        <h2 className="display">Éditeur : case {pos}</h2>
        <FrameEditor
          key={pos}
          submitLabel={byPos.has(pos) ? `Remplacer la case ${pos}` : `Ajouter en case ${pos}`}
          onSubmit={async (blob) => {
            await api.admin.uploadFrame(p.id, pos, blob)
            setMsg({ ok: true, text: `Case ${pos} enregistrée.` })
            reload()
            if (pos < 6) setPos(pos + 1)
          }}
        />
      </section>

      <section className="card">
        <h2 className="display">Infos</h2>
        <label className="field-label" htmlFor="d">Date</label>
        <input id="d" className="input" type="date" defaultValue={p.date} onChange={(e) => setDate(e.target.value)} />
        <GuessInput value={manga} onChange={setManga} label={`Manga (actuel : ${p.manga.title})`} placeholder="Changer de manga…" />
        <button type="button" className="btn btn-ink" disabled={busy || (!manga && !date)} onClick={() => void saveMeta()}>Enregistrer</button>
      </section>

      <button type="button" className="btn btn-danger" disabled={busy} onClick={() => void remove()}>Supprimer ce puzzle</button>
    </div>
  )
}
