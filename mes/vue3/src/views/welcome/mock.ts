/**
 * 首页静态 Mock 数据(作业演示用,非真实接口)。
 * 集中管理,便于后续接入 /digitization/dashboard 时替换。
 */
import {
  Setting,
  Box,
  Share,
  Operation,
  Tickets,
  DataBoard,
  House,
  TrendCharts,
  Goods,
  Cpu,
  CircleCheck,
} from '@element-plus/icons-vue'
import type { Component } from 'vue'

/** KPI 统计卡 */
export interface Kpi {
  key: string
  label: string
  value: string
  unit?: string
  icon: Component
  color: string
  /** 环比百分比,正涨负跌 */
  delta: number
  /** 迷你 sparkline 数据 */
  spark: number[]
}

export const kpis: Kpi[] = [
  {
    key: 'orders',
    label: '生产工单',
    value: '128',
    unit: '单',
    icon: Tickets,
    color: '#2f7cff',
    delta: 12.5,
    spark: [88, 96, 92, 105, 110, 119, 128],
  },
  {
    key: 'material',
    label: '在制物料',
    value: '1,284',
    unit: '件',
    icon: Goods,
    color: '#13c2c2',
    delta: 4.2,
    spark: [1180, 1210, 1195, 1240, 1260, 1255, 1284],
  },
  {
    key: 'oee',
    label: '设备稼动率',
    value: '92.3',
    unit: '%',
    icon: Cpu,
    color: '#52c41a',
    delta: 1.8,
    spark: [89, 90, 88, 91, 90, 92, 92.3],
  },
  {
    key: 'yield',
    label: '今日良率',
    value: '98.6',
    unit: '%',
    icon: CircleCheck,
    color: '#fa8c16',
    delta: -0.4,
    spark: [99, 98.8, 99.1, 98.5, 98.9, 98.7, 98.6],
  },
]

/** 近 7 天产量趋势 */
export const trend = {
  days: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
  output: [820, 932, 901, 934, 1290, 1330, 1320],
  plan: [900, 900, 950, 950, 1200, 1300, 1300],
}

/** 工单状态分布 */
export const orderStatus = [
  { name: '已完成', value: 86, color: '#52c41a' },
  { name: '生产中', value: 28, color: '#2f7cff' },
  { name: '待排产', value: 10, color: '#fa8c16' },
  { name: '已暂停', value: 4, color: '#f5222d' },
]

/** 各车间设备稼动率 */
export const workshopOee = [
  { name: '一号车间', value: 95.2 },
  { name: '二号车间', value: 91.8 },
  { name: '三号车间', value: 88.4 },
  { name: '四号车间', value: 84.6 },
]

/** 快捷入口 — route 为空表示尚未开放(toast 提示) */
export interface QuickEntry {
  label: string
  icon: Component
  color: string
  route?: string
}

export const quickEntries: QuickEntry[] = [
  { label: '系统管理', icon: Setting, color: '#2f7cff', route: '/system/user' },
  { label: '物料管理', icon: Box, color: '#13c2c2', route: '/basedata/materile' },
  { label: '工艺路线', icon: Share, color: '#722ed1', route: '/technology/flow' },
  { label: '工序定义', icon: Operation, color: '#1677ff', route: '/technology/oper' },
  { label: '计划工单', icon: TrendCharts, color: '#fa8c16' },
  { label: '智慧大屏', icon: DataBoard, color: '#eb2f96' },
  { label: '数字孪生', icon: House, color: '#52c41a' },
]

/** 近期生产动态时间线 */
export interface Activity {
  time: string
  text: string
  type: 'primary' | 'success' | 'warning' | 'danger' | 'info'
}

export const activities: Activity[] = [
  { time: '09:42', text: '工单 WO-20260620-018 已完成,产出 320 件', type: 'success' },
  { time: '09:15', text: '二号车间 CNC-07 设备进入保养计划', type: 'warning' },
  { time: '08:50', text: '物料 SteelBar-Φ20 入库 1,200 件', type: 'primary' },
  { time: '08:20', text: '工艺路线「精密轴加工」版本 v2.3 已发布', type: 'info' },
  { time: '08:02', text: '质检拦截:批次 B-0619 良率低于阈值', type: 'danger' },
]

/** 待处理事项 */
export interface Todo {
  text: string
  tag: string
  tagType: 'primary' | 'success' | 'warning' | 'danger' | 'info'
}

export const todos: Todo[] = [
  { text: '审批 3 张待排产工单', tag: '待审批', tagType: 'warning' },
  { text: '处理 2 条物料缺料预警', tag: '紧急', tagType: 'danger' },
  { text: '确认一号车间换型计划', tag: '今日', tagType: 'primary' },
  { text: '复核昨日质量异常报告', tag: '待复核', tagType: 'info' },
]
