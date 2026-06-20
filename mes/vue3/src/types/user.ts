/** 系统用户(登录后由 /admin/user/info 返回,已剔除密码) */
export interface SysUser {
  id: string
  name: string
  username: string
  mobile?: string
  email?: string
  avatar?: string
  status?: string
  deptId?: string
}
