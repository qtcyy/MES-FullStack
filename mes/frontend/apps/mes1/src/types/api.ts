// Result wrapper from backend
export interface ApiResult<T> {
  code: number
  data: T
  msg: string
}

// MyBatis-Plus pagination response
export interface PageResult<T> {
  records: T[]
  total: number
  size: number
  current: number
  pages: number
}

// Pagination request params
export interface PageParams {
  current: number
  size: number
  orderBy?: string
}
