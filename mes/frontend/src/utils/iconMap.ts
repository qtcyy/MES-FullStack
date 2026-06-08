import type { ComponentType } from 'react'
import {
  ApartmentOutlined,
  AppstoreOutlined,
  BranchesOutlined,
  CloudServerOutlined,
  ClusterOutlined,
  CodeSandboxOutlined,
  ControlOutlined,
  DashboardOutlined,
  DatabaseOutlined,
  ExperimentOutlined,
  FileTextOutlined,
  FlagOutlined,
  HomeOutlined,
  MenuOutlined,
  PieChartOutlined,
  ScanOutlined,
  ScheduleOutlined,
  SettingOutlined,
  ShopOutlined,
  TeamOutlined,
  ToolOutlined,
  UserOutlined,
} from '@ant-design/icons'

/**
 * Maps semantic icon keys (stored in DB sp_sys_menu.icon) to Ant Design icon components.
 * Keys match the updated SQL seed data.
 */
const iconMap: Record<string, ComponentType> = {
  home: HomeOutlined,
  setting: SettingOutlined,
  user: UserOutlined,
  team: TeamOutlined,
  menu: MenuOutlined,
  apartment: ApartmentOutlined,
  database: DatabaseOutlined,
  tool: ToolOutlined,
  schedule: ScheduleOutlined,
  flag: FlagOutlined,
  shop: ShopOutlined,
  experiment: ExperimentOutlined,
  branches: BranchesOutlined,
  'file-text': FileTextOutlined,
  cluster: ClusterOutlined,
  scan: ScanOutlined,
  'pie-chart': PieChartOutlined,
  dashboard: DashboardOutlined,
  'cloud-server': CloudServerOutlined,
  control: ControlOutlined,
  appstore: AppstoreOutlined,
  codepen: CodeSandboxOutlined,
}

/**
 * Retrieve the matching Ant Design icon component for a semantic icon key.
 * Falls back to AppstoreOutlined when no match is found.
 */
export function getIcon(iconClass: string): ComponentType {
  return iconMap[iconClass] || AppstoreOutlined
}
