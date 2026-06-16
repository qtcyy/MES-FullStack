// apps/mes-new/src/pages/system/dept/DeptForm.tsx
import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Building2 } from 'lucide-react'
import { Input, toast } from '@workspace/ui'
import FormDialog from '@/components/FormDialog'
import FormField from '@/components/FormField'
import ParentSelect from '@/components/ParentSelect'
import { useMutation$ } from '@/http/hooks'
import { invalidate } from '@/http/queryCache'
import { deptAddOrUpdate } from '@/api/system/dept'
import type { SysDepartment } from '@/types/system'
import type { SelectTreeNode } from '@/utils/tree'

interface DeptFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  record?: SysDepartment | null
  treeNodes: SelectTreeNode[]
  onSaved: () => void
}

const schema = z.object({
  name: z.string().min(1, '请输入部门名称'),
  parentId: z.string(),
  sortNum: z.coerce.number().int().min(0, '排序需为非负整数'),
})

export default function DeptForm({ open, onOpenChange, record, treeNodes, onSaved }: DeptFormProps) {
  const isEdit = !!record
  const { mutate, loading } = useMutation$((dto: SysDepartment) => deptAddOrUpdate(dto))
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', parentId: '0', sortNum: 0 },
  })

  useEffect(() => {
    if (open) {
      reset({
        name: record?.name ?? '',
        parentId: record?.parentId || '0',
        sortNum: record?.sortNum ?? 0,
      })
    }
  }, [open, record, reset])

  const onSubmit = handleSubmit(async (values) => {
    const dto: SysDepartment = {
      ...(record ?? { id: '', parentId: '0', name: '', sortNum: 0, isDeleted: '0' }),
      name: values.name,
      parentId: values.parentId,
      sortNum: values.sortNum,
    }
    try {
      await mutate(dto)
      toast.success(isEdit ? '修改成功' : '新增成功')
      invalidate('["sys","dept"')
      onOpenChange(false)
      onSaved()
    } catch {
      /* 拦截器已 toast */
    }
  })

  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title={isEdit ? '编辑部门' : '新增部门'} icon={Building2} description="维护组织部门" onSubmit={onSubmit} submitting={loading}>
      <FormField label="部门名称" htmlFor="dept-name" required error={errors.name?.message}>
        <Input id="dept-name" aria-invalid={!!errors.name} {...register('name')} />
      </FormField>
      <FormField label="上级部门" required>
        <Controller
          control={control}
          name="parentId"
          render={({ field }) => (
            <ParentSelect nodes={treeNodes} value={field.value} onChange={field.onChange} excludeId={record?.id} />
          )}
        />
      </FormField>
      <FormField label="排序" htmlFor="dept-sort" required error={errors.sortNum?.message}>
        <Input id="dept-sort" type="number" aria-invalid={!!errors.sortNum} {...register('sortNum')} />
      </FormField>
    </FormDialog>
  )
}
