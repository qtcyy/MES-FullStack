# 生产订单录入 + 轻量 BPMN 审批 — 设计文档

- 日期：2026-06-23
- 主开发目标：**vue3 前端**(`mes/vue3`,Element Plus)+ 配套后端能力,后续再同步到 `mes-new`
- 来源：PPT 需求「生产订单录入」模块(生产订单创建 + 生产订单审批)

## 1. 背景与目标

PPT 要求基于「生产订单审批」流程,实现两段业务:

1. **生产订单创建**:计划员登录 → 生产计划中心 → 生产订单菜单 → 新增需求订单 → 产品 BOM 选「台式电脑主机」→ 计划交付时间 = 当前日期顺延 5 个工作日 → 需求数量 10 → 提交 → 订单状态「审核中」。
2. **生产订单审批**:生产主管登录 → 首页待办任务 → 点标题进审批界面 → 分别点「签收」和「提交」→ 完成审批 → 回到生产订单,状态变「待运算」。

需求要点:
- 订单类型区分「需求订单」/「预测订单」。
- 需求订单按计划交付日期/完工时间**逆向排产**;预测订单按计划开工日期**正向排产**(本周期仅记录排产方式,不做运算)。
- 订单对应产品编码及 BOM,下单时确认 BOM 为最新版本。
- 订单提交后由生产主管审批。

**本周期范围边界**:做到订单状态转「待运算 UNCOMPUTED」为止。真正的 MRP 排产运算**不在本周期**。

## 2. 关键决策(已与用户确认)

| 项 | 决策 |
|---|---|
| 模块落位 | 新建独立「生产订单录入」,挂在**生产计划中心**下,与现有「工单下达」并列 |
| 数据表 | **复用 `sp_order` 表**,用 `order_source` 是否有值区分:有值=生产订单,空=旧工单 |
| 审批引擎 | **自研轻量 BPMN 运行时**,沿用预留的 `sp_workflow_instance/task/event_log` 表;解析标准 BPMN 2.0 XML,真实 claim/complete |
| 业务钩子 | 按 `business_type` 分发的 **Java 处理器**(不引入脚本引擎) |
| 待办入口 | 首页卡片 + 独立菜单 |
| 审批界面 | **抽屉(Drawer)**,容纳步骤条 + 订单详情 + 审批轨迹 |
| 种子数据 | 全部一并造:台式电脑主机 BOM、计划员/生产主管角色账号菜单、订单审批 BPMN 模型 |
| UI | Element Plus,精美优雅,彩色标签 + 步骤条;参考 mes-new 功能,不抄其 UI |

## 3. 现状(已核实的一手事实)

- `sp_order` 表**已预留**本需求所需全部列:`order_source / schedule_mode / bom_id / bom_code / bom_version / customer_name / contract_no / priority / audit_status / plan_status`。但 Java 实体 `SpOrder.java` 仅映射了 9 个旧字段,需补齐。
- 后端**无任何 BPMN 引擎依赖**(pom.xml 无 Activiti/Flowable);workflow 模块只是把 BPMN XML 存库的配置工具,零引擎调用。
- SQL 已预留轻量运行时表 `sp_workflow_instance / sp_workflow_task / sp_workflow_event_log`(`MySQL-init-all.sql:686-753`),注释明确「留待将来运行时周期」,本设计正式启用它们。
- 运行时表为**单任务线性模型**:`instance` 无 current_node 列;`task` 含 `task_key`(节点 key)+ `candidate_role_code`(**单**候选角色,非多组);`event_log` 含 `event_type / message / operator_*`。与「start→审批→end」简单流完全匹配。
- 现有 BPMN XML 为标准 BPMN 2.0(带 `flowable:assignee/candidateGroups`),可被 DOM 解析。

> 后端历史代码多为 DeepSeek 生成、常含 bug,本周期涉及的后端需逐处审查。后端构建用系统 mvn(JDK11+),`./mvnw` 已损坏;dev 环境已关验证码(admin/123 可脚本化登录)。

## 4. 数据与状态模型

### 4.1 SpOrder 实体补齐

在 `SpOrder.java` 增加字段(列已存在):`orderSource`、`scheduleMode`、`bomId`、`bomCode`、`bomVersion`、`customerName`、`contractNo`、`priority`、`auditStatus`、`planStatus`。

### 4.2 枚举约定

- `order_source`:`DEMAND`(需求订单)/ `FORECAST`(预测订单)
- `schedule_mode`:`FORWARD`(正向)/ `BACKWARD`(逆向)。**由 order_source 自动派生**:DEMAND→BACKWARD,FORECAST→FORWARD。表单中只读展示。
- `audit_status`:`DRAFT / APPROVING(审核中) / APPROVED(审核通过) / REJECTED(驳回)`
- `plan_status`:`UNCOMPUTED(待运算) / COMPUTED / RELEASED / CANCELLED / DONE`

### 4.3 状态流转(本周期)

```
计划员录入提交
  ├─ 生成 orderCode
  ├─ auditStatus = APPROVING(审核中)
  ├─ scheduleMode = 由 orderSource 派生
  └─ 启动审批流实例(business_type=ORDER_AUDIT, business_id=订单id)
        └─ 建首个 userTask(候选角色=生产主管, status=PENDING)

生产主管在待办
  ├─ 签收 claim  → task: PENDING→CLAIMED, assignee=主管
  └─ 提交 complete → task: CLAIMED→COMPLETED
        └─ token 前进到 endEvent → instance COMPLETED
              └─ 业务钩子(ORDER_AUDIT): auditStatus=APPROVED, planStatus=UNCOMPUTED(待运算) ← 本周期终点
```

（驳回 reject 作为补充能力:task→REJECTED,instance→REJECTED,auditStatus=REJECTED;非 PPT 主线,但实现以保证流程完整。）

## 5. 轻量 BPMN 运行时(后端核心,无第三方引擎)

### 5.1 解析层 `BpmnParser`

用 JDK 自带 DOM(`javax.xml.parsers`)解析 `sp_workflow_model.bpmn_xml`,提取:
- `startEvent`(id)
- `userTask`(id, name, `flowable:assignee`, `flowable:candidateGroups`)
- `endEvent`(id)
- `sequenceFlow`(id, sourceRef, targetRef)

构成有向图 `ProcessGraph`,提供 `firstNodeAfterStart()`、`nextNode(fromNodeKey)`、`nodeType(key)`、`userTaskMeta(key)`。

### 5.2 引擎服务 `WorkflowEngineService`

- `start(processKey, businessType, businessId, businessCode, title, starter)`:
  建 `sp_workflow_instance`(status=RUNNING);从 startEvent 沿 sequenceFlow 找到首个 `userTask` → 建 `sp_workflow_task`(status=PENDING,`task_key`=节点 id,`candidate_role_code`=由 candidateGroups 解析的角色)。写 event_log(`event_type=START`)。
- `claim(taskId, user)`(**签收**):校验 PENDING 且用户角色 ∈ candidate_role → 置 CLAIMED,`assignee_*`=user,`claim_time`。写 event_log(`CLAIM`)。
- `complete(taskId, user, comment)`(**提交**):校验任务由本人持有 → 置 COMPLETED,`complete_time`、`comment`;从 `task_key` 沿图找下一节点:
  - 下一节点是 `userTask` → 建新任务(PENDING)。
  - 下一节点是 `endEvent` → instance 置 COMPLETED、`end_time`,触发**业务钩子**。
  写 event_log(`COMPLETE` / `END`)。
- `reject(taskId, user, comment)`:task→REJECTED,instance→REJECTED,触发钩子(REJECTED 分支)。写 event_log(`REJECT`)。
- `listTodo(user)`:候选角色 ∈ 用户角色集合 且 status=PENDING 的任务 + status=CLAIMED 且 assignee=user 的任务。
- `history(instanceId)`:返回该实例的 event_log 时间线(供审批轨迹展示)。

> 进度不持久化 current_node:由「已完成任务的 task_key + BPMN 图」即可推导当前活动节点,符合单任务线性模型,避免给运行时表加列。

### 5.3 业务钩子 `BusinessAuditHandler`

接口 `OrderAuditCallback`(按 `business_type` 分发);`ORDER_AUDIT` 实现:
- 流程 COMPLETED → 更新 `sp_order`:`audit_status=APPROVED`,`plan_status=UNCOMPUTED`。
- 流程 REJECTED → `audit_status=REJECTED`。

全程留痕写 `sp_workflow_event_log`。

### 5.4 候选组 → 角色映射

BPMN `flowable:candidateGroups` 存角色编码(如 `prod_supervisor`),直接写入 `task.candidate_role_code`。`listTodo` 用当前用户角色编码集合匹配。

## 6. 后端接口

### 6.1 `ProductionOrderController` → `/plan/order`

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/plan/order/page` | 分页(仅 `order_source` 非空),支持订单号/类型/审批状态过滤 |
| GET | `/plan/order/get-by-id` | 详情 |
| POST | `/plan/order/add-or-update` | 新增/编辑;新增时置 `audit_status=APPROVING`、派生 `schedule_mode`、生成 `orderCode`,并调 `WorkflowEngineService.start(...)` |
| POST | `/plan/order/delete` | 删除(仅 DRAFT/REJECTED 允许,APPROVING/已批不允许删——保护流程) |

### 6.2 `WorkflowTaskController` → `/workflow/task`

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/workflow/task/todo` | 我的待办列表(分页) |
| POST | `/workflow/task/claim` | 签收 `{ taskId }` |
| POST | `/workflow/task/complete` | 提交 `{ taskId, comment }` |
| POST | `/workflow/task/reject` | 驳回 `{ taskId, comment }` |
| GET | `/workflow/task/history/{instanceId}` | 审批轨迹 |

### 6.3 BOM 下拉

复用 `technology/bom`:取 `state=pass` 的产品 BOM,按 `bomCode` 分组取**最新版本**;选中回填 `bomId/bomCode/bomVersion` 及产品物料编码/描述。

## 7. 前端(vue3,Element Plus)

### 7.1 目录

```
src/views/plan/
├── order-entry/
│   ├── OrderEntryList.vue        生产订单录入列表(搜索+表格+新增/查看/删除)
│   └── OrderEntryForm.vue        录入表单(弹窗 FormDialog)
└── todo/
    ├── TodoList.vue              待办任务列表
    └── TodoApprovalDrawer.vue    审批界面(抽屉:步骤条+订单详情+轨迹+签收/提交)
src/views/welcome/components/
└── MyTodoCard.vue                首页「我的待办」卡片(条数徽标+列表,点标题进审批)
src/api/plan/order-entry.ts       orderEntryPage / getById / addOrUpdate / delete
src/api/workflow/task.ts          todoList / claim / complete / reject / history
src/types/plan.ts                 ProductionOrder / WorkflowTask / 枚举
```

复用现成封装:`DataTable / SearchForm / FormDialog / PageContainer / useRequest / usePagination / v-permission`。

### 7.2 路由(与种子菜单 url 对齐)

```
/plan/order   → views/plan/order-entry/OrderEntryList.vue   meta.perm = plan:order:list
/plan/todo    → views/plan/todo/TodoList.vue                meta.perm = plan:todo:list
```

> 侧边栏由 `sp_sys_menu` 驱动且不按角色过滤,新页面路由 path 必须与种子菜单 url 一致,否则点不到。

### 7.3 录入表单字段

| 字段 | 控件 | 必填 | 备注 |
|---|---|---|---|
| 订单类型 orderSource | 单选(需求/预测) | ✓ | 默认需求;切换时联动只读「排产方式」提示 |
| 产品 BOM bomId | 下拉(显示编码+版本徽标+「最新」) | ✓ | 回填 bomCode/bomVersion/物料;选非最新版给 warning |
| 需求数量 qty | 数字 | ✓ | 正整数 |
| 计划交付时间 planEndTime | 日期 | 需求订单必填 | 默认「当前+5 工作日」;预测订单改为「计划开工 planStartTime」 |
| 客户名称 customerName | 文本 | — | |
| 销售合同号 contractNo | 文本 | — | |
| 优先级 priority | 数字 | — | |
| 备注 orderDescription | 文本域 | — | |

提交成功后列表刷新,新行 `audit_status=审核中`。

### 7.4 UI 精美要求(硬约束)

- 订单类型 / 审批状态 / 计划状态用彩色 `el-tag`(语义色:审核中=warning、通过=success、驳回=danger、待运算=primary)。
- BOM 选择器:版本徽标 + 「最新」标识,非最新版即时 warning。
- 审批抽屉:顶部 `el-steps`(开始 → 审批 → 结束)+ 中部订单详情卡片 + 底部 `el-timeline` 审批轨迹;「签收 / 提交 / 驳回」按钮醒目且按任务状态启停(未签收只能签收;已签收才能提交/驳回)。
- 首页卡片:右上角数字徽标显示待办条数;空态优雅。

## 8. 种子数据(SQL 脚本,新增到 scripts/sql/)

1. **角色**:`计划员`(`planner`)、`生产主管`(`prod_supervisor`)。
2. **账号**(MD5×3 + username 盐):`planner / 123`、`supervisor / 123`,分别绑定角色。
3. **菜单**:`生产计划中心`(父)→ 子:`生产订单`(url `/plan/order`,perm `plan:order:list`,含 `plan:order:add`)、`待办任务`(url `/plan/todo`,perm `plan:todo:list`,含 `workflow:task:claim` / `workflow:task:complete`)。菜单不按角色过滤(沿用现状),按钮级用 `v-permission`。
4. **产品 BOM**:「台式电脑主机」`sp_bom`(state=pass)+ 若干 `sp_bom_item` 物料行 + 版本号;确保是该 bomCode 的最新版本。
5. **BPMN 模型**:`sp_workflow_model` + `sp_workflow_definition` 一条「订单审批流程」:`startEvent → userTask(name=审批, candidateGroups=prod_supervisor) → endEvent`,status=PUBLISHED,process_key 固定(如 `orderAudit`)供 `start()` 引用。

## 9. 模块边界与可独立性

- **解析层**(`BpmnParser`/`ProcessGraph`):纯函数式,输入 XML 输出图,可单测,不依赖 DB。
- **引擎层**(`WorkflowEngineService`):依赖 mapper + 解析层,提供 start/claim/complete/reject/listTodo/history,业务无关。
- **业务钩子**(`OrderAuditCallback`):唯一连接「流程」与「订单」的点,按 business_type 隔离。
- **订单录入**与**待办审批**前端两条独立链路,仅通过后端状态耦合。

## 10. 验证要点(本周期完成判据)

1. 计划员账号登录,新增需求订单(BOM=台式电脑主机、数量 10、计划交付=当前+5 工作日),提交后状态=审核中,且生成了一条 RUNNING 实例 + PENDING 任务。
2. 生产主管登录,首页卡片与待办菜单都能看到该任务;点标题进抽屉。
3. 抽屉中签收 → 任务 CLAIMED;提交 → 任务 COMPLETED、实例 COMPLETED。
4. 回到生产订单录入,该订单 `audit_status=APPROVED`、`plan_status=UNCOMPUTED(待运算)`。
5. event_log 留有 START/CLAIM/COMPLETE/END 全轨迹,审批界面时间线可见。
6. 需求订单 schedule_mode=BACKWARD、预测订单=FORWARD 正确派生。
7. 后端涉及代码经审查无明显 bug;TypeScript / 编译通过。

## 11. 不在本周期范围

- MRP 排产运算(逆向/正向算法)。
- 多级审批 / 会签 / 网关分支(当前仅单审批节点;引擎设计上可扩展但不实现)。
- `sp_workflow_event_rule` 脚本引擎(用 Java 钩子替代)。
- 同步到 mes-new(本周期先在 vue3 完成,后续周期同步)。
