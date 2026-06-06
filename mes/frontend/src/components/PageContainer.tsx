import type { ReactNode } from 'react'
import { Card } from 'antd'

interface PageContainerProps {
  title?: string
  children: ReactNode
}

function PageContainer({ title, children }: PageContainerProps) {
  if (title) {
    return (
      <Card title={title}>
        {children}
      </Card>
    )
  }

  return <div style={{ padding: 0 }}>{children}</div>
}

export default PageContainer
