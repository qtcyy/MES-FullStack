import { useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { X } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { cn } from '@workspace/ui'
import { useAppStore } from '@/stores/appStore'

export default function AppTabs() {
  const tabs = useAppStore((s) => s.tabs)
  const removeTab = useAppStore((s) => s.removeTab)
  const navigate = useNavigate()
  const location = useLocation()
  const reduce = useReducedMotion()
  const activeRef = useRef<HTMLDivElement | null>(null)

  // 激活标签变化时滚入可见区（标签过多横向滚动时,避免新标签停在视口外）
  useEffect(() => {
    activeRef.current?.scrollIntoView({
      inline: 'nearest',
      block: 'nearest',
      behavior: reduce ? 'auto' : 'smooth',
    })
  }, [location.pathname, reduce])

  const onClose = (e: React.MouseEvent, key: string) => {
    e.stopPropagation()
    removeTab(key)
    const next = useAppStore.getState().activeKey
    if (next !== location.pathname) navigate(next)
  }

  return (
    <div className="no-scrollbar flex h-10 shrink-0 items-center gap-1 overflow-x-auto border-b border-border bg-background px-3">
      {tabs.map((tab) => {
        const active = tab.path === location.pathname
        return (
          <div
            key={tab.key}
            ref={active ? activeRef : undefined}
            className={cn(
              'group relative flex shrink-0 items-center rounded-md text-xs transition-colors',
              active ? 'font-medium text-foreground' : 'text-muted-foreground hover:bg-muted',
            )}
          >
            {active &&
              (reduce ? (
                <span className="absolute inset-0 rounded-md bg-card shadow-sm ring-1 ring-border" />
              ) : (
                <motion.span
                  layoutId="tab-active-pill"
                  className="absolute inset-0 rounded-md bg-card shadow-sm ring-1 ring-border"
                  transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                />
              ))}
            <button
              type="button"
              onClick={() => navigate(tab.path)}
              className="relative z-10 inline-flex items-center gap-2 whitespace-nowrap px-3 py-1.5"
            >
              {tab.title}
            </button>
            {tab.closable && (
              <button
                type="button"
                onClick={(e) => onClose(e, tab.key)}
                className="relative z-10 mr-1 rounded p-0.5 opacity-50 hover:bg-border hover:opacity-100"
                aria-label={`关闭 ${tab.title}`}
              >
                <X className="size-3" />
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
