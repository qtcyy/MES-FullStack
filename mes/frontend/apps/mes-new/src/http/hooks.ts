import { useCallback, useEffect, useRef, useState } from 'react'
import { firstValueFrom, type Observable, type Subscription } from 'rxjs'
import { serializeKey, setCache, getCache, subscribeRefetch } from './queryCache'

export interface QueryResult<T> {
  data: T | undefined
  loading: boolean
  error: unknown
  refetch: () => void
}

/** rxjs 版查询:挂载/依赖变化自动取数,支持 invalidate 触发刷新 */
export function useQuery$<T>(
  key: unknown[],
  factory: () => Observable<T>,
  options?: { enabled?: boolean },
): QueryResult<T> {
  const enabled = options?.enabled ?? true
  const serial = serializeKey(key)
  const [data, setData] = useState<T | undefined>(() => getCache<T>(serial))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const factoryRef = useRef(factory)
  factoryRef.current = factory
  const subRef = useRef<Subscription | null>(null)

  const run = useCallback(() => {
    subRef.current?.unsubscribe()
    setLoading(true)
    setError(null)
    subRef.current = factoryRef.current().subscribe({
      next: (d) => {
        setData(d)
        setCache(serial, d)
        setLoading(false)
      },
      error: (e) => {
        setError(e)
        setLoading(false)
      },
    })
  }, [serial])

  useEffect(() => {
    if (!enabled) return
    run()
    const unsub = subscribeRefetch(serial, run)
    return () => {
      unsub()
      subRef.current?.unsubscribe()
    }
  }, [serial, enabled, run])

  return { data, loading, error, refetch: run }
}

/** rxjs 版变更:mutate 返回 Promise,内部 firstValueFrom */
export function useMutation$<TArgs extends unknown[], TRes>(
  factory: (...args: TArgs) => Observable<TRes>,
) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const factoryRef = useRef(factory)
  factoryRef.current = factory

  const mutate = useCallback((...args: TArgs): Promise<TRes> => {
    setLoading(true)
    setError(null)
    return firstValueFrom(factoryRef.current(...args)).then(
      (res) => {
        setLoading(false)
        return res
      },
      (e) => {
        setError(e)
        setLoading(false)
        throw e
      },
    )
  }, [])

  return { mutate, loading, error }
}
