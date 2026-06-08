import type { QuickPrompt } from '@/types/ai'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface DeltaChunk {
  choices?: Array<{
    delta?: {
      content?: string
    }
  }>
}

/**
 * 发送消息到 AI 助手（SSE 流式）
 *
 * @param messages 当前对话消息列表
 * @param onToken  每收到一个 token 的回调
 * @param signal   AbortController signal，用于取消请求
 */
export async function streamChat(
  messages: ChatMessage[],
  onToken: (text: string) => void,
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
      // 最后一行可能不完整，保留到下次
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed.startsWith('data: ')) continue

        const data = trimmed.slice(6)
        if (data === '[DONE]') return

        try {
          const parsed = JSON.parse(data) as DeltaChunk
          const content = parsed.choices?.[0]?.delta?.content
          if (content) onToken(content)
        } catch {
          // 跳过无法解析的行
        }
      }
    }
  } finally {
    reader.cancel()
  }
}

/** 默认快捷提示词（前端常量，后续可从后端获取） */
const DEFAULT_QUICK_PROMPTS: QuickPrompt[] = [
  {
    id: '1',
    text: '今天有哪些待处理的工单？',
    displayText: '今日待处理工单',
    icon: '📋',
  },
  {
    id: '2',
    text: '当前产线运行状态如何？',
    displayText: '当前产线运行状态',
    icon: '📊',
  },
  {
    id: '3',
    text: '设备OEE数据怎么看？',
    displayText: '设备OEE数据分析',
    icon: '🏭',
  },
  {
    id: '4',
    text: '如何创建工艺路线？',
    displayText: '创建工艺路线的方法',
    icon: '🔄',
  },
  {
    id: '5',
    text: 'BOM表如何录入和维护？',
    displayText: 'BOM表录入与维护',
    icon: '📝',
  },
]

/**
 * 获取快捷提示词列表
 *
 * 当前返回前端默认常量，后续可改为 HTTP GET 请求从后端获取，
 * 以支持后台动态配置提示词。
 */
export function fetchQuickPrompts(): Promise<QuickPrompt[]> {
  // TODO: 后续替换为后端 API 调用
  // return fetch('/api/admin/ai/prompts', { credentials: 'include' })
  //   .then(res => res.json())
  return Promise.resolve(DEFAULT_QUICK_PROMPTS)
}
