import type { ReactNode } from 'react'

interface PanelFrameProps {
  title: string
  badge?: 'real' | 'mock'
  children: ReactNode
}

/** 大屏玻璃面板外框:标题 + 真实/演示角标 + 科技边角 */
export default function PanelFrame({ title, badge = 'real', children }: PanelFrameProps) {
  return (
    <div className="ds-panel">
      <div className="ds-panel__title">
        <span>{title}</span>
        <span className={badge === 'real' ? 'ds-tag ds-tag--real' : 'ds-tag ds-tag--mock'}>
          {badge === 'real' ? '真实' : '演示'}
        </span>
      </div>
      <div className="ds-panel__body">{children}</div>
    </div>
  )
}
