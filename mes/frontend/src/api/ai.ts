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
