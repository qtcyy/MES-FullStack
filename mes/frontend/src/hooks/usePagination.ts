import { useState, useCallback } from 'react'

export function usePagination(defaultPageSize = 10) {
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: defaultPageSize,
  })

  const onChange = useCallback((p: { current: number; pageSize: number }) => {
    setPagination({ current: p.current, pageSize: p.pageSize })
  }, [])

  const reset = useCallback(() => {
    setPagination({ current: 1, pageSize: defaultPageSize })
  }, [defaultPageSize])

  return { pagination, onChange, reset }
}
