import axios from 'axios'
import qs from 'qs'
import { message } from 'antd'

const client = axios.create({
  baseURL: import.meta.env.DEV ? '/api' : '',
  withCredentials: true,
})

// Request interceptor: form-encode POST/PUT data unless Content-Type is explicitly set
client.interceptors.request.use((config) => {
  if (config.method === 'post' || config.method === 'put') {
    const hasContentType =
      config.headers?.['Content-Type'] || config.headers?.['content-type']
    if (!hasContentType && config.data) {
      config.headers['Content-Type'] = 'application/x-www-form-urlencoded;charset=UTF-8'
      config.data = qs.stringify(config.data)
    }
  }
  return config
})

// Response interceptor: unwrap backend Result<T> wrapper
client.interceptors.response.use(
  (response) => {
    const res = response.data as { code: number; data: unknown; msg: string }
    if (res.code !== 0) {
      message.error(res.msg)
      return Promise.reject(new Error(res.msg))
    }
    // Unwrap: return the inner payload directly.
    // Cast to bypass TS check (axios expects AxiosResponse return, but we
    // want downstream code to receive the unwrapped data for convenience).
    return res.data as any
  },
  (error) => {
    if (error.response?.status === 401) {
      window.location.href = '/login'
    } else {
      message.error(error.message || '请求失败')
    }
    return Promise.reject(error)
  },
)

export default client
