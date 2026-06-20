import { reactive } from 'vue'

/** 分页状态:current/size/total + 重置/设置总数 */
export function usePagination(initial: { size?: number } = {}) {
  const pager = reactive({ current: 1, size: initial.size ?? 10, total: 0 })

  function setTotal(t: number) {
    pager.total = t
  }
  function reset() {
    pager.current = 1
  }

  return { pager, setTotal, reset }
}
