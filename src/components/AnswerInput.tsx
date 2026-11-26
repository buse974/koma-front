import { useId } from 'react'

interface Props {
  value: string
  onChange: (v: string) => void
  disabled?: boolean
  label?: string
  placeholder?: string
}

/** Saisie libre (mode personnage) : le serveur compare au nom et à ses variantes. */
export default function AnswerInput({ value, onChange, disabled, label = 'Nom du personnage', placeholder = 'Tape le nom…' }: Props) {
  const id = useId()
  return (
    <div>
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      <input
        id={id}
        className="input"
        type="text"
        autoComplete="off"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        maxLength={120}
        disabled={disabled}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}
