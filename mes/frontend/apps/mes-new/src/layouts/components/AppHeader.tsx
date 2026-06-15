import { useNavigate, useLocation } from 'react-router-dom'
import {
  Avatar,
  AvatarFallback,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@workspace/ui'
import { PanelLeft, Bell, Search, LogOut } from 'lucide-react'
import { useMenuStore } from '@/stores/menuStore'
import { useAuthStore } from '@/stores/authStore'
import ThemeSwitch from '@/components/ThemeSwitch'
import { ROUTE_META } from '@/layouts/routeMeta'

export default function AppHeader() {
  const toggleCollapsed = useMenuStore((s) => s.toggleCollapsed)
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()
  const location = useLocation()
  const title = ROUTE_META[location.pathname]?.title ?? ''

  const onLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-card px-4">
      <Button variant="ghost" size="icon-sm" onClick={toggleCollapsed} aria-label="折叠侧栏">
        <PanelLeft className="size-4" />
      </Button>
      <span className="text-sm text-muted-foreground">
        {title && <><span className="text-foreground font-medium">{title}</span></>}
      </span>
      <div className="flex-1" />
      <Button variant="outline" size="sm" className="hidden gap-2 text-muted-foreground md:inline-flex">
        <Search className="size-4" />
        全局搜索
      </Button>
      <ThemeSwitch />
      <Button variant="ghost" size="icon-sm" aria-label="通知">
        <Bell className="size-4" />
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 rounded-full border border-border py-0.5 pl-0.5 pr-2.5">
            <Avatar className="size-7">
              <AvatarFallback className="bg-primary text-xs text-primary-foreground">
                {(user?.name ?? 'U').slice(0, 1)}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm">{user?.name ?? '用户'}</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuLabel>{user?.name ?? '用户'}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onLogout}>
            <LogOut className="size-4" />
            退出登录
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
