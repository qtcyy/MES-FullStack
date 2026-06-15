# MES-New 前端重构设计文档

- 日期:2026-06-15
- 目标目录:`mes/frontend/apps/mes-new`
- 状态:已通过 brainstorming 评审,待进入实现计划

## 1. 背景与目标

`mes/frontend` 已是 pnpm monorepo,内含:

- `apps/mes1` —— 功能完整的旧前端(Ant Design 6 + axios + TanStack Query + Zustand + React Router 7 + ECharts + Three.js)。**功能可参考,UI 不沿用**。
- `packages/ui`(`@workspace/ui`)—— Tailwind v4 + React 19 + radix-ui 的 shadcn 设计系统,已含约 50 个组件(button/card/table/data-table/sidebar/chart/command/...)。
- `packages/utils`(`@workspace/utils`)—— http(基于 `@ngify/http`,返回 rxjs Observable)、crypto、websocket。
- `packages/typescript-config`。

**目标**:在 `apps/mes-new` 从零重构一个**精美、现代化**的前端,复用 `@workspace/ui` 与 `@workspace/utils`,完全替代 mes1 的 Ant Design,并支持**一键主题切换**。分多个开发周期交付,周期 1 采用「骨架优先」。

### 后端契约(沿用 mes1 已验证的约定)

- 统一响应包 `Result{ code, data, msg }`:`code===0` 取 `data`,否则报错。
- 绝大多数 POST 用 `application/x-www-form-urlencoded`(表单编码);**例外**两个 `@RequestBody` JSON 端点:`/basedata/manager/add-or-update`、`/basedata/flow/process/add-or-update`(设 `Content-Type: application/json`,跳过表单转换)。
- 分页:请求 `current`(页码)+ `size`(每页);响应为 MyBatis-Plus `IPage`:`{ records, total, size, current, pages }`。
- 鉴权:登录后从 `/admin/list/index/menu/tree` 拉菜单树,递归收集所有 `permission` 字符串成 Set;HTTP 401 跳登录页。
- 开发期 Vite 代理 `/api` → `localhost:9090`(后端端口 9090)。

## 2. 技术选型

| 关注点 | 选型 | 说明 |
|---|---|---|
| 框架 | React 19 + TypeScript + Vite | 与 mes1 同基线 |
| UI | `@workspace/ui`(shadcn,允许魔改) | Tailwind v4 + radix |
| 路由 | React Router v7 | 与 mes1 一致 |
| 数据层 | **rxjs 原生 hooks**(基于 `@ngify/http`) | 自写 `useQuery$`/`useMutation$`,不引入 TanStack Query |
| 状态 | Zustand | authStore / menuStore / appStore |
| 表单 | react-hook-form + `@hookform/resolvers` + zod | shadcn 惯用法;ui 包已含 zod、`field.tsx` |
| 表格 | `@workspace/ui` 的 `data-table`(TanStack Table) | 服务端分页 |
| 图标 | lucide-react(ui 包自带) | 后端 icon 字符串 → lucide 映射表 |
| 主题 | next-themes(ui 包自带) + CSS 变量 token | D/B 一键切换 |

> 不引入 Ant Design;不引入 TanStack Query(数据层走 rxjs 原生)。

## 3. 设计语言与主题系统

### 3.1 选定方向

- **默认主题 D · "Slate 专业版"(浅色)**:深色侧栏(`#0f172a`)+ 浅灰内容区(`#eef1f5`)+ 电光蓝点缀(`#2563eb`),信息密集、表头有底色,适合数据驱动后台。
- **可切换主题 B · "Console 控制台"(暗色)**:近黑底(`#0c0e13`)+ 青色霓虹点缀(`#22d3ee`),中控室质感,大屏友好。
- 预留 A(Linear 浅色)、C(暖调编辑风)结构位,后续可加。

### 3.2 实现机制(核心诉求:一键切换)

- 在 `@workspace/ui/src/styles/globals.css` 为每套主题定义**完整 token 集**,用 `data-theme` 区分:
  - `[data-theme="slate"]`(D,默认)
  - `[data-theme="console"]`(B)
- 用 `next-themes`:`<ThemeProvider attribute="data-theme" themes={['slate','console']} defaultTheme="slate" enableSystem={false}>`;持久化到 localStorage。
- 顶栏「D / B」切换控件调用 `setTheme('slate' | 'console')`。
- token 命名沿用 shadcn 体系(`--background --foreground --primary --primary-foreground --border --muted --card --popover ...`)+ MES 扩展(`--sidebar-bg --sidebar-fg --sidebar-active-bg --sidebar-active-fg --kpi-up --kpi-down`)。**所有组件只消费变量,切主题零改组件**。

### 3.3 魔改 shadcn 的位置

**改在共享包 `@workspace/ui`**(它本就是设计系统;mes1 不引用这些组件,不受影响)。按 D 的精致度调整 button/card/table/badge/input 等的圆角、阴影、间距、表头底色等。

## 4. 数据层(rxjs 原生)

`@workspace/utils` 暴露:`HttpContextProvider`、`useHttp()`(返回 `@ngify/http` 的 `HttpClient`,方法返回 Observable)、`HttpLoading`、`HttpPolling`、`createHttpUpload`、`createEventSource`。其自带的 `ErrorInterceptor.ts` 是其他项目残留(引用了本仓库不存在的路径、未在 `http/index.ts` 导出),**不使用**。

在 `apps/mes-new` 内新建:

### 4.1 `src/http/interceptors.ts`(MES 专属函数式拦截器)

- **表单编码拦截器**:POST 且非 FormData/非显式 JSON 时,将 body 转 `application/x-www-form-urlencoded`。
- **Result 解包**:响应体含 `Result{code,data,msg}` → `code===0` 放行(下游取 `data`);否则 `toast.error(msg)` 并抛错。二进制响应(blob/文件)按 content-type 跳过解包。
- **401 处理**:HTTP 401 或业务码表示未登录 → 清 authStore、跳 `/login`。
- 通过 `HttpContextProvider` 的 `fnInterceptors` 注入。

### 4.2 `src/http/queryCache.ts` + `src/http/hooks.ts`

- `queryCache`:`Map<string, BehaviorSubject<QueryState>>` + `invalidate(keyPrefix)`;支持按 key 前缀失效。
- `useQuery$(key, factory: () => Observable<T>, deps?)` → `{ data, loading, error, refetch }`;挂载与 deps 变化时自动取数,可手动 `refetch`。
- `useMutation$<TArgs, TRes>(factory)` → `{ mutate, loading, error }`;`mutate` 返回 Promise(内部 `firstValueFrom`),成功后调用方可 `queryCache.invalidate(key)` 刷新列表。
- loading 复用 `HttpLoading`;轮询场景用 `HttpPolling`;上传用 `createHttpUpload`。

### 4.3 `src/api/<module>/*.ts`

按模块组织(auth/menu/system/basedata/technology/order/inventory/digitization),每个 API 函数用 `useHttp()` 返回 `Observable<T>`,路径参照 mes1 的 `api/`,改成 rxjs 风格。

## 5. 应用架构

### 5.1 目录结构(`apps/mes-new/src`)

```
src/
├── http/                 # interceptors.ts, queryCache.ts, hooks.ts
├── api/                  # auth/menu/system/basedata/technology/order/inventory/digitization
├── stores/               # authStore.ts(user/permissions Set/login/logout/hasPermission)
│                         # menuStore.ts(菜单树/折叠/选中键)
│                         # appStore.ts(多标签 tabs / theme)
├── layouts/
│   └── AdminLayout.tsx   # 侧栏 + 顶栏 + 多标签 + 内容区(Outlet)
├── components/
│   ├── PageTable.tsx     # 基于 ui/data-table,服务端分页
│   ├── ModalForm.tsx     # Dialog + react-hook-form
│   ├── SearchForm.tsx    # 行内筛选(搜索/重置)
│   ├── PageContainer.tsx # 页头(标题+操作)+ 内容包裹
│   ├── PrivateRoute.tsx  # 未登录跳 /login
│   ├── PermissionGuard.tsx# perm 校验后渲染
│   └── ThemeToggle.tsx   # D/B 一键切换
├── pages/
│   ├── login/  welcome/  error/
│   ├── system/ basedata/ technology/ order/ inventory/ digitization/
├── hooks/                # usePagination, usePermission
├── types/                # api.ts(Result/IPage), user.ts, menu.ts, common.ts
├── utils/                # iconMap(后端 icon 字符串 → lucide)
├── App.tsx  main.tsx  router.tsx
```

### 5.2 App 外壳(已可视化确认)

- 分组**可折叠侧栏**:后端动态菜单树渲染,icon 映射 lucide。
- **顶栏**:折叠键 · 面包屑 · 全局搜索 · **D/B 主题切换** · 通知 · 用户菜单。
- **多标签页**:可关闭,`appStore` 管理,切换不丢状态。
- **内容区**:页头(标题+操作)/ 筛选栏 / 数据表+分页。

### 5.3 鉴权

- `PrivateRoute`:未登录重定向 `/login`。
- 登录后拉菜单树 → 递归收集 `permission` 成 `Set<string>` 存 authStore。
- `PermissionGuard perm="user:add"`:成员判定后渲染子节点;`usePermission()` 提供 `hasPermission(perm)`。

## 6. 开发周期划分(骨架优先)

| 周期 | 内容 |
|---|---|
| **周期 1(首期重点)** | 脚手架 + 主题系统(D/B) + 数据层(拦截器/hooks/cache) + App 外壳 + 登录/鉴权 + 用户管理 CRUD(标杆页)全链路 |
| 周期 2 | 系统管理其余(角色/菜单/字典/部门/工具) + 基础数据 + 工艺 |
| 周期 3 | 生产订单 + 库存 |
| 周期 4 | 数字化看板(recharts;3D/大屏 ECharts·Three.js 视复杂度定) + AI |

## 7. 周期 1 交付物与验收标准

### 交付物

1. 脚手架:`apps/mes-new`(Vite + TS + React Router v7),接入 `@workspace/ui`、`@workspace/utils`、`@workspace/typescript-config`;Vite 代理 `/api → localhost:9090`;根 `package.json` 增加 `mes-new` 相关脚本(不影响 mes1)。
2. 主题:`@workspace/ui/globals.css` 双主题 token(slate 默认 / console);`ThemeProvider` + `ThemeToggle`。
3. 数据层:`http/interceptors.ts`、`http/queryCache.ts`、`http/hooks.ts`。
4. 状态:`authStore`、`menuStore`、`appStore`。
5. 外壳:`AdminLayout`(侧栏/顶栏/多标签/主题切换)+ `PrivateRoute` + `PermissionGuard`。
6. 登录:`LoginPage` + 验证码图片;登录成功拉菜单树、建权限 Set。
7. 标杆页 **用户管理**:列表(`PageTable` 服务端分页)+ `SearchForm` + 新建/编辑(`ModalForm` + react-hook-form + zod)+ 删除。
8. 魔改后的 shadcn 基础组件(button/card/table/input/badge 等)落在 `@workspace/ui`。

### 验收标准(需贴出实际输出)

- `pnpm --filter mes-new dev` 起服务,浏览器可访问。
- `pnpm --filter mes-new exec tsc --noEmit` 通过。
- `pnpm --filter mes-new build` 成功。
- 运行时:登录 → 侧栏按后端菜单渲染 → 用户管理增删改查跑通 → D/B 主题一键切换生效且组件零异常。

## 8. 风险与对策

- **rxjs 原生数据层无现成缓存生态**:自写 `queryCache` 保持轻量,先满足列表失效/重取;若后续复杂度上升,再评估是否引入更完整方案。
- **魔改 `@workspace/ui` 影响范围**:mes1 不引用这些组件,改动仅作用于 mes-new;改动前确认 mes1 无依赖。
- **后端 form-encoded 与两个 JSON 端点的差异**:在拦截器层用「显式 JSON 标记」区分,API 函数对两个例外端点显式声明。
- **图标映射**:后端 icon 为字符串(原 Font Awesome),需建 `iconMap` 到 lucide;缺失图标给默认兜底。

## 9. 不在本设计范围(YAGNI)

- 不迁移 mes1 的旧 Ant Design 代码;mes1 保留作功能参考。
- 不动后端;不改 mes1。
- 周期 2~4 的具体页面在各自周期再细化设计。
