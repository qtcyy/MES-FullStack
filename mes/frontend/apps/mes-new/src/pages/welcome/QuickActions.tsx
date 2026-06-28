import { useNavigate } from 'react-router-dom'
import { useAllowedRoutes } from '@/hooks/useAllowedRoutes'
import { getIcon } from '@/utils/iconMap'
import { buildQuickActions } from './welcomeData'

export default function QuickActions() {
  const navigate = useNavigate()
  const { allowed } = useAllowedRoutes()
  const actions = buildQuickActions(allowed)
  if (!actions.length) {
    return <p className="text-sm text-muted-foreground">暂无可用入口</p>
  }
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
      {actions.map((a) => {
        const Icon = getIcon(a.icon)
        return (
          <button
            key={a.to}
            type="button"
            onClick={() => navigate(a.to)}
            className="flex flex-col items-center gap-2 rounded-lg border border-border bg-card p-3 transition-[transform,translate,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[var(--shadow-pop)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <span className="flex size-9 items-center justify-center rounded-full bg-accent text-primary">
              <Icon className="size-4" />
            </span>
            <span className="text-xs text-foreground">{a.label}</span>
          </button>
        )
      })}
    </div>
  )
}
