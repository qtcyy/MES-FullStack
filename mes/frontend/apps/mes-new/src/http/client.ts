import { HttpClient, withInterceptors, type HttpInterceptorFn } from '@ngify/http'
import {
  ajaxHeaderInterceptor,
  formEncodingInterceptor,
  resultUnwrapInterceptor,
} from './interceptors'

/** API 基址:开发走 Vite 代理 /api;生产由 VITE_API_BASE 注入(前后端分离) */
export const API_BASE = import.meta.env.VITE_API_BASE ?? '/api'

/** 为相对 URL 自动补 API_BASE 前缀 */
const apiBaseInterceptor: HttpInterceptorFn = (req, next) => {
  if (/^https?:\/\//.test(req.url)) return next(req)
  return next(req.clone({ url: API_BASE + req.url }))
}

/** 全局单例 HTTP 客户端(store 与 hooks 共享) */
export const http = new HttpClient(
  withInterceptors([
    apiBaseInterceptor,
    ajaxHeaderInterceptor,
    formEncodingInterceptor,
    resultUnwrapInterceptor,
  ]),
)
