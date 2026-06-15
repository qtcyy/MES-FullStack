import {
  HttpResponse,
  HttpErrorResponse,
  type HttpInterceptorFn,
} from '@ngify/http'
import { map, catchError, throwError } from 'rxjs'
import { toast } from '@workspace/ui'
import { buildFormBody, shouldFormEncode } from './formBody'
import { isResult, BusinessError } from './result'

/** 标记 AJAX,使后端在错误时返回 JSON 而非重定向 HTML */
export const ajaxHeaderInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req.clone({ headers: req.headers.set('X-Requested-With', 'XMLHttpRequest') }))
}

/** POST/PUT 普通对象体 → application/x-www-form-urlencoded(显式 json 头则跳过) */
export const formEncodingInterceptor: HttpInterceptorFn = (req, next) => {
  const contentType = req.headers.get('Content-Type') || ''
  if (shouldFormEncode(req.body, contentType)) {
    return next(req.clone({ body: buildFormBody(req.body as Record<string, unknown>) }))
  }
  return next(req)
}

/** 解包 Result:code===0 → data;否则 toast 报错并抛 BusinessError;HTTP 401 → 跳登录 */
export const resultUnwrapInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    map((event) => {
      if (event instanceof HttpResponse) {
        const body = event.body
        if (isResult(body)) {
          if (body.code !== 0) {
            toast.error(body.msg || '请求失败')
            throw new BusinessError(body.code, body.msg)
          }
          return event.clone({ body: body.data })
        }
      }
      return event
    }),
    catchError((err) => {
      if (err instanceof HttpErrorResponse && err.status === 401) {
        if (!location.pathname.startsWith('/login')) {
          location.href = '/login'
        }
      } else if (err instanceof HttpErrorResponse) {
        toast.error(err.message || '网络请求失败')
      }
      return throwError(() => err)
    }),
  )
}
