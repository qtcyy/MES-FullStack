import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import AppSidebar from './components/AppSidebar'
import AppHeader from './components/AppHeader'
import AppTabs from './components/AppTabs'
import { useMenuStore } from '@/stores/menuStore'
import { useAppStore } from '@/stores/appStore'
import { resolveTabMeta } from './routeMeta'

export default function AdminLayout() {
  const loaded = useMenuStore((s) => s.loaded)
  const fetchMenuTree = useMenuStore((s) => s.fetchMenuTree)
  const menuInfo = useMenuStore((s) => s.menuInfo)
  const addTab = useAppStore((s) => s.addTab)
  const location = useLocation()

  useEffect(() => {
    if (!loaded) fetchMenuTree()
  }, [loaded, fetchMenuTree])

  // 每次路由变化都记录标签:标题优先取 ROUTE_META,其次菜单树名,再兜底路径末段。
  // menuInfo 进依赖,菜单异步到达后会用真实名刷新先前的兜底标题。
  useEffect(() => {
    const { title, icon } = resolveTabMeta(location.pathname, menuInfo)
    addTab({
      key: location.pathname,
      title,
      path: location.pathname,
      icon,
      closable: location.pathname !== '/welcome',
    })
  }, [location.pathname, addTab, menuInfo])

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader />
        <AppTabs />
        <main className="flex-1 overflow-auto p-4">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
