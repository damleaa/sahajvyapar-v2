// src/components/NumInput.tsx
// Drop-in replacement for <input type="number"> that correctly clears zero placeholder

interface NumInputProps {
  value: number | string | undefined | null
  onChange: (val: number) => void
  placeholder?: string
  min?: number
  max?: number
  className?: string
  step?: number
}

export default function NumInput({
  value,
  onChange,
  placeholder = '0',
  min = 0,
  max,
  className = 'input-base',
  step,
}: NumInputProps) {
  // Show empty string when value is 0, null, undefined or empty — so placeholder shows
  const displayValue = (value === 0 || value === '' || value === undefined || value === null)
    ? ''
    : String(value)

  return (
    <input
      type="number"
      value={displayValue}
      onChange={e => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
      placeholder={placeholder}
      min={min}
      max={max}
      step={step}
      className={className}
    />
  )
}
