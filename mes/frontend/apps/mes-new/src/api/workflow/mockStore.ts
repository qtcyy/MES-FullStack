import { of, type Observable } from 'rxjs'
import type { PageResult } from '@/types/api'

/** 生成无连字符 id(对齐后端雪花串风格) */
export function genId(): string {
  const uuid =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.floor(Math.random() * 1e9)}`
  return uuid.replace(/-/g, '')
}

/** 当前本地时间 'YYYY-MM-DD HH:mm:ss'(用本地时区,避免 UTC 偏移使展示/排序错位) */
export function nowStr(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

export function readList<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T[]) : []
  } catch {
    return []
  }
}

export function writeList<T>(key: string, list: T[]): void {
  localStorage.setItem(key, JSON.stringify(list))
}

/** 纯函数:内存分页切片(current 为 1 基,越界自动夹紧) */
export function paginate<T>(all: T[], current: number, size: number): PageResult<T> {
  const total = all.length
  const pages = Math.max(1, Math.ceil(total / size))
  const safeCurrent = Math.min(Math.max(1, current), pages)
  const start = (safeCurrent - 1) * size
  return {
    records: all.slice(start, start + size),
    total,
    size,
    current: safeCurrent,
    pages,
  }
}

/** 把同步结果包成 Observable,模仿真 http 解包后的返回形态 */
export function ok<T>(data: T): Observable<T> {
  return of(data)
}
