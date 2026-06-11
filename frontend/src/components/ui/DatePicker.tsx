import { CalendarDays } from 'lucide-react'
import { cn } from '../../lib/utils'

interface DatePickerProps {
  value: string
  onChange: (value: string) => void
  min?: string
  max?: string
  disabled?: boolean
  className?: string
}

export function DatePicker({
  value,
  onChange,
  min,
  max,
  disabled,
  className,
}: DatePickerProps) {
  return (
    <label
      className={cn(
        'flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 transition-colors hover:border-teal-300',
        disabled && 'cursor-not-allowed opacity-60',
        className,
      )}
    >
      <CalendarDays className="h-4 w-4 shrink-0 text-teal-700" />
      <input
        type="date"
        value={value}
        min={min}
        max={max}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="w-full bg-transparent text-sm text-slate-800 outline-none"
      />
    </label>
  )
}
