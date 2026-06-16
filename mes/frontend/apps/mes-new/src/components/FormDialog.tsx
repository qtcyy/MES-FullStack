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
        <DialogHeader className="space-y-0 px-6 py-4 text-left">
          <div className="flex items-center gap-3">
            {Icon && (
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <Icon className="size-5" />
              </span>
            )}
            <div className="min-w-0">
              <DialogTitle className="truncate text-base font-semibold">{title}</DialogTitle>
              {description && <DialogDescription className="truncate text-xs">{description}</DialogDescription>}
            </div>
          </div>
        </DialogHeader>
        <Separator />
        <form onSubmit={(e) => { e.preventDefault(); onSubmit() }}>
          <ScrollArea className="max-h-[70vh]">
            <div className="space-y-5 px-6 py-5">{children}</div>
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

/** 表单分区:小图标 + 标题 + 细线 + 可选标签(B2 轻分区) */
export function FormSection({
  title, icon: Icon, tag, children,
}: { title: string; icon?: LucideIcon; tag?: string; children: ReactNode }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="size-3.5 shrink-0 text-primary" />}
        <span className="text-xs font-semibold text-foreground/80">{title}</span>
        <Separator className="flex-1" />
        {tag && <span className="shrink-0 text-[11px] text-muted-foreground">{tag}</span>}
      </div>
      {children}
    </div>
  )
}
