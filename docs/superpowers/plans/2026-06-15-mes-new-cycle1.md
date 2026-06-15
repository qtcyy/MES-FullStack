# MES-New 周期 1(骨架)实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `mes/frontend/apps/mes-new` 从零搭建一个采用 D(Slate 浅色,默认)/B(Console 暗色)双主题、基于 `@ngify/http` rxjs 数据层、复用 `@workspace/ui` shadcn 的现代化前端骨架,并交付「登录 → 鉴权 → 动态侧栏 → 用户管理 CRUD」全链路标杆。

**Architecture:** Vite + React 19 + TS;UI 复用 `@workspace/ui`(shadcn/Tailwind v4),主题复用其 next-themes+`globals.css`(`:root`=D、`.dark`=B);网络层复用 `@workspace/utils` 的 `HttpContextProvider`/`useHttp`(`@ngify/http`,返回 rxjs Observable),在 app 内写 MES 拦截器(表单编码 + `Result` 解包 + 401)与轻量 `useQuery$`/`useMutation$` + `queryCache`;Zustand 管 auth/menu/app(标签页);后端动态菜单树 → 侧栏 + 权限 Set。

**Tech Stack:** React 19, React Router v7, TypeScript, Vite 8, Tailwind v4, `@workspace/ui`(shadcn), `@workspace/utils`(`@ngify/http`/rxjs), Zustand, react-hook-form + zod, lucide-react, Vitest(纯逻辑单测)。

**后端契约(已核对 mes1):**
- 响应包 `Result{code,data,msg}`:`code===0` 取 `data`,否则报错;HTTP 401 跳 `/login`。
- POST 默认 `application/x-www-form-urlencoded`;例外两个 `@RequestBody` JSON 端点 `/basedata/manager/add-or-update`、`/basedata/flow/process/add-or-update`(周期 1 不涉及,机制预留)。
- 分页:请求 `{current(1基), size}`,响应 `{records,total,size,current,pages}`。
- 端点:登录 `POST /login`{username,password,captcha,rememberMe};登出 `GET /logout`;验证码 `GET /verification/code`(图片流);用户信息 `GET /admin/user/info`→`SysUser`;菜单树 `GET /admin/list/index/menu/tree`→`MenuInfo`;用户 `POST /admin/sys/user/page`、`GET /admin/sys/user/get-by-id?id=`、`POST /admin/sys/user/add-or-update`、`POST /admin/sys/user/delete`{id}。

**开发期端口:** mes-new 用 **4100**(避开 mes1 的 4000),代理 `/api → localhost:9090` 去前缀。**前后端分离,不配置 build 输出目录(默认 `dist/`)。**

---

## 文件结构(本周期创建/修改)

```
mes/frontend/
├── packages/ui/src/styles/globals.css        # 修改::root→D(Slate), .dark→B(Console) token 值
├── package.json                              # 修改:补 mes-new 的 dev:new/build:new 脚本
└── apps/mes-new/                             # 全部新建
    ├── package.json  index.html  vite.config.ts  postcss.config.mjs
    ├── tsconfig.json  tsconfig.app.json  tsconfig.node.json  eslint.config.js
    ├── vitest.config.ts
    └── src/
        ├── main.tsx  App.tsx  router.tsx  vite-env.d.ts
        ├── styles.css                        # 仅 @import "@workspace/ui/globals.css" + 少量全局
        ├── types/        api.ts  user.ts  menu.ts
        ├── http/         interceptors.ts  formBody.ts  queryCache.ts  hooks.ts
        │                 __tests__/formBody.test.ts  __tests__/interceptors.test.ts  __tests__/queryCache.test.ts
        ├── api/          auth.ts  menu.ts  system/user.ts
        ├── utils/        urlMap.ts  iconMap.ts  __tests__/urlMap.test.ts  __tests__/iconMap.test.ts
        ├── stores/       authStore.ts  menuStore.ts  appStore.ts  __tests__/permissions.test.ts
        ├── hooks/        usePermission.ts  usePagination.ts
        ├── components/   PrivateRoute.tsx  PermissionGuard.tsx  ThemeSwitch.tsx
        │                 PageContainer.tsx  SearchForm.tsx  ModalForm.tsx
        ├── layouts/      AdminLayout.tsx  components/AppSidebar.tsx  AppHeader.tsx  AppTabs.tsx
        └── pages/        login/LoginPage.tsx  welcome/WelcomePage.tsx
                          system/user/UserList.tsx  system/user/UserForm.tsx
                          error/NotFound.tsx  error/Forbidden.tsx
```

---

## Task 1: 脚手架(apps/mes-new 工程骨架)

**Files:**
- Create: `apps/mes-new/package.json`、`index.html`、`vite.config.ts`、`postcss.config.mjs`、`tsconfig.json`、`tsconfig.app.json`、`tsconfig.node.json`、`eslint.config.js`、`src/main.tsx`、`src/App.tsx`、`src/styles.css`、`src/vite-env.d.ts`
- Modify: `mes/frontend/package.json`

- [ ] **Step 1: 创建 `apps/mes-new/package.json`**

```json
{
  "name": "mes-new",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "eslint .",
    "preview": "vite preview",
    "check-types": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@hookform/resolvers": "^3.10.0",
    "@ngify/http": "^2.0.6",
    "@tanstack/react-table": "^8.21.3",
    "@workspace/ui": "workspace:*",
    "@workspace/utils": "workspace:*",
    "lucide-react": "^0.475.0",
    "next-themes": "^0.4.6",
    "qs": "^6.15.2",
    "react": "^19.2.6",
    "react-dom": "^19.2.6",
    "react-hook-form": "^7.54.2",
    "react-router-dom": "^7.17.0",
    "rxjs": "^7.8.2",
    "zod": "^3.25.76",
    "zustand": "^5.0.14"
  },
  "devDependencies": {
    "@eslint/js": "^10.0.1",
    "@tailwindcss/postcss": "^4.1.11",
    "@types/node": "^24.12.3",
    "@types/qs": "^6.15.1",
    "@types/react": "^19.2.14",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react": "^6.0.1",
    "@workspace/typescript-config": "workspace:*",
    "eslint": "^10.3.0",
    "eslint-plugin-react-hooks": "^7.1.1",
    "eslint-plugin-react-refresh": "^0.5.2",
    "globals": "^17.6.0",
    "tailwindcss": "^4.1.11",
    "typescript": "~6.0.2",
    "typescript-eslint": "^8.59.2",
    "vite": "^8.0.12",
    "vitest": "^2.1.8"
  }
}
```

- [ ] **Step 2: 创建 `apps/mes-new/index.html`**

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>章鱼MES · 智能制造系统</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 3: 创建 `apps/mes-new/vite.config.ts`**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 4100,
    proxy: {
      '/api': {
        target: 'http://localhost:9090',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, ''),
      },
    },
  },
})
```

- [ ] **Step 4: 创建 `apps/mes-new/postcss.config.mjs`**

```javascript
/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: { '@tailwindcss/postcss': {} },
}

export default config
```

- [ ] **Step 5: 创建 `apps/mes-new/tsconfig.json`**

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
```

- [ ] **Step 6: 创建 `apps/mes-new/tsconfig.app.json`**

```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
    "target": "es2023",
    "lib": ["ES2023", "DOM", "DOM.Iterable"],
    "module": "esnext",
    "types": ["vite/client"],
    "skipLibCheck": true,
    "paths": { "@/*": ["./src/*"] },
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}
```

- [ ] **Step 7: 创建 `apps/mes-new/tsconfig.node.json`**

```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.node.tsbuildinfo",
    "target": "es2023",
    "lib": ["ES2023"],
    "module": "esnext",
    "types": ["node"],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["vite.config.ts", "vitest.config.ts"]
}
```

- [ ] **Step 8: 创建 `apps/mes-new/eslint.config.js`**

```javascript
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: { globals: globals.browser },
  },
])
```

- [ ] **Step 9: 创建 `apps/mes-new/src/vite-env.d.ts`**

```typescript
/// <reference types="vite/client" />
```

- [ ] **Step 10: 创建 `apps/mes-new/src/styles.css`**

```css
@import "@workspace/ui/globals.css";

html,
body,
#root {
  height: 100%;
}
```

- [ ] **Step 11: 创建占位 `apps/mes-new/src/App.tsx`**

```tsx
export default function App() {
  return (
    <div className="flex h-full items-center justify-center bg-background text-foreground">
      <h1 className="text-2xl font-semibold">章鱼MES · mes-new 脚手架就绪</h1>
    </div>
  )
}
```

- [ ] **Step 12: 创建 `apps/mes-new/src/main.tsx`**

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- [ ] **Step 13: 修改根 `mes/frontend/package.json`,新增 mes-new 脚本(保留 mes1 现有脚本)**

将 `scripts` 改为:

```json
  "scripts": {
    "dev": "pnpm --filter mes1 dev",
    "build": "pnpm --filter mes1 build",
    "lint": "pnpm --filter mes1 lint",
    "preview": "pnpm --filter mes1 preview",
    "check-types": "pnpm -r check-types",
    "dev:new": "pnpm --filter mes-new dev",
    "build:new": "pnpm --filter mes-new build",
    "lint:new": "pnpm --filter mes-new lint",
    "test:new": "pnpm --filter mes-new test"
  },
```

- [ ] **Step 14: 安装依赖并启动验证**

Run:
```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack/mes/frontend && pnpm install
```
Expected: 安装完成,`apps/mes-new` 通过 workspace 链接到 `@workspace/ui`/`@workspace/utils`/`@workspace/typescript-config`,无 ERR。

Run:
```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack/mes/frontend && pnpm --filter mes-new exec tsc --noEmit
```
Expected: 无类型错误(占位 App)。

Run(后台起 dev,curl 验证,再停):
```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack/mes/frontend && pnpm --filter mes-new dev &
sleep 4 && curl -s -o /dev/null -w "%{http_code}\n" http://localhost:4100/ ; kill %1
```
Expected: `200`,页面含 root 容器。

- [ ] **Step 15: Commit**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack
git add mes/frontend/apps/mes-new mes/frontend/package.json mes/frontend/pnpm-lock.yaml
git commit -m "🎉 chore(mes-new): 初始化前端脚手架(Vite+TS+Tailwind v4 接入工作区包)"
```

---

## Task 2: Vitest 测试框架

**Files:**
- Create: `apps/mes-new/vitest.config.ts`、`apps/mes-new/src/__smoke__/smoke.test.ts`

- [ ] **Step 1: 创建 `apps/mes-new/vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.ts'],
  },
})
```

- [ ] **Step 2: 写冒烟测试 `apps/mes-new/src/__smoke__/smoke.test.ts`**

```typescript
import { describe, it, expect } from 'vitest'

describe('vitest 冒烟', () => {
  it('运行正常', () => {
    expect(1 + 1).toBe(2)
  })
})
```

- [ ] **Step 3: 运行验证**

Run:
```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack/mes/frontend && pnpm --filter mes-new test
```
Expected: `1 passed`。

- [ ] **Step 4: Commit**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack
git add mes/frontend/apps/mes-new
git commit -m "🔧 chore(mes-new): 接入 Vitest 测试框架"
```

---

## Task 3: 双主题 token(D=Slate 浅色 / B=Console 暗色)

**Files:**
- Modify: `packages/ui/src/styles/globals.css`(只改 `:root` 与 `.dark` 两个块的 token 值,`.custom`/`@theme inline`/`@layer base`/`@layer utilities` 保持不变)

> 说明:Tailwind v4 + color-mix 对 hex 值同样支持 `/alpha`(如 `bg-primary/90`),故直接用与设计稿一致的 hex,避免 oklch 手工换算误差。`mes1` 不引用 `@workspace/ui`,本改动只影响 mes-new。

- [ ] **Step 1: 替换 `:root` 块为 D · Slate 浅色**

将 `globals.css` 中现有的 `:root { ... }` 整块替换为:

```css
:root {
  --background: #eef1f5;
  --foreground: #0f172a;
  --card: #ffffff;
  --card-foreground: #0f172a;
  --popover: #ffffff;
  --popover-foreground: #0f172a;
  --primary: #2563eb;
  --primary-foreground: #ffffff;
  --secondary: #f1f5f9;
  --secondary-foreground: #0f172a;
  --muted: #f1f5f9;
  --muted-foreground: #64748b;
  --accent: #eff6ff;
  --accent-foreground: #1e293b;
  --destructive: #dc2626;
  --destructive-foreground: #ffffff;
  --border: #d8dee7;
  --input: #d8dee7;
  --ring: #2563eb;
  --chart-1: #2563eb;
  --chart-2: #0ea5e9;
  --chart-3: #14b8a6;
  --chart-4: #f59e0b;
  --chart-5: #8b5cf6;
  --radius: 0.5rem;
  --sidebar: #0f172a;
  --sidebar-foreground: #cbd5e1;
  --sidebar-primary: #2563eb;
  --sidebar-primary-foreground: #ffffff;
  --sidebar-accent: #1e293b;
  --sidebar-accent-foreground: #60a5fa;
  --sidebar-border: #1e293b;
  --sidebar-ring: #2563eb;
}
```

- [ ] **Step 2: 替换 `.dark` 块为 B · Console 暗色**

将 `globals.css` 中现有的 `.dark { ... }` 整块替换为:

```css
.dark {
  --background: #0c0e13;
  --foreground: #e6e9ef;
  --card: #14171e;
  --card-foreground: #e6e9ef;
  --popover: #14171e;
  --popover-foreground: #e6e9ef;
  --primary: #22d3ee;
  --primary-foreground: #04141a;
  --secondary: #1b1f27;
  --secondary-foreground: #e6e9ef;
  --muted: #1b1f27;
  --muted-foreground: #7a828f;
  --accent: #11313a;
  --accent-foreground: #22d3ee;
  --destructive: #ef4444;
  --destructive-foreground: #ffffff;
  --border: #242a35;
  --input: #242a35;
  --ring: #22d3ee;
  --chart-1: #22d3ee;
  --chart-2: #34d399;
  --chart-3: #60a5fa;
  --chart-4: #fbbf24;
  --chart-5: #c084fc;
  --sidebar: #090b0f;
  --sidebar-foreground: #aeb6c2;
  --sidebar-primary: #22d3ee;
  --sidebar-primary-foreground: #04141a;
  --sidebar-accent: #11313a;
  --sidebar-accent-foreground: #22d3ee;
  --sidebar-border: #1c212b;
  --sidebar-ring: #22d3ee;
}
```

- [ ] **Step 3: 验证 mes-new 构建能消费新 token**

Run:
```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack/mes/frontend && pnpm --filter mes-new build
```
Expected: 构建成功,产物在 `apps/mes-new/dist/`(无 outDir 覆盖后端 static)。

> 主题切换的运行时验证放在 Task 13(顶栏接入 ThemeSwitch)后整体核验。

- [ ] **Step 4: Commit**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack
git add mes/frontend/packages/ui/src/styles/globals.css
git commit -m "💄 feat(ui): globals.css 双主题 token(:root=D Slate / .dark=B Console)"
```

---

## Task 4: 类型定义

**Files:**
- Create: `apps/mes-new/src/types/api.ts`、`user.ts`、`menu.ts`

- [ ] **Step 1: `src/types/api.ts`**

```typescript
/** 后端统一响应包 */
export interface ApiResult<T> {
  code: number
  data: T
  msg: string
}

/** MyBatis-Plus 分页响应 */
export interface PageResult<T> {
  records: T[]
  total: number
  size: number
  current: number
  pages: number
}

/** 分页请求参数(current 为 1 基) */
export interface PageParams {
  current: number
  size: number
  orderBy?: string
}
```

- [ ] **Step 2: `src/types/user.ts`**

```typescript
export interface SysUser {
  id: string
  username: string
  name: string
  password?: string
  deleted: string // 0=正常 1=删除 2=禁用
  createTime?: string
  createUsername?: string
  updateTime?: string
  updateUsername?: string
}

export interface SysUserDTO extends SysUser {
  sysRoleIds?: string[]
}
```

- [ ] **Step 3: `src/types/menu.ts`**

```typescript
export interface TreeVO<T> {
  id: string
  name: string
  checked?: boolean
  type?: number
  icon?: string
  url?: string
  pid?: string
  permission?: string
  target?: string
  code?: string
  haveParent?: boolean
  haveChild?: boolean
  children?: TreeVO<T>[]
}

export interface SysMenu {
  id: string
  code: string
  name: string
  url: string
  parentId: string
  grade: number
  sortNum: number
  type: number // 0=目录 1=菜单 2=按钮
  permission: string
  icon: string
  descr: string
}

export interface MenuInfo {
  homeInfo: { name: string; icon: string; url: string }
  logoInfo: { name: string; image: string; url: string }
  clearInfo: { clearUrl: string }
  menuInfo: Record<string, TreeVO<SysMenu>>
}
```

- [ ] **Step 4: Commit**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack
git add mes/frontend/apps/mes-new/src/types
git commit -m "🏷️ feat(mes-new): 补充 api/user/menu 类型定义"
```

---

## Task 5: HTTP 层 — 表单编码与 Result 纯逻辑(TDD)

**Files:**
- Create: `src/http/formBody.ts`、`src/http/result.ts`
- Test: `src/http/__tests__/formBody.test.ts`、`src/http/__tests__/result.test.ts`

- [ ] **Step 1: 写失败测试 `src/http/__tests__/formBody.test.ts`**

```typescript
import { describe, it, expect } from 'vitest'
import { buildFormBody, shouldFormEncode } from '@/http/formBody'

describe('buildFormBody', () => {
  it('将普通对象转为 URLSearchParams', () => {
    const p = buildFormBody({ current: 1, size: 10, nameLike: '张' })
    expect(p.get('current')).toBe('1')
    expect(p.get('size')).toBe('10')
    expect(p.get('nameLike')).toBe('张')
  })

  it('跳过 undefined / null', () => {
    const p = buildFormBody({ a: 1, b: undefined, c: null })
    expect(p.has('b')).toBe(false)
    expect(p.has('c')).toBe(false)
    expect(p.get('a')).toBe('1')
  })

  it('数组用重复键展开', () => {
    const p = buildFormBody({ sysRoleIds: ['r1', 'r2'] })
    expect(p.getAll('sysRoleIds')).toEqual(['r1', 'r2'])
  })
})

describe('shouldFormEncode', () => {
  it('普通对象且非 json 头 → true', () => {
    expect(shouldFormEncode({ a: 1 }, '')).toBe(true)
  })
  it('显式 application/json → false', () => {
    expect(shouldFormEncode({ a: 1 }, 'application/json')).toBe(false)
  })
  it('FormData / URLSearchParams / null → false', () => {
    expect(shouldFormEncode(new FormData(), '')).toBe(false)
    expect(shouldFormEncode(new URLSearchParams(), '')).toBe(false)
    expect(shouldFormEncode(null, '')).toBe(false)
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack/mes/frontend && pnpm --filter mes-new test`
Expected: FAIL(`Cannot find module '@/http/formBody'`)。

- [ ] **Step 3: 实现 `src/http/formBody.ts`**

```typescript
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
```

- [ ] **Step 4: 写失败测试 `src/http/__tests__/result.test.ts`**

```typescript
import { describe, it, expect } from 'vitest'
import { isResult, BusinessError } from '@/http/result'

describe('isResult', () => {
  it('识别 Result 形状', () => {
    expect(isResult({ code: 0, data: 1, msg: 'ok' })).toBe(true)
  })
  it('非 Result 返回 false', () => {
    expect(isResult({ records: [] })).toBe(false)
    expect(isResult(null)).toBe(false)
    expect(isResult('text')).toBe(false)
  })
})

describe('BusinessError', () => {
  it('携带 code 与 message', () => {
    const e = new BusinessError(500, '出错了')
    expect(e.code).toBe(500)
    expect(e.message).toBe('出错了')
    expect(e).toBeInstanceOf(Error)
  })
})
```

- [ ] **Step 5: 运行确认失败**

Run: `pnpm --filter mes-new test`
Expected: FAIL(`Cannot find module '@/http/result'`)。

- [ ] **Step 6: 实现 `src/http/result.ts`**

```typescript
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
```

- [ ] **Step 7: 运行确认全部通过**

Run: `pnpm --filter mes-new test`
Expected: PASS(formBody + result + smoke 全绿)。

- [ ] **Step 8: Commit**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack
git add mes/frontend/apps/mes-new/src/http
git commit -m "✅ feat(mes-new): 表单编码与 Result 纯逻辑 + 单测"
```

---

## Task 6: HTTP 层 — queryCache 失效总线(TDD)

**Files:**
- Create: `src/http/queryCache.ts`
- Test: `src/http/__tests__/queryCache.test.ts`

- [ ] **Step 1: 写失败测试 `src/http/__tests__/queryCache.test.ts`**

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import {
  serializeKey,
  setCache,
  getCache,
  subscribeRefetch,
  invalidate,
  clearAll,
} from '@/http/queryCache'

beforeEach(() => clearAll())

describe('serializeKey', () => {
  it('稳定序列化', () => {
    expect(serializeKey(['sys', 'user', { current: 1 }])).toBe(
      JSON.stringify(['sys', 'user', { current: 1 }]),
    )
  })
})

describe('data cache', () => {
  it('存取数据', () => {
    setCache('k', { a: 1 })
    expect(getCache('k')).toEqual({ a: 1 })
  })
})

describe('invalidate(prefix) 触发匹配前缀的 refetcher', () => {
  it('只调用前缀匹配的订阅者', () => {
    const calls: string[] = []
    subscribeRefetch('["sys","user",1]', () => calls.push('user'))
    subscribeRefetch('["sys","role",1]', () => calls.push('role'))
    invalidate('["sys","user"')
    expect(calls).toEqual(['user'])
  })

  it('取消订阅后不再触发', () => {
    const calls: string[] = []
    const unsub = subscribeRefetch('["k"]', () => calls.push('k'))
    unsub()
    invalidate('["k"')
    expect(calls).toEqual([])
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `pnpm --filter mes-new test`
Expected: FAIL(`Cannot find module '@/http/queryCache'`)。

- [ ] **Step 3: 实现 `src/http/queryCache.ts`**

```typescript
type Refetcher = () => void

const refetchers = new Map<string, Set<Refetcher>>()
const dataCache = new Map<string, unknown>()

/** 将 key 数组稳定序列化为字符串 */
export function serializeKey(key: unknown[]): string {
  return JSON.stringify(key)
}

export function setCache(key: string, data: unknown): void {
  dataCache.set(key, data)
}

export function getCache<T>(key: string): T | undefined {
  return dataCache.get(key) as T | undefined
}

/** 订阅某 key 的刷新;返回取消订阅函数 */
export function subscribeRefetch(key: string, fn: Refetcher): () => void {
  let set = refetchers.get(key)
  if (!set) {
    set = new Set()
    refetchers.set(key, set)
  }
  set.add(fn)
  return () => {
    set!.delete(fn)
    if (set!.size === 0) refetchers.delete(key)
  }
}

/** 使所有「序列化 key 以 prefix 开头」的查询重新拉取 */
export function invalidate(prefix: string): void {
  for (const [key, set] of refetchers) {
    if (key.startsWith(prefix)) set.forEach((fn) => fn())
  }
}

/** 仅测试用:清空全部状态 */
export function clearAll(): void {
  refetchers.clear()
  dataCache.clear()
}
```

- [ ] **Step 4: 运行确认通过**

Run: `pnpm --filter mes-new test`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack
git add mes/frontend/apps/mes-new/src/http
git commit -m "✅ feat(mes-new): queryCache 失效总线 + 单测"
```

---

## Task 7: HTTP 层 — 客户端单例、拦截器、rxjs hooks

> 设计说明:Zustand store(login/logout)在 React 组件树之外调用网络,无法用 `useHttp()`。故 mes-new 用 `@ngify/http` 直接构造一个**单例 client**(与 `@workspace/utils` 的 `HttpContextProvider` 内部 `new HttpClient(withInterceptors(...))` 同源),store 与 hooks 共享它。后续若需组件级 `useHttp()`/上传/SSE,可再叠加 `@workspace/utils` 的 `HttpContextProvider` 与 `HttpPolling`/`createHttpUpload`。

**Files:**
- Create: `src/http/interceptors.ts`、`src/http/client.ts`、`src/http/hooks.ts`

- [ ] **Step 1: `src/http/interceptors.ts`**

```typescript
import {
  HttpResponse,
  HttpErrorResponse,
  type HttpInterceptorFn,
} from '@ngify/http'
import { map, catchError, throwError } from 'rxjs'
import { toast } from '@workspace/ui'
import { buildFormBody, shouldFormEncode } from './formBody'
import { isResult, BusinessError } from './result'

/** 标记 AJAX,使后端在错误时返回 JSON 而非重定向 HTML */
export const ajaxHeaderInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req.clone({ headers: req.headers.set('X-Requested-With', 'XMLHttpRequest') }))
}

/** POST/PUT 普通对象体 → application/x-www-form-urlencoded(显式 json 头则跳过) */
export const formEncodingInterceptor: HttpInterceptorFn = (req, next) => {
  const contentType = req.headers.get('Content-Type') || ''
  if (shouldFormEncode(req.body, contentType)) {
    return next(req.clone({ body: buildFormBody(req.body as Record<string, unknown>) }))
  }
  return next(req)
}

/** 解包 Result:code===0 → data;否则 toast 报错并抛 BusinessError;HTTP 401 → 跳登录 */
export const resultUnwrapInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    map((event) => {
      if (event instanceof HttpResponse) {
        const body = event.body
        if (isResult(body)) {
          if (body.code !== 0) {
            toast.error(body.msg || '请求失败')
            throw new BusinessError(body.code, body.msg)
          }
          return event.clone({ body: body.data })
        }
      }
      return event
    }),
    catchError((err) => {
      if (err instanceof HttpErrorResponse && err.status === 401) {
        if (!location.pathname.startsWith('/login')) {
          location.href = '/login'
        }
      } else if (err instanceof HttpErrorResponse) {
        toast.error(err.message || '网络请求失败')
      }
      return throwError(() => err)
    }),
  )
}
```

- [ ] **Step 2: `src/http/client.ts`**

```typescript
import { HttpClient, withInterceptors, type HttpInterceptorFn } from '@ngify/http'
import {
  ajaxHeaderInterceptor,
  formEncodingInterceptor,
  resultUnwrapInterceptor,
} from './interceptors'

/** API 基址:开发走 Vite 代理 /api;生产由 VITE_API_BASE 注入(前后端分离) */
export const API_BASE = import.meta.env.VITE_API_BASE ?? '/api'

/** 为相对 URL 自动补 API_BASE 前缀 */
const apiBaseInterceptor: HttpInterceptorFn = (req, next) => {
  if (/^https?:\/\//.test(req.url)) return next(req)
  return next(req.clone({ url: API_BASE + req.url }))
}

/** 全局单例 HTTP 客户端(store 与 hooks 共享) */
export const http = new HttpClient(
  withInterceptors([
    apiBaseInterceptor,
    ajaxHeaderInterceptor,
    formEncodingInterceptor,
    resultUnwrapInterceptor,
  ]),
)
```

- [ ] **Step 3: `src/http/hooks.ts`**

```typescript
import { useCallback, useEffect, useRef, useState } from 'react'
import { firstValueFrom, type Observable, type Subscription } from 'rxjs'
import { serializeKey, setCache, getCache, subscribeRefetch } from './queryCache'

export interface QueryResult<T> {
  data: T | undefined
  loading: boolean
  error: unknown
  refetch: () => void
}

/** rxjs 版查询:挂载/依赖变化自动取数,支持 invalidate 触发刷新 */
export function useQuery$<T>(
  key: unknown[],
  factory: () => Observable<T>,
  options?: { enabled?: boolean },
): QueryResult<T> {
  const enabled = options?.enabled ?? true
  const serial = serializeKey(key)
  const [data, setData] = useState<T | undefined>(() => getCache<T>(serial))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const factoryRef = useRef(factory)
  factoryRef.current = factory
  const subRef = useRef<Subscription | null>(null)

  const run = useCallback(() => {
    subRef.current?.unsubscribe()
    setLoading(true)
    setError(null)
    subRef.current = factoryRef.current().subscribe({
      next: (d) => {
        setData(d)
        setCache(serial, d)
        setLoading(false)
      },
      error: (e) => {
        setError(e)
        setLoading(false)
      },
    })
  }, [serial])

  useEffect(() => {
    if (!enabled) return
    run()
    const unsub = subscribeRefetch(serial, run)
    return () => {
      unsub()
      subRef.current?.unsubscribe()
    }
  }, [serial, enabled, run])

  return { data, loading, error, refetch: run }
}

/** rxjs 版变更:mutate 返回 Promise,内部 firstValueFrom */
export function useMutation$<TArgs extends unknown[], TRes>(
  factory: (...args: TArgs) => Observable<TRes>,
) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const factoryRef = useRef(factory)
  factoryRef.current = factory

  const mutate = useCallback((...args: TArgs): Promise<TRes> => {
    setLoading(true)
    setError(null)
    return firstValueFrom(factoryRef.current(...args)).then(
      (res) => {
        setLoading(false)
        return res
      },
      (e) => {
        setError(e)
        setLoading(false)
        throw e
      },
    )
  }, [])

  return { mutate, loading, error }
}
```

- [ ] **Step 4: 类型检查**

Run: `cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack/mes/frontend && pnpm --filter mes-new exec tsc --noEmit`
Expected: 无错误。

- [ ] **Step 5: Commit**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack
git add mes/frontend/apps/mes-new/src/http
git commit -m "✨ feat(mes-new): HTTP 单例客户端 + MES 拦截器 + useQuery\$/useMutation\$"
```

---

## Task 8: API 模块(auth / menu / system/user)

**Files:**
- Create: `src/api/auth.ts`、`src/api/menu.ts`、`src/api/system/user.ts`

- [ ] **Step 1: `src/api/auth.ts`**

```typescript
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
```

- [ ] **Step 2: `src/api/menu.ts`**

```typescript
import { http } from '@/http/client'
import type { MenuInfo } from '@/types/menu'

export function getMenuTree() {
  return http.get<MenuInfo>('/admin/list/index/menu/tree')
}
```

- [ ] **Step 3: `src/api/system/user.ts`**

```typescript
import { http } from '@/http/client'
import type { PageParams, PageResult } from '@/types/api'
import type { SysUser, SysUserDTO } from '@/types/user'

export interface UserPageParams extends PageParams {
  nameLike?: string
  usernameLike?: string
}

export function userPage(params: UserPageParams) {
  return http.post<PageResult<SysUser>>('/admin/sys/user/page', params)
}

export function userGetById(id: string) {
  return http.get<SysUser>('/admin/sys/user/get-by-id', { params: { id } })
}

export function userAddOrUpdate(record: SysUserDTO) {
  return http.post<void>('/admin/sys/user/add-or-update', record)
}

export function userDelete(id: string) {
  return http.post<void>('/admin/sys/user/delete', { id })
}
```

- [ ] **Step 4: 类型检查**

Run: `pnpm --filter mes-new exec tsc --noEmit`
Expected: 无错误。

- [ ] **Step 5: Commit**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack
git add mes/frontend/apps/mes-new/src/api
git commit -m "✨ feat(mes-new): auth/menu/user API 模块(rxjs)"
```

---

## Task 9: 工具 — urlMap 与 iconMap(TDD)

**Files:**
- Create: `src/utils/urlMap.ts`、`src/utils/iconMap.ts`
- Test: `src/utils/__tests__/urlMap.test.ts`、`src/utils/__tests__/iconMap.test.ts`

- [ ] **Step 1: 写失败测试 `src/utils/__tests__/urlMap.test.ts`**

```typescript
import { describe, it, expect } from 'vitest'
import { toReactRoute } from '@/utils/urlMap'

describe('toReactRoute', () => {
  it('映射已知后端 url 到 SPA 路由', () => {
    expect(toReactRoute('/admin/sys/user/list-ui')).toBe('/system/user')
    expect(toReactRoute('/admin/welcome-ui')).toBe('/welcome')
  })
  it('未知 url 原样返回', () => {
    expect(toReactRoute('/foo/bar')).toBe('/foo/bar')
  })
  it('不可导航 url 返回 undefined', () => {
    expect(toReactRoute('#')).toBeUndefined()
    expect(toReactRoute(undefined)).toBeUndefined()
    expect(toReactRoute('javascript:void(0)')).toBeUndefined()
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `pnpm --filter mes-new test`
Expected: FAIL(`Cannot find module '@/utils/urlMap'`)。

- [ ] **Step 3: 实现 `src/utils/urlMap.ts`**

```typescript
/** 旧 FreeMarker 后端 URL → 新 React Router 路由 */
const URL_MAP: Record<string, string> = {
  '/admin/welcome-ui': '/welcome',
  '/admin/sys/user/list-ui': '/system/user',
  '/admin/sys/role/list-ui': '/system/role',
  '/admin/sys/menu/list-ui': '/system/menu',
  '/admin/sys/dict/list-ui': '/system/dict',
  '/admin/sys/department/list-ui': '/system/department',
  '/admin/sys/team/list-ui': '/system/team',
  '/basedata/materile/list-ui': '/basedata/materile',
  '/basedata/manager/list-ui': '/basedata/manager',
  '/basedata/manager/item/list-ui': '/basedata/manager-item',
  '/basedata/device-group/list-ui': '/basedata/device-group',
  '/basedata/process-unit/list-ui': '/basedata/process-unit',
  '/basedata/warehouse/list-ui': '/basedata/warehouse',
  '/basedata/component/list-ui': '/basedata/component',
  '/technology/bom/list-ui': '/technology/bom',
  '/basedata/flow/list-ui': '/technology/flow',
  '/basedata/flow/process/list-ui': '/technology/flowprocess',
  '/order/release/list-ui': '/order/production',
  '/digitization/plan/plan-ui': '/digitization/plan',
  '/digital/simulation/list-ui': '/digitization/simulation',
}

/** 转换后端 url 为 SPA 路由;不可导航(#、空、javascript:)返回 undefined */
export function toReactRoute(oldUrl: string | undefined): string | undefined {
  if (!oldUrl || oldUrl === '#' || oldUrl.startsWith('javascript:')) return undefined
  return URL_MAP[oldUrl] || oldUrl
}
```

- [ ] **Step 4: 写失败测试 `src/utils/__tests__/iconMap.test.ts`**

```typescript
import { describe, it, expect } from 'vitest'
import { User, LayoutGrid } from 'lucide-react'
import { getIcon } from '@/utils/iconMap'

describe('getIcon', () => {
  it('已知 key 返回对应图标', () => {
    expect(getIcon('user')).toBe(User)
  })
  it('未知 key 返回兜底图标', () => {
    expect(getIcon('not-exist')).toBe(LayoutGrid)
  })
})
```

- [ ] **Step 5: 运行确认失败**

Run: `pnpm --filter mes-new test`
Expected: FAIL(`Cannot find module '@/utils/iconMap'`)。

- [ ] **Step 6: 实现 `src/utils/iconMap.ts`**

```typescript
import type { LucideIcon } from 'lucide-react'
import {
  Home,
  Settings,
  User,
  Users,
  Menu,
  Building2,
  Database,
  Wrench,
  CalendarClock,
  Flag,
  Store,
  FlaskConical,
  GitBranch,
  FileText,
  Network,
  ScanLine,
  PieChart,
  LayoutDashboard,
  Server,
  SlidersHorizontal,
  LayoutGrid,
  Codepen,
  IdCard,
  Workflow,
  Boxes,
  Landmark,
  Hammer,
  Blocks,
  Waypoints,
  Split,
  Pencil,
  Search,
} from 'lucide-react'

/** 后端 sp_sys_menu.icon 语义 key → lucide 图标 */
const iconMap: Record<string, LucideIcon> = {
  home: Home,
  setting: Settings,
  user: User,
  team: Users,
  menu: Menu,
  apartment: Building2,
  database: Database,
  tool: Wrench,
  schedule: CalendarClock,
  flag: Flag,
  shop: Store,
  experiment: FlaskConical,
  branches: GitBranch,
  'file-text': FileText,
  cluster: Network,
  scan: ScanLine,
  'pie-chart': PieChart,
  dashboard: LayoutDashboard,
  'cloud-server': Server,
  control: SlidersHorizontal,
  appstore: LayoutGrid,
  codepen: Codepen,
  idcard: IdCard,
  'deployment-unit': Workflow,
  gold: Boxes,
  bank: Landmark,
  build: Hammer,
  block: Blocks,
  'node-index': Waypoints,
  partition: Split,
  edit: Pencil,
  search: Search,
}

/** 取图标组件,缺失时兜底 LayoutGrid */
export function getIcon(iconKey: string | undefined): LucideIcon {
  if (!iconKey) return LayoutGrid
  return iconMap[iconKey] ?? LayoutGrid
}
```

- [ ] **Step 7: 运行确认通过**

Run: `pnpm --filter mes-new test`
Expected: PASS。

- [ ] **Step 8: Commit**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack
git add mes/frontend/apps/mes-new/src/utils
git commit -m "✅ feat(mes-new): urlMap + iconMap(lucide)+ 单测"
```

---

## Task 10: Zustand Stores(auth / menu / app)

**Files:**
- Create: `src/stores/permissions.ts`、`src/stores/authStore.ts`、`src/stores/menuStore.ts`、`src/stores/appStore.ts`
- Test: `src/stores/__tests__/permissions.test.ts`

- [ ] **Step 1: 写失败测试 `src/stores/__tests__/permissions.test.ts`**

```typescript
import { describe, it, expect } from 'vitest'
import { collectPermissions } from '@/stores/permissions'
import type { TreeVO, SysMenu } from '@/types/menu'

describe('collectPermissions', () => {
  it('递归收集所有非空 permission', () => {
    const tree: Record<string, TreeVO<SysMenu>> = {
      '1': {
        id: '1',
        name: '系统',
        permission: '',
        children: [
          { id: '2', name: '用户', permission: 'user:list', children: [
            { id: '3', name: '新增', permission: 'user:add' },
          ] },
          { id: '4', name: '角色', permission: 'role:list' },
        ],
      },
    }
    const perms = collectPermissions(tree)
    expect(perms.has('user:list')).toBe(true)
    expect(perms.has('user:add')).toBe(true)
    expect(perms.has('role:list')).toBe(true)
    expect(perms.size).toBe(3)
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `pnpm --filter mes-new test`
Expected: FAIL(`Cannot find module '@/stores/permissions'`)。

- [ ] **Step 3: 实现 `src/stores/permissions.ts`**

```typescript
import type { TreeVO, SysMenu } from '@/types/menu'

/** 递归遍历菜单树,收集所有非空 permission */
export function collectPermissions(
  tree: Record<string, TreeVO<SysMenu>>,
): Set<string> {
  const perms = new Set<string>()
  const walk = (node: TreeVO<SysMenu>) => {
    if (node.permission) perms.add(node.permission)
    node.children?.forEach(walk)
  }
  for (const key in tree) walk(tree[key])
  return perms
}
```

- [ ] **Step 4: 运行确认通过**

Run: `pnpm --filter mes-new test`
Expected: PASS。

- [ ] **Step 5: 实现 `src/stores/authStore.ts`**

```typescript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { firstValueFrom } from 'rxjs'
import type { SysUser } from '@/types/user'
import * as authApi from '@/api/auth'

interface AuthState {
  user: SysUser | null
  isLoggedIn: boolean
  permissions: Set<string>
  login: (username: string, password: string, captcha: string, rememberMe?: boolean) => Promise<void>
  logout: () => Promise<void>
  fetchUserInfo: () => Promise<void>
  setPermissions: (perms: Set<string>) => void
  hasPermission: (perm: string) => boolean
  reset: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isLoggedIn: false,
      permissions: new Set<string>(),

      login: async (username, password, captcha, rememberMe = false) => {
        await firstValueFrom(authApi.login(username, password, captcha, rememberMe))
        await get().fetchUserInfo()
      },

      logout: async () => {
        try {
          await firstValueFrom(authApi.logout())
        } finally {
          get().reset()
        }
      },

      fetchUserInfo: async () => {
        const user = await firstValueFrom(authApi.userInfo())
        set({ user, isLoggedIn: true })
      },

      setPermissions: (permissions) => set({ permissions }),
      hasPermission: (perm) => get().permissions.has(perm),
      reset: () => set({ user: null, isLoggedIn: false, permissions: new Set<string>() }),
    }),
    {
      name: 'mes-new-auth',
      // permissions 是 Set,不持久化;登录态保留后由 menuStore.fetchMenuTree 重建权限
      partialize: (s) => ({ user: s.user, isLoggedIn: s.isLoggedIn }),
    },
  ),
)
```

- [ ] **Step 6: 实现 `src/stores/menuStore.ts`**

```typescript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { MenuInfo, TreeVO, SysMenu } from '@/types/menu'
import * as menuApi from '@/api/menu'
import { collectPermissions } from './permissions'
import { useAuthStore } from './authStore'

interface MenuState {
  menuInfo: Record<string, TreeVO<SysMenu>> | null
  collapsed: boolean
  loaded: boolean
  fetchMenuTree: () => Promise<void>
  toggleCollapsed: () => void
}

export const useMenuStore = create<MenuState>()(
  persist(
    (set) => ({
      menuInfo: null,
      collapsed: false,
      loaded: false,

      fetchMenuTree: async () => {
        const { firstValueFrom } = await import('rxjs')
        const result = await firstValueFrom(menuApi.getMenuTree())
        set({ menuInfo: result.menuInfo, loaded: true })
        useAuthStore.getState().setPermissions(collectPermissions(result.menuInfo))
      },

      toggleCollapsed: () => set((s) => ({ collapsed: !s.collapsed })),
    }),
    {
      name: 'mes-new-menu',
      partialize: (s) => ({ collapsed: s.collapsed }),
    },
  ),
)
```

- [ ] **Step 7: 实现 `src/stores/appStore.ts`**

```typescript
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface TabItem {
  key: string // = path
  title: string
  path: string
  icon?: string
  closable: boolean
}

interface AppState {
  tabs: TabItem[]
  activeKey: string
  addTab: (tab: TabItem) => void
  removeTab: (key: string) => void
  setActive: (key: string) => void
  closeOthers: (key: string) => void
  closeAll: () => void
}

const HOME_TAB: TabItem = { key: '/welcome', title: '工作台', path: '/welcome', closable: false }
const MAX_TABS = 20

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      tabs: [HOME_TAB],
      activeKey: HOME_TAB.key,

      addTab: (tab) => {
        const { tabs, activeKey } = get()
        if (tabs.find((t) => t.key === tab.key)) {
          if (activeKey !== tab.key) set({ activeKey: tab.key })
          return
        }
        let next = [...tabs, tab]
        if (next.length > MAX_TABS) {
          const idx = next.findIndex((t) => t.key !== HOME_TAB.key)
          if (idx !== -1) next = [...next.slice(0, idx), ...next.slice(idx + 1)]
        }
        set({ tabs: next, activeKey: tab.key })
      },

      removeTab: (key) => {
        if (key === HOME_TAB.key) return
        const { tabs, activeKey } = get()
        const index = tabs.findIndex((t) => t.key === key)
        if (index === -1) return
        const next = tabs.filter((t) => t.key !== key)
        let newActive = activeKey
        if (activeKey === key) newActive = next[Math.min(index, next.length - 1)].key
        set({ tabs: next, activeKey: newActive })
      },

      setActive: (key) => set({ activeKey: key }),
      closeOthers: (key) =>
        set((s) => ({
          tabs: s.tabs.filter((t) => t.key === HOME_TAB.key || t.key === key),
          activeKey: key,
        })),
      closeAll: () => set({ tabs: [HOME_TAB], activeKey: HOME_TAB.key }),
    }),
    {
      name: 'mes-new-app',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (s) => ({ tabs: s.tabs, activeKey: s.activeKey }),
    },
  ),
)
```

- [ ] **Step 8: 类型检查 + 测试**

Run: `pnpm --filter mes-new exec tsc --noEmit && pnpm --filter mes-new test`
Expected: tsc 无错误;测试 PASS。

- [ ] **Step 9: Commit**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack
git add mes/frontend/apps/mes-new/src/stores
git commit -m "✨ feat(mes-new): auth/menu/app Zustand stores + 权限收集单测"
```

---

## Task 11: 鉴权守卫与 hooks

**Files:**
- Create: `src/hooks/usePermission.ts`、`src/components/PrivateRoute.tsx`、`src/components/PermissionGuard.tsx`

- [ ] **Step 1: `src/hooks/usePermission.ts`**

```typescript
import { useAuthStore } from '@/stores/authStore'

/** 权限判定 hook */
export function usePermission() {
  const has = useAuthStore((s) => s.hasPermission)
  return { has }
}
```

- [ ] **Step 2: `src/components/PrivateRoute.tsx`**

```tsx
import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'

/** 登录守卫:未登录跳 /login */
export default function PrivateRoute() {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn)
  if (!isLoggedIn) return <Navigate to="/login" replace />
  return <Outlet />
}
```

- [ ] **Step 3: `src/components/PermissionGuard.tsx`**

```tsx
import type { ReactNode } from 'react'
import { useAuthStore } from '@/stores/authStore'

interface PermissionGuardProps {
  perm: string
  children: ReactNode
  fallback?: ReactNode
}

/** 有权限才渲染 children */
export default function PermissionGuard({ perm, children, fallback = null }: PermissionGuardProps) {
  const hasPermission = useAuthStore((s) => s.hasPermission)
  return hasPermission(perm) ? <>{children}</> : <>{fallback}</>
}
```

- [ ] **Step 4: 类型检查**

Run: `pnpm --filter mes-new exec tsc --noEmit`
Expected: 无错误。

- [ ] **Step 5: Commit**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack
git add mes/frontend/apps/mes-new/src/hooks mes/frontend/apps/mes-new/src/components
git commit -m "✨ feat(mes-new): PrivateRoute/PermissionGuard/usePermission"
```

---

## Task 12: 登录页(react-hook-form + zod + 验证码)

**Files:**
- Create: `src/pages/login/LoginPage.tsx`

- [ ] **Step 1: `src/pages/login/LoginPage.tsx`**

```tsx
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Input,
  Label,
  Checkbox,
  toast,
} from '@workspace/ui'
import { Factory, RefreshCw } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useMenuStore } from '@/stores/menuStore'
import { captchaUrl } from '@/api/auth'

const schema = z.object({
  username: z.string().min(1, '请输入登录名'),
  password: z.string().min(1, '请输入密码'),
  captcha: z.string().min(1, '请输入验证码'),
  rememberMe: z.boolean().optional(),
})
type FormValues = z.infer<typeof schema>

export default function LoginPage() {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const fetchMenuTree = useMenuStore((s) => s.fetchMenuTree)
  const [captcha, setCaptcha] = useState(captchaUrl())
  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { username: '', password: '', captcha: '', rememberMe: false },
  })

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true)
    try {
      await login(values.username, values.password, values.captcha, values.rememberMe)
      await fetchMenuTree()
      toast.success('登录成功')
      navigate('/welcome', { replace: true })
    } catch {
      setCaptcha(captchaUrl()) // 失败刷新验证码
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm shadow-lg">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Factory className="size-6" />
          </div>
          <CardTitle className="text-xl">章鱼MES</CardTitle>
          <CardDescription>智能制造执行系统</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="username">登录名</Label>
              <Input id="username" autoComplete="username" {...register('username')} />
              {errors.username && <p className="text-xs text-destructive">{errors.username.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">密码</Label>
              <Input id="password" type="password" autoComplete="current-password" {...register('password')} />
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="captcha">验证码</Label>
              <div className="flex gap-2">
                <Input id="captcha" className="flex-1" {...register('captcha')} />
                <button
                  type="button"
                  onClick={() => setCaptcha(captchaUrl())}
                  className="relative h-9 w-24 shrink-0 overflow-hidden rounded-md border border-input"
                  title="点击刷新"
                >
                  <img src={captcha} alt="验证码" className="h-full w-full object-cover" />
                  <RefreshCw className="absolute right-1 top-1 size-3 text-muted-foreground" />
                </button>
              </div>
              {errors.captcha && <p className="text-xs text-destructive">{errors.captcha.message}</p>}
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="rememberMe"
                checked={watch('rememberMe')}
                onCheckedChange={(v) => setValue('rememberMe', v === true)}
              />
              <Label htmlFor="rememberMe" className="text-sm font-normal">记住我</Label>
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? '登录中…' : '登 录'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 2: 类型检查**

Run: `pnpm --filter mes-new exec tsc --noEmit`
Expected: 无错误(运行时验证留到 Task 17,需后端在 9090)。

- [ ] **Step 3: Commit**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack
git add mes/frontend/apps/mes-new/src/pages/login
git commit -m "✨ feat(mes-new): 登录页(rhf+zod+验证码)"
```

---

## Task 13: App 外壳(侧栏 / 顶栏 / 多标签 / 内容区)

**Files:**
- Create: `src/components/ThemeSwitch.tsx`、`src/layouts/routeMeta.ts`、`src/layouts/components/AppSidebar.tsx`、`src/layouts/components/AppHeader.tsx`、`src/layouts/components/AppTabs.tsx`、`src/layouts/AdminLayout.tsx`

- [ ] **Step 1: `src/components/ThemeSwitch.tsx`(D/B 一键切换)**

```tsx
import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { cn } from '@workspace/ui'

/** D(Slate 浅色)/ B(Console 暗色)分段切换 */
export default function ThemeSwitch() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return <div className="h-7 w-16 rounded-full border border-border" />
  const isDark = theme === 'dark'
  return (
    <div className="inline-flex items-center rounded-full border border-border p-0.5 text-xs font-semibold">
      <button
        onClick={() => setTheme('light')}
        className={cn('rounded-full px-2.5 py-1 transition', !isDark ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}
      >
        D
      </button>
      <button
        onClick={() => setTheme('dark')}
        className={cn('rounded-full px-2.5 py-1 transition', isDark ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}
      >
        B
      </button>
    </div>
  )
}
```

- [ ] **Step 2: `src/layouts/routeMeta.ts`**

```typescript
/** 已实现路由的标签元信息(周期 1 范围) */
export const ROUTE_META: Record<string, { title: string; icon?: string }> = {
  '/welcome': { title: '工作台', icon: 'home' },
  '/system/user': { title: '用户管理', icon: 'user' },
}
```

- [ ] **Step 3: `src/layouts/components/AppSidebar.tsx`**

```tsx
import { NavLink } from 'react-router-dom'
import { useMenuStore } from '@/stores/menuStore'
import { toReactRoute } from '@/utils/urlMap'
import { getIcon } from '@/utils/iconMap'
import { cn } from '@workspace/ui'
import { Factory } from 'lucide-react'
import type { TreeVO, SysMenu } from '@/types/menu'

function NavItem({ node, collapsed }: { node: TreeVO<SysMenu>; collapsed: boolean }) {
  const route = toReactRoute(node.url)
  if (!route) return null
  const Icon = getIcon(node.icon)
  return (
    <NavLink
      to={route}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition',
          'text-sidebar-foreground/85 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground',
          isActive && 'bg-sidebar-accent font-medium text-sidebar-accent-foreground',
          collapsed && 'justify-center px-0',
        )
      }
      title={node.name}
    >
      <Icon className="size-4 shrink-0" />
      {!collapsed && <span className="truncate">{node.name}</span>}
    </NavLink>
  )
}

export default function AppSidebar() {
  const menuInfo = useMenuStore((s) => s.menuInfo)
  const collapsed = useMenuStore((s) => s.collapsed)

  return (
    <aside
      className={cn(
        'flex h-screen shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all',
        collapsed ? 'w-16' : 'w-60',
      )}
    >
      <div className={cn('flex h-14 items-center gap-2 px-4 font-bold text-sidebar-primary-foreground', collapsed && 'justify-center px-0')}>
        <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Factory className="size-4" />
        </span>
        {!collapsed && <span className="text-sidebar-foreground">章鱼MES</span>}
      </div>
      <nav className="flex-1 space-y-4 overflow-y-auto px-2 py-3">
        {menuInfo &&
          Object.values(menuInfo).map((group) => {
            const children = (group.children ?? []).filter((c) => toReactRoute(c.url))
            if (children.length === 0) {
              return <NavItem key={group.id} node={group} collapsed={collapsed} />
            }
            return (
              <div key={group.id}>
                {!collapsed && (
                  <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
                    {group.name}
                  </p>
                )}
                <div className="space-y-1">
                  {children.map((child) => (
                    <NavItem key={child.id} node={child} collapsed={collapsed} />
                  ))}
                </div>
              </div>
            )
          })}
      </nav>
    </aside>
  )
}
```

- [ ] **Step 4: `src/layouts/components/AppHeader.tsx`**

```tsx
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Avatar,
  AvatarFallback,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@workspace/ui'
import { PanelLeft, Bell, Search, LogOut } from 'lucide-react'
import { useMenuStore } from '@/stores/menuStore'
import { useAuthStore } from '@/stores/authStore'
import ThemeSwitch from '@/components/ThemeSwitch'
import { ROUTE_META } from '@/layouts/routeMeta'

export default function AppHeader() {
  const toggleCollapsed = useMenuStore((s) => s.toggleCollapsed)
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()
  const location = useLocation()
  const title = ROUTE_META[location.pathname]?.title ?? ''

  const onLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-card px-4">
      <Button variant="ghost" size="icon-sm" onClick={toggleCollapsed} aria-label="折叠侧栏">
        <PanelLeft className="size-4" />
      </Button>
      <span className="text-sm text-muted-foreground">
        {title && <><span className="text-foreground font-medium">{title}</span></>}
      </span>
      <div className="flex-1" />
      <Button variant="outline" size="sm" className="hidden gap-2 text-muted-foreground md:inline-flex">
        <Search className="size-4" />
        全局搜索
      </Button>
      <ThemeSwitch />
      <Button variant="ghost" size="icon-sm" aria-label="通知">
        <Bell className="size-4" />
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 rounded-full border border-border py-0.5 pl-0.5 pr-2.5">
            <Avatar className="size-7">
              <AvatarFallback className="bg-primary text-xs text-primary-foreground">
                {(user?.name ?? 'U').slice(0, 1)}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm">{user?.name ?? '用户'}</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuLabel>{user?.name ?? '用户'}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onLogout}>
            <LogOut className="size-4" />
            退出登录
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
```

- [ ] **Step 5: `src/layouts/components/AppTabs.tsx`**

```tsx
import { useNavigate, useLocation } from 'react-router-dom'
import { X } from 'lucide-react'
import { cn } from '@workspace/ui'
import { useAppStore } from '@/stores/appStore'

export default function AppTabs() {
  const tabs = useAppStore((s) => s.tabs)
  const removeTab = useAppStore((s) => s.removeTab)
  const navigate = useNavigate()
  const location = useLocation()

  const onClose = (e: React.MouseEvent, key: string) => {
    e.stopPropagation()
    removeTab(key)
    // 关闭后跳到新的激活标签
    const next = useAppStore.getState().activeKey
    if (next !== location.pathname) navigate(next)
  }

  return (
    <div className="flex h-10 shrink-0 items-center gap-1 overflow-x-auto border-b border-border bg-background px-3">
      {tabs.map((tab) => {
        const active = tab.path === location.pathname
        return (
          <button
            key={tab.key}
            onClick={() => navigate(tab.path)}
            className={cn(
              'group flex items-center gap-2 rounded-md px-3 py-1.5 text-xs transition',
              active
                ? 'bg-card font-medium text-foreground shadow-sm ring-1 ring-border'
                : 'text-muted-foreground hover:bg-muted',
            )}
          >
            <span>{tab.title}</span>
            {tab.closable && (
              <span
                onClick={(e) => onClose(e, tab.key)}
                className="rounded p-0.5 opacity-50 hover:bg-border hover:opacity-100"
              >
                <X className="size-3" />
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 6: `src/layouts/AdminLayout.tsx`**

```tsx
import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import AppSidebar from './components/AppSidebar'
import AppHeader from './components/AppHeader'
import AppTabs from './components/AppTabs'
import { useMenuStore } from '@/stores/menuStore'
import { useAppStore } from '@/stores/appStore'
import { ROUTE_META } from './routeMeta'

export default function AdminLayout() {
  const loaded = useMenuStore((s) => s.loaded)
  const fetchMenuTree = useMenuStore((s) => s.fetchMenuTree)
  const addTab = useAppStore((s) => s.addTab)
  const location = useLocation()

  useEffect(() => {
    if (!loaded) fetchMenuTree()
  }, [loaded, fetchMenuTree])

  useEffect(() => {
    const meta = ROUTE_META[location.pathname]
    if (meta) {
      addTab({
        key: location.pathname,
        title: meta.title,
        path: location.pathname,
        icon: meta.icon,
        closable: location.pathname !== '/welcome',
      })
    }
  }, [location.pathname, addTab])

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader />
        <AppTabs />
        <main className="flex-1 overflow-auto p-4">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
```

- [ ] **Step 7: 类型检查**

Run: `pnpm --filter mes-new exec tsc --noEmit`
Expected: 无错误。

- [ ] **Step 8: Commit**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack
git add mes/frontend/apps/mes-new/src/components mes/frontend/apps/mes-new/src/layouts
git commit -m "✨ feat(mes-new): App 外壳(侧栏/顶栏/多标签/内容区)+ D/B 切换"
```

---

## Task 14: 通用 CRUD 组件(PageContainer / SearchForm / ModalForm)

**Files:**
- Create: `src/components/PageContainer.tsx`、`src/components/SearchForm.tsx`、`src/components/ModalForm.tsx`

- [ ] **Step 1: `src/components/PageContainer.tsx`**

```tsx
import type { ReactNode } from 'react'

interface PageContainerProps {
  title?: string
  description?: string
  actions?: ReactNode
  children: ReactNode
}

export default function PageContainer({ title, description, actions, children }: PageContainerProps) {
  return (
    <div className="space-y-4">
      {(title || actions) && (
        <div className="flex items-center justify-between gap-4">
          <div>
            {title && <h2 className="text-lg font-semibold tracking-tight">{title}</h2>}
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
          </div>
          {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  )
}
```

- [ ] **Step 2: `src/components/SearchForm.tsx`**

```tsx
import type { ReactNode } from 'react'
import { Button } from '@workspace/ui'

interface SearchFormProps {
  children: ReactNode
  onSearch: () => void
  onReset: () => void
}

export default function SearchForm({ children, onSearch, onReset }: SearchFormProps) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSearch()
      }}
      className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-4"
    >
      {children}
      <div className="flex gap-2">
        <Button type="submit" size="sm">搜索</Button>
        <Button type="button" size="sm" variant="outline" onClick={onReset}>重置</Button>
      </div>
    </form>
  )
}
```

- [ ] **Step 3: `src/components/ModalForm.tsx`**

```tsx
import type { ReactNode } from 'react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@workspace/ui'

interface ModalFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  onSubmit: () => void
  submitting?: boolean
  submitText?: string
  children: ReactNode
}

export default function ModalForm({
  open,
  onOpenChange,
  title,
  onSubmit,
  submitting,
  submitText = '确定',
  children,
}: ModalFormProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            onSubmit()
          }}
          className="space-y-4"
        >
          {children}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? '提交中…' : submitText}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 4: 类型检查**

Run: `pnpm --filter mes-new exec tsc --noEmit`
Expected: 无错误。

- [ ] **Step 5: Commit**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack
git add mes/frontend/apps/mes-new/src/components
git commit -m "✨ feat(mes-new): 通用 CRUD 组件 PageContainer/SearchForm/ModalForm"
```

---

## Task 15: 用户管理标杆页(列表 + 表单 + 删除)

**Files:**
- Create: `src/pages/system/user/UserForm.tsx`、`src/pages/system/user/UserList.tsx`

- [ ] **Step 1: `src/pages/system/user/UserForm.tsx`**

```tsx
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input, Label, toast } from '@workspace/ui'
import ModalForm from '@/components/ModalForm'
import { useMutation$ } from '@/http/hooks'
import { invalidate } from '@/http/queryCache'
import { userAddOrUpdate } from '@/api/system/user'
import type { SysUser, SysUserDTO } from '@/types/user'

interface UserFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  record?: SysUser | null
  onSaved: () => void
}

const makeSchema = (isEdit: boolean) =>
  z.object({
    username: z.string().min(1, '请输入登录名'),
    name: z.string().min(1, '请输入姓名'),
    password: isEdit ? z.string().optional() : z.string().min(1, '请输入初始密码'),
  })

export default function UserForm({ open, onOpenChange, record, onSaved }: UserFormProps) {
  const isEdit = !!record
  const { mutate, loading } = useMutation$((dto: SysUserDTO) => userAddOrUpdate(dto))

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<z.infer<ReturnType<typeof makeSchema>>>({
    resolver: zodResolver(makeSchema(isEdit)),
    defaultValues: { username: '', name: '', password: '' },
  })

  useEffect(() => {
    if (open) {
      reset({ username: record?.username ?? '', name: record?.name ?? '', password: '' })
    }
  }, [open, record, reset])

  const onSubmit = handleSubmit(async (values) => {
    const dto: SysUserDTO = {
      ...(record ?? { id: '', username: '', name: '', deleted: '0' }),
      username: values.username,
      name: values.name,
    }
    if (values.password) dto.password = values.password
    try {
      await mutate(dto)
      toast.success(isEdit ? '修改成功' : '新增成功')
      invalidate('["sys","user"')
      onOpenChange(false)
      onSaved()
    } catch {
      /* 拦截器已 toast */
    }
  })

  return (
    <ModalForm
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? '编辑用户' : '新增用户'}
      onSubmit={onSubmit}
      submitting={loading}
    >
      <div className="space-y-1.5">
        <Label htmlFor="f-username">登录名</Label>
        <Input id="f-username" disabled={isEdit} {...register('username')} />
        {errors.username && <p className="text-xs text-destructive">{errors.username.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="f-name">姓名</Label>
        <Input id="f-name" {...register('name')} />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="f-password">{isEdit ? '重置密码(留空不改)' : '初始密码'}</Label>
        <Input id="f-password" type="password" {...register('password')} />
        {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
      </div>
    </ModalForm>
  )
}
```

- [ ] **Step 2: `src/pages/system/user/UserList.tsx`**

```tsx
import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Badge,
  Button,
  DataTable,
  Input,
  Label,
  toast,
} from '@workspace/ui'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import PageContainer from '@/components/PageContainer'
import SearchForm from '@/components/SearchForm'
import PermissionGuard from '@/components/PermissionGuard'
import UserForm from './UserForm'
import { useQuery$, useMutation$ } from '@/http/hooks'
import { invalidate } from '@/http/queryCache'
import { userPage, userDelete, type UserPageParams } from '@/api/system/user'
import type { SysUser } from '@/types/user'

const PAGE_SIZE = 10

function statusBadge(deleted: string) {
  if (deleted === '0') return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">正常</Badge>
  if (deleted === '2') return <Badge variant="secondary">禁用</Badge>
  return <Badge variant="destructive">已删除</Badge>
}

export default function UserList() {
  const [params, setParams] = useState<UserPageParams>({ current: 1, size: PAGE_SIZE })
  const [draftName, setDraftName] = useState('')
  const [draftUsername, setDraftUsername] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<SysUser | null>(null)
  const [deleting, setDeleting] = useState<SysUser | null>(null)

  const { data, loading } = useQuery$(['sys', 'user', 'page', params], () => userPage(params))
  const { mutate: removeUser } = useMutation$((id: string) => userDelete(id))

  const onSearch = () =>
    setParams({ current: 1, size: PAGE_SIZE, nameLike: draftName || undefined, usernameLike: draftUsername || undefined })
  const onReset = () => {
    setDraftName('')
    setDraftUsername('')
    setParams({ current: 1, size: PAGE_SIZE })
  }

  const confirmDelete = async () => {
    if (!deleting) return
    try {
      await removeUser(deleting.id)
      toast.success('删除成功')
      invalidate('["sys","user"')
    } catch {
      /* 拦截器已 toast */
    } finally {
      setDeleting(null)
    }
  }

  const columns = useMemo<ColumnDef<SysUser>[]>(
    () => [
      { accessorKey: 'username', header: '登录名' },
      { accessorKey: 'name', header: '姓名' },
      { accessorKey: 'deleted', header: '状态', cell: ({ row }) => statusBadge(row.original.deleted) },
      { accessorKey: 'createTime', header: '创建时间', cell: ({ row }) => row.original.createTime ?? '—' },
      {
        id: 'actions',
        header: '操作',
        cell: ({ row }) => (
          <div className="flex gap-1">
            <PermissionGuard perm="user:update">
              <Button variant="ghost" size="icon-sm" onClick={() => { setEditing(row.original); setFormOpen(true) }}>
                <Pencil className="size-4" />
              </Button>
            </PermissionGuard>
            <PermissionGuard perm="user:delete">
              <Button variant="ghost" size="icon-sm" onClick={() => setDeleting(row.original)}>
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </PermissionGuard>
          </div>
        ),
      },
    ],
    [],
  )

  return (
    <PageContainer
      title="用户管理"
      description="管理系统登录账号与状态"
      actions={
        <PermissionGuard perm="user:add">
          <Button onClick={() => { setEditing(null); setFormOpen(true) }}>
            <Plus className="size-4" />
            新建用户
          </Button>
        </PermissionGuard>
      }
    >
      <SearchForm onSearch={onSearch} onReset={onReset}>
        <div className="space-y-1.5">
          <Label htmlFor="s-username">登录名</Label>
          <Input id="s-username" className="h-9 w-44" value={draftUsername} onChange={(e) => setDraftUsername(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="s-name">姓名</Label>
          <Input id="s-name" className="h-9 w-44" value={draftName} onChange={(e) => setDraftName(e.target.value)} />
        </div>
      </SearchForm>

      <div className="rounded-lg border border-border bg-card p-2">
        <DataTable
          columns={columns}
          data={data?.records ?? []}
          loading={loading}
          loadingRowCount={PAGE_SIZE}
          pagination={{
            mode: 'server',
            pageIndex: (data?.current ?? params.current) - 1,
            pageSize: PAGE_SIZE,
            totalPages: data?.pages ?? 1,
            totalRows: data?.total,
            onPageChange: (idx) => setParams((p) => ({ ...p, current: idx + 1 })),
          }}
        />
      </div>

      <UserForm open={formOpen} onOpenChange={setFormOpen} record={editing} onSaved={() => { /* 由 invalidate 触发刷新 */ }} />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定删除用户「{deleting?.name}」吗?此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer>
  )
}
```

- [ ] **Step 3: 类型检查**

Run: `pnpm --filter mes-new exec tsc --noEmit`
Expected: 无错误。

- [ ] **Step 4: Commit**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack
git add mes/frontend/apps/mes-new/src/pages/system
git commit -m "✨ feat(mes-new): 用户管理标杆页(列表/搜索/增改/删除)"
```

---

## Task 16: 路由、欢迎页、错误页、App 装配

**Files:**
- Create: `src/pages/welcome/WelcomePage.tsx`、`src/pages/error/NotFound.tsx`、`src/pages/error/Forbidden.tsx`、`src/router.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: `src/pages/welcome/WelcomePage.tsx`**

```tsx
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui'
import { Boxes, CheckCircle2, Clock, Factory } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'

const KPIS = [
  { label: '在产工单', value: '128', icon: Factory },
  { label: '今日完工', value: '86', icon: CheckCircle2 },
  { label: '待排产', value: '23', icon: Clock },
  { label: '在库物料', value: '1,204', icon: Boxes },
]

export default function WelcomePage() {
  const user = useAuthStore((s) => s.user)
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">你好,{user?.name ?? '用户'} 👋</h2>
        <p className="text-sm text-muted-foreground">欢迎使用章鱼MES 智能制造执行系统</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {KPIS.map((kpi) => (
          <Card key={kpi.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{kpi.label}</CardTitle>
              <kpi.icon className="size-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight">{kpi.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: `src/pages/error/NotFound.tsx`**

```tsx
import { Link } from 'react-router-dom'
import { Button } from '@workspace/ui'

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
      <p className="text-5xl font-bold text-muted-foreground">404</p>
      <p className="text-muted-foreground">页面不存在</p>
      <Button asChild><Link to="/welcome">返回工作台</Link></Button>
    </div>
  )
}
```

- [ ] **Step 3: `src/pages/error/Forbidden.tsx`**

```tsx
import { Link } from 'react-router-dom'
import { Button } from '@workspace/ui'

export default function Forbidden() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
      <p className="text-5xl font-bold text-muted-foreground">403</p>
      <p className="text-muted-foreground">没有访问权限</p>
      <Button asChild><Link to="/welcome">返回工作台</Link></Button>
    </div>
  )
}
```

- [ ] **Step 4: `src/router.tsx`**

```tsx
import { createBrowserRouter, Navigate } from 'react-router-dom'
import PrivateRoute from '@/components/PrivateRoute'
import AdminLayout from '@/layouts/AdminLayout'
import LoginPage from '@/pages/login/LoginPage'
import WelcomePage from '@/pages/welcome/WelcomePage'
import UserList from '@/pages/system/user/UserList'
import NotFound from '@/pages/error/NotFound'
import Forbidden from '@/pages/error/Forbidden'

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    path: '/',
    element: <PrivateRoute />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          { index: true, element: <Navigate to="/welcome" replace /> },
          { path: 'welcome', element: <WelcomePage /> },
          { path: 'system/user', element: <UserList /> },
          { path: '403', element: <Forbidden /> },
          { path: '*', element: <NotFound /> },
        ],
      },
    ],
  },
])
```

- [ ] **Step 5: 重写 `src/App.tsx`(替换 Task 1 的占位)**

```tsx
import { ThemeProvider } from 'next-themes'
import { RouterProvider } from 'react-router-dom'
import { Toaster } from '@workspace/ui'
import { router } from './router'

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
      <RouterProvider router={router} />
      <Toaster richColors position="top-right" />
    </ThemeProvider>
  )
}
```

- [ ] **Step 6: 类型检查 + 构建**

Run: `cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack/mes/frontend && pnpm --filter mes-new exec tsc --noEmit && pnpm --filter mes-new build`
Expected: tsc 无错误;build 成功,产物在 `apps/mes-new/dist/`。

- [ ] **Step 7: Commit**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack
git add mes/frontend/apps/mes-new/src
git commit -m "✨ feat(mes-new): 路由装配 + 欢迎页 + 错误页 + ThemeProvider"
```

---

## Task 17: 终验(类型/单测/构建/运行时)

**Files:** 无新增(全量核验)

- [ ] **Step 1: 静态全量核验**

Run:
```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack/mes/frontend
pnpm --filter mes-new exec tsc --noEmit && pnpm --filter mes-new lint && pnpm --filter mes-new test && pnpm --filter mes-new build
```
Expected:逐项通过 —— tsc 无错误;eslint 无 error;vitest 全绿(formBody/result/queryCache/urlMap/iconMap/permissions/smoke);build 成功。**贴出实际输出。**

- [ ] **Step 2: 运行时核验(需后端在 9090)**

前置:确保后端已启动 `cd mes && mvn spring-boot:run`(端口 9090)。

Run(后台起 mes-new dev):
```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack/mes/frontend && pnpm --filter mes-new dev
```
浏览器打开 http://localhost:4100,**逐项确认并记录**:
1. 未登录访问 `/welcome` → 自动跳 `/login`。
2. 登录页验证码图片正常显示,点击可刷新。
3. 用正确账号登录 → 跳 `/welcome`,顶栏显示用户名。
4. 侧栏按后端菜单树渲染(分组 + 图标),点击「用户管理」进入列表。
5. 用户列表:分页正常(翻页触发请求)、搜索/重置生效。
6. 新建用户 → 表单校验 → 提交成功 → 列表自动刷新(invalidate)。
7. 编辑用户 → 提交成功 → 刷新。
8. 删除用户 → AlertDialog 确认 → 成功 → 刷新。
9. 顶栏「D / B」一键切换:整站浅色↔暗色即时生效,组件无样式异常。
10. 多标签:打开多个页面生成标签,可关闭、可切换,工作台标签不可关。
11. 退出登录 → 回到 `/login`。

- [ ] **Step 3: 文档与收尾 Commit(如有微调)**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack
git add -A && git commit -m "✅ chore(mes-new): 周期 1 骨架终验通过"
```

---

## 自检(Spec 覆盖 / 占位扫描 / 类型一致)

- **Spec 覆盖**:技术栈✓(Task 1)、双主题 D/B✓(Task 3、ThemeSwitch Task 13)、rxjs 数据层(拦截器/queryCache/hooks)✓(Task 5-7)、API✓(Task 8)、urlMap/iconMap✓(Task 9)、三 store + 权限收集✓(Task 10)、PrivateRoute/PermissionGuard✓(Task 11)、登录+验证码✓(Task 12)、外壳(侧栏/顶栏/多标签)✓(Task 13)、CRUD 组件✓(Task 14)、用户管理标杆✓(Task 15)、路由/欢迎/错误✓(Task 16)、验收✓(Task 17)。前后端分离不配 outDir✓。魔改 shadcn 落 `@workspace/ui`✓(Task 3 改 globals.css;组件级魔改在实现期按需)。
- **占位扫描**:无 TBD/TODO;每步均给完整代码与命令。
- **类型一致**:`useQuery$/useMutation$`、`invalidate(prefix)`、`buildFormBody/shouldFormEncode`、`isResult/BusinessError`、`collectPermissions`、`getIcon/toReactRoute`、`TabItem`、`SysUser/SysUserDTO`、`PageResult/PageParams` 跨任务签名一致;`invalidate` 统一用序列化前缀 `'["sys","user"'`。
- **已知前提**:运行时验收依赖后端 9090 与正确账号;若后端菜单树未配 `user:add/update/delete` 权限,则对应按钮按 `PermissionGuard` 不显示(符合预期)。

---

## 执行交接

计划已完成并保存到 `docs/superpowers/plans/2026-06-15-mes-new-cycle1.md`。两种执行方式:

1. **Subagent-Driven(推荐)** —— 每个 Task 派一个全新 subagent 执行,任务间做两阶段 review,迭代快、互不污染上下文。
2. **Inline Execution** —— 在当前会话用 executing-plans 分批执行,带检查点 review。

选择哪种?
