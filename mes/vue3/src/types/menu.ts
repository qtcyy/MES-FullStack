/** 通用树节点(与后端 TreeVO 对齐) */
export interface TreeVO<T = unknown> {
  id: string
  name: string
  /** 0=目录 1=菜单 2=按钮 */
  type?: number
  icon?: string
  url?: string
  pid?: string
  permission?: string
  code?: string
  children?: TreeVO<T>[]
  /** 业务负载(可选,挂原始实体) */
  _payload?: T
}

/** 系统菜单实体 */
export interface SysMenu {
  id: string
  code: string
  name: string
  url: string
  parentId: string
  type: number
  permission: string
  icon: string
}

/** 菜单树接口返回结构:menuInfo 按分组 key 组织 */
export interface MenuInfo {
  homeInfo: { name: string; icon: string; url: string }
  logoInfo: { name: string; image: string; url: string }
  clearInfo?: { clearUrl: string }
  menuInfo: Record<string, TreeVO<SysMenu>>
}
