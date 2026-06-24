import { http } from '@/api/request'
import type {
  SysNotice, SysNoticeInbox, SysNoticePageReq, SysNoticeInboxPageReq,
  NoticePublishReq, NoticeReadStat, IPage,
} from '@/types/system'

// ── 发布端 (notice:publish) ──────────────────────────────
/** 发布通知：后端 @RequestBody JSON，须显式 json=true 跳过 form 编码 */
export const noticePublish = (req: NoticePublishReq) =>
  http.post<string>('/admin/sys/notice/publish', req, true)
export const noticePage = (req: SysNoticePageReq) =>
  http.post<IPage<SysNotice>>('/admin/sys/notice/page', req)
export const noticeGetById = (id: string) =>
  http.get<SysNotice>('/admin/sys/notice/get-by-id', { id })
export const noticeReadStat = (id: string) =>
  http.get<NoticeReadStat>('/admin/sys/notice/read-stat', { id })
export const noticeDelete = (id: string) =>
  http.post<string>('/admin/sys/notice/delete', { id })

// ── 接收端 (收件箱) ──────────────────────────────────────
export const inboxPage = (req: SysNoticeInboxPageReq) =>
  http.post<IPage<SysNoticeInbox>>('/admin/sys/notice/inbox/page', req)
export const inboxUnreadCount = () =>
  http.get<number>('/admin/sys/notice/inbox/unread-count')
export const inboxRecent = (size = 10) =>
  http.get<SysNoticeInbox[]>('/admin/sys/notice/inbox/recent', { size })
export const inboxDetail = (inboxId: string) =>
  http.get<SysNoticeInbox>('/admin/sys/notice/inbox/detail', { inboxId })
export const inboxMarkRead = (inboxId: string) =>
  http.post<string>('/admin/sys/notice/inbox/mark-read', { inboxId })
export const inboxMarkAllRead = () =>
  http.post<void>('/admin/sys/notice/inbox/mark-all-read', {})
export const inboxDelete = (inboxId: string) =>
  http.post<string>('/admin/sys/notice/inbox/delete', { inboxId })
