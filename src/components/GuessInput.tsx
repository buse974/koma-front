import { useEffect, useId, useRef, useState } from 'react'
import { api, assetUrl, type Manga } from '../api'

interface Props {
  value: Manga | null
  onChange: (m: Manga | null) => void
  disabled?: boolean
  label?: string
  placeholder?: string
  excludeIds?: number[]
}

export default function GuessInput({ value, onChange, disabled, label = 'Titre du manga', placeholder = 'Cherche un manga…', excludeIds }: Props) {
  const id = useId()
  const [text, setText] = useState(value ? value.title : '')
  const [results, setResults] = useState<Manga[]>([])
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  const ctrl = useRef<AbortController | null>(null)


  useEffect(
    () => () => {
      window.clearTimeout(timer.current)
      ctrl.current?.abort()
    },
    [],
  )

  function search(v: string) {
    window.clearTimeout(timer.current)
    ctrl.current?.abort()
    if (v.trim().length < 2) {
      setResults([])
      setLoading(false)
      setOpen(false)
      return
    }
    setLoading(true)
    timer.current = window.setTimeout(async () => {
      const c = new AbortController()
      ctrl.current = c
      try {
        const r = await api.search(v.trim(), 10, c.signal)
        setResults(excludeIds ? r.filter((m) => !excludeIds.includes(m.id)) : r)
        setFailed(false)
        setActive(-1)
        setOpen(true)
      } catch (e) {
        if ((e as Error).name !== 'AbortError') {
          setFailed(true)
          setResults([])
          setOpen(true)
        }
      } finally {
        if (!c.signal.aborted) setLoading(false)
      }
    }, 200)
  }

  function pick(m: Manga) {
    onChange(m)
    setText(m.title)
    setOpen(false)
    setResults([])
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!open && results.length) setOpen(true)
      setActive((a) => Math.min(a + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(a - 1, 0))
    } else if (e.key === 'Enter' && open && active >= 0 && results[active]) {
      e.preventDefault()
      pick(results[active])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div className="combo">
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      <input
        id={id}
        className="input"
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-activedescendant={active >= 0 ? `${id}-o${active}` : undefined}
        aria-autocomplete="list"
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        disabled={disabled}
        placeholder={placeholder}
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          if (value) onChange(null)
          search(e.target.value)
        }}
        onKeyDown={onKey}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        onFocus={() => results.length && setOpen(true)}
      />
      {loading && <span className="combo-spin" aria-hidden="true" />}
      {open && (
        <ul id={`${id}-list`} role="listbox" className="combo-list">
          {failed && <li className="combo-empty">Recherche indisponible.</li>}
          {!failed && results.length === 0 && <li className="combo-empty">Aucun manga trouvé.</li>}
          {results.map((m, i) => (
            <li
              key={m.id}
              id={`${id}-o${i}`}
              role="option"
              aria-selected={i === active}
              className={i === active ? 'combo-opt is-active' : 'combo-opt'}
              onMouseDown={(e) => {
                e.preventDefault()
                pick(m)
              }}
            >
              {m.coverUrl ? <img src={assetUrl(m.coverUrl)} alt="" loading="lazy" /> : <span className="combo-nocover" />}
              <span>
                <strong>{m.title}</strong>
                <small>
                  {m.titleEnglish && m.titleEnglish !== m.title ? `${m.titleEnglish} · ` : ''}
                  {m.year ?? ''}
                </small>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

