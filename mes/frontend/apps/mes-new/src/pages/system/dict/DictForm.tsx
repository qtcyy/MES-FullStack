// apps/mes-new/src/pages/system/dict/DictForm.tsx
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { BookText, Info, Tags } from 'lucide-react'
import { Input, Textarea, toast } from '@workspace/ui'
import FormDialog, { FormSection } from '@/components/FormDialog'
import FormField from '@/components/FormField'
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
      <FormSection title="基本信息" icon={Info} tag="必填">
        <FormField label="标签名" htmlFor="d-name" required error={errors.name?.message}>
          <Input id="d-name" aria-invalid={!!errors.name} {...register('name')} />
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="数据值" htmlFor="d-value" required error={errors.value?.message}>
            <Input id="d-value" aria-invalid={!!errors.value} {...register('value')} />
          </FormField>
          <FormField label="类型" htmlFor="d-type" required error={errors.type?.message}>
            <Input id="d-type" aria-invalid={!!errors.type} {...register('type')} />
          </FormField>
        </div>
      </FormSection>
      <FormSection title="归类与描述" icon={Tags} tag="选填">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="排序" htmlFor="d-sort" required error={errors.sortNum?.message}>
            <Input id="d-sort" type="number" aria-invalid={!!errors.sortNum} {...register('sortNum')} />
          </FormField>
          <FormField label="上级 ID" htmlFor="d-parent">
            <Input id="d-parent" {...register('parentId')} />
          </FormField>
        </div>
        <FormField label="描述" htmlFor="d-descr">
          <Textarea id="d-descr" {...register('descr')} />
        </FormField>
      </FormSection>
    </FormDialog>
  )
}
