import type { DashboardOverview } from '@/types/digitization'

export interface TodoItem {
  id: string
  title: string
  type: '审批' | '排产' | '告警'
  time: string
}

export interface AnnouncementItem {
  id: string
  title: string
  time: string
  tag: string
}

/** overview 接口失败时的兜底数据(全 mock) */
export const MOCK_OVERVIEW: DashboardOverview = {
  kpi: { orderCount: 128, deviceCount: 42, materielCount: 1204, flowCount: 36 },
  orderStatus: [
    { name: '待排产', value: 23 },
    { name: '生产中', value: 68 },
    { name: '已完工', value: 86 },
    { name: '已关闭', value: 12 },
  ],
  deviceStatus: [
    { name: '运行', value: 28 },
    { name: '空闲', value: 9 },
    { name: '维修', value: 3 },
    { name: '停机', value: 2 },
  ],
  orderType: [
    { name: '标准订单', value: 74 },
    { name: '返工订单', value: 18 },
    { name: '试制订单', value: 9 },
  ],
  monthlyTrend: [
    { month: '2025-07', orderCount: 96, totalQty: 5200, completedCount: 88 },
    { month: '2025-08', orderCount: 102, totalQty: 5600, completedCount: 95 },
    { month: '2025-09', orderCount: 88, totalQty: 4800, completedCount: 84 },
    { month: '2025-10', orderCount: 110, totalQty: 6100, completedCount: 101 },
    { month: '2025-11', orderCount: 121, totalQty: 6700, completedCount: 112 },
    { month: '2025-12', orderCount: 128, totalQty: 7000, completedCount: 119 },
  ],
}

/** 待办示例(占位,后续接后端) */
export const MOCK_TODOS: TodoItem[] = [
  { id: 't1', title: '生产订单 PO-20260628-001 待审批', type: '审批', time: '10 分钟前' },
  { id: 't2', title: '工单 WO-3391 待排产', type: '排产', time: '32 分钟前' },
  { id: 't3', title: '设备 CNC-07 温度告警', type: '告警', time: '1 小时前' },
  { id: 't4', title: '物料 M-2207 库存不足', type: '告警', time: '2 小时前' },
  { id: 't5', title: '返工订单 RO-118 待审批', type: '审批', time: '今天 09:12' },
]

/** 系统公告/动态示例(占位) */
export const MOCK_ANNOUNCEMENTS: AnnouncementItem[] = [
  { id: 'a1', title: '系统将于本周六 22:00 例行维护', time: '2026-06-28', tag: '运维' },
  { id: 'a2', title: 'MES v2.3 发布:工序步骤支持拖拽排序', time: '2026-06-26', tag: '版本' },
  { id: 'a3', title: '车间 A 区扫码终端已全部上线', time: '2026-06-24', tag: '公告' },
]
