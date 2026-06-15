import type { LucideIcon } from 'lucide-react'
import {
  House,          // lucide-react 0.475 无 Home，用 House 替代(语义相同)
  Settings,
  User,
  Users,
  Menu,
  Building2,
  Database,
  Wrench,
  CalendarClock,
  Flag,
  Store,
  FlaskConical,
  GitBranch,
  FileText,
  Network,
  ScanLine,
  ChartPie,      // lucide-react 0.475 无 PieChart，用 ChartPie 替代(语义相同)
  LayoutDashboard,
  Server,
  SlidersHorizontal,
  LayoutGrid,
  Codepen,
  IdCard,
  Workflow,
  Boxes,
  Landmark,
  Hammer,
  Blocks,
  Waypoints,
  Split,
  Pencil,
  Search,
} from 'lucide-react'

/** 后端 sp_sys_menu.icon 语义 key → lucide 图标 */
const iconMap: Record<string, LucideIcon> = {
  home: House,
  setting: Settings,
  user: User,
  team: Users,
  menu: Menu,
  apartment: Building2,
  database: Database,
  tool: Wrench,
  schedule: CalendarClock,
  flag: Flag,
  shop: Store,
  experiment: FlaskConical,
  branches: GitBranch,
  'file-text': FileText,
  cluster: Network,
  scan: ScanLine,
  'pie-chart': ChartPie,
  dashboard: LayoutDashboard,
  'cloud-server': Server,
  control: SlidersHorizontal,
  appstore: LayoutGrid,
  codepen: Codepen,
  idcard: IdCard,
  'deployment-unit': Workflow,
  gold: Boxes,
  bank: Landmark,
  build: Hammer,
  block: Blocks,
  'node-index': Waypoints,
  partition: Split,
  edit: Pencil,
  search: Search,
}

/** 取图标组件,缺失时兜底 LayoutGrid */
export function getIcon(iconKey: string | undefined): LucideIcon {
  if (!iconKey) return LayoutGrid
  return iconMap[iconKey] ?? LayoutGrid
}
