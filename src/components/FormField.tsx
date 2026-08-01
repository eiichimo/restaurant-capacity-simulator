import type { InputHTMLAttributes, ReactNode } from 'react'

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string
  label: string
  unit?: string
  hint?: ReactNode
  options?: readonly number[]
  onOptionSelect?: (value: number) => void
}

export function FormField({
  id,
  label,
  unit,
  hint,
  options,
  onOptionSelect,
  type,
  inputMode,
  onFocus,
  ...inputProps
}: FormFieldProps) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className={options && options.length > 0 ? 'field-controls' : undefined}>
        <div className="input-with-unit">
          <input
            id={id}
            type={type}
            inputMode={inputMode ?? (type === 'number' ? 'decimal' : undefined)}
            onFocus={(event) => {
              if (type === 'number') event.currentTarget.select()
              onFocus?.(event)
            }}
            {...inputProps}
          />
          {unit && <span className="unit">{unit}</span>}
        </div>
        {options && options.length > 0 && onOptionSelect && (
          <select
            className="option-select"
            aria-label={`${label}の候補から選択`}
            value=""
            onChange={(event) => onOptionSelect(Number(event.target.value))}
          >
            <option value="">候補</option>
            {options.map((option) => (
              <option key={option} value={option}>
                {option.toLocaleString('ja-JP')}{unit ?? ''}
              </option>
            ))}
          </select>
        )}
      </div>
      {hint && <small>{hint}</small>}
    </div>
  )
}
