import { useState } from 'react'
import { api, assetUrl, getToken, type AdminManga, type MangaInput } from '../api'
import ImagePicker from '../components/ImagePicker'
import { Failure, Loading } from '../components/Status'
import { splitList, useAdminAction, useAdminGuard } from '../useAdmin'
import { useLoad } from '../useLoad'

interface Draft {
  title: string
  titleNative: string
  titleEnglish: string
  aliases: string
  author: string
  year: string
  link: string
}

const toDraft = (m?: AdminManga): Draft => ({
  title: m?.title ?? '',
  titleNative: m?.titleNative ?? '',
  titleEnglish: m?.titleEnglish ?? '',
  aliases: m?.aliases.join('\n') ?? '',
  author: m?.author ?? '',
  year: m?.year ? String(m.year) : '',
  link: m?.link ?? '',
})

const toInput = (d: Draft): MangaInput => ({
  title: d.title.trim(),
  titleNative: d.titleNative.trim() || null,
  titleEnglish: d.titleEnglish.trim() || null,
  aliases: splitList(d.aliases),
  author: d.author.trim() || null,
  year: d.year.trim() ? Number(d.year) : null,
  link: d.link.trim() || null,
})

const FIELDS: { key: keyof Draft; label: string; placeholder?: string; lang?: string; type?: string }[] = [
  { key: 'title', label: 'Titre principal (romaji) *', placeholder: 'One Piece' },
  { key: 'titleNative', label: 'Titre japonais', placeholder: 'ワンピース', lang: 'ja' },
  { key: 'titleEnglish', label: 'Titre anglais', placeholder: 'One Piece' },
  { key: 'author', label: 'Auteur', placeholder: 'Eiichiro Oda' },
  { key: 'year', label: 'Année', placeholder: '1997', type: 'number' },
  { key: 'link', label: 'Lien (fiche, achat…)', placeholder: 'https://…', type: 'url' },
]

function MangaForm({ initial, submitLabel, busy, onSubmit, onCancel }: {
  initial?: AdminManga
  submitLabel: string
  busy: boolean
  onSubmit: (input: MangaInput) => Promise<boolean>
  onCancel?: () => void
}) {
  const [d, setD] = useState(() => toDraft(initial))
  const set = (k: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setD({ ...d, [k]: e.target.value })
  const idp = initial ? `m${initial.id}` : 'new'
  return (
    <form
      className="manga-form"
      onSubmit={async (e) => {
        e.preventDefault()
        if (await onSubmit(toInput(d)) && !initial) setD(toDraft())
      }}
    >
      <div className="form-grid">
        {FIELDS.map((f) => (
          <div key={f.key}>
            <label className="field-label" htmlFor={`${idp}-${f.key}`}>{f.label}</label>
            <input id={`${idp}-${f.key}`} className="input" type={f.type ?? 'text'} lang={f.lang} value={d[f.key]} onChange={set(f.key)} placeholder={f.placeholder} required={f.key === 'title'} />
          </div>
        ))}
      </div>
      <div>
        <label className="field-label" htmlFor={`${idp}-aliases`}>Autres titres acceptés (recherche)</label>
        <textarea id={`${idp}-aliases`} className="input" rows={2} value={d.aliases} onChange={set('aliases')} placeholder={'OP\nワンピ'} />
        <p className="hint">Un par ligne. Servent à retrouver le manga dans l’autocomplétion.</p>
      </div>
      <div className="actions">
        <button type="submit" className="btn btn-ink" disabled={busy || !d.title.trim()}>{submitLabel}</button>
        {onCancel && <button type="button" className="btn btn-ghost" onClick={onCancel}>Annuler</button>}
      </div>
    </form>
  )
}

export default function AdminMangas() {
  const authed = useAdminGuard()
  const [s, reload] = useLoad(() => (getToken() ? api.admin.mangas() : Promise.resolve([])))
  const { busy, msg, run } = useAdminAction(reload)
  const [editing, setEditing] = useState<number | null>(null)
  const [filter, setFilter] = useState('')

  if (!authed) return null
  if (s.status === 'loading') return <Loading />
  if (s.status === 'error') return <Failure error={s.error} onRetry={reload} />
  const f = filter.trim().toLowerCase()
  const mangas = f
    ? s.data.filter((m) => [m.title, m.titleNative, m.titleEnglish, ...m.aliases].some((t) => t?.toLowerCase().includes(f)))
    : s.data

  return (
    <div className="admin">
      <h1 className="display page-title">Mangas</h1>

      <section className="card">
        <h2 className="display">Ajouter un manga</h2>
        <MangaForm submitLabel="Ajouter" busy={busy} onSubmit={(input) => run(() => api.admin.createManga(input), `« ${input.title} » ajouté.`)} />
      </section>

      {msg && <p className={msg.ok ? 'ok' : 'error'} role="status">{msg.text}</p>}

      <h2 className="display admin-group-title">Catalogue <span className="muted">({s.data.length})</span></h2>
      {s.data.length > 5 && (
        <input className="input filter" type="search" placeholder="Filtrer…" aria-label="Filtrer les mangas" value={filter} onChange={(e) => setFilter(e.target.value)} />
      )}
      {s.data.length === 0 && <p className="muted">Catalogue vide : ajoute ton premier manga ci-dessus.</p>}
      <ul className="mlist">
        {mangas.map((m) => (
          <li key={m.id} className="mrow">
            {editing === m.id ? (
              <div className="mrow-edit">
                <ImagePicker
                  label="Couverture"
                  shape="portrait"
                  url={m.coverUrl}
                  busy={busy}
                  onUpload={(file) => void run(() => api.admin.uploadCover(m.id, file), 'Couverture enregistrée.')}
                  onRemove={() => void run(() => api.admin.removeCover(m.id), 'Couverture retirée.')}
                />
                <MangaForm
                  initial={m}
                  submitLabel="Enregistrer"
                  busy={busy}
                  onCancel={() => setEditing(null)}
                  onSubmit={async (input) => {
                    const ok = await run(() => api.admin.updateManga(m.id, input), 'Manga mis à jour.')
                    if (ok) setEditing(null)
                    return ok
                  }}
                />
              </div>
            ) : (
              <div className="mrow-view">
                <span className="mrow-cover">{m.coverUrl ? <img src={assetUrl(m.coverUrl)} alt="" /> : null}</span>
                <span className="mrow-main">
                  <strong>{m.title}</strong>
                  <small>
                    {[m.titleNative, m.titleEnglish, m.author, m.year].filter(Boolean).join(' · ') || '—'}
                  </small>
                  <small>{m.puzzleCount ? `${m.puzzleCount} puzzle${m.puzzleCount > 1 ? 's' : ''}` : 'aucun puzzle'}</small>
                </span>
                <span className="mrow-actions">
                  <button type="button" className="chip" onClick={() => setEditing(m.id)}>Modifier</button>
                  <button
                    type="button"
                    className="chip"
                    disabled={busy || !!m.puzzleCount}
                    title={m.puzzleCount ? 'Utilisé par des puzzles' : undefined}
                    onClick={() => { if (window.confirm(`Supprimer « ${m.title} » ?`)) void run(() => api.admin.removeManga(m.id), 'Manga supprimé.') }}
                  >
                    Supprimer
                  </button>
                </span>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
