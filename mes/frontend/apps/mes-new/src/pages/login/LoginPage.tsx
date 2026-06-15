import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Input,
  Label,
  Checkbox,
  toast,
} from '@workspace/ui'
import { Factory, RefreshCw } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useMenuStore } from '@/stores/menuStore'
import { captchaUrl } from '@/api/auth'

const schema = z.object({
  username: z.string().min(1, '请输入登录名'),
  password: z.string().min(1, '请输入密码'),
  captcha: z.string().min(1, '请输入验证码'),
  rememberMe: z.boolean().optional(),
})
type FormValues = z.infer<typeof schema>

export default function LoginPage() {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const fetchMenuTree = useMenuStore((s) => s.fetchMenuTree)
  const [captcha, setCaptcha] = useState(captchaUrl())
  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { username: '', password: '', captcha: '', rememberMe: false },
  })

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true)
    try {
      await login(values.username, values.password, values.captcha, values.rememberMe)
      await fetchMenuTree()
      toast.success('登录成功')
      navigate('/welcome', { replace: true })
    } catch {
      setCaptcha(captchaUrl()) // 失败刷新验证码
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm shadow-lg">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Factory className="size-6" />
          </div>
          <CardTitle className="text-xl">章鱼MES</CardTitle>
          <CardDescription>智能制造执行系统</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="username">登录名</Label>
              <Input id="username" autoComplete="username" {...register('username')} />
              {errors.username && <p className="text-xs text-destructive">{errors.username.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">密码</Label>
              <Input id="password" type="password" autoComplete="current-password" {...register('password')} />
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="captcha">验证码</Label>
              <div className="flex gap-2">
                <Input id="captcha" className="flex-1" {...register('captcha')} />
                <button
                  type="button"
                  onClick={() => setCaptcha(captchaUrl())}
                  className="relative h-9 w-24 shrink-0 overflow-hidden rounded-md border border-input"
                  title="点击刷新"
                >
                  <img src={captcha} alt="验证码" className="h-full w-full object-cover" />
                  <RefreshCw className="absolute right-1 top-1 size-3 text-muted-foreground" />
                </button>
              </div>
              {errors.captcha && <p className="text-xs text-destructive">{errors.captcha.message}</p>}
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="rememberMe"
                checked={watch('rememberMe')}
                onCheckedChange={(v) => setValue('rememberMe', v === true)}
              />
              <Label htmlFor="rememberMe" className="text-sm font-normal">记住我</Label>
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? '登录中…' : '登 录'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
