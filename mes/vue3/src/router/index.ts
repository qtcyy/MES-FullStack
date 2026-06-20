import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

/**
 * 路由表:
 * - AdminLayout 壳下挂后台业务子路由(Cycle 1 起按模块追加,path 对齐 sp_sys_menu.url)
 * - ScreenLayout 壳用于大屏/3D(Cycle 1 追加)
 * - 动态路由参数示例:Cycle 1 的 /technology/bom/:id?
 */
export const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/login/LoginView.vue'),
    meta: { public: true, title: '登录' },
  },
  {
    path: '/',
    component: () => import('@/layouts/AdminLayout.vue'),
    redirect: '/welcome',
    children: [
      {
        path: 'welcome',
        name: 'welcome',
        component: () => import('@/views/welcome/WelcomeView.vue'),
        meta: { title: '首页' },
      },
      // ↓ Cycle 1 起在此追加各模块子路由(path 对齐后端菜单 url)
      {
        path: 'system/user',
        name: 'system-user',
        component: () => import('@/views/system/user/UserList.vue'),
        meta: { title: '用户管理', perm: 'user:add' },
      },
    ],
  },
  { path: '/403', component: () => import('@/views/error/403.vue'), meta: { public: true, title: '403' } },
  { path: '/500', component: () => import('@/views/error/500.vue'), meta: { public: true, title: '500' } },
  {
    path: '/:pathMatch(.*)*',
    component: () => import('@/views/error/404.vue'),
    meta: { public: true, title: '404' },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

export default router
