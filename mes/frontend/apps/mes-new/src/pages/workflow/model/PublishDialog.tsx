import { useEffect, useState } from 'react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
} from '@workspace/ui'
import { useQuery$, useMutation$ } from '@/http/hooks'
import { invalidate } from '@/http/queryCache'
import { categoryList } from '@/api/workflow/category'
import { modelPublish } from '@/api/workflow/model'
import type { WorkflowModel } from '@/types/workflow'

interface PublishDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  model: WorkflowModel | null
}

export default function PublishDialog({ open, onOpenChange, model }: PublishDialogProps) {
  const { data: categories } = useQuery$(['workflow', 'category', 'list'], () => categoryList(), {
    enabled: open,
  })
  const { mutate, loading } = useMutation$((args: { id: string; categoryCode: string; categoryName: string }) =>
    modelPublish(args),
  )
  const [categoryCode, setCategoryCode] = useState('')

  useEffect(() => {
    if (open) setCategoryCode(model?.categoryCode ?? '')
  }, [open, model])

  const onConfirm = async () => {
    if (!model) return
    if (!categoryCode) {
      toast.error('请选择流程分类')
      return
    }
    const cat = (categories ?? []).find((c) => c.code === categoryCode)
    if (!cat) {
      toast.error('分类不存在')
      return
    }
    try {
      await mutate({ id: model.id, categoryCode: cat.code, categoryName: cat.name })
      toast.success('发布成功')
      invalidate('["workflow","model"')
      onOpenChange(false)
    } catch {
      /* 拦截器已 toast */
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>发布流程模型</DialogTitle>
          <DialogDescription>将「{model?.name}」发布到指定流程分类下</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5 py-2">
          <Label htmlFor="pub-cat">流程分类</Label>
          <Select value={categoryCode} onValueChange={setCategoryCode}>
            <SelectTrigger id="pub-cat">
              <SelectValue placeholder="选择分类" />
            </SelectTrigger>
            <SelectContent>
              {(categories ?? []).map((c) => (
                <SelectItem key={c.id} value={c.code}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={onConfirm} disabled={loading}>
            {loading ? '发布中…' : '发布'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
