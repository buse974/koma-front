import { useId, useRef } from 'react'
import { assetUrl } from '../api'

interface Props {
  label: string
  url: string | null
  busy?: boolean
  hint?: string
  onUpload: (file: File) => void
  onRemove?: () => void
  /** forme de l'aperçu */
  shape?: 'wide' | 'portrait'
}

/** Image envoyée telle quelle (pas de recadrage) : couverture, image de révélation. */
export default function ImagePicker({ label, url, busy, hint, onUpload, onRemove, shape = 'wide' }: Props) {
  const id = useId()
  const input = useRef<HTMLInputElement>(null)
  return (
    <div className="picker">
      <span className="field-label" id={`${id}-l`}>{label}</span>
      <div className={`picker-preview picker-${shape}`}>
        {url ? <img src={assetUrl(url)} alt="" /> : <span className="slot-empty">aucune image</span>}
      </div>
      {hint && <p className="hint">{hint}</p>}
      <div className="picker-actions">
        <input
          ref={input}
          id={id}
          type="file"
          accept="image/*"
          className="sr-only"
          aria-labelledby={`${id}-l`}
          disabled={busy}
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) onUpload(f)
            e.target.value = ''
          }}
        />
        <button type="button" className="btn btn-sm btn-ghost" disabled={busy} onClick={() => input.current?.click()}>
          {url ? 'Remplacer' : 'Importer une image'}
        </button>
        {url && onRemove && (
          <button type="button" className="chip" disabled={busy} onClick={onRemove}>Retirer</button>
        )}
      </div>
    </div>
  )
}
