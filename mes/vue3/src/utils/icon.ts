import type { Component } from 'vue'
import {
  Setting,
  User,
  Avatar,
  Menu as MenuIcon,
  OfficeBuilding,
  Tickets,
  Box,
  Share,
  Files,
  Connection,
  DataBoard,
  Histogram,
  House,
  Document,
} from '@element-plus/icons-vue'

// 关键字 → Element Plus 图标组件(菜单图标兜底,未命中用 MenuIcon)
const iconMap: Record<string, Component> = {
  system: Setting,
  user: User,
  role: Avatar,
  menu: MenuIcon,
  dept: OfficeBuilding,
  department: OfficeBuilding,
  order: Tickets,
  release: Tickets,
  materiel: Box,
  materile: Box,
  flow: Share,
  process: Connection,
  bom: Files,
  digital: DataBoard,
  plan: Histogram,
  warehouse: House,
  manager: Document,
}

/** 根据菜单 code/url/name 解析一个合适的图标组件 */
export function resolveIcon(hint?: string): Component {
  if (!hint) return MenuIcon
  const lower = hint.toLowerCase()
  const key = Object.keys(iconMap).find((k) => lower.includes(k))
  return key ? iconMap[key] : MenuIcon
}
