import type { ReactNode } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAllowedRoutes, APP_ROUTES } from '@/hooks/useAllowedRoutes'

/**
 * 路由访问守卫:
 * - 菜单未加载 → 占位 loading,不误判;
 * - 已注册路由但不在授权集合 → 跳 /403;
 * - 未注册路由 → 放行,由下游 NotFound 处理(保留 404 语义);
 * - 授权 → 渲染 children(无则 <Outlet/>)。
 */
export default function RouteAccessGuard({ children }: { children?: ReactNode }) {
  const { loaded, allowed } = useAllowedRoutes()
  const location = useLocation()

  if (!loaded) {
    return <div className="p-6 text-sm text-muted-foreground">加载中…</div>
  }
  const path = location.pathname
  if (APP_ROUTES.has(path) && !allowed.has(path)) {
    return <Navigate to="/403" replace />
  }
  return <>{children ?? <Outlet />}</>
}
