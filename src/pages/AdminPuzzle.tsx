import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api, assetUrl, getToken, MODE_LABEL, type AdminPuzzle as Puzzle, type Manga } from '../api'
import FrameEditor from '../components/FrameEditor'
import GuessInput from '../components/GuessInput'
import ImagePicker from '../components/ImagePicker'
import { Failure, Loading } from '../components/Status'
import { splitList, useAdminAction, useAdminGuard } from '../useAdmin'
import { useLoad } from '../useLoad'

export default function AdminPuzzle() {
  const id = Number(useParams().id)
  const authed = useAdminGuard()
  const [s, reload] = useLoad(() => (getToken() ? api.admin.puzzle(id) : Promise.reject(new Error('non connecté'))), String(id))
  // dans le parent : le message survit au remontage de l'éditeur
  const action = useAdminAction(reload)
  if (!authed) return null
  if (s.status === 'loading') return <Loading />
  if (s.status === 'error') return <Failure error={s.error} onRetry={reload} />
  // l'éditeur repart des valeurs enregistrées après chaque sauvegarde
  return <Editor key={JSON.stringify([s.data.manga?.id, s.data.answerName, s.data.answerAliases])} p={s.data} reload={reload} action={action} />
}

function Editor({ p, reload, action }: { p: Puzzle; reload: () => void; action: ReturnType<typeof useAdminAction> }) {
  const nav = useNavigate()
  const { busy, msg, setMsg, run } = action
  const character = p.mode === 'character'
  const frames = [...p.frames].sort((a, b) => a.position - b.position)
  const byPos = new Map(frames.map((f) => [f.position, f]))
  const firstEmpty = Array.from({ length: p.maxFrames }, (_, i) => i + 1).find((n) => !byPos.has(n)) ?? 1
  const [pos, setPos] = useState(firstEmpty)

  const [manga, setManga] = useState<Manga | null>(null)
  const [mangaKey, setMangaKey] = useState(0)
  const [name, setName] = useState(p.answerName ?? '')
  const [aliases, setAliases] = useState(p.answerAliases.join('\n'))

  const dirty =
    !!manga ||
    (character && (name.trim() !== (p.answerName ?? '') || splitList(aliases).join('\n') !== p.answerAliases.join('\n')))

  const saveAnswer = () =>
    run(
      () =>
        api.admin.update(p.id, {
          ...(manga ? { mangaId: manga.id } : {}),
          ...(character ? { answerName: name.trim(), answerAliases: splitList(aliases) } : {}),
        }),
      'Réponse enregistrée.',
    )

  function move(i: number, d: -1 | 1) {
    const ids = frames.map((f) => f.id)
    ;[ids[i], ids[i + d]] = [ids[i + d], ids[i]]
    void run(() => api.admin.reorder(p.id, ids), 'Ordre mis à jour.')
  }

  async function remove() {
    if (!window.confirm('Supprimer ce puzzle et ses images ?')) return
    if (await run(() => api.admin.remove(p.id))) nav('/admin')
  }

  const title = character ? p.answerName : p.manga?.title

  return (
    <div className="admin">
      <p><Link to="/admin" className="link">← Puzzles</Link></p>
      <h1 className="display page-title">
        {title} <span className="muted-title">{MODE_LABEL[p.mode]}</span>
      </h1>

      <div className={`banner ${p.published ? 'banner-ok' : ''}`}>
        <span>
          <strong>{p.published ? 'Publié' : 'Brouillon'}</strong>
          {p.published
            ? ' : visible dans la liste des joueurs et les archives.'
            : p.ready
              ? ' : prêt, pas encore visible des joueurs.'
              : character
                ? ' : ajoute l’image du personnage pour pouvoir publier.'
                : ' : ajoute au moins une case pour pouvoir publier.'}
        </span>
        <button
          type="button"
          className={`btn btn-sm ${p.published ? 'btn-ghost' : 'btn-ink'}`}
          disabled={busy || (!p.published && !p.ready)}
          onClick={() => void run(() => api.admin.update(p.id, { published: !p.published }), p.published ? 'Puzzle retiré.' : 'Puzzle publié.')}
        >
          {p.published ? 'Dépublier' : 'Publier'}
        </button>
      </div>
      {msg && <p className={msg.ok ? 'ok' : 'error'} role="status">{msg.text}</p>}

      <section className="card">
        <h2 className="display">{character ? 'Image du personnage' : 'Cases (dans l’ordre de révélation)'}</h2>
        {!character && (
          <ol className="slots">
            {Array.from({ length: p.maxFrames }, (_, i) => {
              const f = byPos.get(i + 1)
              const k = f ? frames.indexOf(f) : -1
              return (
                <li key={i} className={pos === i + 1 ? 'slot is-sel' : 'slot'}>
                  <button type="button" className="slot-pick" onClick={() => setPos(i + 1)} aria-pressed={pos === i + 1} aria-label={`Case ${i + 1}${f ? '' : ', vide'}`}>
                    {f ? <img src={assetUrl(f.url)} alt="" /> : <span className="slot-empty">vide</span>}
                    <span className="slot-no">{i + 1}</span>
                  </button>
                  {f && (
                    <div className="slot-tools">
                      <button type="button" className="chip" disabled={busy || k === 0} onClick={() => move(k, -1)} aria-label={`Déplacer la case ${i + 1} avant`}>←</button>
                      <button type="button" className="chip" disabled={busy || k === frames.length - 1} onClick={() => move(k, 1)} aria-label={`Déplacer la case ${i + 1} après`}>→</button>
                      <button type="button" className="chip" disabled={busy} onClick={() => { if (window.confirm(`Supprimer la case ${i + 1} ?`)) void run(() => api.admin.removeFrame(p.id, i + 1)) }} aria-label={`Supprimer la case ${i + 1}`}>✕</button>
                    </div>
                  )}
                </li>
              )
            })}
          </ol>
        )}
        {!character && <p className="hint">De 1 à 6 cases : la première est montrée d’entrée, chaque erreur révèle la suivante.</p>}
        {character && byPos.get(1) && (
          <div className="char-current">
            <img src={assetUrl(byPos.get(1)!.url)} alt="Image actuelle du personnage" />
            <button type="button" className="chip" disabled={busy} onClick={() => { if (window.confirm('Supprimer l’image ?')) void run(() => api.admin.removeFrame(p.id, 1)) }}>Supprimer</button>
          </div>
        )}
        <h3 className="field-label">{character ? (byPos.has(1) ? 'Remplacer l’image' : 'Ajouter l’image') : `Éditeur : case ${pos}`}</h3>
        <FrameEditor
          key={`${p.mode}-${pos}`}
          ratio={character ? 3 / 4 : 1.6}
          submitLabel={character ? 'Enregistrer l’image' : byPos.has(pos) ? `Remplacer la case ${pos}` : `Ajouter en case ${pos}`}
          onSubmit={async (blob) => {
            await api.admin.uploadFrame(p.id, character ? 1 : pos, blob)
            setMsg({ ok: true, text: character ? 'Image enregistrée.' : `Case ${pos} enregistrée.` })
            reload()
            if (!character && pos < p.maxFrames) setPos(pos + 1)
          }}
        />
      </section>

      <section className="card">
        <h2 className="display">Réponse</h2>
        {character && (
          <>
            <div>
              <label className="field-label" htmlFor="ans-name">Nom du personnage</label>
              <input id="ans-name" className="input" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="field-label" htmlFor="ans-aliases">Autres réponses acceptées</label>
              <textarea id="ans-aliases" className="input" rows={3} value={aliases} onChange={(e) => setAliases(e.target.value)} placeholder={'Luffy\nMugiwara\nルフィ'} />
              <p className="hint">Une par ligne. Majuscules, accents et ponctuation sont ignorés lors de la comparaison.</p>
            </div>
          </>
        )}
        <GuessInput
          key={mangaKey}
          value={manga}
          onChange={setManga}
          label={character ? `Œuvre (actuelle : ${p.manga?.title ?? 'aucune'})` : `Manga à deviner (actuel : ${p.manga?.title})`}
          placeholder="Changer…"
        />
        <div className="actions">
          <button type="button" className="btn btn-ink" disabled={busy || !dirty || (character && !name.trim())} onClick={() => void saveAnswer()}>
            Enregistrer la réponse
          </button>
          {character && p.manga && (
            <button type="button" className="linklike" disabled={busy} onClick={() => { setManga(null); setMangaKey((k) => k + 1); void run(() => api.admin.update(p.id, { mangaId: null }), 'Œuvre retirée.') }}>
              Retirer l’œuvre
            </button>
          )}
        </div>
      </section>

      <section className="card">
        <h2 className="display">Écran de révélation</h2>
        <ImagePicker
          label="Image affichée en grand quand la réponse est dévoilée"
          url={p.answerImageUrl}
          busy={busy}
          hint={p.answerImageUrl ? undefined : p.manga?.coverUrl ? 'Sans image, la couverture du manga est utilisée.' : 'Sans image, l’écran de révélation n’affiche que les titres.'}
          onUpload={(f) => void run(() => api.admin.uploadAnswerImage(p.id, f), 'Image de révélation enregistrée.')}
          onRemove={() => void run(() => api.admin.removeAnswerImage(p.id), 'Image retirée.')}
        />
        <dl className="reveal-preview">
          {character && <><dt>Personnage</dt><dd>{p.answerName}</dd></>}
          <dt>Titre japonais</dt><dd lang="ja">{p.manga?.titleNative || p.manga?.title || '—'}</dd>
          <dt>Titre anglais</dt><dd>{p.manga?.titleEnglish || '—'}</dd>
        </dl>
        {p.manga && (!p.manga.titleNative || !p.manga.titleEnglish) && (
          <p className="hint">Titres manquants ? <Link to="/admin/mangas" className="link">Complète la fiche du manga</Link>.</p>
        )}
      </section>

      <button type="button" className="btn btn-danger" disabled={busy} onClick={() => void remove()}>Supprimer ce puzzle</button>
    </div>
  )
}
