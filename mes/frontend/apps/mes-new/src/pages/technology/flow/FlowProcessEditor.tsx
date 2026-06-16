import { useEffect, useMemo } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input, toast } from '@workspace/ui'
import { Info, ListOrdered, Route } from 'lucide-react'
import FormDialog, { FormSection } from '@/components/FormDialog'
import FormField from '@/components/FormField'
import OrderedTransfer from '@/components/OrderedTransfer'
import { useQuery$, useMutation$ } from '@/http/hooks'
import { invalidate } from '@/http/queryCache'
import { operList } from '@/api/basedata/oper'
import { flowOpers, flowSaveProcess } from '@/api/technology/flow'
import type { SpFlow, SpFlowDtoReq } from '@/types/technology'
import type { TransferItem } from '@/utils/transfer'

const transferItemSchema = z.object({
  id: z.string(),
  primary: z.string(),
  secondary: z.string().optional(),
})

const schema = z.object({
  flow: z.string().min(1, '请输入流程代码'),
  flowDesc: z.string().min(1, '请输入流程描述'),
  opers: z.array(transferItemSchema).min(2, '工艺路线至少需要 2 个工序'),
})

type FormValues = z.infer<typeof schema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  record?: SpFlow | null
}

export default function FlowProcessEditor({ open, onOpenChange, record }: Props) {
  const isEdit = !!record

  const { data: opers } = useQuery$(['oper', 'list'], () => operList(), { enabled: open })
  const { data: chain } = useQuery$(
    ['flow', 'opers', record?.id ?? ''],
    () => flowOpers(record!.id),
    { enabled: open && isEdit },
  )
  const { mutate, loading } = useMutation$((body: SpFlowDtoReq) => flowSaveProcess(body))

  const candidates = useMemo<TransferItem[]>(
    () => (opers ?? []).map((o) => ({ id: o.id, primary: o.operDesc, secondary: o.operCode })),
    [opers],
  )
  const candidateById = useMemo(() => new Map(candidates.map((c) => [c.id, c])), [candidates])

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { flow: '', flowDesc: '', opers: [] },
  })

  // 初始化仅用 reset(非 setState),避免 react-hooks/set-state-in-effect 警告。
  // 新增:开窗即置空;编辑:待工序链(chain)到达后用 reset 回填。
  useEffect(() => {
    if (!open) return
    if (isEdit) {
      if (!chain) return
      reset({
        flow: record?.flow ?? '',
        flowDesc: record?.flowDesc ?? '',
        opers: chain.map((vo) => ({
          id: vo.value,
          primary: vo.title,
          secondary: candidateById.get(vo.value)?.secondary,
        })),
      })
    } else {
      reset({ flow: '', flowDesc: '', opers: [] })
    }
  }, [open, isEdit, chain, candidateById, record, reset])

  const onSubmit = handleSubmit(async (values) => {
    try {
      await mutate({
        id: record?.id,
        flow: values.flow,
        flowDesc: values.flowDesc,
        spOperVoList: values.opers.map((o) => ({ value: o.id, title: o.primary })),
      })
      toast.success(isEdit ? '修改成功' : '新增成功')
      invalidate('["flow","page"')
      onOpenChange(false)
    } catch {
      /* toast */
    }
  })

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? '编辑工艺路线' : '新增工艺路线'}
      description="编排工序生成工艺路线(至少 2 个工序)"
      icon={Route}
      onSubmit={onSubmit}
      submitting={loading}
      contentClassName="sm:max-w-3xl"
    >
      <FormSection title="基本信息" icon={Info} tag="必填">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="流程代码" htmlFor="flow-code" required error={errors.flow?.message}>
            <Input id="flow-code" aria-invalid={!!errors.flow} {...register('flow')} />
          </FormField>
          <FormField label="流程描述" htmlFor="flow-desc" required error={errors.flowDesc?.message}>
            <Input id="flow-desc" aria-invalid={!!errors.flowDesc} {...register('flowDesc')} />
          </FormField>
        </div>
      </FormSection>
      <FormSection title="工序编排" icon={ListOrdered} tag="拖拽 / 上下移调整顺序">
        <Controller
          control={control}
          name="opers"
          render={({ field }) => (
            <OrderedTransfer candidates={candidates} value={field.value} onChange={field.onChange} />
          )}
        />
        {errors.opers && <p className="text-xs text-destructive">{errors.opers.message}</p>}
      </FormSection>
    </FormDialog>
  )
}
