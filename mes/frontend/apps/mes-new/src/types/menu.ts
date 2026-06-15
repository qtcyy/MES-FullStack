export interface TreeVO<T> {
  id: string
  name: string
  checked?: boolean
  type?: number
  icon?: string
  url?: string
  pid?: string
  permission?: string
  target?: string
  code?: string
  haveParent?: boolean
  haveChild?: boolean
  children?: TreeVO<T>[]
}

export interface SysMenu {
  id: string
  code: string
  name: string
  url: string
  parentId: string
  grade: number
  sortNum: number
  type: number // 0=目录 1=菜单 2=按钮
  permission: string
  icon: string
  descr: string
}

export interface MenuInfo {
  homeInfo: { name: string; icon: string; url: string }
  logoInfo: { name: string; image: string; url: string }
  clearInfo: { clearUrl: string }
  menuInfo: Record<string, TreeVO<SysMenu>>
}
