# 子周期 1c-1 工艺路线 — 设计文档（spec）

- 日期：2026-06-20
- 分支：`feature/technology-flow`（从 `develop` 切出）
- 前端工程：`mes/vue3`（独立 Vite，dev :4200，代理 `/api`→9090）
- 范围：**仅工艺路线线（1c-1）** = 工序定义 CRUD + 工艺路线管理（有序穿梭框配工序）
- 不含：产品 BOM（1c-2）、BOM-工艺绑定（1c-3）、工序内容/工艺文件（C3）

---

## 1. 目标与范围

用 Vue3 实现「工艺技术线」的第一段：**工艺路线（Flow）+ 工序（Oper）**。一条工艺路线由若干**有序**工序串成（装配→测试→包装…），顺序即生产执行顺序。后端据穿梭框提交的有序数组推导工序前后道关系、首末道标记、排序号与 `process` 链串。

两个页面，均挂在既有「工艺管理」菜单（id 15）下：

| 页面 | SPA 路由 | 菜单 | 形态 |
|---|---|---|---|
| 工序定义 | `/technology/oper` | **新增** seed（父 15，perm `oper:add`） | 列表 + 新增/编辑弹窗（独立 CRUD） |
| 工艺路线管理 | `/technology/flow` | **151 已存在**（url `/basedata/flow/process/list-ui`，perm `flow:add`） | 列表 + 编辑大弹窗（有序穿梭框） |

**明确不做**：产品 BOM、BOM-工艺绑定、工序内容（设备/文档/上传）、工艺 BOM（旧 sp_bom），均留后续周期。

---

## 2. 后端契约（已核对 `MySQL-init-all.sql` + 控制器；mes-new 已对同后端验证）

### 2.1 工序 Oper（`SpOperController` @ `/basedata/sp-oper`）

| 方法 | 路径 | 编码 | 入参 | 出参 | 说明 |
|---|---|---|---|---|---|
| page | `POST /basedata/sp-oper/page` | form | `SpOperReq`（`operDescLike?` + 分页） | `IPage<SpOper>` | 分页查询，支持工序描述模糊 |
| list | `GET /basedata/sp-oper/list` | — | — | `List<SpOper>` | 全量（穿梭框候选池用） |
| addOrUpdate | `POST /basedata/sp-oper/add-or-update` | form | `SpOper` | `String`(id) | 新增自动生成 `OPR-XXX`；新增默认 `generatePlan='1'` |
| delete | `POST /basedata/sp-oper/delete` | **JSON** `{id}` | — | — | 物理删除 |
| processUnits | `GET /basedata/sp-oper/process-units` | — | — | `List<SpProcessUnit>` | 加工单元下拉源 |

**`SpOper` 字段**：`id` / `oper`(工序名) / `operCode`(OPR-XXX 自动) / `operDesc`(描述) / `processUnitId`(加工单元外键, 可空) / `laborHours`(工时分钟, 默认0) / `manufacturingCycle`(制造周期分钟, 默认0) / `generatePlan`('0'/'1') / `remark` + 审计四字段。**业务规则：`manufacturingCycle > laborHours`，均整数。** 无软删。

### 2.2 工艺路线 Flow（`SpFlowController` @ `/basedata/flow`）

| 方法 | 路径 | 编码 | 入参 | 出参 | 说明 |
|---|---|---|---|---|---|
| page | `POST /basedata/flow/page` | form | `SpFlowReq`（分页） | `IPage<SpFlow>` | 路线分页 |
| list | `GET /basedata/flow/list` | — | — | `List<SpFlow>` | 全量 |

**`SpFlow` 字段**：`id` / `flow`(流程代码) / `flowDesc`(线体/流程描述) / `process`(工序链串, 后端自动生成 `A->B->C`, 只读) + 审计四字段。无软删。

### 2.3 流程-工序关系 / 穿梭框（`SpFlowOperRelationController` @ `/basedata/flow/process`）

| 方法 | 路径 | 编码 | 入参 | 出参 | 说明 |
|---|---|---|---|---|---|
| addOrUpdate | `POST /basedata/flow/process/add-or-update` | **JSON** | `SpFlowDto` | — | 穿梭框保存（新增或重排） |
| opers | `GET /basedata/flow/process/opers/{flowId}` | — | — | `List<SpOperVo>` | 取路线下有序工序链（编辑回填） |
| delete | `POST /basedata/flow/process/delete` | form `{id}` | — | — | 删路线 + 级联删关系 |

**`SpFlowDto`**（穿梭框 payload）：
```jsonc
{
  "id": "可空(新增)或路线id(编辑)",
  "flow": "流程代码",
  "flowDesc": "流程描述",
  "spOperVoList": [               // 数组顺序 = 工序执行顺序
    { "value": "operId", "title": "operCode" },
    { "value": "operId", "title": "operCode" }
  ]
}
```
**校验：`spOperVoList.size() >= 2`（路线至少 2 工序）。** 后端遍历该有序数组推导：`sortNum`(1,2,3…)、`perOperId/perOper`、`nextOperId/nextOper`、首道 `operType=firstOper`、末道 `lastOper`，并拼 `process` 链串。

**`SpOperVo`**：`{ value: operId, title: operCode }`。

> ⚠️ 编码差异（沿用 `api/request.ts` 拦截器约定）：oper page/add-or-update、flow page、flow process delete 走 **form 编码**；oper delete 与 flow process add-or-update 走 **JSON**（显式 `Content-Type: application/json` 跳过拦截器转换）。

---

## 3. 菜单与路由

### 3.1 工艺路线管理（菜单已存在，零 seed）
- 菜单 151 url = `/basedata/flow/process/list-ui` → urlMap 加映射 → `/technology/flow`。

### 3.2 工序定义（新增 seed SQL）
- 新建 `scripts/sql/oper-menu-seed.sql`（幂等：`INSERT ... ON DUPLICATE KEY UPDATE` 或先 `DELETE` 再 `INSERT`），镜像菜单 152 的列结构：
  - 列序：`id,code,name,url,parent_id,grade,sort_num,type,permission,icon,descr,create_time,create_username,update_time,update_username`
  - 值：`id='153'`、`code='operDefine'`、`name='工序定义'`、`url='/basedata/sp-oper/list-ui'`、`parent_id='15'`、`grade='3'`、`sort_num=3`、`type='0'`、`permission='oper:add'`、`icon='set-up'`、`descr=''` + 审计字段（`'admin'`）。
- urlMap 加映射 `/basedata/sp-oper/list-ui` → `/technology/oper`。
- **需用户手动跑该 SQL，工序定义菜单才出现**（与 1a `dict-menu-seed.sql` 同策略）。

### 3.3 urlMap（`src/utils/urlMap.ts`）新增两条
```ts
'/basedata/flow/process/list-ui': '/technology/flow',
'/basedata/sp-oper/list-ui': '/technology/oper',
```

### 3.4 router（懒加载 + meta.perm）
- `/technology/oper` → `views/technology/oper/OperList.vue`，`meta.perm='oper:add'`
- `/technology/flow` → `views/technology/flow/FlowList.vue`，`meta.perm='flow:add'`

> 侧栏由 `sp_sys_menu` 驱动、不按角色过滤；路由须匹配预置/seed 菜单 url，否则侧栏点不到。

---

## 4. 前端结构

```
src/
├── api/technology/
│   ├── flow.ts      # flowPage / flowList / flowSaveProcess(JSON) / flowDelete(form) / flowOpers
│   └── oper.ts      # operPage / operList / operAddOrUpdate(form) / operDelete(JSON) / operProcessUnits
├── types/technology.ts   # SpFlow / SpOper / SpOperVo / SpFlowDtoReq / SpProcessUnitOption
├── utils/technology.ts   # 纯函数(见 §6)
├── components/
│   └── OrderedTransfer.vue   # 新增通用原语(见 §5)
└── views/technology/
    ├── oper/{OperList.vue, OperForm.vue}
    └── flow/{FlowList.vue, FlowProcessEditor.vue}
```

复用既有：`DataTable`(服务端分页)、`FormDialog`、`SearchForm`、`PageContainer`、`usePagination`、`useRequest`。

---

## 5. 核心新原语 `OrderedTransfer.vue`

Element Plus `el-transfer` **不支持排序**，而工艺路线顺序是核心语义 → 自研有序穿梭框，沉淀为通用组件（1c-3 BOM-工艺绑定、工作流等可复用）。

- **Props**：`modelValue: TransferItem[]`（右栏有序已选）、`candidates: TransferItem[]`（左栏全量池）、可选 `titles`/`minHint`。
- **TransferItem**：`{ id: string; primary: string; secondary?: string }`。
- **左栏**（候选池）：标题 + 数量徽标 + 搜索框（按 primary/secondary 模糊）+ 滚动列表（`excludeSelected` 排除已选）；点击项 → 加入右栏末尾。
- **右栏**（有序流水线）：序号圆形徽标 + primary/secondary + **上/下移按钮** + 移除按钮 + 首/末道标记（≥2 项时）；底部「A→B→C」链预览。
- **通信**：纯 props 入、`update:modelValue` 出（`v-model`），零业务耦合。
- **动画**：列表增删/重排用 `@formkit/auto-animate`（路线图既定，约 2KB）。
- **无障碍**：按钮带 `aria-label`；尊重 `prefers-reduced-motion`。

> 拖拽排序作为增强可选项；**MVP 以上/下移按钮为准**（实现简单、可达性好、单测友好），拖拽若时间充裕再加。

---

## 6. 纯函数 + TDD（`utils/technology.ts`，vitest `tests/**/*.spec.ts`）

| 函数 | 签名 | 职责 |
|---|---|---|
| `buildOperPayload` | `(form) => Partial<SpOper>` | 剥空串、`laborHours/manufacturingCycle` 转数值、`generatePlan` 兜底 |
| `validateOper` | `(form) => string \| null` | 校验「制造周期 > 工时」「均为非负整数」，返回错误信息或 null |
| `toSpOperVoList` | `(items: TransferItem[]) => SpOperVo[]` | 有序工序项 → `[{value,title}]`（顺序保持） |
| `buildFlowPayload` | `(form, items) => SpFlowDtoReq` | 组装 `{id?, flow, flowDesc, spOperVoList}` |
| `validateFlow` | `(form, items) => string \| null` | 校验 flow/flowDesc 非空、工序 ≥ 2 |
| `excludeSelected` | `(pool, selectedIds: Set) => TransferItem[]` | 候选池排除已选 |
| `moveItem` | `(list, idx, dir: -1\|1) => list` | 不可变重排（边界安全） |
| `operToTransferItem` | `(SpOper) => TransferItem` | `{id, primary:operDesc, secondary:operCode}` |

测试覆盖：边界（空/单项/越界 move）、校验分支、顺序保持、payload 形状。

---

## 7. 数据流

### 7.1 工序定义页
- `OperList`：`SearchForm`(operDescLike) → `operPage` → `DataTable`(服务端分页，列：operCode/operDesc/工时/制造周期/是否生成计划/加工单元/备注/操作)；新建/编辑 → `OperForm` 弹窗。
- `OperForm`：字段 operDesc(必填)/processUnitId(加工单元下拉, `operProcessUnits`)/laborHours(必填≥0)/manufacturingCycle(必填, >工时)/generatePlan(开关)/remark；前端 `validateOper` + 后端二次校验；提交 `operAddOrUpdate`。
- 删除：`operDelete`(JSON) + 二次确认。

### 7.2 工艺路线管理页
- `FlowList`：`flowPage` → `DataTable`(列：flow/flowDesc/process 链串[徽标+箭头渲染]/操作)；新建/编辑 → `FlowProcessEditor` 大弹窗。
- `FlowProcessEditor`：
  - 打开（新增）：`operList()` 取候选池。
  - 打开（编辑）：并行 `operList()` + `flowOpers(id)`；用 `flowOpers` 的有序 `SpOperVo[]` 回填右栏（`secondary` 从候选池按 id 补 operCode）。
  - 基本信息：flow(必填)/flowDesc(必填)；工序编排：`OrderedTransfer`。
  - 提交：`validateFlow` → `buildFlowPayload` → `flowSaveProcess`(JSON)；成功刷新列表。
- 删除：`flowDelete`(form, `{id}`) + 二次确认（提示级联删工序关系）。

---

## 8. 后端审查（[[backend-deepseek-review-each-cycle]]，最小必要修正）

本模块后端为 DeepSeek 时代代码，实现期逐项核对，**仅修暴露的正确性问题**，能不动则不动：

1. **工序删除未校验被引用**：删除一个已被某条工艺路线引用（存在于 `sp_flow_oper_relation`）的工序 → 产生孤儿关系 / 路线断链。拟加「被引用则拒删」守卫（查关系表 `operId` 是否存在；存在则 `RuntimeException` 拦截，文案提示）。
2. **`flow/process/delete` 级联删事务性**：删路线 + 删关系应在同一 `@Transactional`（历史同类方法缺事务先例，1a/2j 均遇到）。核对，缺则补。
3. **工序校验落地**：`制造周期 > 工时` 后端是否真实生效（前端校验不可信赖为唯一防线）。
4. **穿梭框 `add-or-update` 重排/级联**：核对「删旧关系→按序重建」是否在同一事务，避免中途失败留半截。

> 若需改动：最小、纯修正，配 Mockito 守卫单测（JDK11，`mvn compile` + `mvn test -Dtest=...`）。后端构建用系统 mvn（[[backend-build-mvnw-broken]]）。

---

## 9. 已知坑 / 约定

- **编码差异**：见 §2 末，JSON vs form 必须精确，否则后端绑定失败。
- **DOM 属性名坑**（[[rhf-field-name-dom-clobbering]]）：Vue/el-form 下风险低，但表单字段名仍避开 `nodeName` 等 DOM 属性名。
- **process 字段只读**：由后端生成，前端只展示，不提交。
- **历史脏数据容忍**：`sp_flow.process` 旧数据用 `->` 连接（schema 注释写 `——>`），渲染按 `->` split 兜底空。
- **无软删**：本模块物理删除，与 1a/1b 软删风格不同，沿用后端现状；删除前二次确认 + 引用守卫降低误删风险。

---

## 10. 验证门禁

- 前端：`pnpm typecheck`(0 错) / `pnpm test`(纯函数全绿) / `pnpm lint:check`(0 err) / `pnpm build`(成功)。
- 后端（若有改动）：`mvn compile` BUILD SUCCESS + 守卫单测全绿。
- subagent 驱动逐任务两阶段审查 + opus 终审 Ready to merge。
- 人工 :4200 浏览器冒烟（需后端 9090 + 已跑 `oper-menu-seed.sql`）：登录 → 工艺管理 → 工序定义 CRUD（含周期>工时校验、自动编码）→ 工艺路线 新建（穿梭框选≥2 工序、重排、链预览）→ 编辑回填 → 删除级联。**待用户确认。**

---

## 11. 交付物清单

- 前端：`api/technology/{flow,oper}.ts`、`types/technology.ts`、`utils/technology.ts`、`components/OrderedTransfer.vue`、`views/technology/oper/{OperList,OperForm}.vue`、`views/technology/flow/{FlowList,FlowProcessEditor}.vue`、urlMap 2 条、router 2 路由、`tests/**/technology*.spec.ts`。
- SQL：`scripts/sql/oper-menu-seed.sql`（工序定义菜单 153）。
- 后端（按审查结论）：`SpOper`/`SpFlow` 相关 controller/service 最小修正 + 守卫单测。
- 文档：本 spec + 对应 plan + ROADMAP 更新。
