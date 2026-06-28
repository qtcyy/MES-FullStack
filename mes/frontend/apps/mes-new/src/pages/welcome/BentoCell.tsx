import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { getAccent, type AccentName } from './accents'

interface BentoCellProps {
  accent: AccentName
  title?: string
  icon?: LucideIcon
  /** 标题右侧插槽:徽标/标签 */
  extra?: ReactNode
  /** 内容区类名,默认 flex-1 p-4 */
  bodyClassName?: string
  children: ReactNode
}

/** 便当格通用外壳:左强调条 + 图标标题 + 悬停浮起。须由外层 StaggerItem 提供 col-span 与入场。 */
export default function BentoCell({
  accent, title, icon: Icon, extra, bodyClassName, children,
}: BentoCellProps) {
  const a = getAccent(accent)
  return (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)] transition-[transform,translate,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-[var(--shadow-pop)]">
      <span className="absolute inset-y-0 left-0 w-[3px]" style={{ background: a.color }} aria-hidden />
      {(title || extra) && (
        <div className="flex items-center justify-between gap-2 px-4 pt-4">
          <div className="flex items-center gap-2">
            {Icon && (
              <span
                className="flex size-7 items-center justify-center rounded-lg"
                style={{ background: a.bg, color: a.color }}
              >
                <Icon className="size-4" />
              </span>
            )}
            {title && <h3 className="text-sm font-medium text-foreground">{title}</h3>}
          </div>
          {extra}
        </div>
      )}
      <div className={bodyClassName ?? 'flex-1 p-4'}>{children}</div>
    </div>
  )
}
