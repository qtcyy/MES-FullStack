# 子周期 1g 设计：AI 助手（Agent 模式，SSE 流式）

- **日期**：2026-06-21
- **分支**：`feature/ai-assistant`
- **范围**：Vue3 课程作业前端（`mes/vue3`），对接已存在的后端 SSE Agent 端点 `POST /admin/ai/chat`
- **后端改动**：默认零改动；仅在「后端审查」发现 bug 时按惯例修正并记录

---

## 1. 背景与后端契约（已读懂，非假设）

后端已存在完整的 **Agent（Function Calling）** 实现，前端尚无任何 AI 文件。

### 端点
- `POST /admin/ai/chat`
- 请求体：`application/json` → `{ "messages": [{ "role": "user"|"assistant", "content": "..." }] }`
- 响应：`text/event-stream`，每条事件为 `data: {jsonEvent}\n\n`，整个流末尾追加哨兵 `data: [DONE]\n\n`

### 事件 JSON（`type` 字段区分）
| type | 携带字段 | 含义 |
|------|----------|------|
| `thinking` | `content`（"正在查询数据..."） | 准备调用工具 |
| `tool_start` | `tool`, `args` | 某工具开始执行 |
| `tool_result` | `tool`, `summary`（"查询到 N 条记录"） | 该工具执行完成 |
| `content` | `content` | 助手最终文本（**整段一次性返回，非逐 token**） |
| `done` | — | 服务侧结束（与 `[DONE]` 哨兵并存，二者都要处理） |
| `error` | `content` | 服务异常 |

### 关键事实
- 后端用 `stream=false` 调 DeepSeek 做 tool-call 检测，**内容不是逐 token 流式**，`content` 整段一次给。
- 最多 5 轮 Agent 循环（`MAX_AGENT_ROUNDS=5`），每轮可触发多个工具。
- 后端有 11 个工具（查工单/物料/设备/BOM/产品BOM/仓库库位/工序/工艺流程/用户/看板总览）。
- 运行依赖：`deepseek.api-key`（`application-dev.yml`）。未配置则端点直接报错。

---

## 2. 总体形态

右下角全局**悬浮球 FAB**，挂在 `AdminLayout` 内，所有业务页可见。

- **不进 `sp_sys_menu`、不改 `urlMap.ts`**（侧边栏菜单驱动，AI 助手作为全局工具而非菜单页）。
- 点击 FAB 从右侧滑出 **Drawer 聊天面板**。
- 面板结构：标题栏（标题 + 新建对话/清空 + 关闭）／消息滚动区／底部输入框。
- 输入框：多行 textarea，**Enter 发送 / Shift+Enter 换行**，发送中禁用 + 显示「停止生成」。
- 会话**仅内存态**（刷新即清空，YAGNI；不持久化 localStorage）。
- 空状态：3–4 个建议提示 chip（「本月工单完成情况」「设备运行状态分布」「物料安全库存预警」「生产看板总览」），点击即填入并发送。

---

## 3. SSE 传输层（关键技术点）

**不能复用现有 axios `http`**：`api/request.ts` 的响应拦截器会按 `Result` 解包并在 401 整页跳转，对 `text/event-stream` 不适用。

新建独立 SSE 客户端 `api/ai.ts`：

```
streamChat(messages, handlers, signal?) -> Promise<void>
```

- `fetch('/api/admin/ai/chat', { method:'POST', headers:{'Content-Type':'application/json'},
   body: JSON.stringify({ messages }), credentials:'include', signal })`
  - URL 用 `${import.meta.env.VITE_API_BASE || '/api'}/admin/ai/chat`，对齐 dev 代理。
  - `credentials:'include'` 携带 Shiro 会话 Cookie。
- 读 `response.body.getReader()` + `TextDecoder('utf-8')`，**自行 SSE 分帧**：
  - 维护缓冲区，按 `\n\n` 切分完整事件帧（处理半包/粘包）。
  - 每帧剥 `data: ` 前缀；`[DONE]` → 结束；其余 `JSON.parse` 成事件对象。
- 错误处理（无 axios 拦截器，全部手动）：
  - `response.status === 401` → `window.location.href = '/login'`。
  - 网络/解析异常 → 调 `handlers.onError`，由上层在气泡显示错误态。
- `handlers` 暴露：`onThinking / onToolStart / onToolResult / onContent / onDone / onError`。
- 通过传入的 `AbortController.signal` 支持中途「停止生成」。

**分帧逻辑是纯函数，可单测**（半包、粘包、多事件同一帧、`[DONE]` 混在帧中）。

---

## 4. 事件 → 状态映射

一条 assistant 消息的状态结构：

```ts
interface AiStep { tool: string; args?: Record<string, unknown>; status: 'running' | 'done'; summary?: string }
interface AiChatMessage {
  role: 'user' | 'assistant'
  steps: AiStep[]          // 工具调用时间线
  content: string          // 最终文本
  status: 'streaming' | 'done' | 'error'
}
```

映射规则：
- `thinking` → 确保有一个「分析中」占位（或更新最近 step 文案）。
- `tool_start` → push 一个 step（`status:'running'`，记 `tool` + `args`）。
- `tool_result` → 把对应 `tool` 的最近 running step 标 `done` + `summary`。
- `content` → 设 `content`，触发打字机逐字显现。
- `done` / `[DONE]` → `status:'done'`，补全打字机。
- `error` → `status:'error'`，气泡显示错误文案。

---

## 5. 组件拆分（单一职责、可独立测试）

| 文件 | 职责 | 依赖 |
|------|------|------|
| `api/ai.ts` | SSE 客户端：fetch + 分帧 + 事件分发 | fetch、`types/ai.ts` |
| `types/ai.ts` | `AiChatMessage` / `AiStep` / 事件类型定义 | — |
| `composables/useAiChat.ts` | 会话状态机：messages 数组、send、abort、事件→状态映射 | `api/ai.ts` |
| `composables/useTypewriter.ts` | 打字机逐字显现（对已到达整段文本节流推进） | — |
| `utils/markdown.ts` | markdown-it 实例（`html:false` 防 XSS）+ 渲染函数 | markdown-it |
| `components/ai/AiFab.vue` | 右下角悬浮球 | — |
| `components/ai/AiChatDrawer.vue` | 抽屉外壳：头部 / 消息列表 / 输入框 / 空状态 chip | useAiChat |
| `components/ai/AiMessage.vue` | 单条消息气泡（用户/助手）+ Markdown 渲染 + 打字机 | markdown、useTypewriter |
| `components/ai/AiToolSteps.vue` | 可折叠步骤时间线（默认折叠，展开看 args） | — |

挂载点：`layouts/AdminLayout.vue` 内同时渲染 `<AiFab>` 与 `<AiChatDrawer>`（drawer 开关状态可由一个轻量 store 或局部 ref 控制；倾向局部 ref + provide，避免新增 store）。

---

## 6. 答案渲染（Markdown + 打字机）

- markdown-it 渲染：标题/列表/表格/代码块；`html:false` 禁原始 HTML 防 XSS。
- 打字机：`content` 整段到达后，按字符节流推进「可见前缀长度」；每次推进对当前前缀实时 markdown 渲染。
- 生成中显示光标；`status:'done'` 后立即补全全文（不卡在动画里）。
- 「停止生成」中断时，保留已显现部分。

---

## 7. 后端审查（本周期惯例）

按既定惯例审查涉及的后端，重点：

1. `AiChatController` — SSE 写入与错误分支（`response.isCommitted()` 判断）。
2. `AiChatServiceImpl` — `done` + `[DONE]` 双信号、JSON 换行转义安全（事件内容经 `writeValueAsString` 已转义 → 单行 `data:` 安全 ✅）、工具异常路径、5 轮上限文案。
3. `ToolRegistry` / `ToolExecutor` — 工具定义与执行的异常返回结构（`{error:...}` / `{total:...}`）。
4. **运行依赖**：确认 `deepseek.api-key` 在 dev 是否配置；未配置则端点 LATENT。

发现 bug → 按惯例修正 + 记录；无 bug → 记 OK。结论写入 `docs/specs/2026-06-21-cycle1g-verify-results.md`。

---

## 8. 测试策略

- **纯逻辑单测**（Vitest）：
  - SSE 分帧（半包/粘包/多事件一帧/`[DONE]`）。
  - 事件→状态映射（thinking/tool_start/tool_result/content/done/error 全路径）。
  - markdown 渲染（`html:false` 生效、基础语法）。
  - 打字机推进（节流、done 后补全）。
- **端点审查记录**：dev 起后端实测 `/admin/ai/chat`；无 key 时记录 LATENT。

---

## 9. 非目标（YAGNI）

- 不做会话持久化（localStorage/后端历史）。
- 不做多会话标签管理。
- 不做真正的逐 token 流式（后端不支持，打字机仅前端模拟）。
- 不改后端工具集与系统提示词。
- 不进侧边栏菜单 / 不改数据库。
