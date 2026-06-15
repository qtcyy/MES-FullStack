export interface SysUser {
  id: string
  username: string
  name: string
  password?: string
  deleted: string // 0=正常 1=删除 2=禁用
  createTime?: string
  createUsername?: string
  updateTime?: string
  updateUsername?: string
}

export interface SysUserDTO extends SysUser {
  sysRoleIds?: string[]
}
