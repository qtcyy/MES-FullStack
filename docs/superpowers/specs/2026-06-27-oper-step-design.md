# 工序步骤（工序作业步骤）功能设计

- 日期：2026-06-27
- 模块：basedata / technology（工序管理，路由 `/basedata/oper`）
- 状态：设计已确认，待写实现计划

## 1. 背景与目标

工序管理页面（`/basedata/oper`）目前只维护工序的基础信息（编号、描述、工时、制造周期、是否生成计划、备注），**无法记录"每个工序的具体作业步骤"**。

经调查，前端无步骤 UI、后端无步骤实体/接口、数据库无步骤子表，该功能**完全未实现**。

本设计为每个工序新增一组**可增删改、可排序的"标准作业步骤"**，作为工序的作业指导明细。

### 需求边界（已与用户确认）

- 步骤丰富度：**标准作业步骤** —— 序号 + 步骤标题 + 详细说明 + 预计耗时(分钟) + 备注。
- 交互方式：列表**行级"步骤"按钮 → 右侧抽屉**，抽屉内为该工序的步骤明细表（增删改 + 上移/下移）。
- 保存粒度：步骤**独立保存**（独立接口，按 `oper_id` 关联），不改动现有工序新增/编辑表单。
- 排序方式：**上移/下移按钮**（交换相邻步骤序号），不引入拖拽库。
- 不新增路由/菜单：抽屉内嵌在现有 `/basedata/oper` 页，无需新增 `sp_sys_menu` 记录。

### YAGNI（本期明确不做）

- 不做图片/附件、质检点、工具/物料等"富 SOP"字段。
- 不做拖拽排序。
- 不做步骤的版本管理 / 审批流。
- 不在工序列表上展示步骤数量徽标（如后续需要再加，属增量）。

## 2. 数据库设计

新增子表 `sp_oper_step`，通过 `oper_id` 关联 `sp_oper.id`。审计字段由 `SpMetaObjectHandler` 自动填充。

```sql
CREATE TABLE `sp_oper_step` (
  `id` varchar(64) NOT NULL COMMENT '主键id',
  `oper_id` varchar(64) NOT NULL COMMENT '所属工序ID(sp_oper.id)',
  `step_no` int DEFAULT '0' COMMENT '步骤序号(排序用,从1开始)',
  `step_title` varchar(255) DEFAULT NULL COMMENT '步骤标题',
  `step_desc` varchar(2000) DEFAULT NULL COMMENT '详细说明',
  `est_minutes` int DEFAULT NULL COMMENT '预计耗时(分钟),可空',
  `remark` varchar(255) DEFAULT NULL COMMENT '备注',
  `create_time` datetime DEFAULT NULL COMMENT '创建时间',
  `create_username` varchar(64) DEFAULT NULL COMMENT '创建人',
  `update_time` datetime DEFAULT NULL COMMENT '更新时间',
  `update_username` varchar(64) DEFAULT NULL COMMENT '更新人',
  PRIMARY KEY (`id`) USING BTREE,
  KEY `idx_oper_id` (`oper_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='工序步骤表';
```

落地位置：
- 新建独立迁移脚本 `scripts/sql/oper-step.sql`（与 `product-bom.sql` 等同款风格）。
- 同步把建表语句追加进 `scripts/sql/MySQL-init-all.sql`（保证全新安装可用）。

## 3. 后端设计

仿照 `SpProductBomItem` 那一套主子表实现，**手写并自行审查**（后端历史多为生成代码、常有 bug）。

包：`com.wangziyang.mes.technology`（与 `SpOper` 同模块）。

### 3.1 实体 `SpOperStep extends BaseEntity`

继承自 `BaseEntity` 的字段：`id`、`createTime`、`createUsername`、`updateTime`、`updateUsername`（不重复声明）。

新增字段：

| Java 字段 | 列 | 类型 | 说明 |
|-----------|-----|------|------|
| `operId` | `oper_id` | String | 所属工序 ID（必填） |
| `stepNo` | `step_no` | Integer | 步骤序号 |
| `stepTitle` | `step_title` | String | 步骤标题 |
| `stepDesc` | `step_desc` | String | 详细说明 |
| `estMinutes` | `est_minutes` | Integer | 预计耗时(分钟)，可空 |
| `remark` | `remark` | String | 备注 |

### 3.2 Mapper / Service

- `SpOperStepMapper extends BaseMapper<SpOperStep>`
- `SpOperStepService extends IService<SpOperStep>` + `SpOperStepServiceImpl`

业务方法：
- `listByOperId(operId)`：按 `step_no` 升序（`id` 作次级稳定排序）返回某工序全部步骤。
- `addOrUpdate(step)`：无 `id` 视为新增，新增时 `stepNo = 该 operId 当前最大 step_no + 1`（从 1 开始）；有 `id` 视为修改（`stepNo` 不在此变更）。
- `move(id, direction)`：在同一 `operId` 内与相邻（上/下）步骤**交换 `step_no`**；已在顶/底则不操作。
- 删除：直接走 `IService#removeById`。

### 3.3 Controller `SpOperStepController`

`@RequestMapping("/basedata/sp-oper-step")`，返回统一 `Result`：

| 接口 | 方法/路径 | 入参编码 | 说明 |
|------|-----------|----------|------|
| 步骤列表 | `GET /list?operId=` | query | 返回该工序全部步骤（按序号升序） |
| 新增/修改 | `POST /add-or-update` | **表单编码**（与 `sp-oper` 一致） | 单条保存 |
| 删除 | `POST /delete` | **`@RequestBody {id}` JSON**（沿用 `sp-oper/delete` 约定） | 按 id 删除 |
| 上/下移 | `POST /move` | 表单编码 `{id, direction}` | direction = `up` / `down` |

> 编码约定依据：现有 `oper.ts` 中 `add-or-update` 为表单编码、`delete` 为 JSON `{id}`。步骤接口与之保持一致，避免前端踩 Content-Type 坑。

## 4. 前端设计（`mes/frontend/apps/mes-new`）

不新增路由/菜单，全部内嵌在现有 `/basedata/oper` 页。

### 4.1 类型与 API

- `src/types/technology.ts` 增加 `SpOperStep` 类型。
- 新建 `src/api/basedata/operStep.ts`：
  - `operStepList(operId: string)` → `GET /basedata/sp-oper-step/list`
  - `operStepAddOrUpdate(record: Partial<SpOperStep>)` → `POST .../add-or-update`（默认表单编码）
  - `operStepDelete(id: string)` → `POST .../delete`，显式 `Content-Type: application/json`，body `{id}`
  - `operStepMove(id: string, direction: 'up' | 'down')` → `POST .../move`（表单编码）

### 4.2 组件

- `OperList.tsx`：每行操作区新增 **"步骤"** 按钮，点击打开 `OperStepDrawer`，透传 `operId`、`operCode`、`operDesc`（用于抽屉标题）。
- `src/pages/basedata/oper/OperStepDrawer.tsx`（新建）：
  - 用 `@workspace/ui` 现有抽屉/Sheet 组件，右侧滑出。
  - 顶部：工序编号 + 描述。
  - 主体：步骤明细表（列：序号 / 标题 / 说明 / 预计耗时 / 操作）。
  - 操作：「新增步骤」按钮；每行「编辑 / 删除 / 上移 / 下移」。
  - 数据加载用项目自研 query-cache hooks（`http/hooks.ts`），按 `operId` 维度缓存，增删改/移动后失效刷新。
- `src/pages/basedata/oper/OperStepForm.tsx`（新建）：单条步骤弹窗表单（react-hook-form + zod）。
  - 字段：`stepTitle`(必填) / `stepDesc`(可空) / `estMinutes`(可空整数 ≥0) / `remark`(可空)。
  - `step_no` 由后端自动管理，表单不暴露。

### 4.3 已知坑规避

- **RHF 字段名 DOM 冲突**：本设计字段名 `stepTitle / stepDesc / estMinutes / remark` 均不与 DOM 属性（如 `nodeName`）冲突，安全。
- **zod optional 拒 null**：`estMinutes` 等可空字段在进入表单 / 提交边界做 `?? undefined` 归一化，避免后端返回的 `null` 触发"点确定无反应"。
- 复用 `UserList.tsx` / `ProductBom` 的样式与样板，不另起一套 UI。

## 5. 权限

不新增 `sp_sys_menu` / 权限串。步骤入口（行级按钮、抽屉内增删改）位于已受 `authc` 保护的 `/basedata/oper` 页内，沿用工序页现有可达性；如后续需要按钮级管控再补 `rbac-buttons` 种子。

## 6. 验证计划

- 后端编译：JDK11 + 系统 `mvn`（`mvnw` 已损坏），`mvn -q -DskipTests compile`。
- 前端：`pnpm --filter mes-new exec tsc --noEmit` 通过 + `pnpm lint` 通过。
- 手测主链路（dev 已关验证码，admin/123）：
  1. 在工序行点「步骤」打开抽屉；
  2. 新增 3 条步骤，序号自动 1/2/3；
  3. 上移/下移验证序号交换、列表顺序正确；
  4. 编辑、删除生效；
  5. 关闭重开抽屉数据持久；不同工序步骤互不串。

## 7. 涉及文件清单

新增：
- `scripts/sql/oper-step.sql`
- `mes/src/main/java/com/wangziyang/mes/technology/entity/SpOperStep.java`
- `.../technology/mapper/SpOperStepMapper.java`
- `.../technology/service/SpOperStepService.java`
- `.../technology/service/impl/SpOperStepServiceImpl.java`
- `.../technology/controller/SpOperStepController.java`
- `mes/frontend/apps/mes-new/src/api/basedata/operStep.ts`
- `.../src/pages/basedata/oper/OperStepDrawer.tsx`
- `.../src/pages/basedata/oper/OperStepForm.tsx`

修改：
- `scripts/sql/MySQL-init-all.sql`（追加建表）
- `mes/frontend/apps/mes-new/src/types/technology.ts`（加 `SpOperStep`）
- `.../src/pages/basedata/oper/OperList.tsx`（加"步骤"按钮 + 抽屉挂载）
