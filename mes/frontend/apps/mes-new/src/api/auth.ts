import { http, API_BASE } from '@/http/client'
import type { SysUser } from '@/types/user'

export function login(
  username: string,
  password: string,
  captcha: string,
  rememberMe = false,
) {
  return http.post<void>('/login', { username, password, captcha, rememberMe })
}

export function logout() {
  return http.get<void>('/logout')
}

export function userInfo() {
  return http.get<SysUser>('/admin/user/info')
}

/** 验证码图片地址(带时间戳防缓存,直接用于 <img src>) */
export function captchaUrl(): string {
  return `${API_BASE}/verification/code?t=${Date.now()}`
}
