/** 后端 "YYYY-MM-DD HH:mm:ss" → <input type="datetime-local"> 的 "YYYY-MM-DDTHH:mm" */
export function toDatetimeLocal(value?: string): string {
  if (!value) return ''
  const normalized = value.trim().replace(' ', 'T')
  const m = normalized.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})/)
  return m ? m[1] : ''
}

/** datetime-local "YYYY-MM-DDTHH:mm[:ss]" → 后端 "YYYY-MM-DD HH:mm:ss"(无秒补 00) */
export function fromDatetimeLocal(value?: string): string {
  if (!value) return ''
  const m = value.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::(\d{2}))?$/)
  if (!m) return ''
  return `${m[1]} ${m[2]}:${m[3] ?? '00'}`
}
