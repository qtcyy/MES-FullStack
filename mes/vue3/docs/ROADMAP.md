# 章鱼师兄 MES · Vue3 前端 — 开发计划与周期路线图

> 本文件既是 **架构设计文档**，又是 **开发周期活文档（进度追踪）**。
> 每个开发周期结束时更新「模块覆盖矩阵」中的状态标记。
> **最终目标：用 Vue3 完整实现后端全部 8 个模块的所有功能。**

- 文档版本：v1（2026-06-20 创建）
- 当前阶段：**Cycle 0 基础设施搭建（进行中）**
- 后端：Spring Boot @ `localhost:9090`（Shiro 会话鉴权 + 验证码登录）
- 功能/接口参考：React 版 `mes/frontend/apps/mes-new`（**仅参考接口契约与功能，绝不照抄其 UI**）

---

## 1. 项目目标与评分对齐

本前端是课程大作业的核心交付物。后端功能已完备，前端需在四个评分维度上达到顶档。下表把**关键设计决策**直接映射到评分细则，确保不丢分：

| 评分维度（20 分/项） | 设计决策落点 |
|---|---|
| **① 功能交互与实现** | SFC 单文件组件；通用组件（`DataTable` / `SearchForm` / `FormDialog`）与业务组件分层；props/$emit + Pinia 通信；骨架屏 + Loading；Element Plus 表单 + 正则校验 + 必填/错误反馈；`unplugin` 全量按需引入；丰富但克制的动画（`@vueuse/motion` + `auto-animate`）；关键交互 < 1s |
| **② 代码质量与工程化** | Vite 模块化目录；统一 ESLint + Prettier 风格；语义化命名 + 注释；main/develop/feature 三分支；feat/fix/docs 规范提交；规律增量提交（按模块/页面） |
| **③ 路由与状态管理** | 多级嵌套路由 + 动态路由参数；`beforeEach` 全局守卫（登录拦截 + 角色/权限校验）；Pinia 模块化 store（user / permission / app / notification）；`pinia-plugin-persistedstate` 持久化到 localStorage，刷新不丢失 |
| **④ 创新与深度优化** | 三大亮点：ECharts 数据可视化大屏、Three.js 3D 数字孪生仓库、AI 助手（SSE 流式）；Lighthouse/DevTools 性能分析；路由懒加载 + 组件缓存（keep-alive）+ 图片懒加载 + 产物分包 + 可选 CDN；首屏 < 3s |

---

## 2. 技术栈

| 分类 | 选型 | 说明 |
|---|---|---|
| 框架 | Vue 3.5 `<script setup>` + TypeScript | SFC 单文件组件 |
| 构建 | Vite | 已脚手架；配置代理/按需/分包 |
| 路由 | Vue Router 4 | 嵌套路由 + 动态参数 + 全局守卫 |
| 状态 | Pinia + `pinia-plugin-persistedstate` | 模块化 store + 持久化 |
| UI 库 | Element Plus + `@element-plus/icons-vue` | 深度魔改主题 + 动画 |
| 按需引入 | `unplugin-auto-import` + `unplugin-vue-components`（`ElementPlusResolver`） | API 与组件全自动按需 |
| 请求 | Axios | 拦截器：表单编码 / Result 解包 / 401 / Loading |
| 图表 | ECharts + `vue-echarts` | 大屏，路由级懒加载 |
| 3D | Three.js | 数字孪生仓库，路由级懒加载 |
| 工具 | `@vueuse/core`、`dayjs`、`nprogress` | 组合式工具 / 时间 / 顶部进度条 |
| 动画 | `@vueuse/motion`、`@formkit/auto-animate`、内置 `<Transition>`、`useTransition` | 丰富但克制，组件库实现 |
| 样式 | Sass + CSS 变量 | 双主题驱动 |
| 测试 | Vitest | 组合式函数 / 纯逻辑单测 |
| 规范 | ESLint + Prettier | 统一代码风格 |

---

## 3. 目录结构（Vite 模块化）

```
mes/vue3/
├── docs/                       # 本路线图等文档
├── public/
├── src/
│   ├── api/                    # 按后端模块组织的接口函数
│   │   ├── request.ts          # axios 实例 + 拦截器（表单编码/Result解包/401）
│   │   ├── auth.ts  menu.ts
│   │   ├── system/  basedata/  technology/  order/  digitization/  workflow/
│   ├── assets/styles/          # theme.scss（明/暗 CSS 变量）、element 覆盖、动画
│   ├── components/             # 通用组件（强复用、props/$emit 驱动）
│   │   ├── DataTable.vue       # 表格封装：服务端分页 + 工具栏 + Loading + 空态
│   │   ├── SearchForm.vue      # 行内查询表单（搜索/重置）
│   │   ├── FormDialog.vue      # 弹窗 + 表单（含正则校验/必填）
│   │   ├── PageContainer.vue   # 统一页容器
│   │   ├── skeletons/          # 各类骨架屏
│   │   ├── charts/             # ECharts 封装组件
│   │   └── AiAssistant.vue     # 全局 AI 助手（SSE 流式）
│   ├── composables/            # useRequest / usePagination / useTable / useTheme / usePermission
│   ├── directives/             # v-permission（按钮级权限）、v-lazy（图片懒加载）
│   ├── layouts/
│   │   ├── AdminLayout.vue      # 侧栏(菜单树)+顶栏(主题/用户/通知)+多页签+Outlet
│   │   └── ScreenLayout.vue     # 全屏深色（大屏/3D）
│   ├── router/                 # index.ts（嵌套路由）+ guards.ts（守卫）
│   ├── stores/                 # user.ts / permission.ts / app.ts / notification.ts
│   ├── types/                  # api.ts + 各模块实体类型
│   ├── utils/                  # iconMap / format / sse 等
│   ├── views/                  # 业务页面（见模块矩阵）
│   ├── App.vue   main.ts
├── vite.config.ts              # 代理 /api→9090 + 按需 + 别名 @ + 分包
└── ...
```

---

## 4. 核心机制设计

### 4.1 请求层（`api/request.ts`）
- **请求拦截**：默认把 POST 的 JSON 体转为 `application/x-www-form-urlencoded`（贴合后端绝大多数表单接口）；对少数 `@RequestBody` JSON 接口（workflow、inventory、gantt、bom-flow、process-content、manager 等）显式带 `Content-Type: application/json` 跳过转换；统一附带 `X-Requested-With: XMLHttpRequest`（让 401 返回 JSON 而非跳转 HTML）。
- **响应拦截**：解包后端 `Result{code,data,msg}` —— `code===0` 返回 `data`；否则 `ElMessage.error(msg)` 并 reject；HTTP 401 跳转 `/login`。
- **分页契约**：请求 `current` + `size`；响应 MyBatis-Plus `IPage`：`{records,total,size,current,pages}`。

### 4.2 鉴权与权限
- **登录**：验证码图 `GET /verification/code` → `POST /login`（表单：username/password/captcha/rememberMe，会话 Cookie）。
- **登录后**：`GET /admin/user/info` 取用户信息；`GET /admin/list/index/menu/tree` 取菜单树，递归收集 `permission` 字符串为 `Set`，并据 `url` 生成/匹配前端路由。
- **持久化**：user / 登录态 / 主题 / 页签 经 `pinia-plugin-persistedstate` 落 localStorage，刷新不丢；权限 Set 每次登录由菜单树重建。
- **守卫**：`router.beforeEach` —— 未登录跳 `/login`；已登录访问 `/login` 跳首页；按 `route.meta.perm` 校验权限，无权跳 `/403`；配合 NProgress 顶部进度条。
- **按钮级权限**：`v-permission="'user:add'"` 自定义指令。

> 侧边栏由 `sp_sys_menu` 驱动，**不按角色过滤**；新页面路由须匹配预置菜单 `url`，否则侧栏点不到（详见菜单种子）。

### 4.3 双主题
- 一套 CSS 变量定义明/暗两套色板；`html.dark` 切换 + Element Plus 官方暗色变量。
- `appStore.theme` 控制并持久化；后台页默认浅色，`ScreenLayout`（大屏/3D）强制深色科技风。

### 4.4 组件通信与数据流
- **通用组件**：`DataTable` / `SearchForm` / `FormDialog` 全部 props 入、$emit 出，零业务耦合、强复用。
- **跨页面/全局状态**：Pinia（user / permission / app / notification）。
- **服务端数据**：`useRequest` 组合式函数统一管理 loading / error / data + 骨架屏。

---

## 5. 三大创新亮点

1. **数据可视化大屏（ECharts）** — 对接 `GET /digitization/dashboard/overview`：KPI 指标条 + 订单/设备分布 + 趋势折线 + OEE 仪表盘 + 良率趋势；深色 `ScreenLayout`；`setInterval` 轮询营造实时感；入场/数字滚动动画。
2. **3D 数字孪生仓库（Three.js）** — 对接 `sp_warehouse` / `sp_warehouse_location`：3D 货架布局 + 库存热力着色 + 点选库位详情 + HUD 数据面板；路由级懒加载。
3. **AI 助手（SSE 流式）** — 对接 `POST /admin/ai/chat`（`text/event-stream`，DeepSeek，**已配置可用**）：全局浮窗，`fetch` + `ReadableStream` 解析 SSE，打字机式流式输出。

> 备注：后端无 WebSocket，「实时」由 SSE（AI）+ 大屏轮询 + 通知中心实现，命中「实时通知/数据可视化看板」评分要点。

---

## 6. 动画与深度优化（评分①④）

### 6.1 动画策略（丰富但克制，组件库实现）
原则：**用动画库降本增效，统一节奏，避免过度设计**。
- **基础层**：Vue 内置 `<Transition>` / `<TransitionGroup>` —— 路由切换、弹窗、列表增删的过渡底座。
- **声明式动效**：`@vueuse/motion` 的 `v-motion` —— 页面/卡片入场（淡入+上浮）、滚动揭示（`v-motion-*-visible`），预设统一、改一处即全局一致。
- **零配置列表动画**：`@formkit/auto-animate` —— 表格行、看板卡片的增删/排序自动平滑过渡，约 2KB，性价比极高。
- **数字滚动**：`@vueuse/core` 的 `useTransition` 补间 KPI 数字（大屏指标滚动），无需额外重型依赖。
- **克制守则**：① 统一 `duration`/`easing` 设计令牌（如 200/300ms + 标准缓动）；② 只对「入场 / 状态变化 / 反馈」做动画，不滥用无限循环（大屏少量呼吸点缀除外）；③ 尊重 `prefers-reduced-motion` 无障碍降级；④ 动画走 `transform`/`opacity`，避免布局重排，保证 < 1s 响应。

### 6.2 性能优化
- 路由级代码分割（动态 `import()`）；ECharts / Three.js 懒加载。
- `unplugin` API + 组件按需引入，Element Plus 充分 tree-shaking。
- `<keep-alive>` 多页签组件缓存；图片 `v-lazy` 懒加载。
- Vite `manualChunks` vendor 分包 + gzip；可选第三方库 CDN externals。
- 骨架屏 + 全局 Loading；首屏 < 3s，关键交互 < 1s。
- **Lighthouse / Chrome DevTools** 出具性能分析（记录在 `docs/PERFORMANCE.md`，Cycle 4）。

---

## 7. Git 分支与提交策略（评分②）

- **三分支**：`main`（稳定）← `develop`（集成）← `feature/*`（每模块一支）。
- 从当前 `feat/final-homework` 切出 `develop`；各模块走 `feature/<模块名>` → 合入 `develop`；收尾 PR `develop → main`。
- **提交规范**：Conventional Commits（中文）：`feat` / `fix` / `docs` / `refactor` / `style` / `perf` / `chore` / `test`。
- **节奏**：按页面/功能粒度**增量提交**，杜绝一次性批量提交。

---

## 8. 开发周期划分

> 状态图例：✅ 完成 ｜ 🚧 进行中 ｜ ☐ 待开始

### Cycle 0 — 基础设施（🚧 进行中）
脚手架依赖、Vite 配置（代理/按需/分包/别名）、请求层、类型、路由+守卫、Pinia 四 store、双主题、`AdminLayout`/`ScreenLayout`、通用组件、指令、组合式函数、登录页 + 鉴权闭环 + 菜单驱动侧栏 + 动态路由。

### Cycle 1 — 核心业务闭环 + 三大亮点（☐ 本作业主交付）
系统管理 + 物料 + 工艺（BOM/工艺路线）+ 计划（工单/派工/甘特）+ 数字化大屏 + 3D 数字孪生 + AI 助手 + 工作流（分类/表单/定义/事件，非 BPMN 设计器部分）。

### Cycle 2 — 库存 + 剩余基础数据 + 组织（☐）
入库/出库/库存查询/手工入库；设备 / 设备编组 / 加工单元 / 仓库（库位）/ 零部件 / 班组（成员）。

### Cycle 3 — 工作流设计器 + 动态主数据 + 工艺深化（☐）
BPMN 模型设计器（bpmn-js，保存/发布）；动态主数据（`sp_table_manager` + item + 通用动态数据 CRUD）；工序内容完整（设备/文档/上传）+ 工艺查询页。

### Cycle 4 — 性能 / 打磨 / 测试 / 创新增强（☐）
Lighthouse/DevTools 性能分析报告、分包与缓存调优、CDN、动画与空态打磨、Vitest 单测、实时通知中心增强。

---

## 9. 模块覆盖矩阵（全功能追踪）

> 「目标」= 最终要实现的全部功能；「周期」= 计划所属开发周期；「状态」每周期更新。

### 9.1 系统管理 system
| 功能 | 关键后端接口 | 周期 | 状态 |
|---|---|---|---|
| 登录 / 验证码 / 登出 | `/login` `/verification/code` `/logout` | C0 | ☐ |
| 当前用户 / 菜单树 | `/admin/user/info` `/admin/list/index/menu/tree` | C0 | ☐ |
| 用户管理 | `/admin/sys/user/page|get-by-id|add-or-update` | C1 | ☐ |
| 角色管理（+菜单权限树） | `/admin/sys/role/page|add-or-update|tree/{roleId}` | C1 | ☐ |
| 菜单管理（树） | `/admin/sys/menu/page|tree|add-or-update` | C1 | ☐ |
| 字典管理 | `/admin/sys/dict/page|add-or-update` | C1 | ☐ |
| 部门管理 | `/admin/sys/department/page|add-or-update` | C1 | ☐ |
| 班组管理（成员） | `/admin/sys/team/*` | C2 | ☐ |

### 9.2 基础数据 basedata
| 功能 | 关键后端接口 | 周期 | 状态 |
|---|---|---|---|
| 物料维护（+图片上传） | `/basedata/materile/page|add-or-update|upload-image|delete` | C1 | ☐ |
| 字典下拉助手 | `/basedata/dict/list/{type}` | C1 | ☐ |
| 设备 / 设备编组 | `/basedata/device/*` `/basedata/device-group/*` | C2 | ☐ |
| 加工单元 / 仓库（库位） | `/basedata/process-unit/*` `/basedata/warehouse/*` | C2 | ☐ |
| 零部件 | `/basedata/component/*` | C2 | ☐ |
| 动态主数据配置 + 维护 | `/basedata/manager/*` `/basedata/common/*` | C3 | ☐ |

### 9.3 工艺 technology
| 功能 | 关键后端接口 | 周期 | 状态 |
|---|---|---|---|
| 产品 BOM（树/版本/锁定/子项） | `/technology/product-bom/*` | C1 | ☐ |
| 工艺路线（流程+工序+关系，穿梭） | `/basedata/flow/*` `/basedata/sp-oper/*` `/basedata/flow/process/*` | C1 | ☐ |
| BOM-工艺绑定 | `/technology/bom-flow/*` | C1 | ☐ |
| 工序内容（设备/文档/上传） | `/technology/process-content/*` | C3 | ☐ |
| 工艺 BOM（旧 sp_bom） | `/technology/bom/*` | C3 | ☐ |

### 9.4 计划 order
| 功能 | 关键后端接口 | 周期 | 状态 |
|---|---|---|---|
| 工单下达（CRUD） | `/order/release/page|get-by-id|add-or-update|delete` | C1 | ☐ |
| 派工 | `/order/dispatch/*` | C1 | ☐ |
| 甘特排程（拖拽/开工完工/进度） | `/order/gantt/*` | C1 | ☐ |

### 9.5 库存 inventory
| 功能 | 关键后端接口 | 周期 | 状态 |
|---|---|---|---|
| 入库（单据/明细/记账） | `/inventory/receipt/*` | C2 | ☐ |
| 出库（FIFO 记账） | `/inventory/outbound/*` | C2 | ☐ |
| 库存查询 / 手工入库 | `/inventory/page` `/inventory/manual-inbound` | C2 | ☐ |

### 9.6 数字化 digitization（亮点①）
| 功能 | 关键后端接口 | 周期 | 状态 |
|---|---|---|---|
| 数据可视化大屏（ECharts，轮询） | `/digitization/dashboard/overview` | C1 | ☐ |
| 首页 Welcome | — | C1 | ☐ |

### 9.7 数字孪生 dst（亮点②）
| 功能 | 关键后端接口 | 周期 | 状态 |
|---|---|---|---|
| 3D 数字孪生仓库（Three.js，热力/点选） | `/basedata/warehouse/*`（库位/库存聚合） | C1 | ☐ |

### 9.8 工作流 workflow
| 功能 | 关键后端接口 | 周期 | 状态 |
|---|---|---|---|
| 流程分类 | `/workflow/category/*` | C1 | ☐ |
| 流程表单 | `/workflow/form/*` | C1 | ☐ |
| 流程定义（启停/关联表单） | `/workflow/definition/*` | C1 | ☐ |
| 流程事件规则 | `/workflow/event/*` | C1 | ☐ |
| BPMN 模型设计器（bpmn-js） | `/workflow/model/*` | C3 | ☐ |

### 9.9 全局
| 功能 | 关键后端接口 | 周期 | 状态 |
|---|---|---|---|
| AI 助手（SSE 流式，亮点③） | `/admin/ai/chat` | C1 | ☐ |
| 实时通知中心 | 大屏轮询 / 派生 | C4 | ☐ |
| 错误页 403/404/500 | — | C0 | ☐ |

---

## 10. 风险与备注
- 后端 `mvnw` 损坏：编译/启动用 JDK11 + 系统 `mvn`（`JAVA_HOME=corretto-11`，`mvn -q spring-boot:run`，端口 9090，dev profile 连 `localhost:3306/mes_data`）。
- dev 已关验证码（`mes.captcha.enabled=false`），**可脚本化登录**，凭据 `admin/123`；登录页验证码 UI 仍保留（生产 parity），dev 下放宽为可空。
- 标识符/字段名避免与 DOM 属性同名（如 `nodeName`），否则表单提交可能异常。
- 3D 页若用相关库需关闭全局 StrictMode 类隐患（Vue 无 React StrictMode，但 WebGL 上下文同样需注意单例与卸载清理）。
- 本前端为独立 Vite 工程（`mes/vue3`），dev 端口拟用 `4200`（避开 mes-new 的 `4100`），生产可独立部署或 Nginx 反代。

---

## 11. 当前进度快照（2026-06-20）
- ✅ Vite + Vue3 + TS 脚手架已就位（默认模板）。
- 🚧 Cycle 0 基础设施：规划完成，待落地。
- ☐ 其余全部模块：待开发。
- **下一步**：经你确认本路线图后 → 生成实现计划（writing-plans）→ 搭建 `develop` 分支与基础设施。
