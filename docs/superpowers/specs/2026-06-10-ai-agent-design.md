# MES AI Agent 功能设计

> 日期：2026-06-10
> 状态：已确认
> 分支：feature/smart-dashboard-redesign

## 1. 概述

为 MES 章鱼师兄平台的 AI 智能助手增加 Agent 能力，使其能调用数据库查询工具获取实时数据，进行统计分析并给出专业建议。

### 1.1 当前状态

- 基线代码：`AiChatServiceImpl` — 单纯的 DeepSeek 流式代理
- 只有静态系统提示词，无工具调用
- 前端 SSE 流式接收原始 token

### 1.2 目标

- **阶段 A（本次）**：仅查询统计能力，AI 可自主调用 10 个只读工具查询 MES 数据库
- **未来 C**：多步骤链式工作流（分析→决策→通知等）

### 1.3 技术约束

- Java 8，Spring Boot 2.1.7
- 排除 Spring AI 和 LangChain4j（需 Java 17+）
- 纯自研方案，基于现有 RestTemplate + SSE

## 2. 架构设计

### 2.1 整体架构

```
Frontend (React)                  Backend (Spring Boot / Java 8)

AIChatPanel ─── SSE ───→ AiChatController ─→ AiChatServiceImpl (Agent Loop)
  ├─ messages[]           POST /admin/ai/chat     ├─ buildSystemPrompt()
  ├─ thinking 状态                                ├─ detectToolCalls() → DeepSeek API
  └─ toolCall 进度                                ├─ ToolRegistry.getAllTools()
                                                   ├─ ToolExecutor.execute()
                                                   │    └─ 现有 Mapper 层
                                                   └─ 流式/非流式 混合请求
```

### 2.2 分层职责

| 层 | 类 | 路径 | 职责 |
|---|---|---|---|
| Controller | `AiChatController` | `system/controller/admin/` | SSE 连接管理 |
| Service | `AiChatServiceImpl` | `system/service/impl/` | Agent 循环编排 |
| Registry | `ToolRegistry` | `system/agent/service/` | 工具定义注册 |
| Executor | `ToolExecutor` | `system/agent/service/` | 工具调度执行 |
| DTO | `AiToolDefinition` | `system/agent/dto/` | 工具 JSON Schema 定义 |

### 2.3 依赖关系

```
AiChatController
    └── IAiChatService.streamChat()
            └── AiChatServiceImpl
                    ├── ToolRegistry.getAllTools()
                    ├── ToolExecutor.execute()
                    └── DeepSeek API (RestTemplate)
```

ToolRegistry 和 ToolExecutor 不互相依赖，通过 AiChatServiceImpl 编排。

## 3. Agent 循环（混合模式）

### 3.1 流程

```
用户发送消息
    ↓
[第1轮] 构建 system prompt + tools → 非流式请求 DeepSeek
    ↓
DeepSeek 返回 tool_calls?
    ├─ 否 → 流式请求 DeepSeek，推送 content token
    │
    └─ 是 → 推送 "thinking" SSE 事件
           循环执行所有 tool_calls
           推送 "tool_result" SSE 事件
           将 assistant_msg + tool_results 加入历史
           ↓
[第2轮] 将历史 + 工具结果 → 非流式请求 DeepSeek
           ↓
       DeepSeek 返回 tool_calls?
            ├─ 否 → 流式输出最终分析
            └─ 是 → 继续循环（最多 5 轮）
```

### 3.2 最大循环数

- 5 轮硬上限，防止死循环
- 超限后返回友好提示

### 3.3 终止条件

- AI 不再返回 tool_calls（正常结束）
- 达到最大循环数
- 工具执行全部失败

## 4. SSE 协议（v2 结构化）

### 4.1 事件类型

```typescript
type SSEEvent =
  | { type: "thinking"; content: string }     // AI 正在思考/调用工具
  | { type: "tool_start"; tool: string; args: Record<string, unknown> }  // 开始调用工具
  | { type: "tool_result"; tool: string; summary: string }  // 工具执行结果
  | { type: "content"; content: string }      // AI 分析文本
  | { type: "done" }                          // 会话结束
  | { type: "error"; message: string }        // 错误
```

### 4.2 前端行为

| 事件 | UI 表现 |
|---|---|
| `thinking` | 显示加载动画 + 提示文案 |
| `tool_start` | 消息气泡中显示 "🔧 正在查询：xxx" |
| `tool_result` | 显示工具返回的数据摘要卡片 |
| `content` | 累积显示 AI 分析文本（流式打字效果） |
| `done` | 停止 loading |
| `error` | 显示红色错误信息 |

## 5. 工具定义

### 5.1 工具注册模式

```java
// ToolRegistry.java
@PostConstruct
public void init() {
    allTools.add(new AiToolDefinition(
        "get_production_orders",
        "查询生产工单列表，可按状态、日期范围过滤。返回工单列表+完成率统计",
        jsonSchema(
            opt("status", "string", "工单状态过滤"),
            opt("startDate", "string", "开始日期 yyyy-MM-dd"),
            opt("endDate", "string", "结束日期 yyyy-MM-dd"),
            opt("limit", "integer", "返回条数上限，默认 50")
        )
    ));
    // ... more tools
}
```

### 5.2 工具清单

| 工具名 | 描述 | 参数 | 返回值 |
|--------|------|------|--------|
| `get_production_orders` | 工单列表+统计 | status, startDate, endDate, limit | {total, stats{状态:数, 完成率}, orders[]} |
| `get_materials` | 物料搜索+类型分布 | keyword, type, limit | {total, typeStats{}, materials[]} |
| `get_devices` | 设备列表+运行统计 | groupId, status, limit | {total, stats{运行中,停机}, devices[]} |
| `get_bom_list` | BOM 清单 | productId, keyword, limit | {total, boms[]} |
| `get_product_bom_structure` | 产品BOM树+子件 | productId (必填) | {productBom, totalItems, items[]} |
| `get_warehouse_stock` | 库存+低库存预警 | warehouseId, materialType, limit | {total, lowStockCount, locations[]} |
| `get_processes` | 工序列表 | keyword, limit | {total, processes[]} |
| `get_flow_routes` | 工艺流程+步骤详情 | productId, keyword, limit | {total, flows[{steps, stepDetails[]}]} |
| `get_dashboard_summary` | 生产看板总览 | 无 | {todayOrders, devices, totalMaterials, lowStockAlerts} |
| `get_users` | 系统用户 | deptId, keyword, limit | {total, users[]} |

### 5.3 工具执行原则

- 每个工具通过 case 分支映射到具体 Mapper 调用
- 统一步骤：QueryWrapper 构建 → 筛选 → 分页 → 统计 → JSON 序列化
- 错误不中断流程，返回 `{"error": "xxx"}` 让 AI 自行处理

## 6. System Prompt 设计

```
你是 MES 章鱼师兄平台的智能 AI 助手，具备数据分析能力，能查询系统数据库并给出专业建议。

## 你的能力
你可以调用以下工具查询 MES 系统的实时数据：
- 查询生产工单：获取工单列表、统计完成率、分析延期情况
- 查询物料信息：搜索原材料/成品/半成品，查看规格和库存
- 查询设备信息：查看设备运行状态、利用率统计
- 查询 BOM 清单和结构：查看物料清单和产品 BOM 树
- 查询仓库库存：查看库存数量和库存预警
- 查询工序工艺：查看工序定义和工艺流程路线
- 查询用户信息：查看系统用户和部门信息
- 生产看板总览：获取今日产量、设备运行率等汇总数据

## 行为准则
1. 主动查数据：当用户询问业务数据时，先调用对应的工具查询数据库
2. 数据分析：对查询到的数据进行分析，得出有意义的结论
3. 给出建议：基于数据给出可操作的建议和改进方向
4. 简洁专业：回答要结构清晰，用数据说话
5. 不懂就问：如果用户问题不明确，主动询问细节后再查

## 平台功能模块
1. 系统管理：用户管理、角色权限、菜单配置、部门管理、数据字典、团队管理
2. 基础数据：物料管理、通用管理、设备组、工序单元、仓库管理、组件管理
3. 工艺技术：BOM 管理、产品 BOM 编辑器、工艺流程、工序管理
4. 生产订单：创建和管理生产订单，跟踪进度
5. 数字化看板：计划仪表盘（ECharts）、3D 仿真（Three.js）
```

## 7. 文件变更清单

### 新增

| 文件 | 路径 | 估计行数 |
|------|------|----------|
| AiToolDefinition | `system/agent/dto/AiToolDefinition.java` | ~50 |
| ToolRegistry | `system/agent/service/ToolRegistry.java` | ~200 |
| ToolExecutor | `system/agent/service/ToolExecutor.java` | ~500 |

### 修改

| 文件 | 改动 |
|------|------|
| `AiChatServiceImpl.java` | 重写为 Agent 循环模式，约 300 行 |
| `api/ai.ts` | 升级 SSE 解析支持结构化事件 |
| `aiChatStore.ts` | 新增 thinking/toolCall 状态管理 |
| `AIChatPanel.tsx` | 展示工具调用进度 |

## 8. 错误处理策略

| 场景 | 处理 |
|------|------|
| DeepSeek API 不可用 | 返回 error SSE 事件 |
| 工具执行异常 | 返回 `{"error":"xxx"}` 给 AI，由 AI 告知用户 |
| Mapper 未加载 | 返回模块未加载提示 |
| 参数缺失 | 工具返回校验错误 |
| 超时 | 5 轮循环上限 |
| SSE 连接中断 | 前端 AbortController + 错误提示 |

## 9. 可扩展性预留

为未来 C 阶段（全自主工作流）预留：
- `ToolExecutor.execute()` 接口接受通用 `Map<String, Object>` 参数
- `ToolRegistry` 支持动态注册，非硬编码
- Agent 循环通过 `MAX_AGENT_ROUNDS` 配置
- SSE 协议已支持任意 events 类型
