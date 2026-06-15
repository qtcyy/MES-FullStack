import { useNavigate, useLocation } from 'react-router-dom'
import { X } from 'lucide-react'
import { cn } from '@workspace/ui'
import { useAppStore } from '@/stores/appStore'

export default function AppTabs() {
  const tabs = useAppStore((s) => s.tabs)
  const removeTab = useAppStore((s) => s.removeTab)
  const navigate = useNavigate()
  const location = useLocation()

  const onClose = (e: React.MouseEvent, key: string) => {
    e.stopPropagation()
    removeTab(key)
    // 关闭后跳到新的激活标签
    const next = useAppStore.getState().activeKey
    if (next !== location.pathname) navigate(next)
  }

  return (
    <div className="flex h-10 shrink-0 items-center gap-1 overflow-x-auto border-b border-border bg-background px-3">
      {tabs.map((tab) => {
        const active = tab.path === location.pathname
        return (
          <button
            key={tab.key}
            onClick={() => navigate(tab.path)}
            className={cn(
              'group flex items-center gap-2 rounded-md px-3 py-1.5 text-xs transition',
              active
                ? 'bg-card font-medium text-foreground shadow-sm ring-1 ring-border'
                : 'text-muted-foreground hover:bg-muted',
            )}
          >
            <span>{tab.title}</span>
            {tab.closable && (
              <span
                onClick={(e) => onClose(e, tab.key)}
                className="rounded p-0.5 opacity-50 hover:bg-border hover:opacity-100"
              >
                <X className="size-3" />
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
