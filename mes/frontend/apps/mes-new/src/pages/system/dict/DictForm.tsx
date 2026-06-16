// apps/mes-new/src/pages/system/dict/DictForm.tsx
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { BookText } from 'lucide-react'
import { Input, Label, Textarea, toast } from '@workspace/ui'
import FormDialog from '@/components/FormDialog'
import { useMutation$ } from '@/http/hooks'
import { invalidate } from '@/http/queryCache'
import { dictAddOrUpdate } from '@/api/system/dict'
import type { SysDict } from '@/types/system'

interface DictFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  record?: SysDict | null
  onSaved: () => void
}

const schema = z.object({
  name: z.string().min(1, '请输入标签名'),
  value: z.string().min(1, '请输入数据值'),
  type: z.string().min(1, '请输入类型'),
  sortNum: z.coerce.number().int().min(0, '排序需为非负整数'),
  parentId: z.string().optional(),
  descr: z.string().optional(),
})

export default function DictForm({ open, onOpenChange, record, onSaved }: DictFormProps) {
  const isEdit = !!record
  const { mutate, loading } = useMutation$((dto: SysDict) => dictAddOrUpdate(dto))
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', value: '', type: '', sortNum: 0, parentId: '', descr: '' },
  })

  useEffect(() => {
    if (open) {
      reset({
        name: record?.name ?? '',
        value: record?.value ?? '',
        type: record?.type ?? '',
        sortNum: record?.sortNum ?? 0,
        parentId: record?.parentId ?? '',
        descr: record?.descr ?? '',
      })
    }
  }, [open, record, reset])

  const onSubmit = handleSubmit(async (values) => {
    const dto: SysDict = {
      ...(record ?? { id: '', name: '', value: '', type: '', descr: '', sortNum: 0, parentId: '', deleted: '0' }),
      name: values.name,
      value: values.value,
      type: values.type,
      sortNum: values.sortNum,
      parentId: values.parentId ?? '',
      descr: values.descr ?? '',
    }
    try {
      await mutate(dto)
      toast.success(isEdit ? '修改成功' : '新增成功')
      invalidate('["sys","dict"')
      onOpenChange(false)
      onSaved()
    } catch {
      /* 拦截器已 toast */
    }
  })

  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title={isEdit ? '编辑字典' : '新增字典'} icon={BookText} description="维护数据字典" onSubmit={onSubmit} submitting={loading}>
      <div className="space-y-1.5">
        <Label htmlFor="d-name">标签名</Label>
        <Input id="d-name" {...register('name')} />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="d-value">数据值</Label>
        <Input id="d-value" {...register('value')} />
        {errors.value && <p className="text-xs text-destructive">{errors.value.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="d-type">类型</Label>
        <Input id="d-type" {...register('type')} />
        {errors.type && <p className="text-xs text-destructive">{errors.type.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="d-sort">排序</Label>
        <Input id="d-sort" type="number" {...register('sortNum')} />
        {errors.sortNum && <p className="text-xs text-destructive">{errors.sortNum.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="d-parent">上级 ID(可选)</Label>
        <Input id="d-parent" {...register('parentId')} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="d-descr">描述</Label>
        <Textarea id="d-descr" {...register('descr')} />
      </div>
    </FormDialog>
  )
}
