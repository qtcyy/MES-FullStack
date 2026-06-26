// 复用 api.ts 中已有的分页基础类型,避免重复定义
import type { PageParams, PageResult } from './api'

/** 分页请求别名(与 PageParams 对齐) */
export type PageReq = PageParams

/** 分页响应别名(与 PageResult 对齐,对应 MyBatis-Plus IPage) */
export type IPage<T> = PageResult<T>

// ─── 用户 ──────────────────────────────────────────────────────────────────────

export interface SysUser {
  id: string
  username: string
  name: string
  deptId?: string
  /** is_deleted: 0 正常 / 1 删除 / 2 禁用 */
  deleted?: string
  email?: string
  mobile?: string
  tel?: string
  sex?: string
  birthday?: string
  createTime?: string
  updateTime?: string
}

export interface SysUserDTO extends Partial<SysUser> {
  password?: string
  sysRoleIds?: string[]
}

export interface SysUserPageReq extends PageReq {
  usernameLike?: string
  nameLike?: string
}

// ─── 角色 ──────────────────────────────────────────────────────────────────────

export interface SysRole {
  id: string
  name: string
  code: string
  descr?: string
  deleted?: string
  isSystem?: string
}

export interface SysRoleDTO extends Partial<SysRole> {
  sysMenuIds?: string[]
}

export interface SysRolePageReq extends PageReq {
  nameLike?: string
}

// ─── 字典 ──────────────────────────────────────────────────────────────────────

export interface SysDict {
  id: string
  name: string
  value?: string
  type?: string
  parentId: string
  sortNum?: number
  descr?: string
  deleted?: string
}

export interface SysDictPageReq extends PageReq {
  nameLike?: string
  type?: string
}

// ─── 部门 ──────────────────────────────────────────────────────────────────────

export interface SysDepartment {
  id: string
  name: string
  parentId: string
  sortNum?: number
  isDeleted?: string
}

export interface SysDepartmentPageReq extends PageReq {
  nameLike?: string
}

// ─── 菜单 ──────────────────────────────────────────────────────────────────────

export interface SysMenuPageReq extends PageReq {
  nameLike?: string
}

// ─── 通知中心 ───────────────────────────────────────────────────────────────

export type NoticeType = 'info' | 'success' | 'warning' | 'error'
export type NoticeTargetType = 'all' | 'user' | 'role' | 'dept'

/** 发布端：通知主体 */
export interface SysNotice {
  id: string
  title: string
  content?: string
  type: NoticeType
  targetType: NoticeTargetType
  targetIds?: string
  targetDesc?: string
  sender?: string
  status?: string
  recipientCount?: number
  createTime?: string
}

/** 接收端：收件箱行(含展开的通知字段) */
export interface SysNoticeInbox {
  id: string            // 收件箱行 id
  noticeId: string
  userId?: string
  isRead: string        // '0'/'1'
  readTime?: string
  title: string
  content?: string
  type: NoticeType
  sender?: string
  noticeTime?: string
}

export interface NoticePublishReq {
  title: string
  content?: string
  type: NoticeType
  targetType: NoticeTargetType
  targetIds?: string[]
}

export interface SysNoticePageReq extends PageReq {
  titleLike?: string
}

export interface SysNoticeInboxPageReq extends PageReq {
  titleLike?: string
  isRead?: string
}

export interface NoticeReadStat {
  total: number
  readCount: number
  unreadCount: number
}
