// apps/mes-new/src/pages/system/dept/DeptForm.tsx
import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input, Label, toast } from '@workspace/ui'
import ModalForm from '@/components/ModalForm'
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
    <ModalForm open={open} onOpenChange={onOpenChange} title={isEdit ? '编辑部门' : '新增部门'} onSubmit={onSubmit} submitting={loading}>
      <div className="space-y-1.5">
        <Label htmlFor="dept-name">部门名称</Label>
        <Input id="dept-name" {...register('name')} />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label>上级部门</Label>
        <Controller
          control={control}
          name="parentId"
          render={({ field }) => (
            <ParentSelect nodes={treeNodes} value={field.value} onChange={field.onChange} excludeId={record?.id} />
          )}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="dept-sort">排序</Label>
        <Input id="dept-sort" type="number" {...register('sortNum')} />
        {errors.sortNum && <p className="text-xs text-destructive">{errors.sortNum.message}</p>}
      </div>
    </ModalForm>
  )
}
