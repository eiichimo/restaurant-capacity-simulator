import type { InputHTMLAttributes, ReactNode } from 'react'

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string
  label: string
  unit?: string
  hint?: ReactNode
}

export function FormField({ id, label, unit, hint, ...inputProps }: FormFieldProps) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="input-with-unit">
        <input id={id} {...inputProps} />
        {unit && <span className="unit">{unit}</span>}
      </div>
      {hint && <small>{hint}</small>}
    </div>
  )
}
