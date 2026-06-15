export interface SysUser {
  id: string
  username: string
  name: string
  password?: string
  deleted: string  // 0=Normal, 1=Deleted, 2=Disabled
  createTime: string
  createUsername: string
  updateTime: string
  updateUsername: string
}

export interface SysUserDTO extends SysUser {
  sysRoleIds?: string[]
}

export interface SysRole {
  id: string
  name: string
  code: string
  descr: string
  deleted: string
  isSystem?: string    // "0"=normal, "1"=system role
  sysMenuIds?: string[]  // menu IDs for tree checkbox state
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
  isDeleted: string
  createTime?: string
  createUsername?: string
  updateTime?: string
  updateUsername?: string
}

export interface SysDict {
  id: string
  name: string
  value: string
  type: string
  descr: string
  sortNum: number
  parentId: string
  deleted: string
  createTime?: string
  createUsername?: string
  updateTime?: string
  updateUsername?: string
}
