# 子周期 1g AI 助手（Agent / SSE）实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 Vue3 前端接入已存在的后端 Agent 端点 `POST /admin/ai/chat`，以「右下角悬浮球 + 右侧抽屉」形态提供可查询 MES 数据库的智能助手，展示工具调用过程并以打字机方式渲染 Markdown 答案。

**Architecture:** 纯逻辑（SSE 分帧 / 事件→状态 reducer / markdown 渲染 / 打字机推进）抽成可单测的工具函数；`api/ai.ts` 用 `fetch + ReadableStream` 手动解析 SSE（绕开 axios 的 Result 解包与 401 拦截）；`composables/useAiChat.ts` 组装会话状态机；UI 组件（悬浮球 / 抽屉 / 消息气泡 / 步骤时间线）挂在 `AdminLayout` 内，不进 `sp_sys_menu`、不改 `urlMap`。

**Tech Stack:** Vue 3.5 `<script setup>` + Element Plus 2.14 + Vitest 4 + markdown-it（新增依赖）。

**工作目录：** 所有 `pnpm` / 路径均相对 `mes/vue3/`。git 操作用仓库根 `/Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack-Vue`。

---

## 文件结构

| 文件 | 职责 | 新建/修改 |
|------|------|-----------|
| `src/types/ai.ts` | 事件 / 消息 / 步骤类型定义 | 新建 |
| `src/utils/sse.ts` | SSE 分帧纯函数 `createSseParser` | 新建 |
| `src/utils/aiReducer.ts` | 事件→消息状态 reducer `applyAiEvent` | 新建 |
| `src/utils/markdown.ts` | markdown-it 渲染 `renderMarkdown`（`html:false`） | 新建 |
| `src/utils/typewriter.ts` | 打字机推进纯函数 `advance` | 新建 |
| `src/utils/aiTools.ts` | 工具名→中文标签/图标映射 | 新建 |
| `src/api/ai.ts` | SSE 流式客户端 `streamChat` | 新建 |
| `src/composables/useTypewriter.ts` | 打字机 composable（包裹 `advance` + 定时器） | 新建 |
| `src/composables/useAiChat.ts` | 会话状态机：messages / send / stop / reset | 新建 |
| `src/components/ai/AiToolSteps.vue` | 可折叠步骤时间线 | 新建 |
| `src/components/ai/AiMessage.vue` | 单条消息气泡 + markdown + 打字机 | 新建 |
| `src/components/ai/AiChatDrawer.vue` | 抽屉外壳：头/列表/空状态/输入 | 新建 |
| `src/components/ai/AiFab.vue` | 右下角悬浮球 | 新建 |
| `src/components/ai/AiAssistant.vue` | 包装：持有 open 状态 + useAiChat，渲染 FAB+Drawer | 新建 |
| `src/layouts/AdminLayout.vue` | 挂载 `<AiAssistant />` | 修改 |
| `tests/sse.spec.ts` | 分帧单测 | 新建 |
| `tests/aiReducer.spec.ts` | reducer 单测 | 新建 |
| `tests/markdown.spec.ts` | 渲染单测 | 新建 |
| `tests/typewriter.spec.ts` | 推进单测 | 新建 |
| `tests/aiStream.spec.ts` | streamChat（mock fetch）单测 | 新建 |
| `docs/specs/2026-06-21-cycle1g-verify-results.md` | 后端审查 + 端点实测记录 | 新建 |

---

## Task 0: 依赖 + 类型定义

**Files:**
- Modify: `mes/vue3/package.json`（经 pnpm add）
- Create: `mes/vue3/src/types/ai.ts`

- [ ] **Step 1: 安装 markdown-it**

Run（在 `mes/vue3/`）:
```bash
pnpm add markdown-it && pnpm add -D @types/markdown-it
```
Expected: `dependencies` 出现 `markdown-it`，`devDependencies` 出现 `@types/markdown-it`，无报错。

- [ ] **Step 2: 创建类型定义**

Create `mes/vue3/src/types/ai.ts`:
```ts
/** AI 助手相关类型 */

export type AiRole = 'user' | 'assistant'

/** 发往后端的消息（只含 role + content） */
export interface AiMessageInput {
  role: AiRole
  content: string
}

/** 后端 SSE 事件类型 */
export type AiEventType = 'thinking' | 'tool_start' | 'tool_result' | 'content' | 'done' | 'error'

/** 后端 SSE 事件（data: 里的 JSON） */
export interface AiEvent {
  type: AiEventType
  content?: string
  tool?: string
  args?: Record<string, unknown>
  summary?: string
}

/** 一次工具调用在前端的展示态 */
export interface AiStep {
  tool: string
  args?: Record<string, unknown>
  status: 'running' | 'done'
  summary?: string
}

/** 一条聊天消息（前端状态） */
export interface AiChatMessage {
  role: AiRole
  content: string
  steps: AiStep[]
  status: 'streaming' | 'done' | 'error'
}
```

- [ ] **Step 3: typecheck**

Run（在 `mes/vue3/`）: `pnpm typecheck`
Expected: 无新增错误（types/ai.ts 编译通过）。

- [ ] **Step 4: Commit**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack-Vue
git add mes/vue3/package.json mes/vue3/pnpm-lock.yaml mes/vue3/src/types/ai.ts
git commit -m "🏷️ feat(vue3): 1g AI 助手类型定义 + markdown-it 依赖"
```

---

## Task 1: SSE 分帧纯函数

把 `text/event-stream` 字节流（可能半包/粘包）按 `\n\n` 切成完整事件，提取 `data:` 负载。

**Files:**
- Create: `mes/vue3/src/utils/sse.ts`
- Test: `mes/vue3/tests/sse.spec.ts`

- [ ] **Step 1: 写失败测试**

Create `mes/vue3/tests/sse.spec.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { createSseParser } from '@/utils/sse'

describe('createSseParser', () => {
  it('单帧完整事件提取 data 负载', () => {
    const p = createSseParser()
    expect(p.push('data: {"type":"content"}\n\n')).toEqual(['{"type":"content"}'])
  })

  it('半包：跨两次 push 才凑齐一帧', () => {
    const p = createSseParser()
    expect(p.push('data: {"a":1}')).toEqual([])
    expect(p.push('}\n\n')).toEqual([]) // 注意：上一行已是完整 json,这里仅演示缓冲
  })

  it('粘包：一次 push 含多帧', () => {
    const p = createSseParser()
    expect(p.push('data: a\n\ndata: b\n\n')).toEqual(['a', 'b'])
  })

  it('字节流被任意切断仍能拼回', () => {
    const p = createSseParser()
    const out: string[] = []
    out.push(...p.push('data: hel'))
    out.push(...p.push('lo\n'))
    out.push(...p.push('\ndata: world\n\n'))
    expect(out).toEqual(['hello', 'world'])
  })

  it('[DONE] 哨兵原样返回', () => {
    const p = createSseParser()
    expect(p.push('data: [DONE]\n\n')).toEqual(['[DONE]'])
  })

  it('忽略非 data 行与空帧', () => {
    const p = createSseParser()
    expect(p.push(': comment\n\ndata: x\n\n')).toEqual(['x'])
  })
})
```

> 说明：第二个用例 `'data: {"a":1}'` 本身就是合法 json 串，被缓冲是因为还没遇到 `\n\n`；第二次 push 的 `'}'` 会拼进负载。为避免歧义，断言只验证「未出帧时返回空数组」。

- [ ] **Step 2: 运行验证失败**

Run: `pnpm test -- sse`
Expected: FAIL —「Cannot find module '@/utils/sse'」。

- [ ] **Step 3: 实现**

Create `mes/vue3/src/utils/sse.ts`:
```ts
/**
 * SSE 分帧器：按空行(\n\n)切分事件帧，提取并拼接 data: 负载。
 * 处理半包/粘包；多行 data 按 SSE 规范用 \n 连接。
 * 返回的字符串里包含 [DONE] 哨兵，由调用方判断。
 */
export function createSseParser() {
  let buffer = ''
  return {
    push(chunk: string): string[] {
      buffer += chunk
      const out: string[] = []
      let idx: number
      while ((idx = buffer.indexOf('\n\n')) !== -1) {
        const frame = buffer.slice(0, idx)
        buffer = buffer.slice(idx + 2)
        const data = frame
          .split('\n')
          .filter((line) => line.startsWith('data:'))
          .map((line) => line.slice(5).replace(/^ /, '').replace(/\r$/, ''))
          .join('\n')
        if (data) out.push(data)
      }
      return out
    },
  }
}
```

- [ ] **Step 4: 运行验证通过**

Run: `pnpm test -- sse`
Expected: PASS（6 个用例全过）。

- [ ] **Step 5: Commit**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack-Vue
git add mes/vue3/src/utils/sse.ts mes/vue3/tests/sse.spec.ts
git commit -m "✨ feat(vue3): 1g SSE 分帧纯函数(TDD)"
```

---

## Task 2: 事件 → 消息状态 reducer

把单条 `AiEvent` 应用到一条 assistant `AiChatMessage` 上，返回更新后的消息（纯函数，便于单测）。

**Files:**
- Create: `mes/vue3/src/utils/aiReducer.ts`
- Test: `mes/vue3/tests/aiReducer.spec.ts`

- [ ] **Step 1: 写失败测试**

Create `mes/vue3/tests/aiReducer.spec.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { applyAiEvent } from '@/utils/aiReducer'
import type { AiChatMessage } from '@/types/ai'

function blank(): AiChatMessage {
  return { role: 'assistant', content: '', steps: [], status: 'streaming' }
}

describe('applyAiEvent', () => {
  it('thinking 保持 streaming，不加步骤', () => {
    const m = applyAiEvent(blank(), { type: 'thinking', content: '正在查询数据...' })
    expect(m.status).toBe('streaming')
    expect(m.steps).toHaveLength(0)
  })

  it('tool_start 追加 running 步骤', () => {
    const m = applyAiEvent(blank(), {
      type: 'tool_start',
      tool: 'get_production_orders',
      args: { statue: 2 },
    })
    expect(m.steps).toHaveLength(1)
    expect(m.steps[0]).toMatchObject({ tool: 'get_production_orders', status: 'running', args: { statue: 2 } })
  })

  it('tool_result 把对应 running 步骤标 done + summary', () => {
    let m = applyAiEvent(blank(), { type: 'tool_start', tool: 'get_devices' })
    m = applyAiEvent(m, { type: 'tool_result', tool: 'get_devices', summary: '查询到 8 条记录' })
    expect(m.steps[0]).toMatchObject({ tool: 'get_devices', status: 'done', summary: '查询到 8 条记录' })
  })

  it('content 写入文本并保持 streaming（交给打字机显现）', () => {
    const m = applyAiEvent(blank(), { type: 'content', content: '# 结论\n占比 60%' })
    expect(m.content).toBe('# 结论\n占比 60%')
    expect(m.status).toBe('streaming')
  })

  it('done 置为 done', () => {
    const m = applyAiEvent(blank(), { type: 'done' })
    expect(m.status).toBe('done')
  })

  it('error 置为 error 并写入错误文案', () => {
    const m = applyAiEvent(blank(), { type: 'error', content: 'AI 服务响应为空' })
    expect(m.status).toBe('error')
    expect(m.content).toBe('AI 服务响应为空')
  })

  it('不修改入参（返回新对象）', () => {
    const src = blank()
    const m = applyAiEvent(src, { type: 'tool_start', tool: 'x' })
    expect(src.steps).toHaveLength(0)
    expect(m).not.toBe(src)
  })
})
```

- [ ] **Step 2: 运行验证失败**

Run: `pnpm test -- aiReducer`
Expected: FAIL —「Cannot find module '@/utils/aiReducer'」。

- [ ] **Step 3: 实现**

Create `mes/vue3/src/utils/aiReducer.ts`:
```ts
import type { AiChatMessage, AiEvent, AiStep } from '@/types/ai'

/** 把一条 SSE 事件应用到 assistant 消息上，返回新消息（不可变） */
export function applyAiEvent(msg: AiChatMessage, ev: AiEvent): AiChatMessage {
  switch (ev.type) {
    case 'thinking':
      return { ...msg, status: 'streaming' }

    case 'tool_start': {
      const step: AiStep = { tool: ev.tool ?? '', args: ev.args, status: 'running' }
      return { ...msg, status: 'streaming', steps: [...msg.steps, step] }
    }

    case 'tool_result': {
      const steps = msg.steps.slice()
      // 从后往前找同名 running 步骤标记完成
      for (let i = steps.length - 1; i >= 0; i--) {
        if (steps[i].tool === ev.tool && steps[i].status === 'running') {
          steps[i] = { ...steps[i], status: 'done', summary: ev.summary }
          break
        }
      }
      return { ...msg, steps }
    }

    case 'content':
      return { ...msg, content: ev.content ?? '', status: 'streaming' }

    case 'done':
      return { ...msg, status: 'done' }

    case 'error':
      return { ...msg, status: 'error', content: ev.content || msg.content || 'AI 服务出错' }

    default:
      return msg
  }
}
```

- [ ] **Step 4: 运行验证通过**

Run: `pnpm test -- aiReducer`
Expected: PASS（7 个用例全过）。

- [ ] **Step 5: Commit**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack-Vue
git add mes/vue3/src/utils/aiReducer.ts mes/vue3/tests/aiReducer.spec.ts
git commit -m "✨ feat(vue3): 1g AI 事件→消息状态 reducer(TDD)"
```

---

## Task 3: Markdown 渲染（html:false 防 XSS）

**Files:**
- Create: `mes/vue3/src/utils/markdown.ts`
- Test: `mes/vue3/tests/markdown.spec.ts`

- [ ] **Step 1: 写失败测试**

Create `mes/vue3/tests/markdown.spec.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { renderMarkdown } from '@/utils/markdown'

describe('renderMarkdown', () => {
  it('渲染标题', () => {
    expect(renderMarkdown('# 标题')).toContain('<h1>')
  })

  it('渲染无序列表', () => {
    const html = renderMarkdown('- a\n- b')
    expect(html).toContain('<ul>')
    expect(html).toContain('<li>a</li>')
  })

  it('禁用原始 HTML（html:false 防 XSS）', () => {
    const html = renderMarkdown('<script>alert(1)</script>')
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
  })

  it('空输入返回空串不报错', () => {
    expect(renderMarkdown('')).toBe('')
    // @ts-expect-error 故意传 undefined
    expect(renderMarkdown(undefined)).toBe('')
  })
})
```

- [ ] **Step 2: 运行验证失败**

Run: `pnpm test -- markdown`
Expected: FAIL —「Cannot find module '@/utils/markdown'」。

- [ ] **Step 3: 实现**

Create `mes/vue3/src/utils/markdown.ts`:
```ts
import MarkdownIt from 'markdown-it'

// html:false → 禁止原始 HTML 注入，防 XSS；linkify 自动识别链接；breaks 单换行转 <br>
const md = new MarkdownIt({ html: false, linkify: true, breaks: true })

/** 渲染 markdown 为 HTML 字符串（已转义原始 HTML） */
export function renderMarkdown(src: string): string {
  return md.render(src ?? '')
}
```

- [ ] **Step 4: 运行验证通过**

Run: `pnpm test -- markdown`
Expected: PASS（4 个用例全过）。注：`renderMarkdown('')` 经 markdown-it 返回 `''`；若返回 `'\n'` 之类，请改断言为 `.trim()` 后比较——先按 `''` 跑，失败再调整。

- [ ] **Step 5: Commit**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack-Vue
git add mes/vue3/src/utils/markdown.ts mes/vue3/tests/markdown.spec.ts
git commit -m "✨ feat(vue3): 1g markdown 渲染(html:false 防 XSS,TDD)"
```

---

## Task 4: 打字机推进纯函数 + composable

后端 `content` 整段一次到达，前端用打字机逐字显现。推进步长是纯函数，便于单测；composable 用定时器驱动。

**Files:**
- Create: `mes/vue3/src/utils/typewriter.ts`
- Create: `mes/vue3/src/composables/useTypewriter.ts`
- Test: `mes/vue3/tests/typewriter.spec.ts`

- [ ] **Step 1: 写失败测试**

Create `mes/vue3/tests/typewriter.spec.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { advance } from '@/utils/typewriter'

describe('advance', () => {
  it('每次推进 step 个字符', () => {
    expect(advance(0, 100, 5)).toBe(5)
    expect(advance(5, 100, 5)).toBe(10)
  })

  it('不超过目标长度', () => {
    expect(advance(98, 100, 5)).toBe(100)
  })

  it('已达目标则保持', () => {
    expect(advance(100, 100, 5)).toBe(100)
  })

  it('目标缩短（新一轮回复）时夹到目标', () => {
    expect(advance(50, 10, 5)).toBe(10)
  })
})
```

- [ ] **Step 2: 运行验证失败**

Run: `pnpm test -- typewriter`
Expected: FAIL —「Cannot find module '@/utils/typewriter'」。

- [ ] **Step 3: 实现纯函数**

Create `mes/vue3/src/utils/typewriter.ts`:
```ts
/** 打字机推进：从 current 朝 targetLen 前进 step 个字符，夹在 [0, targetLen] */
export function advance(current: number, targetLen: number, step: number): number {
  if (current >= targetLen) return targetLen
  return Math.min(targetLen, current + step)
}
```

- [ ] **Step 4: 运行验证通过**

Run: `pnpm test -- typewriter`
Expected: PASS（4 个用例全过）。

- [ ] **Step 5: 实现 composable**

Create `mes/vue3/src/composables/useTypewriter.ts`:
```ts
import { ref, watch, onUnmounted, type Ref } from 'vue'
import { advance } from '@/utils/typewriter'

/**
 * 打字机 composable：随 full 增长逐字显现 visible。
 * done 为 true 时立即补全全文。
 * @param full 目标全文（响应式）
 * @param done 是否结束（响应式）
 * @param cps  每秒字符数，默认 240
 */
export function useTypewriter(full: Ref<string>, done: Ref<boolean>, cps = 240) {
  const visible = ref('')
  let timer: ReturnType<typeof setInterval> | null = null
  const stepPerTick = Math.max(1, Math.round(cps / 30)) // ~30fps

  function stop() {
    if (timer !== null) {
      clearInterval(timer)
      timer = null
    }
  }

  function tick() {
    const next = advance(visible.value.length, full.value.length, stepPerTick)
    visible.value = full.value.slice(0, next)
    if (next >= full.value.length) stop()
  }

  watch(
    [full, done],
    () => {
      if (done.value) {
        visible.value = full.value
        stop()
        return
      }
      if (visible.value.length < full.value.length && timer === null) {
        timer = setInterval(tick, 33)
      }
    },
    { immediate: true },
  )

  onUnmounted(stop)
  return { visible }
}
```

- [ ] **Step 6: typecheck**

Run: `pnpm typecheck`
Expected: 无新增错误。

- [ ] **Step 7: Commit**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack-Vue
git add mes/vue3/src/utils/typewriter.ts mes/vue3/src/composables/useTypewriter.ts mes/vue3/tests/typewriter.spec.ts
git commit -m "✨ feat(vue3): 1g 打字机推进纯函数 + composable(TDD)"
```

---

## Task 5: SSE 流式客户端 streamChat

用 `fetch + ReadableStream` 请求 `/admin/ai/chat`，分帧 + JSON 解析后回调 handlers。绕开 axios（其响应拦截器会按 Result 解包、对 401 整页跳转，均不适用于 event-stream）。

**Files:**
- Create: `mes/vue3/src/api/ai.ts`
- Test: `mes/vue3/tests/aiStream.spec.ts`

- [ ] **Step 1: 写失败测试**

Create `mes/vue3/tests/aiStream.spec.ts`:
```ts
import { describe, it, expect, vi, afterEach } from 'vitest'
import { streamChat } from '@/api/ai'
import type { AiEvent } from '@/types/ai'

/** 用给定文本块构造一个 SSE 响应流 */
function sseResponse(chunks: string[], status = 200): Response {
  const enc = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const c of chunks) controller.enqueue(enc.encode(c))
      controller.close()
    },
  })
  return new Response(stream, { status })
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('streamChat', () => {
  it('解析事件并在 [DONE] 处触发 onDone', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        sseResponse([
          'data: {"type":"tool_start","tool":"get_devices"}\n\n',
          'data: {"type":"content","content":"hi"}\n\n',
          'data: [DONE]\n\n',
        ]),
      ),
    )
    const events: AiEvent[] = []
    let doneCalled = false
    await streamChat([{ role: 'user', content: 'q' }], {
      onEvent: (ev) => events.push(ev),
      onDone: () => { doneCalled = true },
      onError: () => { throw new Error('should not error') },
    })
    expect(events.map((e) => e.type)).toEqual(['tool_start', 'content'])
    expect(doneCalled).toBe(true)
  })

  it('401 跳转登录而不触发 onError', async () => {
    const loc = { href: '' }
    vi.stubGlobal('location', loc as unknown as Location)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(sseResponse([], 401)))
    let errored = false
    await streamChat([{ role: 'user', content: 'q' }], {
      onEvent: () => {},
      onDone: () => {},
      onError: () => { errored = true },
    })
    expect(loc.href).toBe('/login')
    expect(errored).toBe(false)
  })

  it('error 事件触发 onError', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(sseResponse(['data: {"type":"error","content":"boom"}\n\n'])),
    )
    let msg = ''
    await streamChat([{ role: 'user', content: 'q' }], {
      onEvent: () => {},
      onDone: () => {},
      onError: (m) => { msg = m },
    })
    expect(msg).toBe('boom')
  })
})
```

- [ ] **Step 2: 运行验证失败**

Run: `pnpm test -- aiStream`
Expected: FAIL —「Cannot find module '@/api/ai'」。

- [ ] **Step 3: 实现**

Create `mes/vue3/src/api/ai.ts`:
```ts
import { createSseParser } from '@/utils/sse'
import type { AiEvent, AiMessageInput } from '@/types/ai'

export interface StreamHandlers {
  onEvent: (ev: AiEvent) => void
  onDone: () => void
  onError: (msg: string) => void
}

/**
 * 请求后端 Agent 端点并流式解析 SSE。
 * 绕开 axios：手动处理 401 与分帧。signal 可中断（停止生成）。
 */
export async function streamChat(
  messages: AiMessageInput[],
  handlers: StreamHandlers,
  signal?: AbortSignal,
): Promise<void> {
  const base = (import.meta.env.VITE_API_BASE as string) || '/api'
  let resp: Response
  try {
    resp = await fetch(`${base}/admin/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
      credentials: 'include',
      signal,
    })
  } catch (e) {
    if ((e as Error).name === 'AbortError') return
    handlers.onError('网络连接失败')
    return
  }

  if (resp.status === 401) {
    window.location.href = '/login'
    return
  }
  if (!resp.ok || !resp.body) {
    handlers.onError(`AI 服务异常 (${resp.status})`)
    return
  }

  const reader = resp.body.getReader()
  const decoder = new TextDecoder('utf-8')
  const parser = createSseParser()

  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      for (const data of parser.push(decoder.decode(value, { stream: true }))) {
        if (data === '[DONE]') {
          handlers.onDone()
          return
        }
        let ev: AiEvent
        try {
          ev = JSON.parse(data) as AiEvent
        } catch {
          continue // 跳过坏帧
        }
        handlers.onEvent(ev)
        if (ev.type === 'error') {
          handlers.onError(ev.content || 'AI 服务出错')
          return
        }
      }
    }
    handlers.onDone()
  } catch (e) {
    if ((e as Error).name === 'AbortError') return
    handlers.onError('读取响应流失败')
  }
}
```

- [ ] **Step 4: 运行验证通过**

Run: `pnpm test -- aiStream`
Expected: PASS（3 个用例全过）。

- [ ] **Step 5: Commit**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack-Vue
git add mes/vue3/src/api/ai.ts mes/vue3/tests/aiStream.spec.ts
git commit -m "✨ feat(vue3): 1g SSE 流式客户端 streamChat(TDD)"
```

---

## Task 6: 会话状态机 useAiChat

组装 messages 数组、send（推送用户消息 + 占位 assistant + 流式更新）、stop（abort）、reset（清空）。无独立单测（依赖 Vue 响应式 + fetch，已由 reducer/sse/api 测试覆盖逻辑）；以 typecheck + 后续手动验证为准。

**Files:**
- Create: `mes/vue3/src/composables/useAiChat.ts`

- [ ] **Step 1: 实现**

Create `mes/vue3/src/composables/useAiChat.ts`:
```ts
import { ref, reactive } from 'vue'
import { streamChat } from '@/api/ai'
import { applyAiEvent } from '@/utils/aiReducer'
import type { AiChatMessage, AiMessageInput } from '@/types/ai'

export function useAiChat() {
  const messages = ref<AiChatMessage[]>([])
  const sending = ref(false)
  let controller: AbortController | null = null

  function stop() {
    controller?.abort()
    controller = null
    sending.value = false
    // 把仍在 streaming 的助手消息收尾
    const last = messages.value[messages.value.length - 1]
    if (last && last.role === 'assistant' && last.status === 'streaming') {
      last.status = 'done'
    }
  }

  function reset() {
    stop()
    messages.value = []
  }

  async function send(text: string) {
    const content = text.trim()
    if (!content || sending.value) return

    messages.value.push({ role: 'user', content, steps: [], status: 'done' })
    const assistant = reactive<AiChatMessage>({
      role: 'assistant',
      content: '',
      steps: [],
      status: 'streaming',
    })
    messages.value.push(assistant)
    sending.value = true
    controller = new AbortController()

    // 历史：用户消息 + 已有内容的助手消息（排除当前空占位）
    const history: AiMessageInput[] = messages.value
      .filter((m) => m.role === 'user' || (m.role === 'assistant' && m.content))
      .map((m) => ({ role: m.role, content: m.content }))

    await streamChat(
      history,
      {
        onEvent: (ev) => {
          Object.assign(assistant, applyAiEvent(assistant, ev))
        },
        onDone: () => {
          if (assistant.status !== 'error') assistant.status = 'done'
          sending.value = false
          controller = null
        },
        onError: (msg) => {
          assistant.status = 'error'
          if (!assistant.content) assistant.content = msg
          sending.value = false
          controller = null
        },
      },
      controller.signal,
    )
  }

  return { messages, sending, send, stop, reset }
}
```

- [ ] **Step 2: typecheck**

Run: `pnpm typecheck`
Expected: 无新增错误。

- [ ] **Step 3: Commit**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack-Vue
git add mes/vue3/src/composables/useAiChat.ts
git commit -m "✨ feat(vue3): 1g 会话状态机 useAiChat"
```

---

## Task 7: UI 组件 + 挂载

工具标签映射 → 步骤时间线 → 消息气泡 → 抽屉 → 悬浮球 → 包装组件 → 挂进 AdminLayout。无组件单测（项目无此惯例），以 `pnpm build` + 手动验证为准。

**Files:**
- Create: `mes/vue3/src/utils/aiTools.ts`
- Create: `mes/vue3/src/components/ai/AiToolSteps.vue`
- Create: `mes/vue3/src/components/ai/AiMessage.vue`
- Create: `mes/vue3/src/components/ai/AiChatDrawer.vue`
- Create: `mes/vue3/src/components/ai/AiFab.vue`
- Create: `mes/vue3/src/components/ai/AiAssistant.vue`
- Modify: `mes/vue3/src/layouts/AdminLayout.vue`

- [ ] **Step 1: 工具标签映射**

Create `mes/vue3/src/utils/aiTools.ts`:
```ts
/** 后端工具名 → 中文展示标签 */
const TOOL_LABELS: Record<string, string> = {
  get_production_orders: '查询生产工单',
  get_materials: '查询物料信息',
  get_devices: '查询设备信息',
  get_bom_list: '查询 BOM 清单',
  get_product_bom_structure: '查询产品 BOM 结构',
  get_warehouse_locations: '查询仓库库位',
  get_process_units: '查询工序单元',
  get_flow_routes: '查询工艺流程',
  get_users: '查询用户信息',
  get_dashboard_summary: '生产看板总览',
}

export function toolLabel(tool: string): string {
  return TOOL_LABELS[tool] ?? tool
}
```

- [ ] **Step 2: 步骤时间线组件**

Create `mes/vue3/src/components/ai/AiToolSteps.vue`:
```vue
<template>
  <div v-if="steps.length" class="ai-steps">
    <button class="ai-steps__head" type="button" @click="open = !open">
      <el-icon :class="{ 'is-open': open }"><CaretRight /></el-icon>
      <span>查询过程（{{ steps.length }} 步）</span>
      <el-icon v-if="hasRunning" class="ai-steps__spin"><Loading /></el-icon>
    </button>
    <ul v-show="open" class="ai-steps__list">
      <li v-for="(s, i) in steps" :key="i" class="ai-steps__item">
        <el-icon v-if="s.status === 'running'" class="ai-steps__spin"><Loading /></el-icon>
        <el-icon v-else class="ai-steps__ok"><Select /></el-icon>
        <span class="ai-steps__label">{{ toolLabel(s.tool) }}</span>
        <span v-if="s.summary" class="ai-steps__summary">{{ s.summary }}</span>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { CaretRight, Loading, Select } from '@element-plus/icons-vue'
import { toolLabel } from '@/utils/aiTools'
import type { AiStep } from '@/types/ai'

const props = defineProps<{ steps: AiStep[] }>()
const hasRunning = computed(() => props.steps.some((s) => s.status === 'running'))
// 运行中默认展开，全部完成后自动折叠
const open = ref(true)
watch(hasRunning, (running) => { if (!running) open.value = false })
</script>

<style scoped>
.ai-steps {
  margin-bottom: 8px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-body);
  font-size: 13px;
}
.ai-steps__head {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 6px 10px;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-secondary, #888);
}
.ai-steps__head .el-icon { transition: transform 0.2s; }
.ai-steps__head .el-icon.is-open { transform: rotate(90deg); }
.ai-steps__list { list-style: none; margin: 0; padding: 0 10px 8px 26px; }
.ai-steps__item { display: flex; align-items: center; gap: 6px; padding: 3px 0; }
.ai-steps__ok { color: var(--el-color-success); }
.ai-steps__spin { animation: ai-spin 0.9s linear infinite; }
.ai-steps__summary { color: var(--text-secondary, #999); margin-left: auto; }
@keyframes ai-spin { to { transform: rotate(360deg); } }
</style>
```

- [ ] **Step 3: 消息气泡组件**

Create `mes/vue3/src/components/ai/AiMessage.vue`:
```vue
<template>
  <div class="ai-msg" :class="`ai-msg--${message.role}`">
    <div class="ai-msg__bubble">
      <template v-if="message.role === 'assistant'">
        <AiToolSteps :steps="message.steps" />
        <div v-if="html" class="ai-msg__md" v-html="html" />
        <div v-else-if="message.status === 'streaming'" class="ai-msg__typing">
          <span class="ai-msg__dot" /><span class="ai-msg__dot" /><span class="ai-msg__dot" />
        </div>
      </template>
      <template v-else>
        <span class="ai-msg__text">{{ message.content }}</span>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, toRef } from 'vue'
import AiToolSteps from './AiToolSteps.vue'
import { useTypewriter } from '@/composables/useTypewriter'
import { renderMarkdown } from '@/utils/markdown'
import type { AiChatMessage } from '@/types/ai'

const props = defineProps<{ message: AiChatMessage }>()

const full = toRef(() => props.message.content)
const done = computed(() => props.message.status !== 'streaming')
const { visible } = useTypewriter(full, done)
const html = computed(() => (visible.value ? renderMarkdown(visible.value) : ''))
</script>

<style scoped>
.ai-msg { display: flex; margin-bottom: 12px; }
.ai-msg--user { justify-content: flex-end; }
.ai-msg__bubble {
  max-width: 86%;
  padding: 10px 12px;
  border-radius: 10px;
  line-height: 1.6;
  font-size: 14px;
  word-break: break-word;
}
.ai-msg--user .ai-msg__bubble { background: var(--brand, #409eff); color: #fff; }
.ai-msg--assistant .ai-msg__bubble { background: var(--bg-card, #f5f7fa); color: var(--text-primary, #303133); }
.ai-msg__md :deep(p) { margin: 4px 0; }
.ai-msg__md :deep(ul), .ai-msg__md :deep(ol) { margin: 4px 0; padding-left: 20px; }
.ai-msg__md :deep(table) { border-collapse: collapse; margin: 6px 0; }
.ai-msg__md :deep(th), .ai-msg__md :deep(td) { border: 1px solid var(--border); padding: 3px 8px; }
.ai-msg__md :deep(code) { background: rgba(0,0,0,0.06); padding: 1px 4px; border-radius: 3px; }
.ai-msg__md :deep(pre) { background: rgba(0,0,0,0.06); padding: 8px; border-radius: 6px; overflow-x: auto; }
.ai-msg__typing { display: flex; gap: 4px; padding: 4px 0; }
.ai-msg__dot { width: 6px; height: 6px; border-radius: 50%; background: var(--text-secondary, #bbb); animation: ai-blink 1.2s infinite; }
.ai-msg__dot:nth-child(2) { animation-delay: 0.2s; }
.ai-msg__dot:nth-child(3) { animation-delay: 0.4s; }
@keyframes ai-blink { 0%, 60%, 100% { opacity: 0.3; } 30% { opacity: 1; } }
</style>
```

> 注：`toRef(() => props.message.content)` 是 Vue 3.3+ 的 getter 形式 ref，随 props 变化保持响应。若 typecheck 报错，改用 `computed(() => props.message.content)` 并把 `useTypewriter` 第一参类型放宽为 `Ref<string> | ComputedRef<string>`（两者均满足 `Ref<string>` 读取约束）。

- [ ] **Step 4: 抽屉组件**

Create `mes/vue3/src/components/ai/AiChatDrawer.vue`:
```vue
<template>
  <el-drawer
    :model-value="modelValue"
    title="AI 智能助手"
    direction="rtl"
    size="420px"
    :with-header="true"
    @update:model-value="(v: boolean) => emit('update:modelValue', v)"
  >
    <template #header>
      <div class="ai-drawer__header">
        <span>🐙 AI 智能助手</span>
        <el-button text size="small" :disabled="!chat.messages.value.length" @click="chat.reset()">
          清空
        </el-button>
      </div>
    </template>

    <div class="ai-drawer">
      <div ref="listEl" class="ai-drawer__list">
        <template v-if="chat.messages.value.length">
          <AiMessage v-for="(m, i) in chat.messages.value" :key="i" :message="m" />
        </template>
        <div v-else class="ai-drawer__empty">
          <p class="ai-drawer__empty-title">你好，我能查询 MES 实时数据并给出分析建议 👋</p>
          <div class="ai-drawer__chips">
            <button
              v-for="q in SUGGESTIONS"
              :key="q"
              class="ai-drawer__chip"
              type="button"
              @click="ask(q)"
            >
              {{ q }}
            </button>
          </div>
        </div>
      </div>

      <div class="ai-drawer__input">
        <el-input
          v-model="draft"
          type="textarea"
          :rows="2"
          resize="none"
          placeholder="输入问题，Enter 发送 / Shift+Enter 换行"
          @keydown="onKeydown"
        />
        <div class="ai-drawer__actions">
          <el-button v-if="chat.sending.value" type="danger" plain size="small" @click="chat.stop()">
            停止
          </el-button>
          <el-button
            v-else
            type="primary"
            size="small"
            :disabled="!draft.trim()"
            @click="ask(draft)"
          >
            发送
          </el-button>
        </div>
      </div>
    </div>
  </el-drawer>
</template>

<script setup lang="ts">
import { ref, nextTick, watch } from 'vue'
import AiMessage from './AiMessage.vue'
import type { useAiChat } from '@/composables/useAiChat'

const props = defineProps<{ modelValue: boolean; chat: ReturnType<typeof useAiChat> }>()
const emit = defineEmits<{ 'update:modelValue': [boolean] }>()

const SUGGESTIONS = [
  '本月生产工单完成情况如何？',
  '当前设备运行状态分布',
  '哪些物料低于安全库存？',
  '给我一份生产看板总览',
]

const draft = ref('')
const listEl = ref<HTMLElement | null>(null)

async function scrollToBottom() {
  await nextTick()
  if (listEl.value) listEl.value.scrollTop = listEl.value.scrollHeight
}

function ask(text: string) {
  const t = text.trim()
  if (!t || props.chat.sending.value) return
  draft.value = ''
  props.chat.send(t)
  scrollToBottom()
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    ask(draft.value)
  }
}

// 消息或流式内容变化时自动滚到底
watch(
  () => props.chat.messages.value.map((m) => m.content + m.steps.length).join('|'),
  scrollToBottom,
)
</script>

<style scoped>
.ai-drawer__header { display: flex; align-items: center; justify-content: space-between; }
.ai-drawer { display: flex; flex-direction: column; height: 100%; }
.ai-drawer__list { flex: 1; overflow-y: auto; padding: 4px 2px; }
.ai-drawer__empty { padding: 24px 8px; text-align: center; color: var(--text-secondary, #909399); }
.ai-drawer__empty-title { margin-bottom: 16px; font-size: 14px; }
.ai-drawer__chips { display: flex; flex-direction: column; gap: 8px; }
.ai-drawer__chip {
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-card);
  cursor: pointer;
  font-size: 13px;
  text-align: left;
  transition: border-color 0.2s;
}
.ai-drawer__chip:hover { border-color: var(--brand, #409eff); color: var(--brand, #409eff); }
.ai-drawer__input { padding-top: 8px; border-top: 1px solid var(--border); }
.ai-drawer__actions { display: flex; justify-content: flex-end; margin-top: 6px; }
</style>
```

- [ ] **Step 5: 悬浮球组件**

Create `mes/vue3/src/components/ai/AiFab.vue`:
```vue
<template>
  <button class="ai-fab" type="button" title="AI 智能助手" @click="emit('click')">
    <el-icon :size="24"><ChatDotRound /></el-icon>
  </button>
</template>

<script setup lang="ts">
import { ChatDotRound } from '@element-plus/icons-vue'
const emit = defineEmits<{ click: [] }>()
</script>

<style scoped>
.ai-fab {
  position: fixed;
  right: 24px;
  bottom: 24px;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  border: none;
  background: var(--brand, #409eff);
  color: #fff;
  cursor: pointer;
  box-shadow: 0 6px 18px rgba(64, 158, 255, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  transition: transform 0.2s, box-shadow 0.2s;
}
.ai-fab:hover { transform: scale(1.08); box-shadow: 0 8px 22px rgba(64, 158, 255, 0.6); }
</style>
```

- [ ] **Step 6: 包装组件（持有状态）**

Create `mes/vue3/src/components/ai/AiAssistant.vue`:
```vue
<template>
  <AiFab @click="open = true" />
  <AiChatDrawer v-model="open" :chat="chat" />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import AiFab from './AiFab.vue'
import AiChatDrawer from './AiChatDrawer.vue'
import { useAiChat } from '@/composables/useAiChat'

// 在此持有会话与开关，保证抽屉关闭再打开时历史仍在
const open = ref(false)
const chat = useAiChat()
</script>
```

- [ ] **Step 7: 挂进 AdminLayout**

Modify `mes/vue3/src/layouts/AdminLayout.vue` — 在最外层 `</el-container>`（admin-layout 根容器的闭合标签）之前插入 `<AiAssistant />`：

把模板结尾这一段：
```vue
      </el-container>
  </el-container>
</template>
```
改为：
```vue
      </el-container>

    <AiAssistant />
  </el-container>
</template>
```

并在 `<script setup>` 顶部 import 区加入：
```ts
import AiAssistant from '@/components/ai/AiAssistant.vue'
```

- [ ] **Step 8: typecheck + build**

Run（在 `mes/vue3/`）:
```bash
pnpm typecheck && pnpm build
```
Expected: 均无错误。若 `AiMessage.vue` 的 `toRef(getter)` 报类型错，按 Step 3 注释改 `computed`。

- [ ] **Step 9: lint**

Run: `pnpm lint`
Expected: 无报错（`--fix` 自动修格式）。

- [ ] **Step 10: Commit**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack-Vue
git add mes/vue3/src/utils/aiTools.ts mes/vue3/src/components/ai mes/vue3/src/layouts/AdminLayout.vue
git commit -m "✨ feat(vue3): 1g AI 助手 UI(悬浮球+抽屉+步骤时间线)"
```

---

## Task 8: 后端审查 + 端点实测记录

按「后端每周期审查」惯例，审查涉及的后端并记录；实测端点（无 key 则记 LATENT）。

**Files:**
- Create: `mes/vue3/docs/specs/2026-06-21-cycle1g-verify-results.md`
- 仅当发现 bug 时修改：`mes/src/main/java/com/wangziyang/mes/system/...`

- [ ] **Step 1: 审查后端四类文件**

Read 并核对：
- `system/controller/admin/AiChatController.java` — SSE 写入、`[DONE]` 哨兵、错误分支 `response.isCommitted()`。
- `system/service/impl/AiChatServiceImpl.java` — `done` 事件 + `[DONE]` 双信号、JSON 换行转义（`writeValueAsString` 已转义 → 单行 `data:` 安全）、工具异常路径、5 轮上限文案。
- `system/agent/service/ToolRegistry.java`、`ToolExecutor.java` — 工具定义结构、执行异常返回（`{error:...}` / `{total:...}`）。

逐项记录结论（OK / 风险 / bug）。发现 bug → 在此 Task 内修正 + 补后端单测（若有测试目录）。

- [ ] **Step 2: 确认运行依赖**

Run:
```bash
grep -n "api-key" /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack-Vue/mes/src/main/resources/application-dev.yml
```
判断 `deepseek.api-key` 是否已配置真实值。未配置 → 端点为 LATENT（需用户提供 key 才能联调）。

- [ ] **Step 3: 端点实测（条件允许时）**

若后端可起且有 key（参考记忆：dev 用 JDK11+ 系统 mvn 启动、已关验证码 admin/123）：
```bash
curl -N -X POST http://localhost:9090/admin/ai/chat \
  -H 'Content-Type: application/json' \
  -b "<已登录会话 cookie>" \
  -d '{"messages":[{"role":"user","content":"当前有多少生产工单？"}]}'
```
Expected: 收到 `data: {...}` 事件流，末尾 `data: [DONE]`。记录实际响应片段。
若无 key/无法起服务 → 记 LATENT 并跳过。

- [ ] **Step 4: 写审查记录**

Create `mes/vue3/docs/specs/2026-06-21-cycle1g-verify-results.md`，包含：
- 审查的后端文件清单与逐项结论（OK / LATENT / 修复）
- 前端单测结果（`pnpm test` 全绿截图/输出摘要）
- 端点实测结果或 LATENT 原因
- 后端是否改动（默认零改动）

- [ ] **Step 5: 全量测试 + Commit**

Run（在 `mes/vue3/`）: `pnpm test`
Expected: 全部 spec PASS。

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack-Vue
git add mes/vue3/docs/specs/2026-06-21-cycle1g-verify-results.md
# 若有后端修复一并 add 对应 java 文件
git commit -m "✅ test(vue3): 1g AI 端点审查记录 + 前端单测"
```

---

## 完成标准（Definition of Done）

- [ ] 5 个纯逻辑 spec（sse / aiReducer / markdown / typewriter / aiStream）全绿
- [ ] `pnpm typecheck`、`pnpm build`、`pnpm lint` 均通过
- [ ] 悬浮球在所有业务页可见，点击滑出抽屉；发送问题能看到「查询过程」步骤时间线 + 打字机 Markdown 答案
- [ ] 「停止生成」可中断；「清空」可重置会话
- [ ] 后端审查记录已写入 verify-results 文档
- [ ] 不改 `sp_sys_menu`、不改 `urlMap.ts`、后端默认零改动
