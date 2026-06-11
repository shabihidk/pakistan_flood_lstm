import { cn } from '../../lib/utils'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'outline' | 'orange'
  loading?: boolean
}

export function Button({
  children,
  className,
  variant = 'primary',
  loading = false,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40 focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        variant === 'primary' &&
          'bg-teal-700 text-white shadow-sm hover:bg-teal-600',
        variant === 'orange' &&
          'bg-orange-500 text-white shadow-sm hover:bg-orange-400',
        variant === 'outline' &&
          'border border-slate-200 bg-white text-slate-700 hover:border-teal-300 hover:text-teal-700',
        variant === 'ghost' &&
          'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-teal-700',
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
      )}
      {children}
    </button>
  )
}
