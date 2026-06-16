import { useMemo, useState } from 'react'
import { ArrowRight, ChevronDown, ChevronUp, GripVertical, Search, X } from 'lucide-react'
import { Badge, Button, Input, ScrollArea, cn } from '@workspace/ui'
import { excludeSelected, filterTransferItems, moveItem, type TransferItem } from '@/utils/transfer'

export interface OrderedTransferProps {
  /** 全量候选 */
  candidates: TransferItem[]
  /** 已选有序列表(受控) */
  value: TransferItem[]
  onChange: (next: TransferItem[]) => void
  leftTitle?: string
  rightTitle?: string
  firstLabel?: string
  lastLabel?: string
  className?: string
}

export default function OrderedTransfer({
  candidates,
  value,
  onChange,
  leftTitle = '可选工序',
  rightTitle = '工序流水线',
  firstLabel = '首道',
  lastLabel = '末道',
  className,
}: OrderedTransferProps) {
  const [leftKw, setLeftKw] = useState('')
  const [dragIndex, setDragIndex] = useState<number | null>(null)

  const selectedIds = useMemo(() => value.map((v) => v.id), [value])
  const leftItems = useMemo(
    () => filterTransferItems(excludeSelected(candidates, selectedIds), leftKw),
    [candidates, selectedIds, leftKw],
  )

  const add = (item: TransferItem) => onChange([...value, item])
  const remove = (id: string) => onChange(value.filter((v) => v.id !== id))
  const move = (from: number, to: number) => onChange(moveItem(value, from, to))

  const handleDrop = (to: number) => {
    if (dragIndex === null) return
    move(dragIndex, to)
    setDragIndex(null)
  }

  return (
    <div className={cn('grid gap-4 lg:grid-cols-2', className)}>
      {/* 左:可选工序池 */}
      <div className="flex flex-col rounded-lg border">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-sm font-medium">{leftTitle}</span>
          <Badge variant="secondary">{leftItems.length}</Badge>
        </div>
        <div className="p-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-8 pl-8"
              placeholder="搜索工序"
              value={leftKw}
              onChange={(e) => setLeftKw(e.target.value)}
            />
          </div>
        </div>
        <ScrollArea className="h-80">
          <ul className="px-2 pb-2">
            {leftItems.map((it) => (
              <li key={it.id}>
                <button
                  type="button"
                  onClick={() => add(it)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-accent"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">{it.primary}</span>
                    {it.secondary && (
                      <span className="block truncate text-xs text-muted-foreground">{it.secondary}</span>
                    )}
                  </span>
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
                </button>
              </li>
            ))}
            {leftItems.length === 0 && (
              <li className="px-2 py-6 text-center text-sm text-muted-foreground">无可选工序</li>
            )}
          </ul>
        </ScrollArea>
      </div>

      {/* 右:工序流水线(有序、可重排) */}
      <div className="flex flex-col rounded-lg border">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-sm font-medium">{rightTitle}</span>
          <Badge variant="secondary">{value.length}</Badge>
        </div>
        <ScrollArea className="h-80">
          <ul className="space-y-1 p-2">
            {value.map((it, idx) => {
              const isFirst = idx === 0
              const isLast = idx === value.length - 1
              return (
                <li
                  key={it.id}
                  draggable
                  onDragStart={() => setDragIndex(idx)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDrop(idx)}
                  onDragEnd={() => setDragIndex(null)}
                  className={cn(
                    'flex items-center gap-2 rounded-md border bg-card px-2 py-1.5 transition-colors hover:bg-accent',
                    dragIndex === idx && 'opacity-50',
                  )}
                >
                  <GripVertical className="size-4 shrink-0 cursor-grab text-muted-foreground" />
                  <span className="grid size-5 shrink-0 place-items-center rounded bg-muted text-xs font-medium text-muted-foreground">
                    {idx + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-sm">{it.primary}</span>
                      {value.length >= 2 && isFirst && <Badge className="shrink-0">{firstLabel}</Badge>}
                      {value.length >= 2 && isLast && (
                        <Badge variant="secondary" className="shrink-0">{lastLabel}</Badge>
                      )}
                    </span>
                    {it.secondary && (
                      <span className="block truncate text-xs text-muted-foreground">{it.secondary}</span>
                    )}
                  </span>
                  <div className="flex shrink-0 items-center">
                    <Button type="button" variant="ghost" size="icon-sm" disabled={isFirst} onClick={() => move(idx, idx - 1)}>
                      <ChevronUp className="size-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon-sm" disabled={isLast} onClick={() => move(idx, idx + 1)}>
                      <ChevronDown className="size-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon-sm" onClick={() => remove(it.id)}>
                      <X className="size-4 text-destructive" />
                    </Button>
                  </div>
                </li>
              )
            })}
            {value.length === 0 && (
              <li className="px-2 py-10 text-center text-sm text-muted-foreground">
                请从左侧添加工序(至少 2 个)
              </li>
            )}
          </ul>
        </ScrollArea>
        {/* 工序链预览 */}
        <div className="border-t px-3 py-2">
          {value.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1 text-xs">
              {value.map((it, idx) => (
                <span key={it.id} className="flex items-center gap-1">
                  <span className="rounded bg-muted px-1.5 py-0.5">{it.primary}</span>
                  {idx < value.length - 1 && <ArrowRight className="size-3 text-muted-foreground" />}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">工序链预览</span>
          )}
        </div>
      </div>
    </div>
  )
}
