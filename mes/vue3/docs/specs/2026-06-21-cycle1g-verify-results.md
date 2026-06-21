# 子周期 1g 验证与后端审查记录（AI 助手 / Agent / SSE）

- **日期**：2026-06-21
- **分支**：`feature/ai-assistant`
- **后端改动**：**零改动**（审查后未发现需修复的阻断性缺陷）

---

## 一、前端单测结果

全量 `pnpm test`（在 `mes/vue3/`）：

```
Test Files  18 passed (18)
     Tests  179 passed (179)
```

本周期新增 5 个纯逻辑 spec（共 24 个新用例）：

| spec 文件 | 用例数 | 覆盖 |
|-----------|--------|------|
| `tests/sse.spec.ts` | 6 | SSE 分帧：单帧/半包/粘包/任意切断/`[DONE]`/忽略非 data 行 |
| `tests/aiReducer.spec.ts` | 7 | 事件→状态：thinking/tool_start/tool_result/content/done/error + 不可变性 |
| `tests/markdown.spec.ts` | 4 | 标题/列表渲染、`html:false` 防 XSS、空输入 |
| `tests/typewriter.spec.ts` | 4 | 推进步长/夹上限/已达目标/目标缩短 |
| `tests/aiStream.spec.ts` | 3 | streamChat：事件解析+`[DONE]`、401 跳登录、error 事件回调（mock fetch） |

`pnpm typecheck`、`pnpm build`、`pnpm lint` 均通过（仅 5 条既有 `no-explicit-any` warning，非本周期引入）。

---

## 二、后端审查

审查范围（本周期前端对接到的后端）：

### 1. `system/controller/admin/AiChatController.java` — OK
- 直接写 `HttpServletResponse` 输出流（注释说明：规避 `SseEmitter` 异步分发导致 Shiro `ThreadContext` 丢失），合理。
- 每个 chunk 输出 `data: {chunk}\n\n`，流末尾输出 `data: [DONE]\n\n` 哨兵；错误时在响应未提交（`response.isCommitted()` 判断）下写 `data: {"error":...}`。
- 与前端约定一致：前端 `createSseParser` 按 `\n\n` 分帧、识别 `[DONE]`、解析 `{type:...}` / `{error:...}`。

### 2. `system/service/impl/AiChatServiceImpl.java` — OK
- **Agent 模式**：用 `stream=false` 非流式请求检测 tool_calls，最多 `MAX_AGENT_ROUNDS=5` 轮；故 `content` 整段一次性返回（前端打字机为前端模拟，符合设计 §1/§6）。
- 事件经 `objectMapper.writeValueAsString` 序列化 → JSON 已转义换行，单行 `data:` 帧安全（前端分帧不会被内容里的换行破坏）。✅
- 双结束信号：服务侧发 `{"type":"done"}` 事件 + 控制器发 `[DONE]` 哨兵；前端 `streamChat` 两者都能正确收尾（`done` 事件经 reducer 置 done；`[DONE]` 触发 `onDone`）。
- 工具调用循环：`thinking` → `tool_start(tool,args)` → 执行 → `tool_result(tool,summary)`，与前端 reducer 映射一一对应。

### 3. `system/agent/service/ToolRegistry.java` — OK（含 1 处轻微代码异味，非 bug）
- 注册 **10 个只读查询工具**：get_production_orders / get_materials / get_devices / get_bom_list / get_product_bom_structure / get_warehouse_locations / get_process_units / get_flow_routes / get_dashboard_summary / get_users。
- 前端 `utils/aiTools.ts` 的中文标签映射覆盖全部 10 个工具名，一致。
- 轻微异味（不影响功能）：`jsonSchema(...)` 内 `List<Map> list = Arrays.asList(props)` 变量未使用；`opt(...)` 第 4 个 `boolean unused` 形参为死参。建议未来清理，本周期不动后端。

### 4. `system/agent/service/ToolExecutor.java` — OK（含 1 处轻微健壮性观察）
- `execute(toolName, args)` switch 覆盖全部 10 工具，未知工具返回 `{"error":"Unknown tool: ..."}`；外层 `catch(Exception)` 统一返回 `{"error":...}`。
- 各查询方法返回 `{total, limit, <列表>, <分布统计>}`；模块缺失返回 `{"error":"xx模块未加载"}`。与 `ServiceImpl.buildToolResultSummary` 读取 `total`/`error` 的逻辑一致。
- 全部为只读查询（无增删改），无数据安全风险。
- 轻微观察（不影响功能）：catch 块 `e.getMessage().replace(...)` 在 `getMessage()` 为 null（无消息的异常）时会二次 NPE。概率低，建议未来加 null 兜底，本周期不动后端。

---

## 三、运行依赖（关键）

- `application.yml` / `application-dev.yml`：`deepseek.api-key: ${DEEPSEEK_API_KEY:}` —— **默认空值**。
- 结论：**端点功能 LATENT**。未设置环境变量 `DEEPSEEK_API_KEY` 时，后端会以空 Bearer token 调用 DeepSeek，远端返回 401 → 服务捕获后以 `content="请求失败: ..."` 返回。前端会正常显示该错误文案（不崩溃）。
- 要端到端联调需：`export DEEPSEEK_API_KEY=<真实key>` 后再启动后端。

---

## 四、端点实测

- 因 dev 环境未配置 `DEEPSEEK_API_KEY`（默认空），未进行真实 DeepSeek 联调 → 记 **LATENT**。
- 前端对端点的契约对接已由 `tests/aiStream.spec.ts`（mock fetch 模拟 SSE 流 + 401 + error 事件）覆盖验证。
- 待用户提供 key 后，可用以下命令联调（需先登录获取会话 cookie；dev 已关验证码 admin/123）：
  ```bash
  curl -N -X POST http://localhost:9090/admin/ai/chat \
    -H 'Content-Type: application/json' -b "<会话cookie>" \
    -d '{"messages":[{"role":"user","content":"当前有多少生产工单？"}]}'
  ```
  预期：`data: {...}` 事件流 + 末尾 `data: [DONE]`。

---

## 五、结论

- 前端 1g 功能完成：悬浮球 + 抽屉 + 步骤时间线 + 打字机 Markdown，纯逻辑层 100% 单测覆盖。
- 后端审查通过，**零改动**；仅记录 2 处可选优化（ToolRegistry 死参 / ToolExecutor catch NPE 兜底），不阻断。
- 唯一前置条件：`DEEPSEEK_API_KEY` 环境变量（LATENT）。
- 未改 `sp_sys_menu`、未改 `urlMap.ts`，符合设计非目标。
