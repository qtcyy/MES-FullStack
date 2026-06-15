// apps/mes-new/src/types/system.ts

export interface SysRole {
  id: string
  name: string
  code: string
  descr: string
  deleted: string // 0=正常 1=删除 2=禁用
  isSystem?: string // 0=否 1=系统角色
  createTime?: string
  createUsername?: string
  updateTime?: string
  updateUsername?: string
}

export interface SysRoleDTO extends SysRole {
  sysMenuIds?: string[]
}

export interface SysDict {
  id: string
  name: string
  value: string
  type: string
  descr: string
  sortNum: number
  parentId: string
  deleted: string // 0=正常 1=删除 2=禁用
  createTime?: string
  createUsername?: string
  updateTime?: string
  updateUsername?: string
}

export interface SysDepartment {
  id: string
  parentId: string
  name: string
  sortNum: number
  isDeleted: string // 0=正常 1=删除
  createTime?: string
  createUsername?: string
  updateTime?: string
  updateUsername?: string
}
