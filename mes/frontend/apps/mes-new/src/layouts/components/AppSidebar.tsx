import { NavLink } from 'react-router-dom'
import { useMenuStore } from '@/stores/menuStore'
import { toReactRoute } from '@/utils/urlMap'
import { getIcon } from '@/utils/iconMap'
import { cn } from '@workspace/ui'
import { Factory } from 'lucide-react'
import type { TreeVO, SysMenu } from '@/types/menu'

function NavItem({ node, collapsed }: { node: TreeVO<SysMenu>; collapsed: boolean }) {
  const route = toReactRoute(node.url)
  if (!route) return null
  const Icon = getIcon(node.icon)
  return (
    <NavLink
      to={route}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition',
          'text-sidebar-foreground/85 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground',
          isActive && 'bg-sidebar-accent font-medium text-sidebar-accent-foreground',
          collapsed && 'justify-center px-0',
        )
      }
      title={node.name}
    >
      <Icon className="size-4 shrink-0" />
      {!collapsed && <span className="truncate">{node.name}</span>}
    </NavLink>
  )
}

export default function AppSidebar() {
  const menuInfo = useMenuStore((s) => s.menuInfo)
  const collapsed = useMenuStore((s) => s.collapsed)

  return (
    <aside
      className={cn(
        'flex h-screen shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all',
        collapsed ? 'w-16' : 'w-60',
      )}
    >
      <div className={cn('flex h-14 items-center gap-2 px-4 font-bold text-sidebar-primary-foreground', collapsed && 'justify-center px-0')}>
        <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Factory className="size-4" />
        </span>
        {!collapsed && <span className="text-sidebar-foreground">章鱼MES</span>}
      </div>
      <nav className="flex-1 space-y-4 overflow-y-auto px-2 py-3">
        {menuInfo &&
          Object.values(menuInfo).map((group) => {
            const children = (group.children ?? []).filter((c) => toReactRoute(c.url))
            if (children.length === 0) {
              return <NavItem key={group.id} node={group} collapsed={collapsed} />
            }
            return (
              <div key={group.id}>
                {!collapsed && (
                  <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
                    {group.name}
                  </p>
                )}
                <div className="space-y-1">
                  {children.map((child) => (
                    <NavItem key={child.id} node={child} collapsed={collapsed} />
                  ))}
                </div>
              </div>
            )
          })}
      </nav>
    </aside>
  )
}
