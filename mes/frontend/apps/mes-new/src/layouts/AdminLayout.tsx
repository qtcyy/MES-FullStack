import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import AppSidebar from './components/AppSidebar'
import AppHeader from './components/AppHeader'
import AppTabs from './components/AppTabs'
import { useMenuStore } from '@/stores/menuStore'
import { useAppStore } from '@/stores/appStore'
import { ROUTE_META } from './routeMeta'

export default function AdminLayout() {
  const loaded = useMenuStore((s) => s.loaded)
  const fetchMenuTree = useMenuStore((s) => s.fetchMenuTree)
  const addTab = useAppStore((s) => s.addTab)
  const location = useLocation()

  useEffect(() => {
    if (!loaded) fetchMenuTree()
  }, [loaded, fetchMenuTree])

  useEffect(() => {
    const meta = ROUTE_META[location.pathname]
    if (meta) {
      addTab({
        key: location.pathname,
        title: meta.title,
        path: location.pathname,
        icon: meta.icon,
        closable: location.pathname !== '/welcome',
      })
    }
  }, [location.pathname, addTab])

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
