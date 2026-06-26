/** 后端统一响应包 Result<T> */
export interface Result<T = unknown> {
  /** 0 = 成功,非 0 = 业务失败 */
  code: number
  data: T
  msg: string
}

/** 分页请求基类(MyBatis-Plus):current 页码 + size 每页条数 */
export interface PageParams {
  current: number
  size: number
  orderBy?: string
  [key: string]: unknown
}

/** 分页响应(MyBatis-Plus IPage 结构) */
export interface PageResult<T> {
  records: T[]
  total: number
  size: number
  current: number
  pages: number
}
