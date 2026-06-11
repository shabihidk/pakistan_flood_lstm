import { Waves } from 'lucide-react'

export function Header() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="flex items-center justify-between px-4 py-3 lg:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-700 text-white shadow-sm">
            <Waves className="h-5 w-5" />
          </div>
          <div className="text-left">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-teal-700">
              AI Geo Navigators
            </p>
            <p className="text-xs text-slate-500">Pakistan Flood Monitoring</p>
          </div>
        </div>

        <h1 className="text-lg font-bold tracking-[0.12em] text-teal-900 sm:text-xl">
          FLOOD INTELLIGENCE
        </h1>

        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-700 text-sm font-bold text-white">
          FI
        </div>
      </div>
    </header>
  )
}
