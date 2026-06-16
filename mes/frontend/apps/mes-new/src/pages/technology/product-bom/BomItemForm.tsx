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
import { Package } from 'lucide-react'
import FormDialog, { FormSection } from '@/components/FormDialog'
import FormField from '@/components/FormField'
import { useQuery$, useMutation$ } from '@/http/hooks'
import { productBomItemSave } from '@/api/technology/product-bom'
import { materilePage } from '@/api/basedata/materile'
import { materielToItem } from '@/utils/productBom'
import type { SpProductBomItem } from '@/types/technology'

const ITEM_TYPES = [
  { value: 'material', label: '物料' },
  { value: 'bom_ref', label: '子 BOM 引用' },
]

const UNITS = ['个', '条', '台', '套', 'kg', 'm']

const schema = z.object({
  itemType: z.enum(['material', 'bom_ref']),
  materialCode: z.string().min(1, '请选择物料'),
  materialDesc: z.string().optional(),
  quantity: z.coerce.number({ invalid_type_error: '请输入数量' }).min(0.01, '数量至少 0.01'),
  unit: z.string().optional(),
  sortOrder: z.coerce.number().optional(),
})

type FormValues = z.infer<typeof schema>

const DEFAULTS: FormValues = {
  itemType: 'material',
  materialCode: '',
  materialDesc: '',
  quantity: 1,
  unit: '个',
  sortOrder: 0,
}

interface BomItemFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  bomId: string
  initial?: SpProductBomItem
  onSaved: () => void
}

export default function BomItemForm({
  open,
  onOpenChange,
  bomId,
  initial,
  onSaved,
}: BomItemFormProps) {
  const isEdit = !!initial
  const { data: materialsData } = useQuery$(
    ['materile', 'all'],
    () => materilePage({ current: 1, size: 500 }),
    { enabled: open },
  )
  const { mutate, loading } = useMutation$((b: Partial<SpProductBomItem>) => productBomItemSave(b))

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
        initial
          ? {
              itemType: initial.itemType ?? 'material',
              materialCode: initial.materialCode ?? '',
              materialDesc: initial.materialDesc ?? '',
              quantity: initial.quantity ?? 1,
              unit: initial.unit ?? '个',
              sortOrder: initial.sortOrder ?? 0,
            }
          : DEFAULTS,
      )
    }
  }, [open, initial, reset])

  const onSubmit = handleSubmit(async (values) => {
    try {
      await mutate({
        id: initial?.id,
        bomId,
        itemType: values.itemType,
        materialCode: values.materialCode,
        materialDesc: values.materialDesc ?? '',
        quantity: values.quantity,
        unit: values.unit ?? '个',
        sortOrder: values.sortOrder ?? 0,
      })
      toast.success('已保存物料行')
      onSaved()
      onOpenChange(false)
    } catch {
      /* toast by interceptor */
    }
  })

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? '编辑物料行' : '新增物料行'}
      description="维护 BOM 节点下的物料行(物料、数量、单位)"
      icon={Package}
      onSubmit={onSubmit}
      submitting={loading}
    >
      <FormSection title="物料信息" tag="必填">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="行类型" required>
            <Controller
              control={control}
              name="itemType"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ITEM_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
          <FormField label="物料" required error={errors.materialCode?.message}>
            <Controller
              control={control}
              name="materialCode"
              render={({ field }) => (
                <Select
                  value={field.value || undefined}
                  onValueChange={(v) => {
                    field.onChange(v)
                    const m = (materialsData?.records ?? []).find((x) => x.materiel === v)
                    if (m) {
                      const mapped = materielToItem(m)
                      setValue('materialDesc', mapped.materialDesc ?? '')
                      setValue('unit', mapped.unit ?? '个')
                    }
                  }}
                >
                  <SelectTrigger className="w-full"><SelectValue placeholder="请选择物料" /></SelectTrigger>
                  <SelectContent>
                    {(materialsData?.records ?? []).map((m) => (
                      <SelectItem key={m.materiel} value={m.materiel}>{m.materiel} {m.materielDesc}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
        </div>
        <FormField label="物料描述" htmlFor="item-desc" help="随物料带出,可手动调整">
          <Input id="item-desc" {...register('materialDesc')} />
        </FormField>
        <div className="grid grid-cols-3 gap-4">
          <FormField label="数量" htmlFor="item-qty" required error={errors.quantity?.message}>
            <Input id="item-qty" type="number" step="0.01" aria-invalid={!!errors.quantity} {...register('quantity')} />
          </FormField>
          <FormField label="单位">
            <Controller
              control={control}
              name="unit"
              render={({ field }) => (
                <Select value={field.value || undefined} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="单位" /></SelectTrigger>
                  <SelectContent>
                    {UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
          <FormField label="排序" htmlFor="item-sort">
            <Input id="item-sort" type="number" {...register('sortOrder')} />
          </FormField>
        </div>
      </FormSection>
    </FormDialog>
  )
}
