import { Link } from 'react-router-dom'
import { Button } from '@workspace/ui'

export default function Forbidden() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
      <p className="text-5xl font-bold text-muted-foreground">403</p>
      <p className="text-muted-foreground">没有访问权限</p>
      <Button asChild><Link to="/welcome">返回工作台</Link></Button>
    </div>
  )
}
