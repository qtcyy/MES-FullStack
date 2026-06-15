import { create } from 'zustand'
import { streamChat } from '@/api/ai'
import type { SseEvent } from '@/types/ai'

export interface ToolCallState {
  status: 'running' | 'done' | 'error'
  tool?: string
  summary?: string
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  /** 工具调用步骤（仅 assistant 消息可能有） */
  toolCalls?: ToolCallState[]
}

interface AIChatState {
  isOpen: boolean
  isMaximized: boolean
  messages: Message[]
  isLoading: boolean
  /** 当前思考中的提示文案 */
  thinkingText: string | null
  error: string | null

  toggle: () => void
  open: () => void
  close: () => void
  toggleMaximize: () => void
  sendMessage: (content: string) => Promise<void>
  clearMessages: () => void
  clearError: () => void
}

let abortController: AbortController | null = null

const useAIChatStore = create<AIChatState>((set, get) => ({
  isOpen: false,
  isMaximized: false,
  messages: [],
  isLoading: false,
  thinkingText: null,
  error: null,

  toggle: () => set((s) => ({ isOpen: !s.isOpen })),

  open: () => set({ isOpen: true }),

  toggleMaximize: () => set((s) => ({ isMaximized: !s.isMaximized })),

  close: () => {
    if (abortController) {
      abortController.abort()
      abortController = null
    }
    set({ isOpen: false, isLoading: false, thinkingText: null })
  },

  sendMessage: async (content: string) => {
    const { messages, isLoading } = get()
    if (isLoading || !content.trim()) return

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: content.trim(),
      timestamp: Date.now(),
    }

    const assistantMsg: Message = {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      toolCalls: [],
    }

    set({
      messages: [...messages, userMsg, assistantMsg],
      isLoading: true,
      thinkingText: null,
      error: null,
    })

    const chatMessages = [...get().messages]
      .filter((m) => m.content !== '' || (m.toolCalls && m.toolCalls.length > 0))
      .map((m) => ({ role: m.role, content: m.content }))

    abortController = new AbortController()

    try {
      await streamChat(
        chatMessages,
        (event: SseEvent) => {
          switch (event.type) {
            case 'thinking':
              set({ thinkingText: event.content || '正在思考...' })
              break

            case 'tool_start':
              set((s) => {
                const msgs = [...s.messages]
                const last = msgs[msgs.length - 1]
                if (last && last.role === 'assistant') {
                  const calls = last.toolCalls || []
                  msgs[msgs.length - 1] = {
                    ...last,
                    toolCalls: [...calls, {
                      status: 'running' as const,
                      tool: event.tool,
                    }],
                  }
                }
                return { messages: msgs }
              })
              break

            case 'tool_result':
              set((s) => {
                const msgs = [...s.messages]
                const last = msgs[msgs.length - 1]
                if (last && last.role === 'assistant') {
                  const calls = [...(last.toolCalls || [])]
                  for (let i = calls.length - 1; i >= 0; i--) {
                    if (calls[i].status === 'running' && calls[i].tool === event.tool) {
                      calls[i] = {
                        ...calls[i],
                        status: event.summary?.includes('失败') ? 'error' : 'done',
                        summary: event.summary,
                      }
                      break
                    }
                  }
                  msgs[msgs.length - 1] = {
                    ...last,
                    toolCalls: calls,
                  }
                }
                return { messages: msgs }
              })
              break

            case 'content':
              set((s) => {
                const msgs = [...s.messages]
                const last = msgs[msgs.length - 1]
                if (last && last.role === 'assistant') {
                  msgs[msgs.length - 1] = {
                    ...last,
                    content: last.content + (event.content || ''),
                  }
                }
                return { messages: msgs, thinkingText: null }
              })
              break

            case 'done':
              set({ isLoading: false, thinkingText: null })
              break

            case 'error':
              set((s) => {
                const msgs = [...s.messages]
                const last = msgs[msgs.length - 1]
                if (last && last.role === 'assistant' && last.content === '') {
                  msgs[msgs.length - 1] = {
                    ...last,
                    content: `⚠️ ${event.content || '服务异常，请稍后重试'}`,
                  }
                }
                return {
                  messages: msgs,
                  isLoading: false,
                  thinkingText: null,
                  error: event.content || '服务异常',
                }
              })
              break
          }
        },
        abortController.signal,
      )
    } catch (err: unknown) {
      const errName = (err as any)?.name
      if (errName === 'AbortError') return

      const errorMsg =
        err instanceof Error ? err.message : '网络连接失败，请稍后重试'
      set((s) => {
        const msgs = [...s.messages]
        const last = msgs[msgs.length - 1]
        if (last && last.role === 'assistant' && last.content === '') {
          msgs[msgs.length - 1] = {
            ...last,
            content: `⚠️ ${errorMsg}`,
          }
        }
        return { messages: msgs, isLoading: false, thinkingText: null, error: errorMsg }
      })
    } finally {
      abortController = null
      set({ isLoading: false, thinkingText: null })
    }
  },

  clearMessages: () => set({ messages: [], error: null, thinkingText: null }),

  clearError: () => set({ error: null }),
}))

export default useAIChatStore
