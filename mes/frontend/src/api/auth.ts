import client from './client'

import type { SysUser } from '@/types/user'

export function login(username: string, password: string, captcha: string, rememberMe: boolean) {
  return client.post('/login', { username, password, captcha, rememberMe })
}

export function getCaptchaUrl() {
  return '/verification/code'
}

export function logout() {
  return client.get('/logout')
}

export function getUserInfo() {
  return client.get('/admin/user/info') as Promise<SysUser>
}
