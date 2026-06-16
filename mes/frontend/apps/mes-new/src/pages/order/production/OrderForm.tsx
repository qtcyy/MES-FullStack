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
import { ClipboardList, Info } from 'lucide-react'
import FormDialog, { FormSection } from '@/components/FormDialog'
import FormField from '@/components/FormField'
import { useQuery$, useMutation$ } from '@/http/hooks'
import { invalidate } from '@/http/queryCache'
import { orderAddOrUpdate } from '@/api/order/order'
import { materilePage } from '@/api/basedata/materile'
import { flowList } from '@/api/technology/flow'
import { toDatetimeLocal, fromDatetimeLocal } from '@/utils/datetime'
import type { SpOrder } from '@/types/order'

const ORDER_TYPES = [
  { value: 'P', label: '批量' },
  { value: 'A', label: '验证' },
  { value: 'F', label: '返工' },
]

const schema = z.object({
  orderCode: z.string().min(1, '请输入工单编号'),
  orderDescription: z.string().optional(),
  qty: z.coerce.number({ invalid_type_error: '请输入数量' }).int('需为整数').min(1, '数量至少 1'),
  orderType: z.enum(['P', 'A', 'F']),
  materiel: z.string().min(1, '请选择物料'),
  materielDesc: z.string().optional(),
  flowId: z.string().optional(),
  planStartTime: z.string().optional(),
  planEndTime: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  record?: SpOrder | null
}

export default function OrderForm({ open, onOpenChange, record }: Props) {
  const isEdit = !!record
  const { data: materials } = useQuery$(
    ['order', 'materials'],
    () => materilePage({ current: 1, size: 200 }),
    { enabled: open },
  )
  const { data: flows } = useQuery$(['order', 'flows'], () => flowList(), { enabled: open })
  const { mutate, loading } = useMutation$((dto: Partial<SpOrder>) => orderAddOrUpdate(dto))

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      orderCode: '', orderDescription: '', qty: 1, orderType: 'P',
      materiel: '', materielDesc: '', flowId: '', planStartTime: '', planEndTime: '',
    },
  })

  useEffect(() => {
    if (open) {
      reset({
        orderCode: record?.orderCode ?? '',
        orderDescription: record?.orderDescription ?? '',
        qty: record?.qty ?? 1,
        orderType: (record?.orderType as FormValues['orderType']) ?? 'P',
        materiel: record?.materiel ?? '',
        materielDesc: record?.materielDesc ?? '',
        flowId: record?.flowId ?? '',
        planStartTime: toDatetimeLocal(record?.planStartTime),
        planEndTime: toDatetimeLocal(record?.planEndTime),
      })
    }
  }, [open, record, reset])

  const onSubmit = handleSubmit(async (values) => {
    try {
      await mutate({
        id: record?.id,
        orderCode: values.orderCode,
        orderDescription: values.orderDescription ?? '',
        qty: values.qty,
        orderType: values.orderType,
        materiel: values.materiel,
        materielDesc: values.materielDesc ?? '',
        flowId: values.flowId ?? '',
        planStartTime: fromDatetimeLocal(values.planStartTime),
        planEndTime: fromDatetimeLocal(values.planEndTime),
        ...(isEdit ? { statue: record?.statue } : {}),
      })
      toast.success(isEdit ? '修改成功' : '新增成功')
      invalidate('["order","page"')
      onOpenChange(false)
    } catch {
      /* toast by interceptor */
    }
  })

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? '编辑生产订单' : '新增生产订单'}
      description="维护生产工单(物料、工艺路线、计划时间)"
      icon={ClipboardList}
      onSubmit={onSubmit}
      submitting={loading}
      contentClassName="sm:max-w-2xl"
    >
      <FormSection title="基本信息" icon={Info} tag="必填">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="工单编号" htmlFor="o-code" required error={errors.orderCode?.message}>
            <Input id="o-code" aria-invalid={!!errors.orderCode} {...register('orderCode')} />
          </FormField>
          <FormField label="数量" htmlFor="o-qty" required error={errors.qty?.message}>
            <Input id="o-qty" type="number" min={1} aria-invalid={!!errors.qty} {...register('qty')} />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="订单类型" required>
            <Controller
              control={control}
              name="orderType"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ORDER_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
          <FormField label="物料" required error={errors.materiel?.message}>
            <Controller
              control={control}
              name="materiel"
              render={({ field }) => (
                <Select
                  value={field.value || undefined}
                  onValueChange={(v) => {
                    field.onChange(v)
                    const m = (materials?.records ?? []).find((x) => x.materiel === v)
                    setValue('materielDesc', m?.materielDesc ?? '')
                  }}
                >
                  <SelectTrigger className="w-full"><SelectValue placeholder="请选择物料" /></SelectTrigger>
                  <SelectContent>
                    {(materials?.records ?? []).map((m) => (
                      <SelectItem key={m.materiel} value={m.materiel}>{m.materiel} - {m.materielDesc}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
        </div>
        <FormField label="工艺路线" htmlFor="o-flow">
          <Controller
            control={control}
            name="flowId"
            render={({ field }) => (
              <Select value={field.value || undefined} onValueChange={field.onChange}>
                <SelectTrigger id="o-flow" className="w-full"><SelectValue placeholder="请选择工艺路线" /></SelectTrigger>
                <SelectContent>
                  {(flows ?? []).map((f) => (
                    <SelectItem key={f.id} value={f.id}>{f.flow} - {f.flowDesc}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </FormField>
        <FormField label="工单描述" htmlFor="o-desc">
          <Textarea id="o-desc" {...register('orderDescription')} />
        </FormField>
      </FormSection>
      <FormSection title="计划时间" icon={Info} tag="选填">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="计划开始" htmlFor="o-start">
            <Input id="o-start" type="datetime-local" {...register('planStartTime')} />
          </FormField>
          <FormField label="计划结束" htmlFor="o-end">
            <Input id="o-end" type="datetime-local" {...register('planEndTime')} />
          </FormField>
        </div>
      </FormSection>
    </FormDialog>
  )
}
