import type { ReactNode } from 'react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@workspace/ui'

interface ModalFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  onSubmit: () => void
  submitting?: boolean
  submitText?: string
  children: ReactNode
}

export default function ModalForm({
  open,
  onOpenChange,
  title,
  onSubmit,
  submitting,
  submitText = '确定',
  children,
}: ModalFormProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            onSubmit()
          }}
          className="space-y-4"
        >
          {children}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? '提交中…' : submitText}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
