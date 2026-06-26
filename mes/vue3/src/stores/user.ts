import { defineStore } from 'pinia'
import type { SysUser } from '@/types/user'
import * as authApi from '@/api/auth'

/** 用户态:登录信息 + 登录态(持久化,刷新不丢) */
export const useUserStore = defineStore('user', {
  state: () => ({
    user: null as SysUser | null,
    logged: false,
  }),
  actions: {
    async login(payload: {
      username: string
      password: string
      captcha?: string
      rememberMe?: boolean
    }) {
      await authApi.login(payload)
      this.logged = true
      await this.fetchUserInfo()
    },
    async fetchUserInfo() {
      this.user = await authApi.userInfo()
    },
    async logout() {
      try {
        await authApi.logout()
      } catch {
        /* 登出接口失败不阻断本地清理 */
      }
      this.$reset()
    },
  },
  persist: { pick: ['user', 'logged'] },
})
