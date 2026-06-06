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
  type: number   // 0=dir, 1=menu, 2=button
  permission: string
  icon: string
  descr: string
  createTime: string
  createUsername: string
  updateTime: string
  updateUsername: string
}

export interface MenuInfo {
  homeInfo: { name: string; icon: string; url: string }
  logoInfo: { name: string; image: string; url: string }
  clearInfo: { clearUrl: string }
  menuInfo: Record<string, TreeVO<SysMenu>>
}
