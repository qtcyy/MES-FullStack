import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Badge } from '@workspace/ui'

interface RelatedPanelProps {
  icon: LucideIcon
  title: string
  /** 计数 Badge;不传则不显示 */
  count?: number
  /** 头部右侧操作区(如"管理成员"按钮) */
  actions?: ReactNode
  /** 空态 */
  empty?: boolean
  emptyIcon?: LucideIcon
  emptyText?: string
  children?: ReactNode
}

/** 关联面板:卡片 + 图标标题 + 计数 Badge + 空态 */
export default function RelatedPanel({
  icon: Icon,
  title,
  count,
  actions,
  empty,
  emptyIcon: EmptyIcon,
  emptyText = '请选择左侧条目',
  children,
}: RelatedPanelProps) {
  return (
    <div className="flex h-full min-h-72 flex-col rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-md bg-primary/10 text-primary">
            <Icon className="size-4" />
          </span>
          <span className="text-sm font-medium">{title}</span>
          {typeof count === 'number' && <Badge variant="secondary">{count}</Badge>}
        </div>
        {actions}
      </div>
      <div className="flex-1 p-3">
        {empty ? (
          <div className="flex h-full min-h-40 flex-col items-center justify-center gap-2 text-muted-foreground">
            {EmptyIcon && <EmptyIcon className="size-8 opacity-60" />}
            <p className="text-sm">{emptyText}</p>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  )
}
