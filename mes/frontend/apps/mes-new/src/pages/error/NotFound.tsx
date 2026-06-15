import { Link } from 'react-router-dom'
import { Button } from '@workspace/ui'

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
      <p className="text-5xl font-bold text-muted-foreground">404</p>
      <p className="text-muted-foreground">页面不存在</p>
      <Button asChild><Link to="/welcome">返回工作台</Link></Button>
    </div>
  )
}
