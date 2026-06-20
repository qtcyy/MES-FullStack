import { http } from './request'
import type { SysUser } from '@/types/user'

/** 登录(表单编码:username/password/captcha/rememberMe);dev 已关验证码,captcha 可空 */
export function login(payload: {
  username: string
  password: string
  captcha?: string
  rememberMe?: boolean
}) {
  return http.post<void>('/login', {
    username: payload.username,
    password: payload.password,
    captcha: payload.captcha ?? '',
    rememberMe: payload.rememberMe ? 'true' : 'false',
  })
}

/** 登出 */
export function logout() {
  return http.get<void>('/logout')
}

/** 当前登录用户信息 */
export function userInfo() {
  return http.get<SysUser>('/admin/user/info')
}

/** 验证码图片地址(带时间戳防缓存) */
export function captchaUrl() {
  return `${import.meta.env.VITE_API_BASE || '/api'}/verification/code?t=${Date.now()}`
}
