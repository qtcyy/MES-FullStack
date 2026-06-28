import { useNavigate, useLocation } from 'react-router-dom'
import { useAppStore } from '@/stores/appStore'
import { getIcon } from '@/utils/iconMap'
import { deriveRecentVisits } from './welcomeData'

export default function RecentVisits() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const tabs = useAppStore((s) => s.tabs)
  const visits = deriveRecentVisits(tabs, pathname)
  if (!visits.length) {
    return <p className="text-sm text-muted-foreground">还没有访问记录,去逛逛吧~</p>
  }
  return (
    <div className="flex flex-wrap gap-2">
      {visits.map((v) => {
        const Icon = getIcon(v.icon)
        return (
          <button
            key={v.path}
            type="button"
            onClick={() => navigate(v.path)}
            className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm transition-colors hover:border-primary/40 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <Icon className="size-3.5 text-muted-foreground" />
            <span>{v.title}</span>
          </button>
        )
      })}
    </div>
  )
}
