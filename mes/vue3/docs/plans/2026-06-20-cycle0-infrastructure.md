# Cycle 0 基础设施 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 搭建 Vue3 MES 前端的全部基础设施，使「登录 → 菜单驱动侧栏 → 鉴权/权限守卫 → 双主题后台布局 → 通用 CRUD 组件」端到端跑通，为 Cycle 1 业务页面铺好地基。

**Architecture:** 独立 Vite 工程（`mes/vue3`），Vue3 `<script setup>` + TS。Axios 拦截器统一处理后端 `Result` 解包 / 表单编码 / 401；Pinia 四模块 store + `persistedstate` 持久化；Vue Router 嵌套路由 + `beforeEach` 守卫；Element Plus 深度主题（明/暗双套 CSS 变量）；`unplugin` 全量按需引入；动画用 `@vueuse/motion` + `auto-animate` 组件库。

**Tech Stack:** Vue 3.5、Vue Router 4、Pinia + persistedstate、Element Plus、Axios、@vueuse/core + motion、@formkit/auto-animate、ECharts/Three（后续周期懒加载）、Sass、unplugin-auto-import / unplugin-vue-components、Vitest。

**关键契约（已核对后端）：**
- 响应包：`Result{ code:number, data:T, msg:string }`，`code===0` 为成功。
- 分页：请求 `current`+`size`；响应 `{records,total,size,current,pages}`。
- 登录：`POST /login`（**表单编码** `username/password/captcha/rememberMe`，会话 Cookie）；dev `captcha.enabled=false`（验证码可空）。
- 验证码图：`GET /verification/code`（image/jpeg）。
- 当前用户：`GET /admin/user/info` → `Result<SysUser>`。
- 菜单树：`GET /admin/list/index/menu/tree` → `Result<MenuInfo>`，`MenuInfo.menuInfo` 是 `Record<分组key, TreeVO<SysMenu>>`，递归 `children`，节点含 `url`/`permission`/`icon`/`type`。
- 大多数 POST 走表单编码；少数 `@RequestBody` JSON 接口（workflow/inventory/gantt/bom-flow/process-content/manager/team 的写操作）需显式 `Content-Type: application/json`。

---

## 文件结构（本周期产出）

```
mes/vue3/
├── .env.development                 # VITE 代理目标等
├── .eslintrc / .prettierrc          # 代码风格
├── vite.config.ts                   # 代理/别名/按需/分包  (修改)
├── tsconfig.app.json                # paths 别名 (修改)
├── src/
│   ├── main.ts                      # 装配 (修改)
│   ├── App.vue                      # RouterView + 全局 AI 浮窗位 (修改)
│   ├── types/
│   │   ├── api.ts                   # Result / Page / PageResult
│   │   ├── menu.ts                  # TreeVO / SysMenu / MenuInfo
│   │   └── user.ts                  # SysUser
│   ├── api/
│   │   ├── request.ts               # axios 实例 + 拦截器
│   │   ├── auth.ts                  # login/logout/captcha/userInfo
│   │   └── menu.ts                  # getMenuTree
│   ├── stores/
│   │   ├── app.ts                   # 主题/侧栏折叠/多页签
│   │   ├── user.ts                  # 用户信息/登录态/登录登出
│   │   ├── permission.ts            # 权限 Set/菜单树/hasPermission
│   │   └── notification.ts          # 通知中心(占位, C4 增强)
│   ├── composables/
│   │   ├── useRequest.ts            # loading/error/data + 骨架
│   │   └── usePagination.ts         # current/size/total + 翻页
│   ├── utils/
│   │   ├── permission.ts            # collectPermissions / flattenMenu
│   │   └── icon.ts                  # 菜单 icon 名 → Element Plus 图标
│   ├── router/
│   │   ├── index.ts                 # 路由表(嵌套+动态)
│   │   └── guards.ts                # beforeEach + NProgress
│   ├── directives/
│   │   └── permission.ts            # v-permission
│   ├── plugins/
│   │   └── index.ts                 # 注册 element/motion/auto-animate/指令
│   ├── styles/
│   │   ├── index.scss               # 入口
│   │   ├── variables.scss           # 设计令牌(色/间距/动画 duration·easing)
│   │   ├── theme.scss               # 明/暗 CSS 变量 + Element 覆盖
│   │   └── transitions.scss         # 路由/通用过渡 class
│   ├── components/
│   │   ├── PageContainer.vue
│   │   ├── SearchForm.vue
│   │   ├── DataTable.vue
│   │   ├── FormDialog.vue
│   │   └── skeletons/TableSkeleton.vue
│   ├── layouts/
│   │   ├── AdminLayout.vue
│   │   ├── ScreenLayout.vue
│   │   └── components/{AppSidebar,AppHeader,AppTabs,ThemeToggle}.vue
│   └── views/
│       ├── login/LoginView.vue
│       ├── welcome/WelcomeView.vue
│       └── error/{403,404,500}.vue
└── tests/                           # Vitest 单测
    ├── request.spec.ts
    └── permission.spec.ts
```

---

## Task 0: Git 分支建立与基线提交

**Files:** 无新增（仅 git 操作 + 已存在的 `mes/vue3/` 脚手架与 `docs/`）

- [ ] **Step 1: 确认当前状态**

Run: `cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack-Vue && git status && git branch`
Expected: 在 `feat/final-homework`，`mes/vue3/` 为 untracked。

- [ ] **Step 2: 从当前分支切出 develop**

Run: `git checkout -b develop`
Expected: `Switched to a new branch 'develop'`（工作区 `mes/vue3/` 跟随保留）。

- [ ] **Step 3: 提交脚手架基线（chore）**

```bash
git add mes/vue3/.gitignore mes/vue3/.vscode mes/vue3/index.html mes/vue3/package.json \
  mes/vue3/pnpm-lock.yaml mes/vue3/public mes/vue3/README.md mes/vue3/src \
  mes/vue3/tsconfig.json mes/vue3/tsconfig.app.json mes/vue3/tsconfig.node.json mes/vue3/vite.config.ts
git commit -m "chore(vue3): 初始化 Vite + Vue3 + TS 脚手架基线"
```

- [ ] **Step 4: 提交规划文档（docs）**

```bash
git add mes/vue3/docs
git commit -m "docs(vue3): 开发计划与周期路线图 + Cycle0 实现计划"
```

- [ ] **Step 5: 切出本周期 feature 分支**

Run: `git checkout -b feature/infra`
Expected: 后续基础设施提交都在 `feature/infra`，完成后合入 `develop`。

---

## Task 1: 安装依赖

**Files:** `mes/vue3/package.json`（pnpm 写入）

- [ ] **Step 1: 安装运行时依赖**

```bash
cd mes/vue3
pnpm add vue-router pinia pinia-plugin-persistedstate element-plus @element-plus/icons-vue \
  axios @vueuse/core @vueuse/motion @formkit/auto-animate nprogress dayjs
```

- [ ] **Step 2: 安装开发依赖**

```bash
pnpm add -D sass unplugin-auto-import unplugin-vue-components @types/nprogress \
  vitest @vue/test-utils jsdom eslint prettier @vue/eslint-config-prettier \
  @vue/eslint-config-typescript eslint-plugin-vue
```

- [ ] **Step 3: 验证安装**

Run: `pnpm ls vue-router pinia element-plus axios --depth 0`
Expected: 四个包均列出版本，无报错。

- [ ] **Step 4: 加测试脚本到 package.json**

在 `scripts` 增加：
```json
"test": "vitest run",
"test:watch": "vitest",
"typecheck": "vue-tsc --noEmit",
"lint": "eslint . --ext .vue,.ts --fix"
```

- [ ] **Step 5: Commit**

```bash
git add mes/vue3/package.json mes/vue3/pnpm-lock.yaml
git commit -m "chore(vue3): 安装核心依赖(router/pinia/element-plus/axios/动画/测试)"
```

---

## Task 2: Vite 配置（代理 / 别名 / 按需引入 / 分包）

**Files:** Modify `mes/vue3/vite.config.ts`、`mes/vue3/tsconfig.app.json`；Create `mes/vue3/.env.development`

- [ ] **Step 1: 写 .env.development**

```
VITE_API_BASE=/api
VITE_PROXY_TARGET=http://localhost:9090
```

- [ ] **Step 2: 重写 vite.config.ts**

```ts
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [
      vue(),
      AutoImport({
        imports: ['vue', 'vue-router', 'pinia', '@vueuse/core'],
        resolvers: [ElementPlusResolver()],
        dts: 'src/types/auto-imports.d.ts',
      }),
      Components({
        resolvers: [ElementPlusResolver()],
        dts: 'src/types/components.d.ts',
      }),
    ],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    server: {
      port: 4200,
      proxy: {
        '/api': {
          target: env.VITE_PROXY_TARGET || 'http://localhost:9090',
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api/, ''),
        },
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            vue: ['vue', 'vue-router', 'pinia'],
            element: ['element-plus', '@element-plus/icons-vue'],
            echarts: ['echarts'],
            three: ['three'],
          },
        },
      },
    },
  }
})
```

> 注：`echarts`/`three` 此时未装，`manualChunks` 引用不存在的包不会报错（仅在被 import 时生效）；保留以备 C1。若 build 阶段报错可暂时移除这两行，待 C1 安装后再加回。

- [ ] **Step 3: tsconfig.app.json 加 paths 别名**

在 `compilerOptions` 加：
```json
"baseUrl": ".",
"paths": { "@/*": ["src/*"] }
```
并确保 `types/*.d.ts` 在 include 范围内。

- [ ] **Step 4: 验证 dev server 启动**

Run: `pnpm dev`（启动后 Ctrl-C）
Expected: 输出 `Local: http://localhost:4200/`，无配置错误。

- [ ] **Step 5: Commit**

```bash
git add mes/vue3/vite.config.ts mes/vue3/tsconfig.app.json mes/vue3/.env.development
git commit -m "build(vue3): Vite 代理/别名/按需引入/分包配置"
```

---

## Task 3: 类型定义

**Files:** Create `src/types/api.ts`、`src/types/menu.ts`、`src/types/user.ts`

- [ ] **Step 1: src/types/api.ts**

```ts
/** 后端统一响应包 */
export interface Result<T = unknown> {
  code: number
  data: T
  msg: string
}

/** 分页请求基类（MyBatis-Plus） */
export interface PageParams {
  current: number
  size: number
  orderBy?: string
  [key: string]: unknown
}

/** 分页响应（MyBatis-Plus IPage） */
export interface PageResult<T> {
  records: T[]
  total: number
  size: number
  current: number
  pages: number
}
```

- [ ] **Step 2: src/types/menu.ts**（与后端契约一致）

```ts
export interface TreeVO<T = unknown> {
  id: string
  name: string
  type?: number // 0=目录 1=菜单 2=按钮
  icon?: string
  url?: string
  pid?: string
  permission?: string
  code?: string
  children?: TreeVO<T>[]
  _payload?: T
}

export interface SysMenu {
  id: string
  code: string
  name: string
  url: string
  parentId: string
  type: number
  permission: string
  icon: string
}

export interface MenuInfo {
  homeInfo: { name: string; icon: string; url: string }
  logoInfo: { name: string; image: string; url: string }
  clearInfo?: { clearUrl: string }
  menuInfo: Record<string, TreeVO<SysMenu>>
}
```

- [ ] **Step 3: src/types/user.ts**

```ts
export interface SysUser {
  id: string
  name: string
  username: string
  mobile?: string
  email?: string
  avatar?: string
  status?: string
  deptId?: string
}
```

- [ ] **Step 4: 验证类型可编译**

Run: `pnpm typecheck`
Expected: 无 error（auto-imports.d.ts 可能尚未生成，先跑 `pnpm dev` 一次生成再 typecheck）。

- [ ] **Step 5: Commit**

```bash
git add src/types/api.ts src/types/menu.ts src/types/user.ts
git commit -m "feat(vue3): 接口/菜单/用户类型定义"
```

---

## Task 4: 请求层 axios（含拦截器 + 单测）

**Files:** Create `src/api/request.ts`、`tests/request.spec.ts`

- [ ] **Step 1: 写失败测试 tests/request.spec.ts（表单编码 + Result 解包逻辑）**

把可单测的纯逻辑抽成导出函数：`toFormUrlEncoded(obj)`、`isJsonRequest(config)`、`unwrapResult(result)`。

```ts
import { describe, it, expect } from 'vitest'
import { toFormUrlEncoded, unwrapResult } from '@/api/request'

describe('toFormUrlEncoded', () => {
  it('把平铺对象编码为 urlencoded 字符串', () => {
    expect(toFormUrlEncoded({ a: 1, b: 'x' })).toBe('a=1&b=x')
  })
  it('跳过 undefined/null 值', () => {
    expect(toFormUrlEncoded({ a: 1, b: undefined, c: null })).toBe('a=1')
  })
})

describe('unwrapResult', () => {
  it('code=0 返回 data', () => {
    expect(unwrapResult({ code: 0, data: { id: '1' }, msg: 'ok' })).toEqual({ id: '1' })
  })
  it('code!=0 抛出携带 msg 的错误', () => {
    expect(() => unwrapResult({ code: 1, data: null, msg: '失败' })).toThrowError('失败')
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm test request`
Expected: FAIL（`@/api/request` 未定义导出）。

- [ ] **Step 3: 写 src/api/request.ts**

```ts
import axios, {
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from 'axios'
import { ElMessage } from 'element-plus'
import type { Result } from '@/types/api'

/** 把平铺对象编码为 application/x-www-form-urlencoded */
export function toFormUrlEncoded(obj: Record<string, unknown>): string {
  const sp = new URLSearchParams()
  Object.entries(obj).forEach(([k, v]) => {
    if (v !== undefined && v !== null) sp.append(k, String(v))
  })
  return sp.toString()
}

/** Result 解包：code===0 返回 data，否则抛错 */
export function unwrapResult<T>(result: Result<T>): T {
  if (result.code === 0) return result.data
  throw new Error(result.msg || '请求失败')
}

const service: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || '/api',
  timeout: 20000,
  withCredentials: true,
  headers: { 'X-Requested-With': 'XMLHttpRequest' },
})

// 请求拦截：默认 JSON→表单编码；显式 application/json 则跳过；FormData 原样
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

// 响应拦截：解包 Result；401 跳登录
service.interceptors.response.use(
  (resp) => {
    const result = resp.data as Result
    if (result.code === 0) return result.data
    ElMessage.error(result.msg || '请求失败')
    return Promise.reject(new Error(result.msg))
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

/** 统一请求方法（已解包，泛型即业务数据类型） */
export const http = {
  get: <T>(url: string, params?: object) =>
    service.get(url, { params }) as unknown as Promise<T>,
  post: <T>(url: string, data?: object, json = false) =>
    service.post(url, data, json ? { headers: { 'Content-Type': 'application/json' } } : undefined) as unknown as Promise<T>,
  upload: <T>(url: string, form: FormData) =>
    service.post(url, form) as unknown as Promise<T>,
}

export default service
```

- [ ] **Step 4: 运行测试确认通过**

Run: `pnpm test request`
Expected: PASS（4 个用例）。

- [ ] **Step 5: Commit**

```bash
git add src/api/request.ts tests/request.spec.ts
git commit -m "feat(vue3): axios 请求层(表单编码/Result解包/401) + 单测"
```

---

## Task 5: 双主题样式（设计令牌 + 明暗 CSS 变量 + 动画令牌）

**Files:** Create `src/styles/{index,variables,theme,transitions}.scss`

- [ ] **Step 1: src/styles/variables.scss（设计令牌）**

```scss
:root {
  // 间距
  --sp-1: 4px;  --sp-2: 8px;  --sp-3: 12px; --sp-4: 16px; --sp-6: 24px;
  // 圆角
  --radius-sm: 6px; --radius: 10px; --radius-lg: 16px;
  // 动画令牌(统一节奏)
  --ease-standard: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-out: cubic-bezier(0, 0, 0.2, 1);
  --dur-fast: 160ms; --dur: 240ms; --dur-slow: 360ms;
}
```

- [ ] **Step 2: src/styles/theme.scss（明/暗变量 + 品牌主色 + Element 覆盖）**

```scss
:root {
  --brand: #2f7cff;
  --bg-body: #f4f6fb;
  --bg-card: #ffffff;
  --text-1: #1f2733;
  --text-2: #5b6675;
  --border: #e6e9f0;
  --el-color-primary: var(--brand);
}
html.dark {
  --brand: #36e0ff;            // 大屏青色霓虹
  --bg-body: #070b18;
  --bg-card: rgba(20, 30, 55, 0.65);
  --text-1: #e6f0ff;
  --text-2: #8aa0c4;
  --border: rgba(120, 160, 220, 0.18);
  --el-bg-color: #0d1530;
  --el-text-color-primary: var(--text-1);
}
body { margin: 0; background: var(--bg-body); color: var(--text-1);
  font-family: system-ui, -apple-system, "Segoe UI", "Microsoft YaHei", sans-serif;
  transition: background var(--dur) var(--ease-standard), color var(--dur) var(--ease-standard); }
```

- [ ] **Step 3: src/styles/transitions.scss（路由/通用过渡）**

```scss
.fade-slide-enter-active, .fade-slide-leave-active {
  transition: opacity var(--dur) var(--ease-out), transform var(--dur) var(--ease-out);
}
.fade-slide-enter-from { opacity: 0; transform: translateY(8px); }
.fade-slide-leave-to   { opacity: 0; transform: translateY(-8px); }
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { transition: none !important; animation: none !important; }
}
```

- [ ] **Step 4: src/styles/index.scss（入口）**

```scss
@use 'element-plus/theme-chalk/dark/css-vars.css';
@use './variables.scss';
@use './theme.scss';
@use './transitions.scss';
* { box-sizing: border-box; }
```

- [ ] **Step 5: Commit**

```bash
git add src/styles
git commit -m "style(vue3): 双主题 CSS 变量 + 设计/动画令牌 + 过渡"
```

---

## Task 6: 权限工具（菜单树 → 权限 Set，含单测）

**Files:** Create `src/utils/permission.ts`、`tests/permission.spec.ts`

- [ ] **Step 1: 写失败测试 tests/permission.spec.ts**

```ts
import { describe, it, expect } from 'vitest'
import { collectPermissions, flattenMenu } from '@/utils/permission'
import type { MenuInfo } from '@/types/menu'

const sample: MenuInfo['menuInfo'] = {
  system: {
    id: '10', name: '系统管理', permission: '', children: [
      { id: '101', name: '菜单管理', url: '/admin/sys/menu/list-ui', permission: 'menu:add' },
      { id: '102', name: '用户管理', url: '/admin/sys/user/list-ui', permission: 'user:add' },
    ],
  },
}

describe('collectPermissions', () => {
  it('递归收集所有非空 permission', () => {
    const set = collectPermissions(sample)
    expect(set.has('menu:add')).toBe(true)
    expect(set.has('user:add')).toBe(true)
    expect(set.size).toBe(2)
  })
})

describe('flattenMenu', () => {
  it('拍平出所有带 url 的叶子菜单', () => {
    const leaves = flattenMenu(sample)
    expect(leaves.map((m) => m.url)).toEqual([
      '/admin/sys/menu/list-ui', '/admin/sys/user/list-ui',
    ])
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `pnpm test permission`
Expected: FAIL（未定义导出）。

- [ ] **Step 3: 写 src/utils/permission.ts**

```ts
import type { MenuInfo, TreeVO, SysMenu } from '@/types/menu'

type MenuMap = MenuInfo['menuInfo']

/** 递归收集所有非空 permission 字符串 */
export function collectPermissions(menuInfo: MenuMap | null): Set<string> {
  const set = new Set<string>()
  if (!menuInfo) return set
  const walk = (node: TreeVO<SysMenu>) => {
    if (node.permission) set.add(node.permission)
    node.children?.forEach(walk)
  }
  Object.values(menuInfo).forEach(walk)
  return set
}

/** 拍平出所有带 url（且非 '#'/空）的菜单叶子 */
export function flattenMenu(menuInfo: MenuMap | null): TreeVO<SysMenu>[] {
  const out: TreeVO<SysMenu>[] = []
  if (!menuInfo) return out
  const walk = (node: TreeVO<SysMenu>) => {
    if (node.url && node.url !== '#' && node.url.trim() !== '') out.push(node)
    node.children?.forEach(walk)
  }
  Object.values(menuInfo).forEach(walk)
  return out
}
```

- [ ] **Step 4: 运行确认通过**

Run: `pnpm test permission`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add src/utils/permission.ts tests/permission.spec.ts
git commit -m "feat(vue3): 菜单权限收集/菜单拍平工具 + 单测"
```

---

## Task 7: Pinia stores（app / user / permission / notification）

**Files:** Create `src/stores/{app,user,permission,notification}.ts`

- [ ] **Step 1: src/stores/app.ts（主题/侧栏/多页签，持久化）**

```ts
import { defineStore } from 'pinia'

export interface TabItem { path: string; title: string; closable: boolean }

export const useAppStore = defineStore('app', {
  state: () => ({
    theme: 'light' as 'light' | 'dark',
    collapsed: false,
    tabs: [] as TabItem[],
  }),
  actions: {
    applyTheme() {
      document.documentElement.classList.toggle('dark', this.theme === 'dark')
    },
    toggleTheme() {
      this.theme = this.theme === 'light' ? 'dark' : 'light'
      this.applyTheme()
    },
    toggleCollapsed() { this.collapsed = !this.collapsed },
    addTab(tab: TabItem) {
      if (!this.tabs.find((t) => t.path === tab.path)) this.tabs.push(tab)
    },
    removeTab(path: string) { this.tabs = this.tabs.filter((t) => t.path !== path) },
  },
  persist: { pick: ['theme', 'collapsed', 'tabs'] },
})
```

- [ ] **Step 2: src/stores/user.ts（登录态/用户信息，持久化）**

```ts
import { defineStore } from 'pinia'
import type { SysUser } from '@/types/user'
import * as authApi from '@/api/auth'

export const useUserStore = defineStore('user', {
  state: () => ({
    user: null as SysUser | null,
    logged: false,
  }),
  actions: {
    async login(payload: { username: string; password: string; captcha?: string; rememberMe?: boolean }) {
      await authApi.login(payload)
      this.logged = true
      await this.fetchUserInfo()
    },
    async fetchUserInfo() {
      this.user = await authApi.userInfo()
    },
    async logout() {
      try { await authApi.logout() } catch { /* 忽略 */ }
      this.$reset()
    },
  },
  persist: { pick: ['user', 'logged'] },
})
```

- [ ] **Step 3: src/stores/permission.ts（权限 Set + 菜单树，登录时重建）**

```ts
import { defineStore } from 'pinia'
import type { MenuInfo } from '@/types/menu'
import { getMenuTree } from '@/api/menu'
import { collectPermissions } from '@/utils/permission'

export const usePermissionStore = defineStore('permission', {
  state: () => ({
    menuInfo: null as MenuInfo['menuInfo'] | null,
    permissions: new Set<string>(),
    loaded: false,
  }),
  getters: {
    hasPermission: (state) => (perm?: string) =>
      !perm || state.permissions.has(perm),
  },
  actions: {
    async loadMenu() {
      const info = await getMenuTree()
      this.menuInfo = info.menuInfo
      this.permissions = collectPermissions(info.menuInfo)
      this.loaded = true
    },
    reset() { this.menuInfo = null; this.permissions = new Set(); this.loaded = false },
  },
  // Set 不可直接 JSON 持久化 → 不持久化，登录后由 loadMenu 重建
})
```

- [ ] **Step 4: src/stores/notification.ts（占位，C4 增强）**

```ts
import { defineStore } from 'pinia'

export interface NoticeItem { id: string; title: string; time: string; read: boolean }

export const useNotificationStore = defineStore('notification', {
  state: () => ({ list: [] as NoticeItem[] }),
  getters: { unread: (s) => s.list.filter((n) => !n.read).length },
  actions: {
    push(n: NoticeItem) { this.list.unshift(n) },
    markAllRead() { this.list.forEach((n) => (n.read = true)) },
  },
})
```

- [ ] **Step 5: Commit**

```bash
git add src/stores
git commit -m "feat(vue3): Pinia 模块化 store(app/user/permission/notification) + 持久化"
```

---

## Task 8: 组合式函数（useRequest / usePagination）

**Files:** Create `src/composables/useRequest.ts`、`src/composables/usePagination.ts`

- [ ] **Step 1: src/composables/useRequest.ts**

```ts
import { ref, type Ref } from 'vue'

interface UseRequestOptions<T> {
  immediate?: boolean
  initialData?: T
  onSuccess?: (data: T) => void
}

/** 统一管理 loading/error/data，配合骨架屏 */
export function useRequest<T, A extends unknown[] = []>(
  fetcher: (...args: A) => Promise<T>,
  options: UseRequestOptions<T> = {},
) {
  const data = ref(options.initialData) as Ref<T | undefined>
  const loading = ref(false)
  const error = ref<Error | null>(null)

  async function run(...args: A) {
    loading.value = true
    error.value = null
    try {
      const res = await fetcher(...args)
      data.value = res
      options.onSuccess?.(res)
      return res
    } catch (e) {
      error.value = e as Error
      throw e
    } finally {
      loading.value = false
    }
  }

  if (options.immediate) run(...([] as unknown as A))
  return { data, loading, error, run }
}
```

- [ ] **Step 2: src/composables/usePagination.ts**

```ts
import { reactive } from 'vue'

export function usePagination(initial: { size?: number } = {}) {
  const pager = reactive({ current: 1, size: initial.size ?? 10, total: 0 })
  function setTotal(t: number) { pager.total = t }
  function reset() { pager.current = 1 }
  return { pager, setTotal, reset }
}
```

- [ ] **Step 3: 验证类型**

Run: `pnpm typecheck`
Expected: 无 error。

- [ ] **Step 4: Commit**

```bash
git add src/composables
git commit -m "feat(vue3): useRequest/usePagination 组合式函数"
```

---

## Task 9: API 模块（auth / menu）

**Files:** Create `src/api/auth.ts`、`src/api/menu.ts`

- [ ] **Step 1: src/api/auth.ts**

```ts
import { http } from './request'
import type { SysUser } from '@/types/user'

export function login(payload: {
  username: string; password: string; captcha?: string; rememberMe?: boolean
}) {
  // 走表单编码（默认）
  return http.post<void>('/login', {
    username: payload.username,
    password: payload.password,
    captcha: payload.captcha ?? '',
    rememberMe: payload.rememberMe ? 'true' : 'false',
  })
}

export function logout() {
  return http.get<void>('/logout')
}

export function userInfo() {
  return http.get<SysUser>('/admin/user/info')
}

/** 验证码图片地址（带时间戳防缓存，由调用方拼 base） */
export function captchaUrl() {
  return `${import.meta.env.VITE_API_BASE || '/api'}/verification/code?t=${Date.now()}`
}
```

- [ ] **Step 2: src/api/menu.ts**

```ts
import { http } from './request'
import type { MenuInfo } from '@/types/menu'

export function getMenuTree() {
  return http.get<MenuInfo>('/admin/list/index/menu/tree')
}
```

- [ ] **Step 3: 验证类型**

Run: `pnpm typecheck`
Expected: 无 error。

- [ ] **Step 4: Commit**

```bash
git add src/api/auth.ts src/api/menu.ts
git commit -m "feat(vue3): 鉴权与菜单 API 模块"
```

---

## Task 10: 路由 + 全局守卫

**Files:** Create `src/router/index.ts`、`src/router/guards.ts`、`src/utils/icon.ts`

> 路由策略：静态壳路由（登录、错误页、布局壳）+ 业务子路由。业务子路由 `path` 必须与 `sp_sys_menu.url` 匹配（侧栏点击靠 url 跳转）。本周期仅放 `welcome`，Cycle 1 起按模块补子路由。动态参数示例：`/technology/bom/:id?`。

- [ ] **Step 1: src/router/index.ts**

```ts
import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

export const routes: RouteRecordRaw[] = [
  { path: '/login', name: 'login', component: () => import('@/views/login/LoginView.vue'), meta: { public: true } },
  {
    path: '/',
    component: () => import('@/layouts/AdminLayout.vue'),
    redirect: '/welcome',
    children: [
      { path: 'welcome', name: 'welcome', component: () => import('@/views/welcome/WelcomeView.vue'), meta: { title: '首页' } },
      // Cycle 1 起在此追加各模块子路由（path 对齐菜单 url）
    ],
  },
  // 大屏/3D 用全屏 ScreenLayout（Cycle 1 追加）
  { path: '/403', component: () => import('@/views/error/403.vue'), meta: { public: true } },
  { path: '/500', component: () => import('@/views/error/500.vue'), meta: { public: true } },
  { path: '/:pathMatch(.*)*', component: () => import('@/views/error/404.vue'), meta: { public: true } },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

export default router
```

- [ ] **Step 2: src/router/guards.ts**

```ts
import type { Router } from 'vue-router'
import NProgress from 'nprogress'
import 'nprogress/nprogress.css'
import { useUserStore } from '@/stores/user'
import { usePermissionStore } from '@/stores/permission'

NProgress.configure({ showSpinner: false })

export function setupGuards(router: Router) {
  router.beforeEach(async (to) => {
    NProgress.start()
    const userStore = useUserStore()
    const permStore = usePermissionStore()

    if (to.meta.public) return true
    if (!userStore.logged) return { path: '/login', query: { redirect: to.fullPath } }

    // 已登录但权限未加载（如刷新后）→ 重建菜单/权限
    if (!permStore.loaded) {
      try { await permStore.loadMenu() } catch { /* 失败交由 401 处理 */ }
    }
    // 路由级权限：meta.perm 存在则校验
    const perm = to.meta.perm as string | undefined
    if (perm && !permStore.hasPermission(perm)) return { path: '/403' }
    return true
  })

  router.afterEach(() => NProgress.done())
}
```

- [ ] **Step 3: src/utils/icon.ts（菜单图标名 → Element Plus 图标组件名映射）**

```ts
// 后端 icon 多为 fa-/layui 名，这里给一份兜底映射，未命中用默认
export const iconMap: Record<string, string> = {
  system: 'Setting', user: 'User', role: 'Avatar', menu: 'Menu',
  order: 'Tickets', materiel: 'Box', flow: 'Share', bom: 'Files',
  dashboard: 'DataBoard', warehouse: 'House', default: 'Menu',
}
export function resolveIcon(code?: string): string {
  if (!code) return iconMap.default
  const key = Object.keys(iconMap).find((k) => code.toLowerCase().includes(k))
  return key ? iconMap[key] : iconMap.default
}
```

- [ ] **Step 4: 验证类型**

Run: `pnpm typecheck`
Expected: 无 error（views 文件将在后续任务创建；若报缺失，先建空壳占位）。

- [ ] **Step 5: Commit**

```bash
git add src/router src/utils/icon.ts
git commit -m "feat(vue3): 路由表 + beforeEach 守卫(登录拦截/权限校验/NProgress)"
```

---

## Task 11: 通用组件（强复用，props/$emit 驱动）

**Files:** Create `src/components/PageContainer.vue`、`SearchForm.vue`、`DataTable.vue`、`FormDialog.vue`、`skeletons/TableSkeleton.vue`

> 每个组件契约明确，零业务耦合。下面给出 props/emits/slots 契约与关键模板片段。

- [ ] **Step 1: PageContainer.vue**

契约：默认插槽为页面内容；props `title?`。包一层卡片 + 入场 `v-motion`。
```vue
<template>
  <section class="page-container" v-motion :initial="{ opacity: 0, y: 12 }" :enter="{ opacity: 1, y: 0 }">
    <header v-if="title" class="page-container__header">{{ title }}</header>
    <slot />
  </section>
</template>
<script setup lang="ts">
defineProps<{ title?: string }>()
</script>
<style scoped>
.page-container { padding: var(--sp-4); }
.page-container__header { font-size: 18px; font-weight: 600; margin-bottom: var(--sp-4); }
</style>
```

- [ ] **Step 2: SearchForm.vue**

契约：props `model`（v-model 双向，查询条件对象）；emits `search`、`reset`；默认插槽放 `el-form-item`。
```vue
<template>
  <el-form :model="model" inline class="search-form" @submit.prevent>
    <slot />
    <el-form-item>
      <el-button type="primary" :icon="Search" @click="emit('search')">搜索</el-button>
      <el-button :icon="Refresh" @click="emit('reset')">重置</el-button>
    </el-form-item>
  </el-form>
</template>
<script setup lang="ts">
import { Search, Refresh } from '@element-plus/icons-vue'
defineProps<{ model: Record<string, unknown> }>()
const emit = defineEmits<{ search: []; reset: [] }>()
</script>
```

- [ ] **Step 3: DataTable.vue（核心通用表格）**

契约：
- props：`data: T[]`、`loading: boolean`、`columns: Column[]`、`pager: {current,size,total}`、`rowKey?`。
- emits：`page-change [current]`、`size-change [size]`。
- slots：`toolbar`（左上操作区）、`actions`（行操作列，作用域 `{ row }`）、按列 `col-<prop>`（作用域 `{ row }`）。
- loading 时展示 `TableSkeleton`；空数据展示 Element 空态。
- 列表行用 `v-auto-animate` 平滑增删。

```vue
<template>
  <div class="data-table">
    <div class="data-table__toolbar"><slot name="toolbar" /></div>
    <TableSkeleton v-if="loading && !data.length" :rows="pager.size" />
    <el-table v-else :data="data" :row-key="rowKey" v-loading="loading" stripe v-auto-animate>
      <el-table-column v-for="c in columns" :key="c.prop" :prop="c.prop" :label="c.label" :width="c.width">
        <template v-if="$slots[`col-${c.prop}`]" #default="{ row }">
          <slot :name="`col-${c.prop}`" :row="row" />
        </template>
      </el-table-column>
      <el-table-column v-if="$slots.actions" label="操作" :width="actionWidth" fixed="right">
        <template #default="{ row }"><slot name="actions" :row="row" /></template>
      </el-table-column>
      <template #empty><el-empty description="暂无数据" /></template>
    </el-table>
    <el-pagination
      class="data-table__pager"
      :current-page="pager.current" :page-size="pager.size" :total="pager.total"
      :page-sizes="[10, 20, 50, 100]" layout="total, sizes, prev, pager, next, jumper"
      @current-change="(p:number)=>emit('page-change', p)"
      @size-change="(s:number)=>emit('size-change', s)" />
  </div>
</template>
<script setup lang="ts" generic="T extends Record<string, unknown>">
import TableSkeleton from './skeletons/TableSkeleton.vue'
export interface Column { prop: string; label: string; width?: number | string }
withDefaults(defineProps<{
  data: T[]; loading?: boolean; columns: Column[]
  pager: { current: number; size: number; total: number }
  rowKey?: string; actionWidth?: number | string
}>(), { loading: false, rowKey: 'id', actionWidth: 180 })
const emit = defineEmits<{ 'page-change': [number]; 'size-change': [number] }>()
</script>
<style scoped>
.data-table__toolbar { margin-bottom: var(--sp-3); display: flex; gap: var(--sp-2); }
.data-table__pager { margin-top: var(--sp-4); justify-content: flex-end; }
</style>
```

- [ ] **Step 4: FormDialog.vue（弹窗表单容器）**

契约：props `modelValue`(visible, v-model)、`title`、`width?`、`loading?`；emits `update:modelValue`、`submit`；默认插槽放表单项；内部不持有业务数据，校验由父级 `el-form` ref 触发后再 `submit`。
```vue
<template>
  <el-dialog :model-value="modelValue" :title="title" :width="width" @update:model-value="(v:boolean)=>emit('update:modelValue', v)" destroy-on-close>
    <slot />
    <template #footer>
      <el-button @click="emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" :loading="loading" @click="emit('submit')">确定</el-button>
    </template>
  </el-dialog>
</template>
<script setup lang="ts">
withDefaults(defineProps<{ modelValue: boolean; title?: string; width?: string; loading?: boolean }>(),
  { title: '', width: '520px', loading: false })
const emit = defineEmits<{ 'update:modelValue': [boolean]; submit: [] }>()
</script>
```

- [ ] **Step 5: skeletons/TableSkeleton.vue**

```vue
<template>
  <div class="table-skeleton">
    <el-skeleton animated :rows="0" v-for="i in rows" :key="i">
      <template #template>
        <el-skeleton-item variant="text" style="width: 100%; height: 38px; margin-bottom: 8px" />
      </template>
    </el-skeleton>
  </div>
</template>
<script setup lang="ts">
withDefaults(defineProps<{ rows?: number }>(), { rows: 8 })
</script>
```

- [ ] **Step 6: 验证类型**

Run: `pnpm typecheck`
Expected: 无 error。

- [ ] **Step 7: Commit**

```bash
git add src/components
git commit -m "feat(vue3): 通用组件 PageContainer/SearchForm/DataTable/FormDialog/骨架屏"
```

---

## Task 12: 布局（AdminLayout 后台 + ScreenLayout 大屏）

**Files:** Create `src/layouts/AdminLayout.vue`、`ScreenLayout.vue`、`components/{AppSidebar,AppHeader,AppTabs,ThemeToggle}.vue`

- [ ] **Step 1: components/ThemeToggle.vue**

契约：点击切换 `appStore.toggleTheme()`，图标随主题变化。
```vue
<template>
  <el-button circle text :icon="app.theme === 'dark' ? Sunny : Moon" @click="app.toggleTheme()" />
</template>
<script setup lang="ts">
import { Sunny, Moon } from '@element-plus/icons-vue'
import { useAppStore } from '@/stores/app'
const app = useAppStore()
</script>
```

- [ ] **Step 2: components/AppSidebar.vue**

契约：从 `permissionStore.menuInfo` 渲染 `el-menu`（递归分组+子项）；点击叶子 `router.push(node.url)`；折叠跟随 `appStore.collapsed`；图标用 `resolveIcon`。仅渲染有 `url`（非 `#`/空）或有子项的节点。
关键：用 `el-sub-menu` 渲染分组，`el-menu-item :index="node.url"` 渲染叶子，`@select` 里 `router.push`。

- [ ] **Step 3: components/AppHeader.vue**

契约：左侧折叠按钮（`app.toggleCollapsed`）+ 面包屑（`route.matched`）；右侧通知铃铛（`notification.unread` 角标）、`ThemeToggle`、用户下拉（用户名 + 退出 → `user.logout()` 后跳 `/login`）。

- [ ] **Step 4: components/AppTabs.vue**

契约：从 `appStore.tabs` 渲染 `el-tabs`（可关闭）；切换 `router.push`，关闭 `app.removeTab`；当前路由进入时 `app.addTab`（在 AdminLayout 的 `watch(route)` 里做）。

- [ ] **Step 5: AdminLayout.vue（组装）**

```vue
<template>
  <el-container class="admin-layout">
    <el-aside :width="app.collapsed ? '64px' : '220px'" class="admin-layout__aside">
      <div class="admin-layout__logo">章鱼师兄 MES</div>
      <AppSidebar />
    </el-aside>
    <el-container>
      <el-header class="admin-layout__header"><AppHeader /></el-header>
      <AppTabs />
      <el-main>
        <router-view v-slot="{ Component }">
          <transition name="fade-slide" mode="out-in">
            <keep-alive><component :is="Component" /></keep-alive>
          </transition>
        </router-view>
      </el-main>
    </el-container>
  </el-container>
</template>
<script setup lang="ts">
import { watch } from 'vue'
import { useRoute } from 'vue-router'
import AppSidebar from './components/AppSidebar.vue'
import AppHeader from './components/AppHeader.vue'
import AppTabs from './components/AppTabs.vue'
import { useAppStore } from '@/stores/app'
const app = useAppStore()
const route = useRoute()
watch(() => route.fullPath, () => {
  if (route.meta.title) app.addTab({ path: route.fullPath, title: route.meta.title as string, closable: route.path !== '/welcome' })
}, { immediate: true })
</script>
<style scoped>
.admin-layout { height: 100vh; }
.admin-layout__aside { background: var(--bg-card); border-right: 1px solid var(--border); transition: width var(--dur) var(--ease-standard); overflow: hidden; }
.admin-layout__logo { height: 56px; line-height: 56px; text-align: center; font-weight: 700; color: var(--brand); }
.admin-layout__header { display: flex; align-items: center; background: var(--bg-card); border-bottom: 1px solid var(--border); }
</style>
```

- [ ] **Step 6: ScreenLayout.vue（大屏全屏深色壳）**

契约：`onMounted` 强制 `document.documentElement.classList.add('dark')`，`onUnmounted` 恢复 `appStore.applyTheme()`；全屏黑底容器 + `<router-view />`。

- [ ] **Step 7: 验证 dev 启动渲染**

Run: `pnpm dev`（浏览器开 4200，未登录应被守卫导向 /login）
Expected: 无控制台报错。

- [ ] **Step 8: Commit**

```bash
git add src/layouts
git commit -m "feat(vue3): AdminLayout(侧栏/头部/页签) + ScreenLayout 双布局"
```

---

## Task 13: 指令与插件注册

**Files:** Create `src/directives/permission.ts`、`src/plugins/index.ts`

- [ ] **Step 1: src/directives/permission.ts（v-permission）**

```ts
import type { Directive } from 'vue'
import { usePermissionStore } from '@/stores/permission'

/** v-permission="'user:add'"：无权限时移除元素 */
export const vPermission: Directive<HTMLElement, string> = {
  mounted(el, binding) {
    const store = usePermissionStore()
    if (binding.value && !store.hasPermission(binding.value)) {
      el.parentNode?.removeChild(el)
    }
  },
}
```

- [ ] **Step 2: src/plugins/index.ts（集中注册）**

```ts
import type { App } from 'vue'
import { MotionPlugin } from '@vueuse/motion'
import { autoAnimatePlugin } from '@formkit/auto-animate/vue'
import { vPermission } from '@/directives/permission'

export function setupPlugins(app: App) {
  app.use(MotionPlugin)
  app.use(autoAnimatePlugin)
  app.directive('permission', vPermission)
}
```

- [ ] **Step 3: 验证类型**

Run: `pnpm typecheck`
Expected: 无 error。

- [ ] **Step 4: Commit**

```bash
git add src/directives src/plugins
git commit -m "feat(vue3): v-permission 指令 + motion/auto-animate 插件注册"
```

---

## Task 14: 登录页 + 鉴权闭环

**Files:** Create `src/views/login/LoginView.vue`

- [ ] **Step 1: LoginView.vue**

契约/行为：
- `el-form` + 校验规则：`username` 必填（正则 `^[\w.@-]{2,30}$`）、`password` 必填（≥3）、`captcha` 必填（dev 可空，用 `import.meta.env.DEV` 放宽）。
- 验证码：`<img :src="captchaSrc" @click="refreshCaptcha">`，点击刷新（重算 `captchaUrl()`）。dev 下隐藏或可空。
- 提交：`formRef.validate()` 通过 → `userStore.login(...)` → 成功后 `permissionStore.loadMenu()` → `router.push(redirect || '/welcome')`；失败 `ElMessage`（已由拦截器统一提示）。
- 视觉：左侧品牌渐变插画区 + 右侧卡片，卡片 `v-motion` 入场。

```vue
<template>
  <div class="login">
    <div class="login__brand" v-motion :initial="{opacity:0,x:-20}" :enter="{opacity:1,x:0}">
      <h1>章鱼师兄 MES</h1><p>智能制造执行系统</p>
    </div>
    <el-card class="login__card" v-motion :initial="{opacity:0,y:20}" :enter="{opacity:1,y:0}">
      <h2>欢迎登录</h2>
      <el-form ref="formRef" :model="form" :rules="rules" @keyup.enter="onSubmit">
        <el-form-item prop="username">
          <el-input v-model="form.username" placeholder="用户名" :prefix-icon="User" />
        </el-form-item>
        <el-form-item prop="password">
          <el-input v-model="form.password" type="password" show-password placeholder="密码" :prefix-icon="Lock" />
        </el-form-item>
        <el-form-item v-if="!isDev" prop="captcha">
          <div class="login__captcha">
            <el-input v-model="form.captcha" placeholder="验证码" />
            <img :src="captchaSrc" alt="验证码" @click="refreshCaptcha" />
          </div>
        </el-form-item>
        <el-button type="primary" :loading="loading" class="login__submit" @click="onSubmit">登 录</el-button>
      </el-form>
    </el-card>
  </div>
</template>
<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { User, Lock } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { usePermissionStore } from '@/stores/permission'
import { captchaUrl } from '@/api/auth'

const isDev = import.meta.env.DEV
const router = useRouter(); const route = useRoute()
const userStore = useUserStore(); const permStore = usePermissionStore()
const formRef = ref<FormInstance>()
const form = reactive({ username: 'admin', password: '123', captcha: '', rememberMe: true })
const captchaSrc = ref(captchaUrl())
const loading = ref(false)
const rules: FormRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' },
    { pattern: /^[\w.@-]{2,30}$/, message: '2-30位字母/数字/.@-', trigger: 'blur' }],
  password: [{ required: true, min: 3, message: '密码至少3位', trigger: 'blur' }],
  captcha: [{ required: !isDev, message: '请输入验证码', trigger: 'blur' }],
}
function refreshCaptcha() { captchaSrc.value = captchaUrl() }
async function onSubmit() {
  await formRef.value?.validate()
  loading.value = true
  try {
    await userStore.login(form)
    await permStore.loadMenu()
    router.push((route.query.redirect as string) || '/welcome')
  } catch { refreshCaptcha() } finally { loading.value = false }
}
</script>
<style scoped>
.login { height: 100vh; display: grid; grid-template-columns: 1fr 1fr; }
.login__brand { display: flex; flex-direction: column; justify-content: center; align-items: center;
  background: linear-gradient(135deg, #2f7cff, #36e0ff); color: #fff; }
.login__card { width: 380px; margin: auto; }
.login__captcha { display: flex; gap: 8px; }
.login__captcha img { height: 40px; cursor: pointer; border-radius: 6px; }
.login__submit { width: 100%; }
</style>
```

- [ ] **Step 2: 联调验证（需后端 9090 运行）**

Run: `pnpm dev` → 浏览器 `/login` → 用 `admin/123` 登录（dev 免验证码）。
Expected: 登录成功跳 `/welcome`，侧栏出现菜单树，刷新页面保持登录（持久化生效）。

- [ ] **Step 3: Commit**

```bash
git add src/views/login
git commit -m "feat(vue3): 登录页(表单正则校验/验证码) + 鉴权闭环"
```

---

## Task 15: Welcome 首页 + 错误页

**Files:** Create `src/views/welcome/WelcomeView.vue`、`src/views/error/{403,404,500}.vue`

- [ ] **Step 1: WelcomeView.vue**

契约：欢迎卡片（显示当前用户名）、快捷入口卡片若干（`v-motion` 错峰入场）、占位的"今日概览"小卡（C1 接大屏数据）。

- [ ] **Step 2: error/403.vue / 404.vue / 500.vue**

契约：统一 `el-result`（icon + 标题 + "返回首页"按钮 `router.push('/')`）。三页仅状态码/文案不同。
```vue
<!-- 404.vue 示例 -->
<template>
  <el-result icon="warning" title="404" sub-title="页面不存在">
    <template #extra><el-button type="primary" @click="$router.push('/')">返回首页</el-button></template>
  </el-result>
</template>
```

- [ ] **Step 3: Commit**

```bash
git add src/views/welcome src/views/error
git commit -m "feat(vue3): Welcome 首页 + 403/404/500 错误页"
```

---

## Task 16: main.ts 装配 + 端到端冒烟验证

**Files:** Modify `src/main.ts`、`src/App.vue`

- [ ] **Step 1: src/main.ts**

```ts
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import App from './App.vue'
import router from './router'
import { setupGuards } from './router/guards'
import { setupPlugins } from './plugins'
import { useAppStore } from './stores/app'
import './styles/index.scss'

const app = createApp(App)
const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)
app.use(pinia)
app.use(router)
setupGuards(router)
setupPlugins(app)

// 启动时应用持久化的主题
useAppStore().applyTheme()

app.mount('#app')
```

- [ ] **Step 2: src/App.vue**

```vue
<template>
  <router-view />
  <!-- C1: 这里挂全局 AiAssistant 浮窗 -->
</template>
<script setup lang="ts"></script>
```

- [ ] **Step 3: typecheck 全量过**

Run: `pnpm typecheck`
Expected: 0 error。

- [ ] **Step 4: 单测全过**

Run: `pnpm test`
Expected: request + permission 全部 PASS。

- [ ] **Step 5: 端到端冒烟（后端需运行）**

手动核对清单：
- 未登录访问 `/welcome` → 被守卫重定向 `/login?redirect=/welcome`。
- `admin/123` 登录成功 → 跳 `/welcome`，侧栏渲染菜单树。
- 切换主题 → 全站明/暗切换；刷新后主题保持。
- 刷新页面 → 仍登录（持久化），侧栏/权限重建无报错。
- 退出登录 → 回 `/login`，再访问受保护页被拦截。
- 访问不存在路径 → 404 页。

- [ ] **Step 6: Commit + 合并到 develop**

```bash
git add src/main.ts src/App.vue
git commit -m "feat(vue3): 应用装配(pinia持久化/路由守卫/插件/主题) + Cycle0 冒烟通过"
git checkout develop && git merge --no-ff feature/infra -m "merge: Cycle0 基础设施完成"
```

---

## Self-Review（对照 ROADMAP 第 4 节核心机制）

- ✅ 请求层（表单编码/Result 解包/401）→ Task 4（含单测）
- ✅ 鉴权闭环（登录/验证码/用户信息/菜单树/持久化）→ Task 9/12/14
- ✅ 权限（菜单树→Set、v-permission、路由 meta.perm）→ Task 6/10/13
- ✅ 双主题（CSS 变量 + 切换持久化）→ Task 5/7/12
- ✅ 路由（嵌套 + 动态参数预留 + beforeEach 守卫 + NProgress）→ Task 10
- ✅ Pinia 模块化 + 持久化 → Task 7 + Task 16
- ✅ 通用组件（DataTable/SearchForm/FormDialog/骨架屏，props/$emit）→ Task 11
- ✅ 动画（motion/auto-animate/过渡令牌/reduced-motion）→ Task 5/11/13
- ✅ 按需引入（unplugin + ElementPlusResolver）→ Task 2
- ✅ Git 三分支 + 规范增量提交 → Task 0 起每任务一提交
- ⏭ ECharts/Three/AI/业务页面 → Cycle 1（独立 plan）

**类型一致性核对**：`http.get/post/upload` 签名、`Result/PageResult`、`MenuInfo.menuInfo`、`usePermissionStore.hasPermission`、`useAppStore.applyTheme/toggleTheme`、`useUserStore.login/fetchUserInfo/logout` 在各任务间一致。
