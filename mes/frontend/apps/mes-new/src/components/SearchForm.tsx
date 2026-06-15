import type { ReactNode } from 'react'
import { Button } from '@workspace/ui'

interface SearchFormProps {
  children: ReactNode
  onSearch: () => void
  onReset: () => void
}

export default function SearchForm({ children, onSearch, onReset }: SearchFormProps) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSearch()
      }}
      className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-4"
    >
      {children}
      <div className="flex gap-2">
        <Button type="submit" size="sm">搜索</Button>
        <Button type="button" size="sm" variant="outline" onClick={onReset}>重置</Button>
      </div>
    </form>
  )
}
