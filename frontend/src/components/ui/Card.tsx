import { cn } from '../../lib/utils'

interface CardProps {
  children: React.ReactNode
  className?: string
}

export function Card({ children, className }: CardProps) {
  return <div className={cn('dashboard-card', className)}>{children}</div>
}

interface CardHeaderProps {
  title: string
  subtitle?: string
  icon?: React.ReactNode
  className?: string
}

export function CardHeader({ title, subtitle, icon, className }: CardHeaderProps) {
  return (
    <div className={cn('flex items-start gap-3 border-b border-slate-100 px-5 py-4', className)}>
      {icon && (
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
          {icon}
        </div>
      )}
      <div className="min-w-0 text-left">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
      </div>
    </div>
  )
}

interface CardContentProps {
  children: React.ReactNode
  className?: string
}

export function CardContent({ children, className }: CardContentProps) {
  return <div className={cn('px-5 py-4', className)}>{children}</div>
}
