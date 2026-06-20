import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios'
import { ElMessage } from 'element-plus'
import type { Result } from '@/types/api'

/** 把平铺对象编码为 application/x-www-form-urlencoded(跳过 undefined/null) */
export function toFormUrlEncoded(obj: Record<string, unknown>): string {
  const sp = new URLSearchParams()
  Object.entries(obj).forEach(([k, v]) => {
    if (v !== undefined && v !== null) sp.append(k, String(v))
  })
  return sp.toString()
}

/** Result 解包:code===0 返回 data,否则抛出携带 msg 的错误 */
export function unwrapResult<T>(result: Result<T>): T {
  if (result.code === 0) return result.data
  throw new Error(result.msg || '请求失败')
}

const service: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || '/api',
  timeout: 20000,
  withCredentials: true, // 携带会话 Cookie(Shiro session)
  headers: { 'X-Requested-With': 'XMLHttpRequest' }, // 让 401 返回 JSON 而非 HTML 重定向
})

// 请求拦截:默认 JSON→表单编码;显式 application/json 跳过;二进制原样
service.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const ct = (config.headers?.['Content-Type'] as string) || ''
  const isJson = ct.includes('application/json')
  const data = config.data
  const isBinary =
    data instanceof FormData || data instanceof URLSearchParams || data instanceof Blob
  if (config.method?.toLowerCase() === 'post' && data && !isJson && !isBinary) {
    config.headers['Content-Type'] = 'application/x-www-form-urlencoded'
    config.data = toFormUrlEncoded(data as Record<string, unknown>)
  }
  return config
})

// 响应拦截:解包 Result(失败 toast);401 跳登录
service.interceptors.response.use(
  (resp) => {
    try {
      return unwrapResult(resp.data as Result)
    } catch (e) {
      ElMessage.error((e as Error).message)
      return Promise.reject(e)
    }
  },
  (error) => {
    if (error.response?.status === 401) {
      window.location.href = '/login'
      return Promise.reject(error)
    }
    ElMessage.error(error.message || '网络错误')
    return Promise.reject(error)
  },
)

/** 统一请求方法(响应已解包,泛型即业务数据类型) */
export const http = {
  get: <T>(url: string, params?: object) =>
    service.get(url, { params }) as unknown as Promise<T>,
  post: <T>(url: string, data?: object, json = false) =>
    service.post(
      url,
      data,
      json ? { headers: { 'Content-Type': 'application/json' } } : undefined,
    ) as unknown as Promise<T>,
  upload: <T>(url: string, form: FormData) => service.post(url, form) as unknown as Promise<T>,
}

export default service
