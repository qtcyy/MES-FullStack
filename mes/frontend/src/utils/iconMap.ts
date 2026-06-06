import type { ComponentType } from 'react'
import {
  HomeOutlined,
  SettingOutlined,
  UserOutlined,
  TeamOutlined,
  MenuOutlined,
  AppstoreOutlined,
  DatabaseOutlined,
  ToolOutlined,
  BarChartOutlined,
  OrderedListOutlined,
  FileTextOutlined,
  ScheduleOutlined,
  ExperimentOutlined,
  DashboardOutlined,
  ShopOutlined,
  CloudServerOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons'

const iconMap: Record<string, ComponentType> = {
  'fa-home': HomeOutlined,
  'fa-user': UserOutlined,
  'fa-users': TeamOutlined,
  'fa-cog': SettingOutlined,
  'fa-bars': MenuOutlined,
  'fa-database': DatabaseOutlined,
  'fa-wrench': ToolOutlined,
  'fa-bar-chart': BarChartOutlined,
  'fa-file-text': FileTextOutlined,
  'fa-list': OrderedListOutlined,
  'fa-calendar': ScheduleOutlined,
  'fa-flask': ExperimentOutlined,
  'fa-dashboard': DashboardOutlined,
  'fa-shopping-cart': ShopOutlined,
  'fa-server': CloudServerOutlined,
  'fa-shield': SafetyCertificateOutlined,
}

/**
 * Retrieve the matching Ant Design icon component for a Font Awesome class name.
 * Falls back to AppstoreOutlined when no match is found.
 */
export function getIcon(iconClass: string): ComponentType {
  return iconMap[iconClass] || AppstoreOutlined
}
