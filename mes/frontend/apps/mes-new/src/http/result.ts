import type { ApiResult } from '@/types/api'

/** 业务错误(code !== 0) */
export class BusinessError extends Error {
  code: number
  constructor(code: number, message: string) {
    super(message)
    this.name = 'BusinessError'
    this.code = code
  }
}

/** 判断响应体是否为后端 Result 包 */
export function isResult(body: unknown): body is ApiResult<unknown> {
  return (
    typeof body === 'object' &&
    body !== null &&
    'code' in body &&
    'msg' in body &&
    'data' in body
  )
}
