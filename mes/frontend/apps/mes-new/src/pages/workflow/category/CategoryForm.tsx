import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { FolderTree, Info } from 'lucide-react'
import { Input, Textarea, toast } from '@workspace/ui'
import FormDialog, { FormSection } from '@/components/FormDialog'
import FormField from '@/components/FormField'
import { useMutation$ } from '@/http/hooks'
import { invalidate } from '@/http/queryCache'
import { categoryAddOrUpdate } from '@/api/workflow/category'
import type { WorkflowCategory } from '@/types/workflow'

interface CategoryFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  record?: WorkflowCategory | null
}

const schema = z.object({
  code: z.string().min(1, '请输入分类编码'),
  name: z.string().min(1, '请输入分类名称'),
  descr: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

export default function CategoryForm({ open, onOpenChange, record }: CategoryFormProps) {
  const isEdit = !!record
  const { mutate, loading } = useMutation$((dto: WorkflowCategory) => categoryAddOrUpdate(dto))
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { code: '', name: '', descr: '' },
  })

  useEffect(() => {
    if (open) {
      reset({ code: record?.code ?? '', name: record?.name ?? '', descr: record?.descr ?? '' })
    }
  }, [open, record, reset])

  const onSubmit = handleSubmit(async (values) => {
    const dto: WorkflowCategory = {
      id: record?.id ?? '',
      code: values.code,
      name: values.name,
      descr: values.descr ?? '',
    }
    try {
      await mutate(dto)
      toast.success(isEdit ? '修改成功' : '新增成功')
      invalidate('["workflow","category"')
      onOpenChange(false)
    } catch {
      /* 拦截器已 toast */
    }
  })

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? '编辑流程分类' : '新增流程分类'}
      icon={FolderTree}
      description="维护流程分类(如 生产流程 / prod)"
      onSubmit={onSubmit}
      submitting={loading}
    >
      <FormSection title="基本信息" icon={Info} tag="必填">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="分类编码" htmlFor="wc-code" required error={errors.code?.message}>
            <Input id="wc-code" aria-invalid={!!errors.code} placeholder="如 prod" {...register('code')} />
          </FormField>
          <FormField label="分类名称" htmlFor="wc-name" required error={errors.name?.message}>
            <Input id="wc-name" aria-invalid={!!errors.name} placeholder="如 生产流程" {...register('name')} />
          </FormField>
        </div>
        <FormField label="备注" htmlFor="wc-descr">
          <Textarea id="wc-descr" {...register('descr')} />
        </FormField>
      </FormSection>
    </FormDialog>
  )
}
