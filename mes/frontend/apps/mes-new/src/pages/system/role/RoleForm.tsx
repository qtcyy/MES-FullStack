// apps/mes-new/src/pages/system/role/RoleForm.tsx
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ShieldCheck, Info, ListChecks } from 'lucide-react'
import { Input, Textarea, toast } from '@workspace/ui'
import FormDialog, { FormSection } from '@/components/FormDialog'
import FormField from '@/components/FormField'
import TreeView, { type TreeViewNode } from '@/components/TreeView'
import { useQuery$, useMutation$ } from '@/http/hooks'
import { invalidate } from '@/http/queryCache'
import { roleAddOrUpdate, roleMenuTree } from '@/api/system/role'
import { menuTree } from '@/api/system/menu'
import { collectGrantedIds, type CheckTreeNode } from '@/utils/tree'
import type { SysRole, SysRoleDTO } from '@/types/system'
import type { SysMenu, TreeVO } from '@/types/menu'

interface RoleFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  record?: SysRole | null
  onSaved: () => void
}

const schema = z.object({
  name: z.string().min(1, '请输入角色名'),
  code: z.string().min(1, '请输入角色编码'),
  descr: z.string().optional(),
})

function toTreeViewNodes(nodes: TreeVO<SysMenu>[]): TreeViewNode[] {
  return nodes.map((n) => ({ id: n.id, label: n.name, children: n.children ? toTreeViewNodes(n.children) : undefined }))
}

export default function RoleForm({ open, onOpenChange, record, onSaved }: RoleFormProps) {
  const isEdit = !!record
  const [checkedIds, setCheckedIds] = useState<string[]>([])

  const { data: menuData } = useQuery$(['sys', 'menu', 'tree'], () => menuTree())
  const { data: grantedIds } = useQuery$(
    ['sys', 'role', 'menuIds', record?.id ?? ''],
    () => roleMenuTree(record!.id),
    { enabled: open && isEdit },
  )

  const { mutate, loading } = useMutation$((dto: SysRoleDTO) => roleAddOrUpdate(dto))
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', code: '', descr: '' },
  })

  const menuNodes = useMemo<TreeViewNode[]>(() => toTreeViewNodes(menuData ?? []), [menuData])

  useEffect(() => {
    if (open) {
      reset({ name: record?.name ?? '', code: record?.code ?? '', descr: record?.descr ?? '' })
      setCheckedIds(isEdit ? (grantedIds ?? []) : [])
    }
  }, [open, record, isEdit, grantedIds, reset])

  const onSubmit = handleSubmit(async (values) => {
    const sysMenuIds = collectGrantedIds(menuNodes as CheckTreeNode[], new Set(checkedIds))
    const dto: SysRoleDTO = {
      ...(record ?? { id: '', name: '', code: '', descr: '', deleted: '0' }),
      name: values.name,
      code: values.code,
      descr: values.descr ?? '',
      sysMenuIds,
    }
    try {
      await mutate(dto)
      toast.success(isEdit ? '修改成功' : '新增成功')
      invalidate('["sys","role"')
      onOpenChange(false)
      onSaved()
    } catch {
      /* 拦截器已 toast */
    }
  })

  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title={isEdit ? '编辑角色' : '新增角色'} icon={ShieldCheck} description="维护角色与权限" onSubmit={onSubmit} submitting={loading}>
      <FormSection title="基本信息" icon={Info} tag="必填">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="角色名" htmlFor="r-name" required error={errors.name?.message}>
            <Input id="r-name" aria-invalid={!!errors.name} {...register('name')} />
          </FormField>
          <FormField label="角色编码" htmlFor="r-code" required error={errors.code?.message}>
            <Input id="r-code" aria-invalid={!!errors.code} {...register('code')} />
          </FormField>
        </div>
        <FormField label="描述" htmlFor="r-descr">
          <Textarea id="r-descr" {...register('descr')} />
        </FormField>
      </FormSection>
      <FormSection title="菜单权限" icon={ListChecks}>
        <div className="max-h-64 overflow-auto rounded-md border border-border p-2">
          <TreeView nodes={menuNodes} checkedIds={checkedIds} onCheckedChange={setCheckedIds} />
        </div>
      </FormSection>
    </FormDialog>
  )
}
