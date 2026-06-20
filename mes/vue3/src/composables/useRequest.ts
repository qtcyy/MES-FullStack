import { ref, type Ref } from 'vue'

interface UseRequestOptions<T> {
  /** 挂载即执行 */
  immediate?: boolean
  initialData?: T
  onSuccess?: (data: T) => void
}

/**
 * 统一管理异步请求的 loading/error/data,配合骨架屏与错误反馈。
 * @param fetcher 返回 Promise 的请求函数
 */
export function useRequest<T, A extends unknown[] = []>(
  fetcher: (...args: A) => Promise<T>,
  options: UseRequestOptions<T> = {},
) {
  const data = ref(options.initialData) as Ref<T | undefined>
  const loading = ref(false)
  const error = ref<Error | null>(null)

  async function run(...args: A) {
    loading.value = true
    error.value = null
    try {
      const res = await fetcher(...args)
      data.value = res
      options.onSuccess?.(res)
      return res
    } catch (e) {
      error.value = e as Error
      throw e
    } finally {
      loading.value = false
    }
  }

  if (options.immediate) run(...([] as unknown as A))

  return { data, loading, error, run }
}
