type Refetcher = () => void

const refetchers = new Map<string, Set<Refetcher>>()
const dataCache = new Map<string, unknown>()

/** 将 key 数组稳定序列化为字符串 */
export function serializeKey(key: unknown[]): string {
  return JSON.stringify(key)
}

export function setCache(key: string, data: unknown): void {
  dataCache.set(key, data)
}

export function getCache<T>(key: string): T | undefined {
  return dataCache.get(key) as T | undefined
}

/** 订阅某 key 的刷新;返回取消订阅函数 */
export function subscribeRefetch(key: string, fn: Refetcher): () => void {
  let set = refetchers.get(key)
  if (!set) {
    set = new Set()
    refetchers.set(key, set)
  }
  set.add(fn)
  return () => {
    set!.delete(fn)
    if (set!.size === 0) refetchers.delete(key)
  }
}

/** 使所有「序列化 key 以 prefix 开头」的查询重新拉取 */
export function invalidate(prefix: string): void {
  for (const [key, set] of refetchers) {
    if (key.startsWith(prefix)) set.forEach((fn) => fn())
  }
}

/** 仅测试用:清空全部状态 */
export function clearAll(): void {
  refetchers.clear()
  dataCache.clear()
}
