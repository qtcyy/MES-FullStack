# 周期 2g-3：生产甘特图交互升级（拖拽改期 + 执行回填）设计

> 状态：已批准设计，待写实现计划
> 日期：2026-06-17
> 前置：周期 2g 已交付「只读甘特图 + hover/点击详情」（commit `ae604d5`）。本周期把交互档位从 **level 1** 提升到 **level 3**：在只读基础上叠加「拖拽改期（写 plan_time）」与「执行回填（写 actual_time / progress）」。

## 1. 目标与范围

把现有只读甘特图升级为可操作的生产计划工具，新增两类写交互：

1. **拖拽改期（level 2）**：拖动「计划条」修改计划起止时间，回写 `plan_start_time` / `plan_end_time`。支持两种手势：
   - **整体平移**：拖中间区域，起止一起移动、工期不变。
   - **两端缩放**：拖左/右端点句柄，独立改计划开始或结束，可改变工期。
2. **执行回填（level 3）**：四个写操作——
   - **记录实际开工**：写 `actual_start_time`（默认当前时间，可改）+ `dispatch_status → 2`。
   - **记录实际完工**：写 `actual_end_time` + `progress = 100` + `dispatch_status → 3`。
   - **更新完工进度**：手动设置 `progress`（0–100）。
   - **手动修正实际时间**：直接编辑 / 纠正 `actual_start_time` / `actual_end_time`（纠错用，不改状态）。

回填控件**两处都放**：条体悬停快捷按钮（高频的开工/完工）+ 详情 Sheet 完整编辑区。

### 非目标（YAGNI）

- 乐观锁 / 并发冲突检测（last-write-wins）。
- 按角色的逐操作权限控制。
- 直接拖拽「实际条」纠正实际时间（纠时统一走 Sheet）。
- 小时级 / 分钟级吸附（统一按天吸附）。

## 2. 架构总览

| 层 | 现状 | 本周期改动 |
|---|---|---|
| DB `sp_order_dispatch` | 已有 `plan_start_time / plan_end_time / actual_start_time / actual_end_time / progress / dispatch_status` | **零 DDL**（列均已存在，上周期 `oper_id/progress` 已加） |
| 后端 Controller | `SpGanttController` 只有只读 `POST /order/gantt/tasks` | 增 5 个语义化写端点 |
| 后端 Service | `SpGanttService` 只有 `listGanttTasks` | 增 5 个 `@Transactional` 写方法 + 状态守卫 |
| 后端 DTO | `GanttQueryReq`、`GanttTaskVO` | 增 5 个请求 DTO |
| 前端 GanttChart | 只读渲染 + `onTaskClick` | 计划条拖拽层（平移 + 两端缩放，按天吸附，实时预览） |
| 前端 TaskDetailSheet | 只读 | 升级为可编辑（开工/完工/进度/纠时操作区） |
| 前端 GanttPage | 单 `useQuery$` 拉数据 | 编排 5 个 `useMutation$`，成功后 `invalidate` 重拉 |
| 前端 ganttUtils | 纯函数（已 TDD） | 增拖拽计算纯函数（平移/缩放/吸附/格式保留），TDD |
| 前端 api/types | `fetchGanttTasks` | 增 5 个 API 函数 + 5 个请求类型 |

后端接口采用**方案 A：语义化薄端点**（每端点自带状态守卫），而非单一通用 PATCH，理由：贴合现有 `/dispatch/assign` 风格、守卫清晰、单测好写；考虑到「后端多为 DeepSeek 生成、每周期需审查」，端点越薄越语义化越容易审。

## 3. 状态机与守卫（后端强制，前端按此显隐按钮）

`dispatch_status`：`1=派工 → 2=开工 → 3=完工`

| 操作 | 前置守卫 | 写入字段 |
|---|---|---|
| `reschedule` | `status != 3`（已完工不可改期）；`planStart ≤ planEnd` | `plan_start_time`、`plan_end_time` |
| `start` | `status == 1` | `actual_start_time`(默认 now)、`status = 2` |
| `finish` | `status == 2` | `actual_end_time`(默认 now)、`progress = 100`、`status = 3` |
| `progress` | `status == 2`；`0 ≤ progress ≤ 100` | `progress` |
| `actual`（纠时） | `status >= 2`；若两值都传则 `start ≤ end` | `actual_start_time` / `actual_end_time`（不改 status） |

守卫不满足时抛业务异常（`RuntimeException`，由全局异常处理转 `Result` 失败），前端 toast 提示。

## 4. 后端接口契约（方案 A）

所有写端点：`@PostMapping` + `@RequestBody`（JSON）+ 返回 `Result`。挂在现有 `SpGanttController`（路由前缀 `/order/gantt`），不新建模块。

| 端点 | 请求体 | 说明 |
|---|---|---|
| `POST /order/gantt/reschedule` | `{ id, planStartTime, planEndTime }` | 拖拽改期 |
| `POST /order/gantt/start` | `{ id, actualStartTime? }` | 记录开工（省略时默认 now） |
| `POST /order/gantt/finish` | `{ id, actualEndTime? }` | 记录完工（省略时默认 now） |
| `POST /order/gantt/progress` | `{ id, progress }` | 更新进度 |
| `POST /order/gantt/actual` | `{ id, actualStartTime?, actualEndTime? }` | 手动修正实际时间 |

- 时间字段为 `String`，格式必须与现有 `/dispatch/assign`（`DispatchDialog` 经 `fromDatetimeLocal` 写入）保持一致——**实现时先确认该格式并统一**（候选 `yyyy-MM-dd HH:mm:ss`）。
- 服务层默认 now 的格式同样需对齐上述格式。
- `id` 为 `sp_order_dispatch.id`（即 `GanttTask.id`）。

### Service 方法骨架（每个方法同构）

```
@Transactional(rollbackFor = Exception.class)
public void reschedule(GanttRescheduleDTO dto) {
    SpOrderDispatch d = baseMapper.selectById(dto.getId());
    if (d == null) throw new RuntimeException("派工记录不存在");
    // 状态守卫……
    // set 字段……
    baseMapper.updateById(d); // update_username/time 由 SpMetaObjectHandler 自动填
}
```

### DeepSeek 审查重点（本周期必查）

- 状态守卫是否真的拦住非法转移（如 `status=3` 仍能 start）。
- 空指针：`selectById` 返回 null、入参 null。
- 数值/时间校验：`planStart > planEnd`、`progress` 越界、`actual start > end`。
- 时间格式与既有写入是否一致（避免甘特图渲染解析不到）。
- 是否误用 `@RequestBody` 与表单编码（写端点用 JSON，前端需带 `JSON_HEADERS`）。

## 5. 前端设计（apps/mes-new）

### 5.1 GanttChart.tsx —— 拖拽层

- **计划条**（顶部细条，`top=4 height=7`）变为可拖：外包一层透明 hit-area（~14px 高）便于抓取；中间区域 = 整体平移，左/右各 ~6px 句柄 = 两端缩放。
- 光标：中间 `grab/grabbing`，端点 `ew-resize`。
- 用原生 **pointer 事件**（`onPointerDown` + `setPointerCapture` + `pointermove/pointerup`），比 HTML5 DnD 更可控。
- **按天吸附**（`dayWidth = 44`）：拖拽中维护本地 `dragPreview` state 实时渲染，`pointerup` 才提交 mutation。
- 拖拽数学抽成 **纯函数**进 `ganttUtils`，TDD：
  - `pxToDays(deltaPx, dayWidth): number`（四舍五入到天）。
  - `shiftPlanByDays(task, deltaDays, mode): { planStartTime, planEndTime }`，`mode ∈ {'move','resize-start','resize-end'}`，**保留原时分秒**，缩放时保证 `start ≤ end`（至少 1 天）。
- **语义约束**：拖拽只改计划条；实际条不可拖（纠时走 Sheet）。

### 5.2 TaskDetailSheet.tsx —— 升级为可编辑

- 保留现有只读字段展示，底部新增「操作区」，按 `dispatchStatus` 显隐：
  - `status=1`：显「记录开工」（可选 datetime 输入，默认 now）。
  - `status=2`：显「记录完工」「更新进度（0–100 滑块/数字）」。
  - `status>=2`：显「手动修正实际时间」（actual start/end 两个 datetime 输入）。
- 表单用 **react-hook-form + zod**（匹配技术栈）。
- ⚠️ **字段名避开 DOM 属性名**（`nodeName` 等会触发 RHF DOM clobbering，导致提交崩溃 + 整页刷新）。

### 5.3 条体悬停快捷按钮

- 复用现有 HoverCard，仅放高频快捷动作：`status=1` 显「记录开工」，`status=2` 显「记录完工」。
- 进度 / 纠时等低频操作只在 Sheet 提供。

### 5.4 GanttPage.tsx + api + types

- `api/order/gantt.ts` 增 5 个函数：`http.post(url, body, JSON_HEADERS)`。
- `types/order.ts` 增 5 个请求类型。
- `GanttPage` 用 `useMutation$` 包 5 个写操作；handler 下传：
  - → GanttChart：`onReschedule`、`onQuickStart`、`onQuickFinish`。
  - → TaskDetailSheet：`onStart`、`onFinish`、`onProgress`、`onAdjustActual`。
- 成功后：`toast.success(...)` + `invalidate('["gantt"...')` 触发自动重拉。
- **走重拉而非乐观更新**：更稳、契合现有 `invalidate` 模式、以后端为真值来源（DeepSeek 后端信任度低，重拉拿真值更安全）。需在实现时确认 gantt query 的 queryKey 以匹配 `invalidate` 前缀。

## 6. 测试与验证

### 前端

- **TDD**：vitest 对 `ganttUtils` 新纯函数（`pxToDays` / `shiftPlanByDays` 平移/缩放/吸附/时分秒保留/`start≤end`）先写 failing test 再实现。
- `pnpm --filter mes-new exec tsc --noEmit`、`pnpm lint`。
- 起 dev server（:4100）人工验证：平移、左缩放、右缩放、开工、完工、进度、纠时全链路 + toast + 自动重拉。

### 后端

- `mvn -DskipTests compile` 通过（mvnw 损坏，用系统 mvn / JDK11+）。
- 若项目已配 Mockito：加 service 单测（mock mapper，断言 5 类守卫拦截非法状态）。
- 人工双端联调（端点因登录验证码无法脚本化鉴权，故以人工联调为准）。

### 验证命令（占位，实现计划中给精确版）

```bash
# 前端
cd mes/frontend && pnpm --filter mes-new test
cd mes/frontend && pnpm --filter mes-new exec tsc --noEmit
cd mes/frontend && pnpm lint
# 后端
cd mes && mvn -DskipTests compile
```

## 7. 文件改动清单

**后端**
- `order/controller/SpGanttController.java`（+5 端点）
- `order/service/SpGanttService.java` / `service/impl/SpGanttServiceImpl.java`（+5 方法 + 守卫）
- `order/dto/`（+5 请求 DTO，与 `GanttQueryReq` 同目录同风格）

**前端**（`apps/mes-new/src/`）
- `pages/order/gantt/GanttChart.tsx`（拖拽层）
- `pages/order/gantt/TaskDetailSheet.tsx`（可编辑）
- `pages/order/gantt/GanttPage.tsx`（编排 mutation）
- `pages/order/gantt/ganttUtils.ts`（+拖拽纯函数）
- `pages/order/gantt/ganttUtils.test.ts`（+测试，TDD）
- `api/order/gantt.ts`（+5 API）
- `types/order.ts`（+5 请求类型）

## 8. 开放项（实现前确认）

1. 后端时间字符串格式 → 以现有 `/dispatch/assign` 写入格式为准，统一服务层默认 now。
2. gantt query 的 `queryKey` → 确认后匹配 `invalidate` 前缀。
3. 后端是否已配 Mockito → 决定 service 单测形态（有则单测，无则编译 + 人工联调）。
