// apps/mes-new/src/pages/system/menu/MenuForm.tsx
import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
} from '@workspace/ui'
import { ListTree, Info, KeyRound } from 'lucide-react'
import FormDialog, { FormSection } from '@/components/FormDialog'
import FormField from '@/components/FormField'
import ParentSelect from '@/components/ParentSelect'
import { useMutation$, useQuery$ } from '@/http/hooks'
import { invalidate } from '@/http/queryCache'
import { menuAddOrUpdate, menuGetById } from '@/api/system/menu'
import type { SysMenu, TreeVO } from '@/types/menu'

interface MenuFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  record?: SysMenu | null
  treeNodes: TreeVO<SysMenu>[]
  onSaved: () => void
}

const schema = z.object({
  code: z.string().min(1, '请输入编码'),
  name: z.string().min(1, '请输入名称'),
  url: z.string().optional(),
  parentId: z.string(),
  type: z.coerce.number().int().min(0).max(2),
  sortNum: z.coerce.number().int().min(0),
  permission: z.string().optional(),
  icon: z.string().optional(),
  descr: z.string().optional(),
})

export default function MenuForm({ open, onOpenChange, record, treeNodes, onSaved }: MenuFormProps) {
  const isEdit = !!record
  const { mutate, loading } = useMutation$((dto: SysMenu) => menuAddOrUpdate(dto))
  // 菜单树投影(record)缺 sortNum/grade/descr,编辑时按 id 拉完整记录回填
  const { data: full } = useQuery$(
    ['sys', 'menu', 'byId', record?.id ?? ''],
    () => menuGetById(record!.id),
    { enabled: open && isEdit },
  )
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { code: '', name: '', url: '', parentId: '0', type: 1, sortNum: 0, permission: '', icon: '', descr: '' },
  })

  useEffect(() => {
    if (open) {
      const src = full ?? record
      reset({
        code: src?.code ?? '',
        name: src?.name ?? '',
        url: src?.url ?? '',
        parentId: src?.parentId || '0',
        type: src?.type ?? 1,
        sortNum: src?.sortNum ?? 0,
        permission: src?.permission ?? '',
        icon: src?.icon ?? '',
        descr: src?.descr ?? '',
      })
    }
  }, [open, record, full, reset])

  const onSubmit = handleSubmit(async (values) => {
    const dto: SysMenu = {
      ...(full ?? record ?? { id: '', code: '', name: '', url: '', parentId: '0', grade: 0, sortNum: 0, type: 1, permission: '', icon: '', descr: '' }),
      code: values.code,
      name: values.name,
      url: values.url ?? '',
      parentId: values.parentId,
      type: values.type,
      sortNum: values.sortNum,
      permission: values.permission ?? '',
      icon: values.icon ?? '',
      descr: values.descr ?? '',
    }
    try {
      await mutate(dto)
      toast.success(isEdit ? '修改成功' : '新增成功')
      invalidate('["sys","menu"')
      onOpenChange(false)
      onSaved()
    } catch {
      /* 拦截器已 toast */
    }
  })

  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title={isEdit ? '编辑菜单' : '新增菜单'} icon={ListTree} description="维护菜单与权限项" onSubmit={onSubmit} submitting={loading}>
      <FormSection title="基本信息" icon={Info} tag="必填">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="编码" htmlFor="m-code" required error={errors.code?.message}>
            <Input id="m-code" aria-invalid={!!errors.code} {...register('code')} />
          </FormField>
          <FormField label="名称" htmlFor="m-name" required error={errors.name?.message}>
            <Input id="m-name" aria-invalid={!!errors.name} {...register('name')} />
          </FormField>
        </div>
        <FormField label="上级菜单" required>
          <Controller
            control={control}
            name="parentId"
            render={({ field }) => (
              <ParentSelect
                nodes={treeNodes.map((n) => toSelectNode(n))}
                value={field.value}
                onChange={field.onChange}
                excludeId={record?.id}
                rootLabel="顶级菜单"
              />
            )}
          />
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="类型" required>
            <Controller
              control={control}
              name="type"
              render={({ field }) => (
                <Select value={String(field.value)} onValueChange={(v) => field.onChange(Number(v))}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">目录</SelectItem>
                    <SelectItem value="1">菜单</SelectItem>
                    <SelectItem value="2">按钮</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
          <FormField label="排序" htmlFor="m-sort" required error={errors.sortNum?.message}>
            <Input id="m-sort" type="number" aria-invalid={!!errors.sortNum} {...register('sortNum')} />
          </FormField>
        </div>
      </FormSection>
      <FormSection title="展示与权限" icon={KeyRound} tag="选填">
        <FormField label="路由 URL" htmlFor="m-url">
          <Input id="m-url" {...register('url')} />
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="权限标识" htmlFor="m-perm">
            <Input id="m-perm" {...register('permission')} />
          </FormField>
          <FormField label="图标(lucide 名)" htmlFor="m-icon">
            <Input id="m-icon" {...register('icon')} />
          </FormField>
        </div>
      </FormSection>
    </FormDialog>
  )
}

// TreeVO → SelectTreeNode(id/name/children)
function toSelectNode(n: TreeVO<SysMenu>): { id: string; name: string; children?: ReturnType<typeof toSelectNode>[] } {
  return { id: n.id, name: n.name, children: n.children?.map(toSelectNode) }
}
