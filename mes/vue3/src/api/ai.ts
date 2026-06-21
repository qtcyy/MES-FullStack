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
    location.href = '/login'
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
