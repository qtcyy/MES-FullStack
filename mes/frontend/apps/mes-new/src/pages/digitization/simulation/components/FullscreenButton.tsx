import { useEffect, useState, type RefObject } from 'react'
import { Button } from '@workspace/ui'
import { Maximize, Minimize } from 'lucide-react'

export default function FullscreenButton({ targetRef }: { targetRef: RefObject<HTMLElement | null> }) {
  const [isFs, setIsFs] = useState(false)

  useEffect(() => {
    const onChange = () => setIsFs(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  const toggle = () => {
    const el = targetRef.current
    if (!el) return
    if (document.fullscreenElement) void document.exitFullscreen()
    else void el.requestFullscreen()
  }

  return (
    <Button variant="outline" size="sm" onClick={toggle}>
      {isFs ? <Minimize className="size-4" /> : <Maximize className="size-4" />}
      {isFs ? '退出全屏' : '全屏'}
    </Button>
  )
}
