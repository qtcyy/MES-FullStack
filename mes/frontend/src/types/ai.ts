/** 快捷提示词 */
export interface QuickPrompt {
  /** 唯一标识 */
  id: string
  /** 实际发送给 AI 的完整问题文本 */
  text: string
  /** 便利贴上显示的简短文本 */
  displayText: string
  /** emoji 图标 */
  icon?: string
}

/** SSE 事件类型 */
export type SseEventType =
  | 'thinking'
  | 'tool_start'
  | 'tool_result'
  | 'content'
  | 'done'
  | 'error'

/** 结构化 SSE 事件 */
export interface SseEvent {
  type: SseEventType
  content?: string
  tool?: string
  args?: Record<string, unknown>
  summary?: string
}
