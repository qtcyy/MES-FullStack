import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { FileText, Info, Link2, SlidersHorizontal } from 'lucide-react'
import {
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  toast,
} from '@workspace/ui'
import { firstValueFrom } from 'rxjs'
import FormDialog, { FormSection } from '@/components/FormDialog'
import FormField from '@/components/FormField'
import ScriptEditor from '@/components/ScriptEditor'
import { useMutation$ } from '@/http/hooks'
import { invalidate } from '@/http/queryCache'
import { formAddOrUpdate, formList } from '@/api/workflow/form'
import {
  FORM_KEY_REGEX,
  DEFAULT_TITLE_SCRIPT,
  DEFAULT_PC_URL_SCRIPT,
  DEFAULT_MOBILE_URL_SCRIPT,
} from '@/pages/workflow/formUtils'
import type { WorkflowForm } from '@/types/workflow'

interface FormWizardDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  record?: WorkflowForm | null
}

const schema = z.object({
  name: z.string().min(1, '请输入表单名称'),
  formKey: z.string().min(1, '请输入表单key').regex(FORM_KEY_REGEX, '以字母开头,仅字母/数字/下划线'),
  formType: z.literal('URL'),
  titleScript: z.string().min(1, '请输入流程标题生成脚本'),
  pcUrlScript: z.string().min(1, '请输入PC表单地址脚本'),
  mobileUrlScript: z.string().min(1, '请输入手机表单地址脚本'),
  skipSameAssignee: z.boolean(),
})

type FormValues = z.infer<typeof schema>

const EMPTY: FormValues = {
  name: '',
  formKey: '',
  formType: 'URL',
  titleScript: DEFAULT_TITLE_SCRIPT,
  pcUrlScript: DEFAULT_PC_URL_SCRIPT,
  mobileUrlScript: DEFAULT_MOBILE_URL_SCRIPT,
  skipSameAssignee: true,
}

export default function FormWizardDialog({ open, onOpenChange, record }: FormWizardDialogProps) {
  const isEdit = !!record
  const { mutate, loading } = useMutation$((dto: WorkflowForm) => formAddOrUpdate(dto))
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: EMPTY })

  useEffect(() => {
    if (open) {
      reset(
        record
          ? {
              name: record.name,
              formKey: record.formKey,
              formType: 'URL',
              titleScript: record.titleScript,
              pcUrlScript: record.pcUrlScript,
              mobileUrlScript: record.mobileUrlScript,
              skipSameAssignee: record.skipSameAssignee,
            }
          : EMPTY,
      )
    }
  }, [open, record, reset])

  const onSubmit = handleSubmit(async (values) => {
    const existing = await firstValueFrom(formList())
    if (existing.some((f) => f.formKey === values.formKey && f.id !== (record?.id ?? ''))) {
      toast.error(`表单key「${values.formKey}」已存在`)
      return
    }
    const dto: WorkflowForm = { id: record?.id ?? '', ...values }
    try {
      await mutate(dto)
      toast.success(isEdit ? '修改成功' : '新增成功')
      invalidate('["workflow","form"')
      onOpenChange(false)
    } catch {
      /* 拦截器已 toast */
    }
  })

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? '编辑流程表单' : '新增流程表单'}
      icon={FileText}
      description="为已发布流程配置 URL 表单与地址脚本"
      onSubmit={onSubmit}
      submitting={loading}
      contentClassName="sm:max-w-2xl"
    >
      <FormSection title="基本信息" icon={Info} tag="必填">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="表单名称" htmlFor="wf-name" required error={errors.name?.message}>
            <Input id="wf-name" aria-invalid={!!errors.name} placeholder="如 生产订单审批流程" {...register('name')} />
          </FormField>
          <FormField label="表单key" htmlFor="wf-key" required error={errors.formKey?.message}>
            <Input id="wf-key" aria-invalid={!!errors.formKey} placeholder="如 orderRecord" {...register('formKey')} />
          </FormField>
        </div>
        <FormField label="表单类型" required>
          <Controller
            control={control}
            name="formType"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="URL">URL表单</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </FormField>
      </FormSection>

      <FormSection title="地址脚本" icon={Link2} tag="URL表单">
        <FormField label="流程标题生成脚本" htmlFor="wf-title" required error={errors.titleScript?.message}>
          <Controller
            control={control}
            name="titleScript"
            render={({ field }) => (
              <ScriptEditor id="wf-title" value={field.value} onChange={field.onChange} invalid={!!errors.titleScript} />
            )}
          />
        </FormField>
        <FormField label="PC表单地址脚本" htmlFor="wf-pc" required error={errors.pcUrlScript?.message}>
          <Controller
            control={control}
            name="pcUrlScript"
            render={({ field }) => (
              <ScriptEditor id="wf-pc" value={field.value} onChange={field.onChange} invalid={!!errors.pcUrlScript} showHint={false} />
            )}
          />
        </FormField>
        <FormField label="手机表单地址脚本" htmlFor="wf-mobile" required error={errors.mobileUrlScript?.message}>
          <Controller
            control={control}
            name="mobileUrlScript"
            render={({ field }) => (
              <ScriptEditor id="wf-mobile" value={field.value} onChange={field.onChange} invalid={!!errors.mobileUrlScript} showHint={false} />
            )}
          />
        </FormField>
      </FormSection>

      <FormSection title="表单选项" icon={SlidersHorizontal}>
        <Controller
          control={control}
          name="skipSameAssignee"
          render={({ field }) => (
            <label className="flex items-center gap-3 text-sm">
              <Switch checked={field.value} onCheckedChange={field.onChange} />
              <span>跳过相同处理人</span>
            </label>
          )}
        />
      </FormSection>
    </FormDialog>
  )
}
