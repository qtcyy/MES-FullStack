import type { ReactNode } from 'react'

interface PageContainerProps {
  title?: string
  description?: string
  actions?: ReactNode
  children: ReactNode
}

export default function PageContainer({ title, description, actions, children }: PageContainerProps) {
  return (
    <div className="space-y-4">
      {(title || actions) && (
        <div className="flex items-center justify-between gap-4">
          <div>
            {title && <h2 className="text-lg font-semibold tracking-tight">{title}</h2>}
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
          </div>
          {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  )
}
