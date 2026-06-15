import { describe, it, expect, vi } from 'vitest'
import { of, lastValueFrom } from 'rxjs'
import { HttpRequest } from '@ngify/http'

// 拦截器模块顶部 import 了 @workspace/ui 的 toast(含 React/sonner),
// node 测试环境无需真实 UI,mock 掉以保证可独立加载。
vi.mock('@workspace/ui', () => ({ toast: { error: () => {}, success: () => {} } }))

import { formEncodingInterceptor } from '@/http/interceptors'

describe('formEncodingInterceptor', () => {
  it('普通对象体转 form-urlencoded,并显式带 Content-Type 头(否则 @ngify 会误判为 application/json)', async () => {
    const req = new HttpRequest('POST', '/login', {
      body: { username: 'admin', password: '123', captcha: 'AB12', rememberMe: false },
    })

    let forwarded: HttpRequest<unknown> | undefined
    const next = (r: HttpRequest<unknown>) => {
      forwarded = r
      return of(null as never)
    }

    await lastValueFrom(formEncodingInterceptor(req as never, next as never))

    // 关键:必须显式声明表单 Content-Type,否则 @ngify detectContentTypeHeader
    // 对原生 URLSearchParams 返回 application/json,后端绑不到表单参数。
    expect(forwarded!.headers.get('Content-Type')).toMatch(/application\/x-www-form-urlencoded/i)

    const bodyStr = String(forwarded!.body)
    expect(bodyStr).toContain('username=admin')
    expect(bodyStr).toContain('captcha=AB12')
  })

  it('已是 application/json 的请求不被表单化', async () => {
    const req = new HttpRequest('POST', '/x', {
      body: { a: 1 },
      headers: { 'Content-Type': 'application/json' },
    })
    let forwarded: HttpRequest<unknown> | undefined
    await lastValueFrom(
      formEncodingInterceptor(req as never, ((r: HttpRequest<unknown>) => {
        forwarded = r
        return of(null as never)
      }) as never),
    )
    expect(forwarded!.headers.get('Content-Type')).toMatch(/application\/json/i)
    // body 保持原对象(未被转成 URLSearchParams)
    expect(forwarded!.body).toEqual({ a: 1 })
  })
})
