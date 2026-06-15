import { useState } from 'react'
import { ArrowRight, Search, X } from 'lucide-react'
import {
  Badge,
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  ScrollArea,
} from '@workspace/ui'
import { filterTransferItems, type TransferItem } from '@/utils/transfer'

interface DualListTransferProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  /** 候选(已排除已选) */
  candidates: TransferItem[]
  /** 已选/已绑定 */
  selected: TransferItem[]
  onAdd: (ids: string[]) => void | Promise<void>
  onRemove: (id: string) => void | Promise<void>
}

export default function DualListTransfer({
  open,
  onOpenChange,
  title,
  description,
  candidates,
  selected,
  onAdd,
  onRemove,
}: DualListTransferProps) {
  const [leftKw, setLeftKw] = useState('')
  const [rightKw, setRightKw] = useState('')
  const [checked, setChecked] = useState<Record<string, boolean>>({})

  // 关闭时重置勾选与搜索,避免复开后脏状态残留(覆盖 ESC/遮罩/X/关闭按钮所有关闭路径)
  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setChecked({})
      setLeftKw('')
      setRightKw('')
    }
    onOpenChange(next)
  }

  const leftItems = filterTransferItems(candidates, leftKw)
  const rightItems = filterTransferItems(selected, rightKw)
  const checkedIds = Object.keys(checked).filter((id) => checked[id])

  const handleAdd = async () => {
    if (checkedIds.length === 0) return
    // 无论 onAdd 成功或抛错都清空勾选,防止脏选残留导致后续发送无效 id
    try {
      await onAdd(checkedIds)
    } finally {
      setChecked({})
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <div className="grid grid-cols-[1fr_auto_1fr] items-stretch gap-3">
          {/* 候选 */}
          <div className="flex flex-col rounded-lg border">
            <div className="flex items-center justify-between border-b px-3 py-2">
              <span className="text-sm font-medium">候选</span>
              <Badge variant="secondary">{leftItems.length}</Badge>
            </div>
            <div className="p-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="h-8 pl-8" placeholder="搜索" value={leftKw} onChange={(e) => setLeftKw(e.target.value)} />
              </div>
            </div>
            <ScrollArea className="h-72">
              <ul className="px-2 pb-2">
                {leftItems.map((it) => (
                  <li key={it.id}>
                    <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent">
                      <Checkbox
                        checked={!!checked[it.id]}
                        onCheckedChange={(v) => setChecked((c) => ({ ...c, [it.id]: !!v }))}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm">{it.primary}</span>
                        {it.secondary && <span className="block truncate text-xs text-muted-foreground">{it.secondary}</span>}
                      </span>
                    </label>
                  </li>
                ))}
                {leftItems.length === 0 && (
                  <li className="px-2 py-6 text-center text-sm text-muted-foreground">无候选</li>
                )}
              </ul>
            </ScrollArea>
          </div>

          {/* 中间方向按钮 */}
          <div className="flex items-center">
            <Button type="button" size="sm" onClick={handleAdd} disabled={checkedIds.length === 0}>
              <ArrowRight className="size-4" />
              加入{checkedIds.length > 0 ? ` (${checkedIds.length})` : ''}
            </Button>
          </div>

          {/* 已选 */}
          <div className="flex flex-col rounded-lg border">
            <div className="flex items-center justify-between border-b px-3 py-2">
              <span className="text-sm font-medium">已选</span>
              <Badge variant="secondary">{rightItems.length}</Badge>
            </div>
            <div className="p-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="h-8 pl-8" placeholder="搜索" value={rightKw} onChange={(e) => setRightKw(e.target.value)} />
              </div>
            </div>
            <ScrollArea className="h-72">
              <ul className="px-2 pb-2">
                {rightItems.map((it) => (
                  <li key={it.id} className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm">{it.primary}</span>
                      {it.secondary && <span className="block truncate text-xs text-muted-foreground">{it.secondary}</span>}
                    </span>
                    <Button type="button" variant="ghost" size="icon-sm" onClick={() => onRemove(it.id)}>
                      <X className="size-4 text-destructive" />
                    </Button>
                  </li>
                ))}
                {rightItems.length === 0 && (
                  <li className="px-2 py-6 text-center text-sm text-muted-foreground">暂无</li>
                )}
              </ul>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>关闭</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
