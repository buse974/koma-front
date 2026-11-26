import { useCallback, useEffect, useRef, useState } from 'react'

const MAX_W = 1600

interface Rect {
  x: number // coordonnées normalisées (0..1) dans le cadre recadré
  y: number
  w: number
  h: number
}
type Mode = 'crop' | 'blur'

interface Props {
  /** Reçoit le JPEG final ; doit renvoyer une promesse (upload). */
  onSubmit: (blob: Blob) => Promise<void>
  submitLabel?: string
  /** largeur / hauteur du cadre (16:10 par défaut) */
  ratio?: number
}

/** Dessine le cadre recadré + flous dans un canvas de taille (w,h). */
function paint(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  src: { x: number; y: number; w: number; h: number },
  w: number,
  h: number,
  rects: Rect[],
) {
  ctx.clearRect(0, 0, w, h)
  ctx.drawImage(img, src.x, src.y, src.w, src.h, 0, 0, w, h)
  if (rects.length === 0) return
  // Canvas intermédiaire : copie de l'image floutée fortement (filter: blur)
  const tmp = document.createElement('canvas')
  tmp.width = w
  tmp.height = h
  const t = tmp.getContext('2d')!
  t.filter = `blur(${Math.round(w * 0.022)}px)`
  t.drawImage(ctx.canvas, 0, 0)
  for (const r of rects) {
    ctx.save()
    ctx.beginPath()
    ctx.rect(r.x * w, r.y * h, r.w * w, r.h * h)
    ctx.clip()
    ctx.drawImage(tmp, 0, 0)
    ctx.restore()
  }
}

export default function FrameEditor({ onSubmit, submitLabel = 'Envoyer la case', ratio: RATIO = 1.6 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  const [zoom, setZoom] = useState(1)
  const [center, setCenter] = useState({ x: 0, y: 0 })
  const [rects, setRects] = useState<Rect[]>([])
  const [draft, setDraft] = useState<Rect | null>(null)
  const [mode, setMode] = useState<Mode>('crop')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const drag = useRef<{ x: number; y: number; cx: number; cy: number } | null>(null)
  const urlRef = useRef<string | null>(null)

  useEffect(
    () => () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    },
    [],
  )

  // Région source (en pixels de l'image) pour un zoom et un centre donnés
  const region = useCallback(
    (z: number, c: { x: number; y: number }) => {
      if (!img) return { x: 0, y: 0, w: 1, h: 1 }
      const base = Math.min(img.naturalWidth, img.naturalHeight * RATIO)
      const w = base / z
      const h = w / RATIO
      const x = Math.min(Math.max(c.x - w / 2, 0), img.naturalWidth - w)
      const y = Math.min(Math.max(c.y - h / 2, 0), img.naturalHeight - h)
      return { x, y, w, h }
    },
    [img, RATIO],
  )

  // Rendu de l'aperçu
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !img) return
    const cssW = canvas.clientWidth
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const w = Math.round(cssW * dpr)
    const h = Math.round(w / RATIO)
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')!
    paint(ctx, img, region(zoom, center), w, h, rects)
    // surcouche (aperçu uniquement, jamais exportée)
    ctx.save()
    ctx.lineWidth = 2 * dpr
    ctx.setLineDash([6 * dpr, 4 * dpr])
    ctx.strokeStyle = '#e63946'
    for (const r of draft ? [...rects, draft] : mode === 'blur' ? rects : []) {
      ctx.strokeRect(r.x * w, r.y * h, r.w * w, r.h * h)
    }
    ctx.restore()
  }, [img, zoom, center, rects, draft, mode, region, RATIO])

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    const url = URL.createObjectURL(f)
    urlRef.current = url
    const im = new Image()
    im.onload = () => {
      setImg(im)
      setZoom(1)
      setCenter({ x: im.naturalWidth / 2, y: im.naturalHeight / 2 })
      setRects([])
      setError(null)
    }
    im.onerror = () => setError('Image illisible.')
    im.src = url
  }

  function pos(e: React.PointerEvent<HTMLCanvasElement>) {
    const r = e.currentTarget.getBoundingClientRect()
    return {
      nx: Math.min(Math.max((e.clientX - r.left) / r.width, 0), 1),
      ny: Math.min(Math.max((e.clientY - r.top) / r.height, 0), 1),
      px: e.clientX,
      py: e.clientY,
    }
  }

  function down(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!img) return
    e.currentTarget.setPointerCapture(e.pointerId)
    const p = pos(e)
    if (mode === 'crop') drag.current = { x: p.px, y: p.py, cx: center.x, cy: center.y }
    else drag.current = { x: p.nx, y: p.ny, cx: 0, cy: 0 }
  }
  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    const d = drag.current
    if (!d || !img) return
    const p = pos(e)
    if (mode === 'crop') {
      const reg = region(zoom, center)
      const k = reg.w / e.currentTarget.clientWidth
      setCenter({ x: d.cx - (p.px - d.x) * k, y: d.cy - (p.py - d.y) * k })
    } else {
      setDraft({ x: Math.min(d.x, p.nx), y: Math.min(d.y, p.ny), w: Math.abs(p.nx - d.x), h: Math.abs(p.ny - d.y) })
    }
  }
  function up() {
    drag.current = null
    if (draft && draft.w > 0.01 && draft.h > 0.01) setRects((r) => [...r, draft])
    setDraft(null)
  }

  function changeZoom(z: number) {
    // maintient le centre dans l'image après clamp
    setZoom(z)
    setCenter((c) => {
      const r = region(z, c)
      return { x: r.x + r.w / 2, y: r.y + r.h / 2 }
    })
  }

  async function submit() {
    if (!img) return
    setBusy(true)
    setError(null)
    try {
      const src = region(zoom, center)
      const w = Math.min(MAX_W, Math.round(src.w))
      const h = Math.round(w / RATIO)
      const c = document.createElement('canvas')
      c.width = w
      c.height = h
      paint(c.getContext('2d')!, img, src, w, h, rects)
      const blob = await new Promise<Blob | null>((res) => c.toBlob(res, 'image/jpeg', 0.9))
      if (!blob) throw new Error('Export impossible.')
      await onSubmit(blob)
      setImg(null)
      setRects([])
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="editor">
      <label className="field-label" htmlFor="frame-file">
        Image source
      </label>
      <input id="frame-file" className="input" type="file" accept="image/*" onChange={onFile} />

      {img && (
        <>
          <div className="seg" role="group" aria-label="Outil">
            <button type="button" aria-pressed={mode === 'crop'} onClick={() => setMode('crop')}>
              Recadrer
            </button>
            <button type="button" aria-pressed={mode === 'blur'} onClick={() => setMode('blur')}>
              Flouter
            </button>
          </div>
          <p className="hint">
            {mode === 'crop'
              ? `Glisse pour déplacer, utilise le curseur pour zoomer (cadre ${RATIO < 1 ? 'portrait 3:4' : '16:10'}).`
              : 'Dessine un rectangle sur chaque bulle de texte à masquer.'}
          </p>
          <canvas
            ref={canvasRef}
            className="editor-canvas"
            style={{ aspectRatio: String(RATIO), cursor: mode === 'crop' ? 'grab' : 'crosshair' }}
            onPointerDown={down}
            onPointerMove={move}
            onPointerUp={up}
            onPointerCancel={up}
            role="img"
            aria-label="Aperçu de la case"
          />
          <label className="field-label" htmlFor="zoom">
            Zoom
          </label>
          <input
            id="zoom"
            type="range"
            min={1}
            max={4}
            step={0.01}
            value={zoom}
            onChange={(e) => changeZoom(Number(e.target.value))}
          />
          <div className="rects">
            <span className="muted">{rects.length} zone{rects.length > 1 ? 's' : ''} floutée{rects.length > 1 ? 's' : ''}</span>
            <button type="button" className="btn btn-ghost btn-sm" disabled={!rects.length} onClick={() => setRects((r) => r.slice(0, -1))}>
              Annuler la dernière
            </button>
            {rects.map((_, i) => (
              <button
                key={i}
                type="button"
                className="chip"
                aria-label={`Supprimer la zone ${i + 1}`}
                onClick={() => setRects((r) => r.filter((_, j) => j !== i))}
              >
                Zone {i + 1} ✕
              </button>
            ))}
          </div>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <button type="button" className="btn btn-red" disabled={busy} onClick={() => void submit()}>
            {busy ? 'Envoi…' : submitLabel}
          </button>
        </>
      )}
      {!img && error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
