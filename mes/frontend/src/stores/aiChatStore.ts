import { create } from 'zustand'
import { streamChat } from '@/api/ai'

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

interface AIChatState {
  isOpen: boolean
  messages: Message[]
  isLoading: boolean
  error: string | null

  toggle: () => void
  open: () => void
  close: () => void
  sendMessage: (content: string) => Promise<void>
  clearMessages: () => void
  clearError: () => void
}

let abortController: AbortController | null = null

const useAIChatStore = create<AIChatState>((set, get) => ({
  isOpen: false,
  messages: [],
  isLoading: false,
  error: null,

  toggle: () => set((s) => ({ isOpen: !s.isOpen })),

  open: () => set({ isOpen: true }),

  close: () => {
    // 关闭时取消进行中的请求
    if (abortController) {
      abortController.abort()
      abortController = null
    }
    set({ isOpen: false, isLoading: false })
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
    }

    set({
      messages: [...messages, userMsg, assistantMsg],
      isLoading: true,
      error: null,
    })

    // 发送时只传历史消息（不含刚添加的空 assistant）
    const chatMessages = [...get().messages]
      .filter((m) => m.content !== '') // 排除空的 assistant 消息
      .map((m) => ({ role: m.role, content: m.content }))

    abortController = new AbortController()

    try {
      await streamChat(
        chatMessages,
        (token) => {
          set((s) => {
            const msgs = [...s.messages]
            const last = msgs[msgs.length - 1]
            if (last && last.role === 'assistant') {
              msgs[msgs.length - 1] = {
                ...last,
                content: last.content + token,
              }
            }
            return { messages: msgs }
          })
        },
        abortController.signal,
      )
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return

      const errorMsg =
        err instanceof Error ? err.message : '网络连接失败，请稍后重试'
      set((s) => {
        const msgs = [...s.messages]
        // 如果 assistant 消息为空，补充错误提示
        const last = msgs[msgs.length - 1]
        if (last && last.role === 'assistant' && last.content === '') {
          msgs[msgs.length - 1] = {
            ...last,
            content: `⚠️ ${errorMsg}`,
          }
        }
        return { messages: msgs, error: errorMsg }
      })
    } finally {
      abortController = null
      set({ isLoading: false })
    }
  },

  clearMessages: () => set({ messages: [], error: null }),

  clearError: () => set({ error: null }),
}))

export default useAIChatStore
