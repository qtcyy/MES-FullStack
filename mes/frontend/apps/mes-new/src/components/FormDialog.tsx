import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Check } from 'lucide-react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  ScrollArea,
  Separator,
} from '@workspace/ui'

interface FormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  icon?: LucideIcon
  onSubmit: () => void
  submitting?: boolean
  submitText?: string
  /** 覆盖弹窗宽度,默认 sm:max-w-lg */
  contentClassName?: string
  children: ReactNode
}

export default function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  icon: Icon,
  onSubmit,
  submitting,
  submitText = '确定',
  contentClassName = 'sm:max-w-lg',
  children,
}: FormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`gap-0 overflow-hidden p-0 ${contentClassName}`}>
        <DialogHeader className="space-y-0 bg-gradient-to-r from-primary/5 to-transparent px-6 py-4 text-left">
          <div className="flex items-center gap-3">
            <span className="h-10 w-1 shrink-0 rounded-full bg-primary" />
            {Icon && (
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                <Icon className="size-5" />
              </span>
            )}
            <div className="min-w-0">
              <DialogTitle className="truncate">{title}</DialogTitle>
              {description && <DialogDescription className="truncate">{description}</DialogDescription>}
            </div>
          </div>
        </DialogHeader>
        <Separator />
        <form onSubmit={(e) => { e.preventDefault(); onSubmit() }}>
          <ScrollArea className="max-h-[70vh]">
            <div className="space-y-4 px-6 py-5">{children}</div>
          </ScrollArea>
          <Separator />
          <DialogFooter className="px-6 py-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? '提交中…' : <><Check className="size-4" />{submitText}</>}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/** 表单分区:小标题 + 细分隔线 */
export function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</span>
        <Separator className="flex-1" />
      </div>
      {children}
    </div>
  )
}
