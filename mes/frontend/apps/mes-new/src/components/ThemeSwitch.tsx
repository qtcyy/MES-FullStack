import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { cn } from '@workspace/ui'

/** D(Slate 浅色)/ B(Console 暗色)分段切换 */
export default function ThemeSwitch() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return <div className="h-7 w-16 rounded-full border border-border" />
  const isDark = theme === 'dark'
  return (
    <div className="inline-flex items-center rounded-full border border-border p-0.5 text-xs font-semibold">
      <button
        onClick={() => setTheme('light')}
        className={cn('rounded-full px-2.5 py-1 transition', !isDark ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}
      >
        D
      </button>
      <button
        onClick={() => setTheme('dark')}
        className={cn('rounded-full px-2.5 py-1 transition', isDark ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}
      >
        B
      </button>
    </div>
  )
}
