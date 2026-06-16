// apps/mes-new/src/pages/system/menu/MenuForm.tsx
import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
} from '@workspace/ui'
import { ListTree } from 'lucide-react'
import FormDialog from '@/components/FormDialog'
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
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="m-code">编码</Label>
          <Input id="m-code" {...register('code')} />
          {errors.code && <p className="text-xs text-destructive">{errors.code.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="m-name">名称</Label>
          <Input id="m-name" {...register('name')} />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>上级菜单</Label>
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
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>类型</Label>
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
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="m-sort">排序</Label>
          <Input id="m-sort" type="number" {...register('sortNum')} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="m-url">路由 URL</Label>
        <Input id="m-url" {...register('url')} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="m-perm">权限标识</Label>
          <Input id="m-perm" {...register('permission')} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="m-icon">图标(lucide 名)</Label>
          <Input id="m-icon" {...register('icon')} />
        </div>
      </div>
    </FormDialog>
  )
}

// TreeVO → SelectTreeNode(id/name/children)
function toSelectNode(n: TreeVO<SysMenu>): { id: string; name: string; children?: ReturnType<typeof toSelectNode>[] } {
  return { id: n.id, name: n.name, children: n.children?.map(toSelectNode) }
}
