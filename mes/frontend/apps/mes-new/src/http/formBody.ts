/** 将普通对象序列化为 application/x-www-form-urlencoded 的 URLSearchParams */
export function buildFormBody(data: Record<string, unknown>): URLSearchParams {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined || value === null) continue
    if (Array.isArray(value)) {
      value.forEach((v) => {
        if (v !== undefined && v !== null) params.append(key, String(v))
      })
    } else {
      params.append(key, String(value))
    }
  }
  return params
}

/** 判断请求体是否应做表单编码 */
export function shouldFormEncode(body: unknown, contentType: string): boolean {
  if (body === null || body === undefined) return false
  if (contentType.includes('application/json')) return false
  if (typeof body !== 'object') return false
  if (body instanceof FormData) return false
  if (body instanceof URLSearchParams) return false
  if (body instanceof Blob) return false
  if (body instanceof ArrayBuffer) return false
  return true
}
