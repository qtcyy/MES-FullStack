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
  Textarea,
  toast,
} from '@workspace/ui'
import { FolderTree, Pencil } from 'lucide-react'
import FormDialog, { FormSection } from '@/components/FormDialog'
import FormField from '@/components/FormField'
import { useQuery$, useMutation$ } from '@/http/hooks'
import { productBomProducts, productBomSave } from '@/api/technology/product-bom'
import type { SpProductBom } from '@/types/technology'

export type BomNodeMode = 'create-root' | 'add-child' | 'edit'

const schema = z.object({
  // 字段名避开 'nodeName':input 的 name="nodeName" 会污染 <form>.nodeName(DOM clobbering),
  // 令 React 事件系统读取 form.nodeName.toLowerCase() 崩溃并触发原生提交导致整页刷新。
  // 这里用 bomNodeName,提交时再映射回后端要的 nodeName。
  bomNodeName: z.string().min(1, '请输入节点名称'),
  productCode: z.string().optional(),
  remark: z.string().optional(),
  sortOrder: z.coerce.number().optional(),
})

type FormValues = z.infer<typeof schema>

const DEFAULTS: FormValues = {
  bomNodeName: '',
  productCode: '',
  remark: '',
  sortOrder: 0,
}

const TITLES: Record<BomNodeMode, string> = {
  'create-root': '新建根 BOM',
  'add-child': '添加子节点',
  edit: '编辑节点',
}

interface BomNodeFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: BomNodeMode
  parentId?: string
  initial?: Pick<SpProductBom, 'id' | 'nodeName' | 'productCode' | 'remark' | 'sortOrder'>
  onSaved: (newId: string) => void
}

export default function BomNodeForm({
  open,
  onOpenChange,
  mode,
  parentId,
  initial,
  onSaved,
}: BomNodeFormProps) {
  const isCreateRoot = mode === 'create-root'
  const { data: products } = useQuery$(
    ['productBom', 'products'],
    () => productBomProducts(),
    { enabled: open && isCreateRoot },
  )
  const { mutate, loading } = useMutation$((b: Partial<SpProductBom>) => productBomSave(b))

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: DEFAULTS,
  })

  useEffect(() => {
    if (open) {
      reset(
        mode === 'edit' && initial
          ? {
              bomNodeName: initial.nodeName ?? '',
              productCode: initial.productCode ?? '',
              remark: initial.remark ?? '',
              sortOrder: initial.sortOrder ?? 0,
            }
          : DEFAULTS,
      )
    }
  }, [open, mode, initial, reset])

  const onSubmit = handleSubmit(async (values) => {
    try {
      let body: Partial<SpProductBom>
      if (mode === 'create-root') {
        body = {
          nodeName: values.bomNodeName,
          productCode: values.productCode ?? '',
          remark: values.remark ?? '',
          sortOrder: values.sortOrder ?? 0,
        }
      } else if (mode === 'add-child') {
        body = {
          nodeName: values.bomNodeName,
          parentId,
          remark: values.remark ?? '',
          sortOrder: values.sortOrder ?? 0,
        }
      } else {
        body = {
          id: initial!.id,
          nodeName: values.bomNodeName,
          remark: values.remark ?? '',
          sortOrder: values.sortOrder ?? 0,
        }
      }
      const newId = await mutate(body)
      toast.success('已保存节点')
      onSaved(newId)
      onOpenChange(false)
    } catch {
      /* toast by interceptor */
    }
  })

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={TITLES[mode]}
      description="维护产品 BOM 树节点"
      icon={isCreateRoot || mode === 'add-child' ? FolderTree : Pencil}
      onSubmit={onSubmit}
      submitting={loading}
    >
      <FormSection title="节点信息" tag="必填">
        {isCreateRoot && (
          <FormField label="产品" required error={errors.productCode?.message}>
            <Controller
              control={control}
              name="productCode"
              render={({ field }) => (
                <Select
                  value={field.value || undefined}
                  onValueChange={(v) => {
                    field.onChange(v)
                    const m = (products ?? []).find((x) => x.materiel === v)
                    if (m) setValue('bomNodeName', m.materielDesc ?? '')
                  }}
                >
                  <SelectTrigger className="w-full"><SelectValue placeholder="请选择产品" /></SelectTrigger>
                  <SelectContent>
                    {(products ?? []).map((m) => (
                      <SelectItem key={m.materiel} value={m.materiel}>{m.materiel} {m.materielDesc}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
        )}
        <FormField label="节点名称" htmlFor="node-name" required error={errors.bomNodeName?.message}>
          <Input id="node-name" aria-invalid={!!errors.bomNodeName} {...register('bomNodeName')} />
        </FormField>
        <FormField label="排序" htmlFor="node-sort">
          <Input id="node-sort" type="number" {...register('sortOrder')} />
        </FormField>
        <FormField label="备注" htmlFor="node-remark">
          <Textarea id="node-remark" {...register('remark')} />
        </FormField>
      </FormSection>
    </FormDialog>
  )
}
