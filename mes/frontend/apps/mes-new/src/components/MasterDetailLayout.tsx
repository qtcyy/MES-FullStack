import type { ReactNode } from 'react'

interface MasterDetailLayoutProps {
  /** 左:主表区 */
  master: ReactNode
  /** 右:关联面板区(未选中由调用方传入空态) */
  detail: ReactNode
}

/** 主从两栏布局:大屏左 3 / 右 2,小屏堆叠 */
export default function MasterDetailLayout({ master, detail }: MasterDetailLayoutProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <div className="min-w-0">{master}</div>
      <div className="min-w-0">{detail}</div>
    </div>
  )
}
