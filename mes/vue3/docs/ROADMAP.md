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

### Cycle 0 — 基础设施（✅ 完成）
脚手架依赖、Vite 配置（代理/按需/分包/别名）、请求层、类型、路由+守卫、Pinia 四 store、双主题、`AdminLayout`/`ScreenLayout`、通用组件、指令、组合式函数、登录页 + 鉴权闭环 + 菜单驱动侧栏 + 动态路由。

### Cycle 1 — 核心业务闭环 + 三大亮点（🚧 本作业主交付）
系统管理 + 物料 + 工艺（BOM/工艺路线）+ 计划（工单/派工/甘特）+ 数字化大屏 + 3D 数字孪生 + AI 助手 + 工作流（分类/表单/定义/事件，非 BPMN 设计器部分）。

> **Cycle 1 体量过大，按子周期 1a~1h 逐个推进**（每个一条 `feature/*` 分支 + 独立 spec→plan→实现→审查→合并）：1a 系统管理 ✅ / 1b 基础数据·物料 ✅ / 1c 工艺技术线（**1c-1 工艺路线 ✅** / **1c-2 产品 BOM ✅** / **1c-3 BOM-工艺绑定 ✅**，工艺技术线收尾）/ **1d 计划·订单/派工/甘特 ✅** / **1e 数字化大屏 ✅** / **1f 3D 数字孪生 ✅** / **1g AI 助手 ✅** / **1h 工作流配置 ✅（Cycle 1 收官）**。
>
> **✅ 1a 系统管理已完成（2026-06-20，分支 `feature/system`）**：用户/角色/菜单/字典/部门五页 CRUD。沉淀通用原语 `TreeTable`/`MasterDetailLayout` + `urlMap` 路由翻译 + `systemTree` 纯函数（TDD）。后端最小补齐：5 个删除端点（用户/角色/字典/部门软删 + 列表过滤 + 软删用户阻断登录；菜单物理删 + 子守卫 + role_menu 清理）+ 审查修正 add-or-update（用户编辑密码加盐、角色保存与菜单 rebuild 同事务）+ 字典菜单种子（id=108）。详见 `docs/specs|plans/2026-06-20-cycle1a-system-management*`。
>
> **✅ 1b 基础数据·物料已完成（2026-06-20，分支 `feature/basedata-materile`）**：物料维护单页（列表 搜索/分页/图片列/字典 label + 新增/编辑弹窗 动态字典下拉/校验/图片上传 + 软删）+ 字典下拉助手。沉淀通用原语 `ImageUpload`（上传函数 prop 注入，真正可复用 + a11y）/ `useDict`（按 type 取字典 + 模块级 Promise 缓存 + 降级）+ `utils/materile` 纯函数（buildMaterilePayload/resolveDictLabel/toDictOptions，TDD 10 例）。**动态字典走真实 DB**（material_type=成品/半成品 FG/PG、ORDER_UNIT=个/箱 PCS/BOX）。后端最小修正 `SpMaterileController`：page 加 `is_deleted` 软删过滤 + create_time 排序、delete 由物理删改 UpdateWrapper 软删、getCodePrefix 补字典 value(FG/PG) 前缀映射。**菜单 131 DB 已存在，零种子 SQL**；urlMap 加 `/basedata/materile/list-ui`→`/basedata/materile`。工艺路线 flowId 绑定本周期不做（依赖 1c）。详见 `docs/specs|plans/2026-06-20-cycle1b-basedata-materile*`。**backlog**：图片管线 object-key 重签 + 遗留 image_url（过期预签名/相对路径）迁移；`/basedata/dict/list` 未过滤 is_deleted；自动编码并发竞态；source 字典化。

> **✅ 1c-3 BOM-工艺绑定完成（2026-06-20，分支 `feature/bom-flow`）**：单页双态——浏览态（选产品根 → 进入绑定）↔ 编辑态（主从：左 BOM 结构树点选 + 右节点详情/已绑工艺/只读工序链预览 + 锁定整树工艺）。对接后端**已存在**的 `/technology/bom-flow/*`（7 端点：products/list/flows/opers GET + bind/unbind/lock JSON）。**关键契约决策**：`sp_bom_flow` 对 `bom_id` 有唯一约束 → 一节点一路线；`bind` 端点内部 `replaceBinding`（@Transactional 先删后插）→ 绑定即换绑；故**放弃路线图原预估的 `OrderedTransfer`**，改单选工艺路线下拉（契约不支持有序多选）。`update-remark` 端点不接（备注随 bind 提交，mes-new 亦未用）。沉淀 `utils/bomFlow` 纯函数（buildBomNodeTree/canWriteBomFlow/buildBindPayload/flowOperRows，TDD 15 例）+ 3 视图组件（BomFlowPage/BomNodeFlowDetail/FlowBindDialog）。**锁定语义**：BOM 结构须先在 1c-2 锁定（rootStatus→locked），本页「锁定工艺」按钮才启用（后端 `lock` 端点亦校验）。**后端审查（按每周期审查约定）结论无暴露 bug**：bind 三重守卫 / unbind 双锁 / lock 要求根已锁定 / replaceBinding+lockProductBomFlows 均 @Transactional / `getTreeByRootId` 确认含根（递归前 `result.add(root)`）/ 物理删无软删列——全部正确；补 Mockito 守卫单测 6 例（JUnit4，AssertJ 风格对齐同包 Cycle1c1BackendTest）。**新增 `scripts/sql/bom-flow-menu-seed.sql`（菜单 id=155「BOM工艺绑定」，父 15，需手动跑）** + urlMap 1 条 + router 1 路由。门禁全绿（typecheck 0 / test 94 / lint 0 err / build ✓）+ 后端守卫单测 6 绿。subagent 驱动逐任务两阶段审查 + 终审 **Ready to merge**。**backlog**：list 接口 N+1 查询；cascadeDelete 删 BOM 节点遗留孤儿 sp_bom_flow 行（跨模块）。spec/plan：`docs/specs|plans/2026-06-20-cycle1c3-bom-flow*`。

### Cycle 2 — 库存 + 剩余基础数据 + 组织（🚧）
入库/出库/库存查询/手工入库；设备 / 设备编组 / 加工单元 / 仓库（库位）/ 零部件 / 班组（成员）。

> **按子周期推进**：**2a 库存 ✅**（`feature/inventory`）/ 2b 剩余基础数据（拆 **2b-1 设备/零部件/设备编组 ✅** `feature/basedata-device` + **2b-2 仓库库位/加工单元 CRUD ✅** `feature/basedata-warehouse-unit`，**Cycle 2 基础数据收尾**）/ 2c 组织·班组（成员，含加工单元-班组关联面板，待开始）。
>
> **✅ 2b-2 仓库库位/加工单元完成（2026-06-22，分支 `feature/basedata-warehouse-unit` → `develop` 已 `--no-ff` 合并）——Cycle 2 基础数据收尾**：两页一支——**仓库管理**（`/basedata/warehouse` 主从：左仓库 CRUD code/name/type/组×排×层×列/descr + 软删，右**只读库位面板**展示后端按规格自动生成的库位网格 + `组×排×层×列=总数` 徽标）、**加工单元管理**（`/basedata/process-unit` 标准 CRUD code/name/type/**是否有线边库**开关 hasLineWarehouse '1'/'0'/descr + 软删）。沉淀 `utils/warehouse.ts`（validateWarehouse/buildWarehousePayload/locationGridSummary/**dimensionsChanged**，与后端守卫语义对称）+ `utils/processUnit.ts`（validateProcessUnit/buildProcessUnitPayload）+ `api/basedata/{warehouse(扩展),processUnit(新建)}.ts` + `types/{warehouse(补分页),processUnit(新建)}.ts`，**TDD 14 例**（warehouse 10 + processUnit 4）。**编码**：2 个 page 走 form；warehouse/process-unit 的 add-or-update+delete 走 **JSON**（@RequestBody）；warehouse list/getById/locations 走 GET。**DataTable 自定义列契约实证**：自定义单元格走 `#col-{prop}` 具名插槽（无 `formatter` 字段）——仓库「规格」列与加工单元「线边库」标签列均按此实现。**后端审查（按 [[backend-deepseek-review-each-cycle]] 每周期必审）抓到并修 1 个跨模块数据完整性真 bug**：`SpWarehouseController.addOrUpdate` **无条件 `remove`+重建库位**（改名也重建、库位 id 全变）→ 孤儿化 2a `sp_inventory.location_id` 引用；改为先 `getById` 取旧维度、抽 `dimensionsChanged` 守卫**仅维度实际变化才重建**（read-before-write，事务内序正确）+ 补 `list-ui` forward（硬刷新 parity，对齐 process-unit）+ Mockito 守卫单测 4 例（真新建 id=null 跳 getById / stale 已删记录退化重建 / 仅改名跳重建 / 改维度重建）。加工单元后端零改动（page 软删过滤 + delete 软删已正确）。**菜单**：主 schema 无 warehouse/process-unit 菜单（`warehouse:add` 仅被 3D 仿真 171 占用，permission Set 去重无碍）→ 新增 `scripts/sql/warehouse-unit-menu-seed.sql`（幂等 id/url/name 三守卫 + 重挂 UPDATE，**需手动跑**，id 133 仓库管理 / 134 加工单元，挂物料管理组 13）；urlMap +2、router +2（meta.perm warehouse:add / process-unit:add）。门禁全绿（typecheck 0 / **test 281**[+14] / lint 0 err[5 既有 warn] / build ✓）+ 后端 `mvn compile` BUILD SUCCESS + 守卫单测 4 绿。subagent 驱动逐任务两阶段审查 + opus 整体终审——**终审抓出并修复 2 个真 bug**：① 编辑后 `handleFormSubmit` 用客户端 dto 脏快照刷新选中 → 改为 `await run()` 取服务端真实记录 ② **库位面板 `:key="selected.id"` 改维度后 id 不变不重挂 → 库位表陈旧（徽标却更新，不一致）**，改为按 `id-组x排x层x列` 维度签名 keying 强制重挂重拉。spec/plan：`docs/specs|plans/2026-06-22-cycle2b2-warehouse-unit*`。**2b-2 backlog（非阻塞）**：① 库位仍「删后插」全量重建（维度变化时，demo 规模无碍，靠守卫只在真变化时触发）② `warehouse:add` 与 3D 仿真菜单 171 共享权限串（侧栏不按角色过滤故可用，授权粒度可后续拆 `warehouse-mgmt:*`）③ type 自由文本未字典化（对齐 mes-new）④ 表单 `validate()` 拒绝未 try/catch（无害，仅控制台 unhandled rejection）。**人工 :4200 冒烟待确认**：需后端 9090 + DB 跑仓库/加工单元建表脚本 + `warehouse-unit-menu-seed.sql`（菜单），`admin/123` 登录 → 物料管理 → 仓库管理（新建填规格→右面板出库位网格 / 仅改名库位不变 / 改维度弹警示+保存后库位重生成 / 软删右面板清空）+ 加工单元（新建/编辑含线边库开关/软删）。

> **✅ 2b-1 设备/零部件/设备编组完成（2026-06-22，分支 `feature/basedata-device`，待 `--no-ff` 合 `develop`）**：三页一支——**设备维护**（`/basedata/device` 标准 CRUD code/name/type/model/specs/location/status/descr + 软删）、**零部件维护**（`/basedata/component` 极简 CRUD code/name/descr）、**设备编组**（`/basedata/device-group` 主从：左编组 CRUD + 右成员设备无序穿梭 diff 保存）。沉淀通用原语 **`DualListTransfer.vue`**（无序双列穿梭：左候选搜索加入/右已选移除，区别于有序 `OrderedTransfer`，**2c 班组成员面板可复用**）+ `utils/device.ts`（buildDevicePayload/validateDevice/buildComponentPayload/validateComponent/buildGroupPayload/validateGroup/excludeSelected/diffMembers/deviceToTransferItem，**TDD 15 例**）+ `api/basedata/{device,component,deviceGroup}.ts` + `types/basedata.ts` 扩展。**编码**：3 个 page 走 form；device/device-group 的 add-or-update+delete 走 JSON；**component add-or-update 走 form**（后端无 @RequestBody）、component delete 走 JSON；device-group items-add/remove 走 JSON、items 与 device get-by-id 走 GET。**成员 diff 保存**：`diffMembers(原成员ids, 现选ids)` → added 批量 `items/add`、removed 逐个 `items/remove`，reload 置于 `finally`（部分失败也与服务端对账），右面板 `:key=组id` 强制按组重挂载隔离并行加载竞态。**菜单实证**：DB 实查发现零部件(111)/设备编组(108)菜单**已存在但错挂在组 10**、设备菜单不存在 → `scripts/sql/device-menu-seed.sql`（幂等，**需手动跑**）新增 132 设备定义 + UPDATE 重挂 108/111 到组 13，物料管理组下整齐排列 131/132/111/108；urlMap +3、router +3，route perm（device:add/component:add/device:add）与菜单 permission 实测一致。**后端审查（按每周期必审）结论零 bug 零改动**：实连 dev DB 复核三模块 page 均过滤 `is_deleted != '1'`（设备/编组经 Mapper.xml、零部件经 `qw.ne`）、delete 均 `setDeleted("1")+updateById` 软删（设备 delete 另有 hasOrders 引用守卫）。门禁全绿（typecheck0/**test267**[+15]/lint0err[5既有warn]/build✓）。subagent 驱动逐任务两阶段审查（抓修：设备页提交瘦身对齐 MaterileList、成员保存 reload 移入 finally、菜单 seed 统一分组）+ opus 整体终审 **Ready to merge**（API 契约逐端点核对吻合）。spec/plan/验证：`docs/specs|plans/2026-06-22-cycle2b1-basedata-device*` + `…cycle2b1-verify-results.md`。**2b-1 backlog**：① validate*/excludeSelected 当前未被视图消费（rules 校验、穿梭框内部过滤）、excludeSelected 与 utils/technology 重复，可后续清理 ② 候选池 `devicePage(size:1000)` 兜底全量（PaginationInterceptor 上限，同 1f/2a）③ 编组 delete 遗留 join 孤儿行 + getGroupItems 不过滤软删设备 + items/add 无 @Transactional（均低危）④ 零部件 code 后端可自动生成但 UI 设必填致该路径不可达（无害）。**人工 :4200 冒烟待确认**：需后端 9090 + DB 跑 `device-management.sql`（建表/演示）+ `device-menu-seed.sql`（菜单，已执行），`admin/123` 登录 → 物料管理 → 设备定义/零部件定义/设备编组三页。**下一步 2b-2 仓库库位 + 加工单元 CRUD。**
>
> **✅ 2a 库存管理完成（2026-06-22，分支 `feature/inventory`，待 `--no-ff` 合 `develop`）**：四页一支——**计划入库确认**（`/inventory/receipt` 主从 + 占用感知库位登账弹窗）、**配套出库确认**（`/inventory/outbound` 主从 + FIFO 登账确认框，仅传 itemId 后端扣最早批次）、**库存明细查询**（`/inventory/query` 只读）、**手动入库**（`/inventory/manual-inbound` 表单 + 占用感知库位）。对接后端**已存在** 8 端点，**零后端生产代码改动**。沉淀 `LocationSelect.vue`（占用感知库位选择器：库房→库位级联 + 空闲/可累加/已占标注，入库与手工入库共用，取数失败降级容错）+ `utils/inventory`（receiptStatusMeta/outboundStatusMeta/postStatusMeta/progressText/progressPercent/locationAvailability/locationOptionLabel/buildOccupancyMap/validateManualInbound/buildManualInboundPayload，**TDD 31 例**）+ `types/inventory.ts`（分页参数复用 `PageReq` 基类）+ `api/inventory/{receipt,outbound,stock}.ts`。**菜单零新增**——181~184 种子已存在，菜单 url 本就是干净 SPA 路径（`/inventory/*`），`toSpaRoute` 原样透传 → **urlMap 零改动**，仅加 4 条 router 路由。**编码约定**：3 个 page 走 form，2 个 items GET，2 个 item/post + manual-inbound 走 JSON（`http.post(url,dto,true)`）。**后端审查（按 [[backend-deepseek-review-each-cycle]]）结论 5 个 ServiceImpl 全 OK、零改动**：入库台账累加非覆盖 + 幂等守卫、出库 `@Transactional` + FIFO（last_inbound_time/create_time 升序）+ 缺货整单回滚 + 归零删行 + allocationDetail、手工入库同库位累加（`sp_inventory` 有 `UNIQUE(location_id)` 背书一库位一物料）；5 表无 is_deleted 列故无软删过滤问题。门禁全绿（typecheck 0 / **test 252**[+31] / lint 0 err[5 既有 warn] / build ✓）。subagent 驱动逐任务两阶段审查（实现 + spec + 质量），审查抓修：PageReq 复用、LocationSelect 取数降级容错、入库弹窗关闭清空陈旧引用、outboundStatusMeta 缺省分支补测。spec/plan/验证：`docs/specs|plans/2026-06-22-cycle2a-inventory*` + `…cycle2a-verify-results.md`。**2a-backlog（非阻塞）**：① 台账 upsert + FIFO 扣减无行锁/乐观锁（高并发竞态，LATENT，建议 `version` 乐观锁或 `update...where quantity>=?` 原子扣减）② `pageInventory` 占用感知用大 size 兜底全量（与 1f 同款 `PaginationInterceptor` 上限隐患）③ 状态徽标按 quantity 派生而非后端 status 字符串（status 枚举值未实测，刻意设计）。**人工 :4200 冒烟待确认**：需后端 9090 + DB 跑 `scripts/sql/planned-inbound.sql` + `scripts/sql/kitting-outbound.sql`（建表 + 演示单据 + 菜单 181~184），`admin/123` 登录 → 库存管理四页。

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
| 登录 / 验证码 / 登出 | `/login` `/verification/code` `/logout` | C0 | ✅ |
| 当前用户 / 菜单树 | `/admin/user/info` `/admin/list/index/menu/tree` | C0 | ✅ |
| 用户管理 | `/admin/sys/user/page|get-by-id|add-or-update|delete` | C1·1a | ✅ |
| 角色管理（+菜单权限树） | `/admin/sys/role/page|add-or-update|tree/{roleId}|delete` | C1·1a | ✅ |
| 菜单管理（树） | `/admin/sys/menu/page|tree|add-or-update|delete` | C1·1a | ✅ |
| 字典管理（按 type 分组主从） | `/admin/sys/dict/page|add-or-update|delete` | C1·1a | ✅ |
| 部门管理 | `/admin/sys/department/page|add-or-update|delete` | C1·1a | ✅ |
| 班组管理（成员） | `/admin/sys/team/*` | C2 | ☐ |

### 9.2 基础数据 basedata
| 功能 | 关键后端接口 | 周期 | 状态 |
|---|---|---|---|
| 物料维护（+图片上传） | `/basedata/materile/page|add-or-update|upload-image|delete` | C1·1b | ✅ |
| 字典下拉助手 | `/basedata/dict/list/{type}` | C1·1b | ✅ |
| 设备 / 设备编组 | `/basedata/device/*` `/basedata/device-group/*` | C2·2b-1 | ✅ |
| 加工单元 / 仓库（库位） | `/basedata/process-unit/*` `/basedata/warehouse/*` | C2·2b-2 | ✅ |
| 零部件 | `/basedata/component/*` | C2·2b-1 | ✅ |
| 动态主数据配置 + 维护 | `/basedata/manager/*` `/basedata/common/*` | C3 | ☐ |

### 9.3 工艺 technology
| 功能 | 关键后端接口 | 周期 | 状态 |
|---|---|---|---|
| 产品 BOM（树/版本/锁定/子项） | `/technology/product-bom/*` | C1·1c-2 | ✅ |
| 工艺路线（流程+工序+关系，穿梭） | `/basedata/flow/*` `/basedata/sp-oper/*` `/basedata/flow/process/*` | C1·1c-1 | ✅ |
| BOM-工艺绑定 | `/technology/bom-flow/*` | C1·1c-3 | ✅ |
| 工序内容（设备/文档/上传） | `/technology/process-content/*` | C3 | ☐ |
| 工艺 BOM（旧 sp_bom） | `/technology/bom/*` | C3 | ☐ |

### 9.4 计划 order
| 功能 | 关键后端接口 | 周期 | 状态 |
|---|---|---|---|
| 工单下达（CRUD） | `/order/release/page|get-by-id|add-or-update|delete` | C1·1d | ✅ |
| 派工 | `/order/dispatch/*` | C1·1d | ✅ |
| 甘特排程（拖拽/开工完工/进度） | `/order/gantt/*` | C1·1d | ✅ |

### 9.5 库存 inventory
| 功能 | 关键后端接口 | 周期 | 状态 |
|---|---|---|---|
| 入库（单据/明细/记账） | `/inventory/receipt/*` | C2·2a | ✅ |
| 出库（FIFO 记账） | `/inventory/outbound/*` | C2·2a | ✅ |
| 库存查询 / 手工入库 | `/inventory/page` `/inventory/manual-inbound` | C2·2a | ✅ |

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
| 流程分类 | `/workflow/category/*` | C1·1h | ✅ |
| 流程表单 | `/workflow/form/*` | C1·1h | ✅ |
| 流程定义（启停/关联表单） | `/workflow/definition/*` | C1·1h | ✅ |
| 流程事件规则 | `/workflow/event/*` | C1·1h | ✅ |
| BPMN 模型设计器（bpmn-js） | `/workflow/model/*` | C3 | ☐ |

### 9.9 全局
| 功能 | 关键后端接口 | 周期 | 状态 |
|---|---|---|---|
| AI 助手（SSE 流式，亮点③） | `/admin/ai/chat` | C1 | ☐ |
| 实时通知中心 | 大屏轮询 / 派生 | C4 | ☐ |
| 错误页 403/404/500 | — | C0 | ✅ |

---

## 10. 风险与备注
- 后端 `mvnw` 损坏：编译/启动用 JDK11 + 系统 `mvn`（`JAVA_HOME=corretto-11`，`mvn -q spring-boot:run`，端口 9090，dev profile 连 `localhost:3306/mes_data`）。
- dev 已关验证码（`mes.captcha.enabled=false`），**可脚本化登录**，凭据 `admin/123`；登录页验证码 UI 仍保留（生产 parity），dev 下放宽为可空。
- 标识符/字段名避免与 DOM 属性同名（如 `nodeName`），否则表单提交可能异常。
- 3D 页若用相关库需关闭全局 StrictMode 类隐患（Vue 无 React StrictMode，但 WebGL 上下文同样需注意单例与卸载清理）。
- 本前端为独立 Vite 工程（`mes/vue3`），dev 端口拟用 `4200`（避开 mes-new 的 `4100`），生产可独立部署或 Nginx 反代。

---

## 11. 当前进度快照（2026-06-20）
- ✅ **Cycle 0 基础设施完成**：脚手架、Vite（代理/按需/分包）、请求层（+单测）、双主题、Pinia 四 store（持久化）、路由+守卫、通用组件、指令/插件、登录鉴权闭环、布局（菜单树侧栏/页签）、Welcome/错误页。
- ✅ 质量门禁全绿：`typecheck` 0 错误、`test` 8/8 通过、`build` 成功（vue/element 分包）、dev server 正常启动（665ms）。
- ✅ Git：`develop` + `feature/infra` 分支，约 20 个语义化 emoji 提交。
- ⏳ 待你启动后端（9090）后做浏览器联调冒烟：`admin/123` 登录 → 菜单树侧栏 → 主题切换持久化 → 刷新保持登录 → 退出拦截。
- ✅ **子周期 1a 系统管理完成（2026-06-20，分支 `feature/system` → `develop`）**：五页 CRUD + 后端 5 删除端点/审查修正/字典菜单种子。前端门禁全绿（`typecheck` 0 / `test` 26 / `build` ✓ / `lint` 0 err）；后端守卫测试 15 全绿、`mvn compile` BUILD SUCCESS（JDK11）。subagent 驱动逐任务两阶段审查 + opus 终审（揪出并修复角色权限树回填级联、菜单 grade NOT NULL、字典按 type 分组三处）。
- ⏳ **1a 待人工确认**：需启动后端（9090）+ 执行 `scripts/sql/dict-menu-seed.sql`（字典菜单）后浏览器端到端冒烟（`admin/123` 登录 → 系统管理五项 → 各页 CRUD + 角色权限树勾选 round-trip + 字典两级 + 菜单/部门树）。
- ✅ **子周期 1b 基础数据·物料完成（2026-06-20，分支 `feature/basedata-materile` → 待合 `develop`）**：物料维护单页 + 字典下拉助手。沉淀 `ImageUpload`/`useDict` + `utils/materile` 纯函数（TDD）。后端 `SpMaterileController` 三处审查修正（page 软删过滤/delete 软删/getCodePrefix 字典前缀）。前端门禁全绿（typecheck 0 / test 36 / lint 0 err / build ✓）+ 后端 `mvn compile` BUILD SUCCESS。subagent 驱动逐任务两阶段审查 + opus 终审 **Ready to merge**。
- ⏳ **1b 待人工确认**：启动后端（9090）后浏览器（:4200）冒烟——`admin/123` 登录 → 物料维护 → 搜索/分页 → 新增（字典下拉 + 图片上传 + 自动编码）→ 编辑 → 软删消失。
- ✅ **子周期 1c-1 工艺路线完成（2026-06-20，分支 `feature/technology-flow` → 待合 `develop`）**：工序定义页（列表 搜索/分页 + 新增/编辑弹窗 校验[制造周期>工时]/加工单元下拉）+ 工艺路线管理页（列表 工序链渲染 + 有序穿梭框编辑弹窗 候选池/编辑回填/校验[≥2 工序]/级联删确认）。沉淀通用原语 `OrderedTransfer.vue`（有序穿梭框：搜索/上下移/移除/首末道标记/链预览/a11y，1c-3 可复用）+ `utils/technology` 纯函数（buildOperPayload/validateOper/operToTransferItem/excludeSelected/moveItem/toSpOperVoList/buildFlowPayload/validateFlow，TDD 20 例）。**后端两处最小修正（已审查）**：① 工艺路线删除事务化（`deleteFlowWithRelations` 加 `@Transactional`，头表+关系同事务）② 工序删除引用守卫（被任一路线 oper_id/per/next 引用则拒删，防孤儿/断链）+ Mockito 守卫单测 2 例（JUnit4，`Result extends HashMap`、MP3.1.2 count 返回 int）。**菜单 151 工艺路线管理 DB 已存在**；新增 `scripts/sql/oper-menu-seed.sql`（工序定义菜单 id=153，**需手动跑**）+ urlMap 2 条 + router 2 路由。门禁全绿（typecheck 0 / test 56 / lint 0 err / build ✓）+ 后端 `mvn compile` BUILD SUCCESS + 守卫单测 2 绿。subagent 驱动逐任务两阶段审查 + opus 终审。spec/plan：`docs/specs|plans/2026-06-20-cycle1c1-technology-flow*`。
- ✅ **子周期 1c-2 产品 BOM 完成（2026-06-20，分支 `feature/product-bom` → `develop` 已 `--no-ff` 合并）**：单页双态——浏览态（列表/树视图切换 + 新建根 + 级联删除）↔ 编辑态（主从：左结构树点选 + 右节点信息卡/物料行表 + 锁定整树/创建新版本）。对接后端**已存在**的 `/technology/product-bom/*`（11 端点：page/tree/save/delete/lock/new-version/items/item-save/item-delete/products）。沉淀 `utils/productBom` 纯函数（pickBomSubtree/findBomNode/canWriteBom/buildBomNodePayload/validateBomNode/buildBomItemPayload/validateBomItem/materielToItem，TDD 23 例）+ 4 个视图组件（ProductBomList/BomNodeDetail/BomNodeForm/BomItemForm）。**后端审查修 2 个真 bug**：① `/products` 与根节点校验硬编码中文「产品」→ 放宽白名单 {FG,PG,产品,半成品}（对齐 1b 字典 value，实连 DB 证 mat_type 真实值含 FG）② `createNewVersion` 漏复制根节点自身行项目 → 抽 `copyItems` 根节点也复制 + Mockito 守卫单测 7 例。**新增 `scripts/sql/product-bom-menu-seed.sql`（菜单 id=154「产品BOM管理」，父 15，需手动跑）** + urlMap 1 条 + router 1 路由。门禁全绿（typecheck 0 / test 79 / lint 0 err / build ✓）+ 后端 `mvn compile` BUILD SUCCESS + 守卫单测 7 绿。subagent 驱动逐任务两阶段审查 + opus 终审 **Ready to merge**。spec/plan：`docs/specs|plans/2026-06-20-cycle1c2-product-bom*`。
- ⏳ **1c-1 / 1c-2 待人工确认**：启动后端（9090）+ 执行 `scripts/sql/oper-menu-seed.sql`、`scripts/sql/product-bom-menu-seed.sql`、`scripts/sql/product-bom.sql`（建表）后浏览器（:4200）冒烟——`admin/123` 登录 → 工艺管理 → 工序定义/工艺路线（1c-1）+ 产品BOM管理（1c-2：新建根选产品→加子节点→加物料行→锁定整树→创建新版本→删除级联）。
- ✅ **子周期 1c-3 BOM-工艺绑定完成（2026-06-20，分支 `feature/bom-flow` → 待合 `develop`）**：单页双态（浏览选产品根 ↔ 编辑态主从:树点选+单选路线绑/换/解+只读工序链预览+锁定整树工艺）。对接后端已存在 7 端点零新增。**放弃 OrderedTransfer**（`sp_bom_flow` 唯一约束+bind 即换绑，有序穿梭框契约不匹配）；不接 update-remark。沉淀 `utils/bomFlow`（TDD 15 例）+ 3 组件。后端审查无暴露 bug（getTreeByRootId 确认含根）+ 守卫单测 6 绿。门禁全绿（typecheck 0 / test 94 / lint 0 err / build ✓）。subagent 驱动逐任务两阶段审查 + 终审 Ready to merge。新增 `scripts/sql/bom-flow-menu-seed.sql`（菜单 id=155，需手动跑）。
- ⏳ **1c-3 待人工确认**：启动后端（9090）+ 执行 `scripts/sql/bom-flow-menu-seed.sql`（+ 1c-2 的 `product-bom.sql` 建表与数据）后浏览器（:4200）冒烟——`admin/123` 登录 → 工艺管理 → BOM工艺绑定 → 选产品根 → 进入绑定 → 左树点节点 → 绑定工艺路线（下拉选 + 备注）→ 右侧工序链预览出现 → 换绑 → 解绑 → 回 1c-2 锁 BOM 结构 → 回本页「锁定工艺」→ 全部绑定变只读。
- ✅ **子周期 1d 计划·订单/派工/甘特完成（2026-06-21，分支 `feature/order-planning` → 待合 `develop`）**：三屏一分支——**工单下达**（列表 搜索/分页 + 新增编辑弹窗 物料带描述/工艺路线下拉/计划起止 + 删除）、**员工作业派工**（待派工多选 + 班组级联作业员派工弹窗，`DataTable` 加可选 `selectable` 多选列）、**生产甘特排程**（自研 CSS/div 甘特，双视角 资源/订单 + 计划vs实际双条 + 状态色 + 今日红线 + 拖拽改期 平移/缩放 + 执行回填 开工/进度/完工/纠时）。对接后端**已存在**的 15 端点。沉淀 `utils/order`（buildOrderPayload/validateOrder/orderTypeLabel/orderStatusMeta/buildDispatchPayload/validateDispatch）+ `utils/gantt`（parseDay/daysBetween/getDisplayStatus/computeRange/enumerateDays/timeToX/pxToDays/shiftPlanByDays/groupByResource/groupByOrder，TDD 20 例）+ `DataTable` selectable 增强。**后端审查（按每周期必审）抓到并修 1 个主链路真 bug**：`SpOrderDispatchMapper.xml` 的 `selectGanttTasks` 含 `WHERE d.oper_id IS NOT NULL`，而正常派工（`assignWorker` 创建的订单级派工 oper_id 为 NULL）会被全部过滤 → 派工后甘特永远空白；改为 `WHERE 1=1` + Mockito 守卫单测（派工批量 + operId NULL 回归）。前端门禁全绿（typecheck 0 / test 131 / lint 0 err / build ✓）+ 后端 `Cycle1dBackendTest`+`SpGanttServiceImplTest` 18 绿。subagent 驱动逐任务两阶段审查（揪出并修复：工单表单缺 el-form 行内校验、甘特纯函数 parseDay 越界 guard + overdue 边界锁定、甘特图 pointercancel/卸载清理健壮性）。spec/plan：`docs/specs|plans/2026-06-21-cycle1d-order-planning*`。**1d-backlog**：① 甘特全量拉取+客户端过滤（未用后端 orderCode/teamId 过滤参数，demo 规模无碍）② GanttPage activeTask 变 null 时抽屉未防御性关闭 ③ 派工 `pageOrdersForDispatch` N+1 查询 ④ 时间字段 String compareTo 依赖固定格式。
- ⏳ **1d 待人工确认**：启动后端（9090）+ DB 已执行 `scripts/sql/dispatch-management.sql`（建 sp_order_dispatch + 菜单122）、`scripts/sql/gantt-migration.sql`（加 oper_id/progress 列 + 菜单123）、可选 `scripts/sql/gantt-mock-seed.sql`（演示数据）后浏览器（:4200，`admin/123`）冒烟——计划管理 → 工单下达（新建/编辑/删除）→ 员工作业派工（勾选→班组级联作业员→派工后从待派工消失）→ 生产甘特图（双视角切换 + 拖拽改期 + 悬停/抽屉回填 开工→进度→完工→纠时）。
- ✅ **子周期 1h 工作流配置完成（2026-06-22，分支 `feature/workflow-config`，从 `develop` 切）——Cycle 1 收官**：四个配置页一次性交付——**流程分类管理**（`/workflow/category` 标准 CRUD，code 唯一、编辑禁改 code）、**流程表单管理**（`/workflow/form` 三段表单 基本/地址脚本/选项 + 跳过相同处理人开关，formKey 字母开头唯一）、**流程定义管理**（`/workflow/definition` 启停 / 关联表单弹窗 / 事件规则弹窗，**无增删**——定义由模型发布派生）、**流程事件规则**（嵌定义页弹窗：编辑器+列表，SET_AUDIT_STATUS/SCRIPT 两类动作 + 「填入示例」三条）。对接后端**已存在**的 12 端点（category 4 + form 4 + definition 3 + event 3），**零后端改动**。沉淀 `utils/workflow` 纯函数（validateCategory/validateForm/validateEventRule/build*Payload/triggerLabel/actionLabel/auditStatusLabel/sampleEventRules + TRIGGER/ACTION/AUDIT_STATUS_OPTIONS，**TDD 26 例**）+ `types/workflow.ts` + `api/workflow/{category,form,definition,event}.ts` + 8 视图组件。**关键契约坑（已处理）**：① 事件规则字段 API 暴露名是 **`trigger`**（后端 Java 字段 `triggerType` + `@JsonProperty("trigger")` 避 SQL 保留字），前端类型/payload/读取一律用 `trigger`；seed SQL 用 DB 列名 `trigger_type`。② 编码 form vs JSON：page/list/add-or-update 走 form，所有 delete + definition set-enabled/set-form + 全部 event 端点走 JSON（`http.post(url,data,true)`）。③ set-form 选「未关联」传 `null`（后端 `UpdateWrapper.set("form_key", null)` 真正清除）。**菜单零新增**——191/192/193/194 种子已存在，仅加 urlMap 3 条 + router 3 路由（菜单 192「流程模型设计」本周期不映射，留 Cycle 3 bpmn-js 设计器）。**新增 `scripts/sql/workflow-demo-seed.sql`**（幂等：2 分类 / 2 已发布模型 + 对应定义 [id=model.id] / 1 表单 / 2 事件规则）——因 BPMN 设计器在 Cycle 3，定义数据靠 seed 预置供演示。**后端审查（按每周期必审）结论零 bug 零改动**：category/form add-or-update 唯一性用 `.ne(...id...)` 排除自身（编辑不误判）、definition set-form null 经 UpdateWrapper 真正清除、event `trigger` 保留字修复在位、save 双分支 + 缺省值正确——mes-new 2n 已端到端验证同份后端代码。门禁全绿（typecheck 0 / **test 221**[+26 workflow] / lint 0 err[5 既有 warn] / build ✓）。spec/plan：`docs/specs|plans/2026-06-22-cycle1h-workflow-config*`。**1h-backlog（非阻塞）**：① formKey/code 提交前未预查唯一性（靠后端校验 + toast，可选增强）② BPMN 模型设计页 + 发布动作留 Cycle 3 ③ 运行时（实例/任务/审批/事件触发）留将来周期 ④ businessType 固定 ORDER_APPROVAL。**人工 :4200 冒烟待确认**：需后端 9090 + DB 跑 `workflow-config-tables.sql`（建表）+ `workflow-flow-config.sql`/`workflow-form-event-config.sql`（菜单）+ `workflow-demo-seed.sql`（演示数据），`admin/123` 登录 → 流程配置工具 → 分类 CRUD / 表单 CRUD / 定义 启停·关联表单·配事件（含填入示例）。
- ✅ **子周期 2a 库存管理完成（2026-06-22，分支 `feature/inventory` → 待 `--no-ff` 合 `develop`）**：四页（计划入库确认 / 配套出库确认 FIFO / 库存明细查询 / 手动入库）+ 占用感知库位选择器 + `utils/inventory` TDD 31 例。零后端改动（5 ServiceImpl 审查全 OK）、零新增 SQL（复用 `planned-inbound.sql`+`kitting-outbound.sql`）、零 urlMap 改动。门禁全绿（typecheck 0 / test 252 / lint 0 err / build ✓）。详见 §8 Cycle 2 段。
- ✅ **子周期 2b-1 设备/零部件/设备编组完成（2026-06-22，分支 `feature/basedata-device` → 待 `--no-ff` 合 `develop`）**：三页（设备 CRUD / 零部件 CRUD / 设备编组主从）+ 通用原语 `DualListTransfer`（无序双列穿梭，2c 班组面板可复用）+ `utils/device` TDD 15 例。零后端改动（三模块软删一致性实连 DB 审查全 OK）；菜单 `device-menu-seed.sql` 新增设备定义(132) + 重挂已存在的零部件(111)/设备编组(108)到组 13。门禁全绿（typecheck0/test267/lint0err/build✓）。详见 §8 Cycle 2 段。
- ✅ **子周期 2b-2 仓库库位/加工单元完成（2026-06-22，分支 `feature/basedata-warehouse-unit` → `develop` 已 `--no-ff` 合并）——Cycle 2 基础数据收尾**：两页（仓库管理主从[CRUD + 只读库位面板] / 加工单元 CRUD[含线边库开关]）+ `utils/{warehouse,processUnit}` TDD 14 例。**后端审查抓修 1 个跨模块真 bug**：仓库 `addOrUpdate` 无条件重建库位 → 孤儿化 2a 库存 location_id，改为 `dimensionsChanged` 守卫仅维度变化才重建 + `list-ui` forward + Mockito 4 例。终审再抓修 2 个前端 bug（编辑后取服务端真实记录、库位面板按维度签名 keying 防陈旧）。菜单 `warehouse-unit-menu-seed.sql`（133/134 挂组 13，需手动跑）。门禁全绿（typecheck0/**test281**/lint0err/build✓）+ 后端守卫单测 4 绿。详见 §8 Cycle 2 段。
- ☐ 其余周期：Cycle 2 剩余（**2c 组织·班组**，含加工单元-班组关联面板，可复用 2b-1 `DualListTransfer`）/ Cycle 3（工作流设计器 + 动态主数据 + 工艺深化）/ Cycle 4（性能/打磨/测试）。
- **下一步**：2b-2 浏览器 :4200 冒烟确认（需跑仓库/加工单元建表脚本 + `warehouse-unit-menu-seed.sql`）；启动 **2c 组织·班组**（班组成员 + 加工单元-班组关联面板）。
- **下一步**：2b-1 浏览器 :4200 冒烟确认（需跑 `device-management.sql` + 已执行的 `device-menu-seed.sql`）；`feature/basedata-device` `--no-ff` 合 `develop`；启动 2b-2（仓库库位 + 加工单元 CRUD）。
