import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { User } from 'lucide-react'
import { Input, toast } from '@workspace/ui'
import FormDialog from '@/components/FormDialog'
import FormField from '@/components/FormField'
import { useMutation$ } from '@/http/hooks'
import { invalidate } from '@/http/queryCache'
import { userAddOrUpdate } from '@/api/system/user'
import type { SysUser, SysUserDTO } from '@/types/user'

interface UserFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  record?: SysUser | null
  onSaved: () => void
}

const makeSchema = (isEdit: boolean) =>
  z.object({
    username: z.string().min(1, '请输入登录名'),
    name: z.string().min(1, '请输入姓名'),
    password: isEdit ? z.string().optional() : z.string().min(1, '请输入初始密码'),
  })

export default function UserForm({ open, onOpenChange, record, onSaved }: UserFormProps) {
  const isEdit = !!record
  const { mutate, loading } = useMutation$((dto: SysUserDTO) => userAddOrUpdate(dto))

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<z.infer<ReturnType<typeof makeSchema>>>({
    resolver: zodResolver(makeSchema(isEdit)),
    defaultValues: { username: '', name: '', password: '' },
  })

  useEffect(() => {
    if (open) {
      reset({ username: record?.username ?? '', name: record?.name ?? '', password: '' })
    }
  }, [open, record, reset])

  const onSubmit = handleSubmit(async (values) => {
    const dto: SysUserDTO = {
      ...(record ?? { id: '', username: '', name: '', deleted: '0' }),
      username: values.username,
      name: values.name,
    }
    if (values.password) dto.password = values.password
    try {
      await mutate(dto)
      toast.success(isEdit ? '修改成功' : '新增成功')
      invalidate('["sys","user"')
      onOpenChange(false)
      onSaved()
    } catch {
      /* 拦截器已 toast */
    }
  })

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? '编辑用户' : '新增用户'}
      icon={User}
      description="维护系统用户账号"
      onSubmit={onSubmit}
      submitting={loading}
    >
      <FormField label="登录名" htmlFor="f-username" required error={errors.username?.message} help={isEdit ? '登录名创建后不可修改' : undefined}>
        <Input id="f-username" disabled={isEdit} aria-invalid={!!errors.username} {...register('username')} />
      </FormField>
      <FormField label="姓名" htmlFor="f-name" required error={errors.name?.message}>
        <Input id="f-name" aria-invalid={!!errors.name} {...register('name')} />
      </FormField>
      <FormField label={isEdit ? '重置密码' : '初始密码'} htmlFor="f-password" required={!isEdit} error={errors.password?.message} help={isEdit ? '留空表示不修改密码' : '新用户的初始登录密码'}>
        <Input id="f-password" type="password" aria-invalid={!!errors.password} {...register('password')} />
      </FormField>
    </FormDialog>
  )
}
