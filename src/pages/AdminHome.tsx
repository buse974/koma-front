import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, assetUrl, getToken, MODE_LABEL, type AdminPuzzle, type Manga, type Mode } from '../api'
import GuessInput from '../components/GuessInput'
import { Failure, Loading } from '../components/Status'
import { useAdminAction, useAdminGuard } from '../useAdmin'
import { useLoad } from '../useLoad'

const MODES: Mode[] = ['manga', 'character']

function status(p: AdminPuzzle) {
  if (p.published) return { cls: 'is-pub', label: 'Publié' }
  if (!p.ready) return { cls: 'is-incomplete', label: 'Incomplet' }
  return { cls: 'is-draft', label: 'Brouillon' }
}

export default function AdminHome() {
  const authed = useAdminGuard()
  const nav = useNavigate()
  const [s, reload] = useLoad(() => (getToken() ? api.admin.puzzles() : Promise.resolve([])))
  const { busy, msg, setMsg, run } = useAdminAction(reload)
  const [mode, setMode] = useState<Mode>('manga')
  const [manga, setManga] = useState<Manga | null>(null)
  const [name, setName] = useState('')
  const [formKey, setFormKey] = useState(0)

  if (!authed) return null
  if (s.status === 'loading') return <Loading />
  if (s.status === 'error') return <Failure error={s.error} onRetry={reload} />
  const puzzles = s.data

  const canCreate = mode === 'manga' ? !!manga : name.trim().length > 0
  async function create(e: React.FormEvent) {
    e.preventDefault()
    if (!canCreate) return
    setMsg(null)
    try {
      const p = await api.admin.create(mode, mode === 'manga' ? { mangaId: manga!.id } : { answerName: name.trim(), mangaId: manga?.id ?? null })
      nav(`/admin/puzzles/${p.id}`)
    } catch (err) {
      setMsg({ ok: false, text: (err as Error).message })
    }
  }

  function move(list: AdminPuzzle[], i: number, d: -1 | 1) {
    const ids = list.map((p) => p.id)
    ;[ids[i], ids[i + d]] = [ids[i + d], ids[i]]
    void run(() => api.admin.order(list[0].mode, ids))
  }

  return (
    <div className="admin">
      <h1 className="display page-title">Puzzles</h1>

      <form className="card" onSubmit={create}>
        <h2 className="display">Nouveau puzzle</h2>
        <div className="seg" role="group" aria-label="Mode de jeu">
          {MODES.map((m) => (
            <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)}>
              {MODE_LABEL[m]}
            </button>
          ))}
        </div>
        {mode === 'character' && (
          <div>
            <label className="field-label" htmlFor="char-name">Nom du personnage (réponse)</label>
            <input id="char-name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="ex. Monkey D. Luffy" />
          </div>
        )}
        <GuessInput
          key={`${mode}-${formKey}`}
          value={manga}
          onChange={setManga}
          label={mode === 'manga' ? 'Manga à deviner (réponse)' : 'Œuvre du personnage (facultatif)'}
          placeholder="Cherche dans ton catalogue…"
        />
        <p className="hint">
          Le manga n’existe pas encore ? <Link to="/admin/mangas" className="link">Ajoute-le au catalogue</Link>.
        </p>
        <div className="actions">
          <button type="submit" className="btn btn-ink" disabled={!canCreate}>Créer et ajouter les images</button>
          {manga && (
            <button type="button" className="linklike" onClick={() => { setManga(null); setFormKey((k) => k + 1) }}>
              Effacer le manga
            </button>
          )}
        </div>
      </form>

      {msg && <p className={msg.ok ? 'ok' : 'error'} role="status">{msg.text}</p>}

      {MODES.map((m) => {
        const list = puzzles.filter((p) => p.mode === m)
        return (
          <section key={m} className="admin-group">
            <h2 className="display admin-group-title">{MODE_LABEL[m]} <span className="muted">({list.length})</span></h2>
            {list.length === 0 ? (
              <p className="muted">Aucun puzzle.</p>
            ) : (
              <ol className="plist">
                {list.map((p, i) => {
                  const st = status(p)
                  const thumb = p.frames[0]?.url
                  return (
                    <li key={p.id} className="plist-row">
                      <Link to={`/admin/puzzles/${p.id}`} className={`prow ${st.cls}`}>
                        <span className="tile-num">{i + 1}</span>
                        <span className={`prow-thumb${m === 'character' ? ' is-portrait' : ''}`}>
                          {thumb ? <img src={assetUrl(thumb)} alt="" /> : null}
                        </span>
                        <span className="prow-main">
                          <strong>{m === 'character' ? p.answerName : p.manga?.title}</strong>
                          <small>
                            {m === 'character' && p.manga ? `${p.manga.title} · ` : ''}
                            {p.frames.length}/{p.maxFrames} image{p.maxFrames > 1 ? 's' : ''}
                            {p.answerImageUrl ? ' · révélation ✓' : ''}
                          </small>
                        </span>
                        <span className={`badge ${st.cls}`}>{st.label}</span>
                      </Link>
                      <div className="prow-move">
                        <button type="button" className="chip" disabled={busy || i === 0} onClick={() => move(list, i, -1)} aria-label={`Monter le puzzle ${i + 1}`}>↑</button>
                        <button type="button" className="chip" disabled={busy || i === list.length - 1} onClick={() => move(list, i, 1)} aria-label={`Descendre le puzzle ${i + 1}`}>↓</button>
                      </div>
                    </li>
                  )
                })}
              </ol>
            )}
          </section>
        )
      })}
    </div>
  )
}
