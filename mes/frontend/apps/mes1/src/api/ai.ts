import type { QuickPrompt, SseEvent } from '@/types/ai'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

/**
 * 发送消息到 AI 助手（Agent 模式 SSE 流式）
 *
 * @param messages 当前对话消息列表
 * @param onEvent  每收到一个结构化事件的回调
 * @param signal   AbortController signal
 */
export async function streamChat(
  messages: ChatMessage[],
  onEvent: (event: SseEvent) => void,
  signal: AbortSignal,
): Promise<void> {
  const response = await fetch('/api/admin/ai/chat', {
    method: 'POST',
    credentials: 'include',
    redirect: 'error',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream',
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: JSON.stringify({
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    }),
    signal,
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || `HTTP ${response.status}`)
  }

  const reader = response.body?.getReader()
  if (!reader) throw new Error('Stream not supported')

  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed.startsWith('data: ')) continue

        const data = trimmed.slice(6)
        if (data === '[DONE]') return

        try {
          const event = JSON.parse(data) as SseEvent
          onEvent(event)
        } catch {
          // skip unparseable lines
        }
      }
    }
  } finally {
    reader.cancel()
  }
}

/** 默认快捷提示词 — 与 Agent 工具能力对齐 */
const DEFAULT_QUICK_PROMPTS: QuickPrompt[] = [
  {
    id: '1',
    text: '帮我分析一下当前生产工单的整体情况，各状态分布如何？',
    displayText: '分析工单情况',
    icon: '📋',
  },
  {
    id: '2',
    text: '查看当前设备运行状态，有哪些设备？状态分布怎样？',
    displayText: '查看设备状态',
    icon: '🏭',
  },
  {
    id: '3',
    text: '查一下物料数据，各类物料有多少？给我一个概览',
    displayText: '统计物料数据',
    icon: '📦',
  },
  {
    id: '4',
    text: '查询 BOM 清单，有哪些物料清单？',
    displayText: '查看BOM清单',
    icon: '📊',
  },
  {
    id: '5',
    text: '获取生产看板总览，包括工单、设备、物料的汇总数据',
    displayText: '生产看板总览',
    icon: '📈',
  },
]

/**
 * 获取快捷提示词列表
 */
export function fetchQuickPrompts(): Promise<QuickPrompt[]> {
  return Promise.resolve(DEFAULT_QUICK_PROMPTS)
}
