/** 后端统一响应包 */
export interface ApiResult<T> {
  code: number
  data: T
  msg: string
}

/** MyBatis-Plus 分页响应 */
export interface PageResult<T> {
  records: T[]
  total: number
  size: number
  current: number
  pages: number
}

/** 分页请求参数(current 为 1 基) */
export interface PageParams {
  current: number
  size: number
  orderBy?: string
}
