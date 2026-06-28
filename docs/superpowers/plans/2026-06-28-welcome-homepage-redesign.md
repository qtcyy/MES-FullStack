# 首页（工作台 `/welcome`）重设计 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 `mes/frontend/apps/mes-new` 的工作台首页重构为「混合驾驶舱」——便当盒网格布局、多彩克制配色、极光 Hero + 全套动效，真数据优先（接 `/digitization/dashboard/overview`，失败回退 mock）。

**Architecture:** 纯前端改造，不动后端。新增 `pages/welcome/` 子模块：纯逻辑（`accents`/`welcomeData`/`welcomeCharts`/`welcomeMock`）抽成可单测的函数，UI 拆成单一职责小组件（`HeroBanner`/`MetricCard`/`BentoCell`/`TrendChart`/`StatusDonut`/`TodoPanel`/`QuickActions`/`RecentVisits`/`AnnouncementPanel`），`WelcomePage` 仅做编排。取数走既有 `useQuery$`，回退逻辑用纯函数 `resolveOverview`。

**Tech Stack:** React 19 + TS + Tailwind 4 + shadcn/Radix(`@workspace/ui`) + motion/react + echarts(`@/components/EChart`) + 既有 `Stagger`/`Reveal`/`useCountUp` 动画基元 + Zustand store（`authStore`/`appStore`/`menuStore`）+ vitest（环境 `node`，**纯函数单测**范式）。

---

## 关键约定（实现前必读）

- **测试环境是 `node`，不是 jsdom**。仓库范式是把逻辑抽成纯函数测试（见 `src/hooks/usePointerParallax.test.ts`、`src/pages/digitization/__tests__/dashboardOptions.test.ts`）。本计划**不写组件渲染测试**，只对纯函数 TDD。
- 所有命令在 `mes/frontend` 目录下用 pnpm filter 执行：
  - 类型检查：`pnpm --filter mes-new check-types`
  - Lint：`pnpm --filter mes-new lint`
  - 跑单个测试：`pnpm --filter mes-new exec vitest run <相对 apps/mes-new 的路径>`
  - 全量测试：`pnpm --filter mes-new test`
  - 构建：`pnpm --filter mes-new build`
- 提交用中文 conventional commit + emoji（项目惯例）。
- `http.get(...)` 返回 **rxjs Observable**；`useQuery$(key, () => observable)` 直接消费。
- `fetchOverview()` 在 `@/api/digitization/dashboard`，返回 `Observable<DashboardOverview>`。
- 类型 `DashboardOverview` / `MonthlyTrendPoint` / `NameValue` / `DashboardKpi` 在 `@/types/digitization`。
- 图标用 lucide-react 0.475（已确认存在）：`Factory Cpu Boxes Workflow TrendingUp ListChecks Megaphone History Zap ChartPie`。字符串 key→组件用 `@/utils/iconMap` 的 `getIcon`。
- 路由门控用 `@/hooks/useAllowedRoutes` 的 `useAllowedRoutes()`（返回 `{ loaded, allowed: Set<string> }`）。

---

## Task 1: 设计令牌 + 极光/走马灯动画（styles.css）

**Files:**
- Modify: `mes/frontend/apps/mes-new/src/styles.css`

- [ ] **Step 1: 在 `:root` 块追加多彩强调令牌**

在 `src/styles.css` 的 `:root { ... }` 块内、`--shadow-brand` 行之后追加：

```css
  /* 工作台多彩强调色（主色 + 浅色 tint 背景） */
  --accent-blue: #2f7cff;
  --accent-cyan: #36e0ff;
  --accent-violet: #7c5cff;
  --accent-amber: #ff9f43;
  --accent-emerald: #10b981;
```

- [ ] **Step 2: 在 `@layer utilities` 块内追加极光光晕工具类**

在 `src/styles.css` 的 `@layer utilities { ... }` 块内（`.glass` 之后、登录页 `@keyframes drift` 之前）追加：

```css
  /* 工作台 Hero 极光光晕 */
  .welcome-aurora {
    position: absolute;
    border-radius: 9999px;
    filter: blur(48px);
    opacity: 0.7;
    pointer-events: none;
  }
  .welcome-aurora-1 {
    width: 260px; height: 260px; background: #2f7cff;
    left: -40px; top: -80px; animation: welcome-drift-1 11s ease-in-out infinite;
  }
  .welcome-aurora-2 {
    width: 220px; height: 220px; background: #36e0ff;
    right: 8%; top: -40px; animation: welcome-drift-2 13s ease-in-out infinite;
  }
  .welcome-aurora-3 {
    width: 240px; height: 240px; background: #7c5cff;
    left: 38%; bottom: -120px; animation: welcome-drift-1 12s ease-in-out infinite reverse;
  }
```

- [ ] **Step 3: 在文件末尾（`@media (prefers-reduced-motion)` 之前）追加 keyframes**

在 `src/styles.css` 中、`/* 无障碍 */` 注释行之前追加：

```css
@keyframes welcome-drift-1 {
  0%, 100% { transform: translate(0, 0); }
  50% { transform: translate(36px, 22px); }
}
@keyframes welcome-drift-2 {
  0%, 100% { transform: translate(0, 0); }
  50% { transform: translate(-30px, 18px); }
}
@keyframes welcome-marquee {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}
```

> 说明：全局 `@media (prefers-reduced-motion: reduce)` 已把所有 `animation-duration` 归零，极光与走马灯在减少动效下自动静止，无需额外处理。

- [ ] **Step 4: 验证构建不报错**

Run: `cd mes/frontend && pnpm --filter mes-new build`
Expected: 构建成功（CSS 无语法错误）。

- [ ] **Step 5: 提交**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack
git add mes/frontend/apps/mes-new/src/styles.css
git commit -m "💄 style(welcome): 新增多彩强调令牌与极光/走马灯动画 keyframes"
```

---

## Task 2: 强调色映射 `accents.ts`（TDD）

**Files:**
- Create: `mes/frontend/apps/mes-new/src/pages/welcome/accents.ts`
- Test: `mes/frontend/apps/mes-new/src/pages/welcome/accents.test.ts`

- [ ] **Step 1: 写失败测试**

创建 `src/pages/welcome/accents.test.ts`：

```ts
import { describe, it, expect } from 'vitest'
import { ACCENTS, getAccent } from './accents'

describe('accents', () => {
  it('包含 5 个强调色,主色均为合法 hex', () => {
    const names = Object.keys(ACCENTS)
    expect(names).toHaveLength(5)
    for (const n of names) {
      expect(ACCENTS[n as keyof typeof ACCENTS].color).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })

  it('getAccent 返回对应项', () => {
    expect(getAccent('blue').color).toBe('#2f7cff')
    expect(getAccent('emerald').color).toBe('#10b981')
  })

  it('getAccent 对未知名兜底 blue', () => {
    expect(getAccent('nope' as never).color).toBe('#2f7cff')
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd mes/frontend && pnpm --filter mes-new exec vitest run src/pages/welcome/accents.test.ts`
Expected: FAIL（`Cannot find module './accents'`）。

- [ ] **Step 3: 实现 `accents.ts`**

创建 `src/pages/welcome/accents.ts`：

```ts
export type AccentName = 'blue' | 'cyan' | 'violet' | 'amber' | 'emerald'

export interface Accent {
  /** 主色:图标、强调条、图表主色 */
  color: string
  /** 浅色 tint 背景:图标底 */
  bg: string
}

export const ACCENTS: Record<AccentName, Accent> = {
  blue: { color: '#2f7cff', bg: 'rgba(47,124,255,0.10)' },
  cyan: { color: '#36e0ff', bg: 'rgba(54,224,255,0.12)' },
  violet: { color: '#7c5cff', bg: 'rgba(124,92,255,0.12)' },
  amber: { color: '#ff9f43', bg: 'rgba(255,159,67,0.14)' },
  emerald: { color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
}

/** 取强调色,缺失兜底 blue */
export function getAccent(name: AccentName): Accent {
  return ACCENTS[name] ?? ACCENTS.blue
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `cd mes/frontend && pnpm --filter mes-new exec vitest run src/pages/welcome/accents.test.ts`
Expected: PASS（3 个用例）。

- [ ] **Step 5: 提交**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack
git add mes/frontend/apps/mes-new/src/pages/welcome/accents.ts mes/frontend/apps/mes-new/src/pages/welcome/accents.test.ts
git commit -m "✨ feat(welcome): 强调色映射 accents + 单测"
```

---

## Task 3: 占位 mock 数据 `welcomeMock.ts`

**Files:**
- Create: `mes/frontend/apps/mes-new/src/pages/welcome/welcomeMock.ts`
- Test: `mes/frontend/apps/mes-new/src/pages/welcome/welcomeMock.test.ts`

- [ ] **Step 1: 写失败测试**

创建 `src/pages/welcome/welcomeMock.test.ts`：

```ts
import { describe, it, expect } from 'vitest'
import { MOCK_OVERVIEW, MOCK_TODOS, MOCK_ANNOUNCEMENTS } from './welcomeMock'

describe('welcomeMock', () => {
  it('MOCK_OVERVIEW 含完整 overview 字段', () => {
    expect(Object.keys(MOCK_OVERVIEW.kpi)).toEqual(
      expect.arrayContaining(['orderCount', 'deviceCount', 'materielCount', 'flowCount']),
    )
    expect(MOCK_OVERVIEW.orderStatus.length).toBeGreaterThan(0)
    expect(MOCK_OVERVIEW.deviceStatus.length).toBeGreaterThan(0)
    expect(MOCK_OVERVIEW.orderType.length).toBeGreaterThan(0)
    expect(MOCK_OVERVIEW.monthlyTrend.length).toBeGreaterThan(0)
  })

  it('待办/公告非空且字段齐全', () => {
    expect(MOCK_TODOS.length).toBeGreaterThan(0)
    expect(MOCK_TODOS[0]).toHaveProperty('type')
    expect(MOCK_ANNOUNCEMENTS[0]).toHaveProperty('tag')
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd mes/frontend && pnpm --filter mes-new exec vitest run src/pages/welcome/welcomeMock.test.ts`
Expected: FAIL（模块不存在）。

- [ ] **Step 3: 实现 `welcomeMock.ts`**

创建 `src/pages/welcome/welcomeMock.ts`：

```ts
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
```

- [ ] **Step 4: 跑测试确认通过**

Run: `cd mes/frontend && pnpm --filter mes-new exec vitest run src/pages/welcome/welcomeMock.test.ts`
Expected: PASS（2 个用例）。

- [ ] **Step 5: 提交**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack
git add mes/frontend/apps/mes-new/src/pages/welcome/welcomeMock.ts mes/frontend/apps/mes-new/src/pages/welcome/welcomeMock.test.ts
git commit -m "✨ feat(welcome): 待办/公告/兜底总览占位 mock 数据"
```

---

## Task 4: 纯逻辑 `welcomeData.ts`（TDD）

**Files:**
- Create: `mes/frontend/apps/mes-new/src/pages/welcome/welcomeData.ts`
- Test: `mes/frontend/apps/mes-new/src/pages/welcome/welcomeData.test.ts`

- [ ] **Step 1: 写失败测试**

创建 `src/pages/welcome/welcomeData.test.ts`：

```ts
import { describe, it, expect } from 'vitest'
import {
  greetingByHour, deriveRecentVisits, resolveOverview, buildQuickActions,
} from './welcomeData'
import { MOCK_OVERVIEW } from './welcomeMock'
import type { TabItem } from '@/stores/appStore'
import type { DashboardOverview } from '@/types/digitization'

const tab = (path: string, title: string): TabItem => ({ key: path, path, title, closable: true })

describe('greetingByHour', () => {
  it('按时段返回问候语', () => {
    expect(greetingByHour(3)).toBe('夜深了')
    expect(greetingByHour(8)).toBe('早上好')
    expect(greetingByHour(10)).toBe('上午好')
    expect(greetingByHour(13)).toBe('中午好')
    expect(greetingByHour(16)).toBe('下午好')
    expect(greetingByHour(21)).toBe('晚上好')
  })
})

describe('deriveRecentVisits', () => {
  it('排除首页与当前页,最新在前', () => {
    const tabs = [
      tab('/welcome', '工作台'),
      tab('/system/user', '用户管理'),
      tab('/order/production', '生产订单'),
      tab('/basedata/materile', '物料管理'),
    ]
    const r = deriveRecentVisits(tabs, '/basedata/materile')
    expect(r.map((v) => v.path)).toEqual(['/order/production', '/system/user'])
  })

  it('限制数量', () => {
    const tabs = Array.from({ length: 10 }, (_, i) => tab(`/p/${i}`, `P${i}`))
    expect(deriveRecentVisits(tabs, '/none', 3)).toHaveLength(3)
  })
})

describe('resolveOverview', () => {
  it('有 data → 用真实', () => {
    const data = MOCK_OVERVIEW
    expect(resolveOverview(data, null)).toEqual({ overview: data, isFallback: false })
  })
  it('无 data 有 error → 回退 mock', () => {
    const r = resolveOverview(undefined, new Error('x'))
    expect(r.isFallback).toBe(true)
    expect(r.overview).toBe(MOCK_OVERVIEW)
  })
  it('无 data 无 error → undefined(加载中)', () => {
    expect(resolveOverview(undefined, null)).toEqual({ overview: undefined, isFallback: false })
  })
})

describe('buildQuickActions', () => {
  it('只保留 allowed 中的入口', () => {
    const allowed = new Set(['/order/production', '/technology/flow'])
    const actions = buildQuickActions(allowed)
    expect(actions.length).toBeGreaterThan(0)
    expect(actions.every((a) => allowed.has(a.to))).toBe(true)
  })
  it('空集合 → 空数组', () => {
    expect(buildQuickActions(new Set())).toEqual([])
  })
})

// 类型自检:resolveOverview 接受 DashboardOverview | undefined
const _typecheck: DashboardOverview | undefined = resolveOverview(undefined, null).overview
void _typecheck
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd mes/frontend && pnpm --filter mes-new exec vitest run src/pages/welcome/welcomeData.test.ts`
Expected: FAIL（模块不存在）。

- [ ] **Step 3: 实现 `welcomeData.ts`**

创建 `src/pages/welcome/welcomeData.ts`：

```ts
import type { TabItem } from '@/stores/appStore'
import type { DashboardOverview } from '@/types/digitization'
import { MOCK_OVERVIEW } from './welcomeMock'

/** 按小时返回问候语 */
export function greetingByHour(hour: number): string {
  if (hour < 6) return '夜深了'
  if (hour < 9) return '早上好'
  if (hour < 12) return '上午好'
  if (hour < 14) return '中午好'
  if (hour < 18) return '下午好'
  return '晚上好'
}

export interface RecentVisit {
  path: string
  title: string
  icon?: string
}

/**
 * 从标签历史派生最近访问:
 * 排除首页与当前页;标签数组末尾为最新,故取末 limit 条再反转(最新在前)。
 */
export function deriveRecentVisits(
  tabs: TabItem[],
  currentPath: string,
  limit = 6,
): RecentVisit[] {
  return tabs
    .filter((t) => t.path !== '/welcome' && t.path !== currentPath)
    .slice(-limit)
    .reverse()
    .map((t) => ({ path: t.path, title: t.title, icon: t.icon }))
}

/**
 * overview 取数结果归一:
 * - 有 data → 用真实(isFallback=false)
 * - 无 data 但有 error → 用 mock(isFallback=true)
 * - 否则 undefined(仍在加载)
 */
export function resolveOverview(
  data: DashboardOverview | undefined,
  error: unknown,
): { overview: DashboardOverview | undefined; isFallback: boolean } {
  if (data) return { overview: data, isFallback: false }
  if (error) return { overview: MOCK_OVERVIEW, isFallback: true }
  return { overview: undefined, isFallback: false }
}

export interface QuickAction {
  label: string
  to: string
  /** iconMap 的语义 key */
  icon: string
}

/** 候选快捷入口(to 必须是真实已注册路由) */
const QUICK_ACTIONS: QuickAction[] = [
  { label: '生产订单', to: '/order/production', icon: 'schedule' },
  { label: '物料管理', to: '/basedata/materile', icon: 'gold' },
  { label: '工艺路线', to: '/technology/flow', icon: 'branches' },
  { label: '设备管理', to: '/basedata/device', icon: 'tool' },
  { label: '作业派工', to: '/order/dispatch', icon: 'team' },
  { label: '生产甘特图', to: '/order/gantt', icon: 'schedule' },
  { label: '工艺查询', to: '/technology/process-query', icon: 'file-text' },
  { label: '用户管理', to: '/system/user', icon: 'user' },
]

/** 过滤出当前用户可访问的快捷入口 */
export function buildQuickActions(allowed: Set<string>): QuickAction[] {
  return QUICK_ACTIONS.filter((a) => allowed.has(a.to))
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `cd mes/frontend && pnpm --filter mes-new exec vitest run src/pages/welcome/welcomeData.test.ts`
Expected: PASS（全部用例）。

- [ ] **Step 5: 提交**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack
git add mes/frontend/apps/mes-new/src/pages/welcome/welcomeData.ts mes/frontend/apps/mes-new/src/pages/welcome/welcomeData.test.ts
git commit -m "✨ feat(welcome): 问候/最近访问/取数回退/快捷入口纯逻辑 + 单测"
```

---

## Task 5: 浅色图表选项 `welcomeCharts.ts`（TDD）

**Files:**
- Create: `mes/frontend/apps/mes-new/src/pages/welcome/welcomeCharts.ts`
- Test: `mes/frontend/apps/mes-new/src/pages/welcome/welcomeCharts.test.ts`

- [ ] **Step 1: 写失败测试**

创建 `src/pages/welcome/welcomeCharts.test.ts`：

```ts
import { describe, it, expect } from 'vitest'
import {
  mix, donutPalette, buildWelcomeTrendOption, buildWelcomeDonutOption,
} from './welcomeCharts'
import type { MonthlyTrendPoint, NameValue } from '@/types/digitization'

describe('mix', () => {
  it('黑白对半 → 灰', () => {
    expect(mix('#000000', '#ffffff', 0.5)).toBe('#808080')
  })
  it('t=0 返回 a,t=1 返回 b', () => {
    expect(mix('#2f7cff', '#ffffff', 0)).toBe('#2f7cff')
    expect(mix('#2f7cff', '#ffffff', 1)).toBe('#ffffff')
  })
})

describe('donutPalette', () => {
  it('返回 5 色,首色为主色', () => {
    const p = donutPalette('#2f7cff')
    expect(p).toHaveLength(5)
    expect(p[0]).toBe('#2f7cff')
  })
})

describe('buildWelcomeTrendOption', () => {
  const trend: MonthlyTrendPoint[] = [
    { month: '2025-11', orderCount: 10, totalQty: 100, completedCount: 8 },
    { month: '2025-12', orderCount: 12, totalQty: 120, completedCount: 11 },
  ]
  it('x 轴标签为 M月,两条 series', () => {
    const opt = buildWelcomeTrendOption(trend) as {
      xAxis: { data: string[] }; series: unknown[]
    }
    expect(opt.xAxis.data).toEqual(['11月', '12月'])
    expect(opt.series).toHaveLength(2)
  })
})

describe('buildWelcomeDonutOption', () => {
  it('扇区数量与输入一致', () => {
    const items: NameValue[] = [
      { name: 'A', value: 1 }, { name: 'B', value: 2 }, { name: 'C', value: 3 },
    ]
    const opt = buildWelcomeDonutOption(items, 'cyan') as {
      series: { data: unknown[] }[]
    }
    expect(opt.series[0].data).toHaveLength(3)
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd mes/frontend && pnpm --filter mes-new exec vitest run src/pages/welcome/welcomeCharts.test.ts`
Expected: FAIL（模块不存在）。

- [ ] **Step 3: 实现 `welcomeCharts.ts`**

创建 `src/pages/welcome/welcomeCharts.ts`：

```ts
import type { MonthlyTrendPoint, NameValue } from '@/types/digitization'
import type { EChartOption } from '@/pages/digitization/dashboardOptions'
import { ACCENTS, getAccent, type AccentName } from './accents'

const TEXT = '#64748b'
const AXIS = '#cbd5e1'
const SPLIT = 'rgba(100,116,139,0.12)'

/** 'yyyy-MM' → 'M月';非法回显原值 */
function monthLabel(month: string): string {
  const m = Number(month.slice(5, 7))
  return m >= 1 && m <= 12 ? `${m}月` : month
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '')
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  }
}

/** 线性混色:t=0 取 a,t=1 取 b */
export function mix(a: string, b: string, t: number): string {
  const pa = hexToRgb(a)
  const pb = hexToRgb(b)
  const ch = (x: number, y: number) => Math.round(x + (y - x) * t)
  const r = ch(pa.r, pb.r)
  const g = ch(pa.g, pb.g)
  const bl = ch(pa.b, pb.b)
  return `#${[r, g, bl].map((n) => n.toString(16).padStart(2, '0')).join('')}`
}

/** 由主色派生同色系(不同明度)扇区色 */
export function donutPalette(base: string): string[] {
  return [
    base,
    mix(base, '#ffffff', 0.28),
    mix(base, '#ffffff', 0.52),
    mix(base, '#0f172a', 0.22),
    mix(base, '#ffffff', 0.72),
  ]
}

/** 浅色版生产趋势:工单数 + 完工数 两条面积折线 */
export function buildWelcomeTrendOption(trend: MonthlyTrendPoint[]): EChartOption {
  return {
    color: [ACCENTS.blue.color, ACCENTS.emerald.color],
    tooltip: { trigger: 'axis' },
    legend: { data: ['工单数', '完工数'], top: 0, textStyle: { color: TEXT, fontSize: 11 }, icon: 'circle' },
    grid: { left: 8, right: 12, top: 32, bottom: 8, containLabel: true },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: trend.map((t) => monthLabel(t.month)),
      axisLine: { lineStyle: { color: AXIS } },
      axisLabel: { color: TEXT, fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisLabel: { color: TEXT, fontSize: 11 },
      splitLine: { lineStyle: { color: SPLIT } },
    },
    series: [
      {
        name: '工单数', type: 'line', smooth: true, showSymbol: false,
        lineStyle: { width: 3 },
        areaStyle: { color: 'rgba(47,124,255,0.14)' },
        data: trend.map((t) => t.orderCount),
      },
      {
        name: '完工数', type: 'line', smooth: true, showSymbol: false,
        lineStyle: { width: 3 },
        areaStyle: { color: 'rgba(16,185,129,0.12)' },
        data: trend.map((t) => t.completedCount),
      },
    ],
  }
}

/** 浅色版环形图;围绕给定强调色生成同色系扇区 */
export function buildWelcomeDonutOption(items: NameValue[], accent: AccentName): EChartOption {
  const palette = donutPalette(getAccent(accent).color)
  return {
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { bottom: 0, textStyle: { color: TEXT, fontSize: 11 }, icon: 'circle' },
    series: [
      {
        type: 'pie',
        radius: ['52%', '74%'],
        center: ['50%', '42%'],
        avoidLabelOverlap: true,
        label: { show: false },
        emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold' } },
        data: items.map((it, i) => ({
          name: it.name,
          value: it.value,
          itemStyle: { color: palette[i % palette.length] },
        })),
      },
    ],
  }
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `cd mes/frontend && pnpm --filter mes-new exec vitest run src/pages/welcome/welcomeCharts.test.ts`
Expected: PASS（全部用例）。

- [ ] **Step 5: 提交**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack
git add mes/frontend/apps/mes-new/src/pages/welcome/welcomeCharts.ts mes/frontend/apps/mes-new/src/pages/welcome/welcomeCharts.test.ts
git commit -m "✨ feat(welcome): 浅色版趋势/环形图表选项 + 单测"
```

---

## Task 6: 取数 hook `useWelcomeOverview.ts`

**Files:**
- Create: `mes/frontend/apps/mes-new/src/pages/welcome/useWelcomeOverview.ts`

- [ ] **Step 1: 实现 hook**

创建 `src/pages/welcome/useWelcomeOverview.ts`：

```ts
import { useQuery$ } from '@/http/hooks'
import { fetchOverview } from '@/api/digitization/dashboard'
import { resolveOverview } from './welcomeData'
import type { DashboardOverview } from '@/types/digitization'

export interface WelcomeOverviewResult {
  overview: DashboardOverview | undefined
  loading: boolean
  isFallback: boolean
}

/** 工作台总览取数:成功用真实,失败回退 mock,加载中 overview=undefined */
export function useWelcomeOverview(): WelcomeOverviewResult {
  const { data, loading, error } = useQuery$(['welcome', 'overview'], () => fetchOverview())
  const { overview, isFallback } = resolveOverview(data, error)
  return { overview, loading: loading && !overview, isFallback }
}
```

- [ ] **Step 2: 类型检查**

Run: `cd mes/frontend && pnpm --filter mes-new check-types`
Expected: 无错误。

- [ ] **Step 3: 提交**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack
git add mes/frontend/apps/mes-new/src/pages/welcome/useWelcomeOverview.ts
git commit -m "✨ feat(welcome): useWelcomeOverview 取数 hook(失败回退 mock)"
```

---

## Task 7: 便当格壳 `BentoCell.tsx`

**Files:**
- Create: `mes/frontend/apps/mes-new/src/pages/welcome/BentoCell.tsx`

- [ ] **Step 1: 实现 `BentoCell.tsx`**

创建 `src/pages/welcome/BentoCell.tsx`：

```tsx
import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { getAccent, type AccentName } from './accents'

interface BentoCellProps {
  accent: AccentName
  title?: string
  icon?: LucideIcon
  /** 标题右侧插槽:徽标/标签 */
  extra?: ReactNode
  /** 内容区类名,默认 flex-1 p-4 */
  bodyClassName?: string
  children: ReactNode
}

/** 便当格通用外壳:左强调条 + 图标标题 + 悬停浮起。须由外层 StaggerItem 提供 col-span 与入场。 */
export default function BentoCell({
  accent, title, icon: Icon, extra, bodyClassName, children,
}: BentoCellProps) {
  const a = getAccent(accent)
  return (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)] transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-[var(--shadow-pop)]">
      <span className="absolute inset-y-0 left-0 w-[3px]" style={{ background: a.color }} aria-hidden />
      {(title || extra) && (
        <div className="flex items-center justify-between gap-2 px-4 pt-4">
          <div className="flex items-center gap-2">
            {Icon && (
              <span
                className="flex size-7 items-center justify-center rounded-lg"
                style={{ background: a.bg, color: a.color }}
              >
                <Icon className="size-4" />
              </span>
            )}
            {title && <h3 className="text-sm font-medium text-foreground">{title}</h3>}
          </div>
          {extra}
        </div>
      )}
      <div className={bodyClassName ?? 'flex-1 p-4'}>{children}</div>
    </div>
  )
}
```

- [ ] **Step 2: 类型检查**

Run: `cd mes/frontend && pnpm --filter mes-new check-types`
Expected: 无错误。

- [ ] **Step 3: 提交**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack
git add mes/frontend/apps/mes-new/src/pages/welcome/BentoCell.tsx
git commit -m "✨ feat(welcome): 便当格通用外壳 BentoCell"
```

---

## Task 8: KPI 卡 `MetricCard.tsx`

**Files:**
- Create: `mes/frontend/apps/mes-new/src/pages/welcome/MetricCard.tsx`

- [ ] **Step 1: 实现 `MetricCard.tsx`**

创建 `src/pages/welcome/MetricCard.tsx`：

```tsx
import type { LucideIcon } from 'lucide-react'
import { useCountUp } from '@/pages/digitization/useCountUp'
import { getAccent, type AccentName } from './accents'

interface MetricCardProps {
  label: string
  value: number
  icon: LucideIcon
  accent: AccentName
}

/** KPI 卡:数字滚动 + 强调色。须由外层 StaggerItem 提供 col-span 与入场。 */
export default function MetricCard({ label, value, icon: Icon, accent }: MetricCardProps) {
  const n = useCountUp(value)
  const a = getAccent(accent)
  return (
    <div className="group relative flex h-full items-center justify-between overflow-hidden rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-card)] transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-[var(--shadow-pop)]">
      <span className="absolute inset-y-0 left-0 w-[3px]" style={{ background: a.color }} aria-hidden />
      <div className="min-w-0">
        <p className="truncate text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-bold tracking-tight tabular-nums" style={{ color: a.color }}>
          {Math.round(n).toLocaleString()}
        </p>
      </div>
      <span
        className="flex size-10 shrink-0 items-center justify-center rounded-lg"
        style={{ background: a.bg, color: a.color }}
      >
        <Icon className="size-5" />
      </span>
    </div>
  )
}
```

- [ ] **Step 2: 类型检查**

Run: `cd mes/frontend && pnpm --filter mes-new check-types`
Expected: 无错误。

- [ ] **Step 3: 提交**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack
git add mes/frontend/apps/mes-new/src/pages/welcome/MetricCard.tsx
git commit -m "✨ feat(welcome): KPI 指标卡 MetricCard(数字滚动+强调色)"
```

---

## Task 9: 图表组件 `TrendChart.tsx` + `StatusDonut.tsx`

**Files:**
- Create: `mes/frontend/apps/mes-new/src/pages/welcome/TrendChart.tsx`
- Create: `mes/frontend/apps/mes-new/src/pages/welcome/StatusDonut.tsx`

- [ ] **Step 1: 实现 `TrendChart.tsx`**

创建 `src/pages/welcome/TrendChart.tsx`：

```tsx
import EChart from '@/components/EChart'
import { buildWelcomeTrendOption } from './welcomeCharts'
import type { MonthlyTrendPoint } from '@/types/digitization'

export default function TrendChart({ data }: { data: MonthlyTrendPoint[] }) {
  if (!data.length) {
    return (
      <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
        暂无数据
      </div>
    )
  }
  return <EChart option={buildWelcomeTrendOption(data)} className="h-[280px] w-full" />
}
```

- [ ] **Step 2: 实现 `StatusDonut.tsx`**

创建 `src/pages/welcome/StatusDonut.tsx`：

```tsx
import EChart from '@/components/EChart'
import { buildWelcomeDonutOption } from './welcomeCharts'
import type { NameValue } from '@/types/digitization'
import type { AccentName } from './accents'

interface StatusDonutProps {
  data: NameValue[]
  accent: AccentName
}

export default function StatusDonut({ data, accent }: StatusDonutProps) {
  if (!data.length) {
    return (
      <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
        暂无数据
      </div>
    )
  }
  return <EChart option={buildWelcomeDonutOption(data, accent)} className="h-[220px] w-full" />
}
```

- [ ] **Step 3: 类型检查**

Run: `cd mes/frontend && pnpm --filter mes-new check-types`
Expected: 无错误。

- [ ] **Step 4: 提交**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack
git add mes/frontend/apps/mes-new/src/pages/welcome/TrendChart.tsx mes/frontend/apps/mes-new/src/pages/welcome/StatusDonut.tsx
git commit -m "✨ feat(welcome): 趋势折线与状态环形图组件"
```

---

## Task 10: 列表面板 `TodoPanel.tsx` + `AnnouncementPanel.tsx`

**Files:**
- Create: `mes/frontend/apps/mes-new/src/pages/welcome/TodoPanel.tsx`
- Create: `mes/frontend/apps/mes-new/src/pages/welcome/AnnouncementPanel.tsx`

- [ ] **Step 1: 实现 `TodoPanel.tsx`**

创建 `src/pages/welcome/TodoPanel.tsx`：

```tsx
import { MOCK_TODOS, type TodoItem } from './welcomeMock'
import { ACCENTS } from './accents'

const TYPE_COLOR: Record<TodoItem['type'], string> = {
  审批: ACCENTS.violet.color,
  排产: ACCENTS.blue.color,
  告警: ACCENTS.amber.color,
}

export default function TodoPanel() {
  return (
    <ul className="space-y-1">
      {MOCK_TODOS.map((t) => (
        <li
          key={t.id}
          className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-accent"
        >
          <span
            className="size-2 shrink-0 rounded-full"
            style={{ background: TYPE_COLOR[t.type] }}
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-foreground">{t.title}</p>
            <p className="text-xs text-muted-foreground">{t.type} · {t.time}</p>
          </div>
        </li>
      ))}
    </ul>
  )
}
```

- [ ] **Step 2: 实现 `AnnouncementPanel.tsx`**

创建 `src/pages/welcome/AnnouncementPanel.tsx`：

```tsx
import { MOCK_ANNOUNCEMENTS } from './welcomeMock'
import { ACCENTS } from './accents'

export default function AnnouncementPanel() {
  return (
    <ol className="space-y-3">
      {MOCK_ANNOUNCEMENTS.map((a) => (
        <li key={a.id} className="flex gap-3">
          <span
            className="mt-1.5 size-2 shrink-0 rounded-full"
            style={{ background: ACCENTS.amber.color }}
            aria-hidden
          />
          <div className="min-w-0">
            <p className="text-sm text-foreground">{a.title}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{a.tag} · {a.time}</p>
          </div>
        </li>
      ))}
    </ol>
  )
}
```

- [ ] **Step 3: 类型检查**

Run: `cd mes/frontend && pnpm --filter mes-new check-types`
Expected: 无错误。

- [ ] **Step 4: 提交**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack
git add mes/frontend/apps/mes-new/src/pages/welcome/TodoPanel.tsx mes/frontend/apps/mes-new/src/pages/welcome/AnnouncementPanel.tsx
git commit -m "✨ feat(welcome): 待办与公告/动态时间线面板(占位示例)"
```

---

## Task 11: 本地数据面板 `QuickActions.tsx` + `RecentVisits.tsx`

**Files:**
- Create: `mes/frontend/apps/mes-new/src/pages/welcome/QuickActions.tsx`
- Create: `mes/frontend/apps/mes-new/src/pages/welcome/RecentVisits.tsx`

- [ ] **Step 1: 实现 `QuickActions.tsx`**

创建 `src/pages/welcome/QuickActions.tsx`：

```tsx
import { useNavigate } from 'react-router-dom'
import { useAllowedRoutes } from '@/hooks/useAllowedRoutes'
import { getIcon } from '@/utils/iconMap'
import { buildQuickActions } from './welcomeData'

export default function QuickActions() {
  const navigate = useNavigate()
  const { allowed } = useAllowedRoutes()
  const actions = buildQuickActions(allowed)
  if (!actions.length) {
    return <p className="text-sm text-muted-foreground">暂无可用入口</p>
  }
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
      {actions.map((a) => {
        const Icon = getIcon(a.icon)
        return (
          <button
            key={a.to}
            type="button"
            onClick={() => navigate(a.to)}
            className="flex flex-col items-center gap-2 rounded-lg border border-border bg-card p-3 transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[var(--shadow-pop)]"
          >
            <span className="flex size-9 items-center justify-center rounded-full bg-accent text-primary">
              <Icon className="size-4" />
            </span>
            <span className="text-xs text-foreground">{a.label}</span>
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: 实现 `RecentVisits.tsx`**

创建 `src/pages/welcome/RecentVisits.tsx`：

```tsx
import { useNavigate, useLocation } from 'react-router-dom'
import { useAppStore } from '@/stores/appStore'
import { getIcon } from '@/utils/iconMap'
import { deriveRecentVisits } from './welcomeData'

export default function RecentVisits() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const tabs = useAppStore((s) => s.tabs)
  const visits = deriveRecentVisits(tabs, pathname)
  if (!visits.length) {
    return <p className="text-sm text-muted-foreground">还没有访问记录,去逛逛吧~</p>
  }
  return (
    <div className="flex flex-wrap gap-2">
      {visits.map((v) => {
        const Icon = getIcon(v.icon)
        return (
          <button
            key={v.path}
            type="button"
            onClick={() => navigate(v.path)}
            className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm transition-colors hover:border-primary/40 hover:bg-accent"
          >
            <Icon className="size-3.5 text-muted-foreground" />
            <span>{v.title}</span>
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 3: 类型检查**

Run: `cd mes/frontend && pnpm --filter mes-new check-types`
Expected: 无错误。

- [ ] **Step 4: 提交**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack
git add mes/frontend/apps/mes-new/src/pages/welcome/QuickActions.tsx mes/frontend/apps/mes-new/src/pages/welcome/RecentVisits.tsx
git commit -m "✨ feat(welcome): 快捷入口(权限门控)与最近访问(标签派生)面板"
```

---

## Task 12: 极光 Hero `HeroBanner.tsx`

**Files:**
- Create: `mes/frontend/apps/mes-new/src/pages/welcome/HeroBanner.tsx`

- [ ] **Step 1: 实现 `HeroBanner.tsx`**

创建 `src/pages/welcome/HeroBanner.tsx`：

```tsx
import { useAuthStore } from '@/stores/authStore'
import { greetingByHour } from './welcomeData'
import type { DashboardOverview } from '@/types/digitization'

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

function todayLabel(d: Date): string {
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 星期${WEEKDAYS[d.getDay()]}`
}

interface HeroBannerProps {
  overview: DashboardOverview | undefined
  isFallback: boolean
}

export default function HeroBanner({ overview, isFallback }: HeroBannerProps) {
  const user = useAuthStore((s) => s.user)
  const now = new Date()
  const greeting = greetingByHour(now.getHours())
  const k = overview?.kpi
  const trend = overview?.monthlyTrend
  const lastCompleted = trend && trend.length ? trend[trend.length - 1].completedCount : 0
  const pills: string[] = overview
    ? [
        `生产工单 ${k?.orderCount ?? 0}`,
        `本月完工 ${lastCompleted}`,
        `设备总数 ${k?.deviceCount ?? 0}`,
        `在库物料 ${k?.materielCount ?? 0}`,
        `工艺路线 ${k?.flowCount ?? 0}`,
      ]
    : []
  return (
    <div
      className="relative overflow-hidden rounded-2xl p-6 text-white shadow-[var(--shadow-brand)]"
      style={{ background: '#16233f' }}
    >
      <span className="welcome-aurora welcome-aurora-1" aria-hidden />
      <span className="welcome-aurora welcome-aurora-2" aria-hidden />
      <span className="welcome-aurora welcome-aurora-3" aria-hidden />
      <div className="relative z-10">
        <h2 className="text-2xl font-semibold tracking-tight">
          {greeting}，{user?.name ?? '用户'} 👋
        </h2>
        <p className="mt-1 text-sm text-white/70">
          {todayLabel(now)} · 欢迎使用章鱼MES 智能制造执行系统
          {isFallback ? ' · 离线示例数据' : ''}
        </p>
        {pills.length > 0 && (
          <div className="relative mt-4 overflow-hidden">
            <div className="flex w-max gap-3 [animation:welcome-marquee_26s_linear_infinite] hover:[animation-play-state:paused] motion-reduce:[animation:none]">
              {[...pills, ...pills].map((p, i) => (
                <span
                  key={i}
                  className="flex items-center gap-1.5 whitespace-nowrap rounded-full bg-white/10 px-3 py-1 text-xs text-white/90 backdrop-blur"
                >
                  <span className="size-1.5 rounded-full bg-[var(--brand-to)]" aria-hidden />
                  {p}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 类型检查**

Run: `cd mes/frontend && pnpm --filter mes-new check-types`
Expected: 无错误。

- [ ] **Step 3: 提交**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack
git add mes/frontend/apps/mes-new/src/pages/welcome/HeroBanner.tsx
git commit -m "✨ feat(welcome): 极光 Hero 横幅(问候+实时数据走马灯)"
```

---

## Task 13: 编排页 `WelcomePage.tsx`（重写）

**Files:**
- Modify (overwrite): `mes/frontend/apps/mes-new/src/pages/welcome/WelcomePage.tsx`

- [ ] **Step 1: 用便当盒编排重写 `WelcomePage.tsx`**

整文件覆盖 `src/pages/welcome/WelcomePage.tsx`：

```tsx
import type { ReactNode } from 'react'
import { Factory, Cpu, Boxes, Workflow, TrendingUp, ListChecks, ChartPie, Zap, History, Megaphone } from 'lucide-react'
import Reveal from '@/components/motion/Reveal'
import { Stagger, StaggerItem } from '@/components/motion/Stagger'
import HeroBanner from './HeroBanner'
import MetricCard from './MetricCard'
import BentoCell from './BentoCell'
import TrendChart from './TrendChart'
import StatusDonut from './StatusDonut'
import TodoPanel from './TodoPanel'
import QuickActions from './QuickActions'
import RecentVisits from './RecentVisits'
import AnnouncementPanel from './AnnouncementPanel'
import { useWelcomeOverview } from './useWelcomeOverview'
import { MOCK_TODOS } from './welcomeMock'
import { getAccent, type AccentName } from './accents'

/** 「真实」数据标签 */
function RealTag() {
  return (
    <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600">
      真实
    </span>
  )
}

/** 「示例」占位标签 */
function MockTag() {
  return (
    <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-600">
      示例
    </span>
  )
}

/** 计数徽标 */
function CountBadge({ n, accent }: { n: number; accent: AccentName }) {
  const a = getAccent(accent)
  return (
    <span
      className="flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold"
      style={{ background: a.bg, color: a.color }}
    >
      {n}
    </span>
  )
}

/** 统一的格子布局包裹:StaggerItem + col-span */
function Cell({ span, children }: { span: string; children: ReactNode }) {
  return <StaggerItem className={span}>{children}</StaggerItem>
}

export default function WelcomePage() {
  const { overview, isFallback } = useWelcomeOverview()
  const kpi = overview?.kpi

  return (
    <div className="space-y-4">
      <Reveal>
        <HeroBanner overview={overview} isFallback={isFallback} />
      </Reveal>

      <Stagger className="grid grid-cols-12 gap-4">
        {/* 特征带:生产趋势(8) + 待办(4) */}
        <Cell span="col-span-12 lg:col-span-8">
          <BentoCell accent="blue" title="生产趋势 · 近 6 月" icon={TrendingUp} extra={isFallback ? <MockTag /> : <RealTag />}>
            <TrendChart data={overview?.monthlyTrend ?? []} />
          </BentoCell>
        </Cell>
        <Cell span="col-span-12 lg:col-span-4">
          <BentoCell accent="violet" title="待办 / 待审批" icon={ListChecks} extra={<CountBadge n={MOCK_TODOS.length} accent="violet" />}>
            <TodoPanel />
          </BentoCell>
        </Cell>

        {/* KPI 四连 */}
        <Cell span="col-span-6 lg:col-span-3">
          <MetricCard label="生产工单" value={kpi?.orderCount ?? 0} icon={Factory} accent="blue" />
        </Cell>
        <Cell span="col-span-6 lg:col-span-3">
          <MetricCard label="设备总数" value={kpi?.deviceCount ?? 0} icon={Cpu} accent="cyan" />
        </Cell>
        <Cell span="col-span-6 lg:col-span-3">
          <MetricCard label="在库物料" value={kpi?.materielCount ?? 0} icon={Boxes} accent="emerald" />
        </Cell>
        <Cell span="col-span-6 lg:col-span-3">
          <MetricCard label="工艺路线" value={kpi?.flowCount ?? 0} icon={Workflow} accent="violet" />
        </Cell>

        {/* 三环图 */}
        <Cell span="col-span-12 sm:col-span-6 lg:col-span-4">
          <BentoCell accent="cyan" title="订单状态" icon={ChartPie} extra={isFallback ? <MockTag /> : <RealTag />}>
            <StatusDonut data={overview?.orderStatus ?? []} accent="cyan" />
          </BentoCell>
        </Cell>
        <Cell span="col-span-12 sm:col-span-6 lg:col-span-4">
          <BentoCell accent="blue" title="设备状态" icon={ChartPie} extra={isFallback ? <MockTag /> : <RealTag />}>
            <StatusDonut data={overview?.deviceStatus ?? []} accent="blue" />
          </BentoCell>
        </Cell>
        <Cell span="col-span-12 sm:col-span-6 lg:col-span-4">
          <BentoCell accent="emerald" title="订单类型" icon={ChartPie} extra={isFallback ? <MockTag /> : <RealTag />}>
            <StatusDonut data={overview?.orderType ?? []} accent="emerald" />
          </BentoCell>
        </Cell>

        {/* 三工具格 */}
        <Cell span="col-span-12 sm:col-span-6 lg:col-span-4">
          <BentoCell accent="blue" title="快捷入口" icon={Zap}>
            <QuickActions />
          </BentoCell>
        </Cell>
        <Cell span="col-span-12 sm:col-span-6 lg:col-span-4">
          <BentoCell accent="amber" title="最近访问" icon={History}>
            <RecentVisits />
          </BentoCell>
        </Cell>
        <Cell span="col-span-12 sm:col-span-6 lg:col-span-4">
          <BentoCell accent="amber" title="系统公告 / 动态" icon={Megaphone} extra={<MockTag />}>
            <AnnouncementPanel />
          </BentoCell>
        </Cell>
      </Stagger>
    </div>
  )
}
```

- [ ] **Step 2: 类型检查 + Lint**

Run: `cd mes/frontend && pnpm --filter mes-new check-types && pnpm --filter mes-new lint`
Expected: 均无错误（注意:`Cell`/`RealTag` 等内联组件无未用变量;若 lint 报 `ReactNode` 未用,确认确实在 `Cell` props 用到）。

- [ ] **Step 3: 提交**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack
git add mes/frontend/apps/mes-new/src/pages/welcome/WelcomePage.tsx
git commit -m "✨ feat(welcome): 便当盒驾驶舱首页编排(Hero+KPI+图表+待办+快捷+最近+公告)"
```

---

## Task 14: 全量验证 + 人工验收

**Files:** 无（仅校验）

- [ ] **Step 1: 类型检查**

Run: `cd mes/frontend && pnpm --filter mes-new check-types`
Expected: 无错误。

- [ ] **Step 2: Lint**

Run: `cd mes/frontend && pnpm --filter mes-new lint`
Expected: 无错误。

- [ ] **Step 3: 全量单测**

Run: `cd mes/frontend && pnpm --filter mes-new test`
Expected: 全绿，含本次新增 `accents`/`welcomeMock`/`welcomeData`/`welcomeCharts` 用例。

- [ ] **Step 4: 构建**

Run: `cd mes/frontend && pnpm --filter mes-new build`
Expected: 构建成功。

- [ ] **Step 5: 人工验收（dev 起服）**

Run: `cd mes/frontend && pnpm dev`（前端 4100，代理 `/api → 9090`；如需真实数据，后端 9090 也要起，dev 账号 admin/123）。访问 `http://localhost:4100/welcome`，逐项核对：

- [ ] 极光 Hero：蓝/青/紫光晕缓慢漂移；问候语随时间段变化；走马灯横向滚动、悬停暂停；接口失败时显示「离线示例数据」。
- [ ] KPI 四连：数字滚动到位；强调色正确（蓝/青/翠/靛）。
- [ ] 生产趋势：浅色面积折线两条（工单数/完工数）；绘制动画。
- [ ] 三环图：订单/设备/订单类型扇区与图例正确；同色系扇区。
- [ ] 待办/公告：列表渲染，带「示例」标；图表/趋势带「真实」标（接口成功时）。
- [ ] 快捷入口：仅显示有权限的入口；点击跳转。
- [ ] 最近访问：显示除首页/当前页外的近访标签 chips；点击跳转；无记录时显示空态文案。
- [ ] 便当格悬停浮起 + 强调描边；梯级入场动画。
- [ ] 响应式：窄屏（<768）单列；中屏（768–1279）2 列；宽屏（≥1280）按 §4 12 栅格。
- [ ] 减少动效：系统开启「减少动态效果」后，极光/走马灯/入场静止，页面仍可用。

- [ ] **Step 6（如有改动）：提交收尾**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack
git add -A
git commit -m "🐛 fix(welcome): 验收修正"
```

---

## Self-Review（计划自检结果）

**1. Spec 覆盖：**
- §3 信息架构 10 版块 → Hero(T12)、KPI×4(T8/T13)、趋势(T5/T9)、待办(T10)、订单/设备/订单类型环图(T5/T9)、快捷入口(T4/T11)、最近访问(T4/T11)、公告(T10) 全覆盖。✓
- §4 12 栅格布局 → T13 编排（含响应式 col-span）。✓
- §5 色彩令牌 → T1（CSS）+ T2（TS 映射）。✓
- §6 动效（极光/入场/数字/图表/悬停/走马灯 + reduced-motion）→ T1 CSS + T7/T8/T12/T13 复用 Stagger/Reveal/useCountUp + EChart 原生动画。✓
- §7 组件拆分与复用、数据层回退 → T2–T13 一一对应。✓
- §8 可访问性/响应式 → aria-hidden、tabular-nums、button 可聚焦、响应式 col-span、T14 验收。✓
- §9 测试 → 纯函数单测（T2–T5）+ T14 门禁与人工验收。✓

**2. 占位扫描：** 无 TBD/TODO；每个代码步骤均给出完整代码与确切命令。✓

**3. 类型一致性：** `AccentName`/`Accent`（T2）、`TodoItem`/`AnnouncementItem`/`MOCK_OVERVIEW`（T3）、`RecentVisit`/`QuickAction`/`resolveOverview`/`buildQuickActions`（T4）、`buildWelcomeTrendOption`/`buildWelcomeDonutOption`/`mix`/`donutPalette`（T5）、`useWelcomeOverview`（T6）在各组件中引用一致；图标名已对 lucide 0.475 核实存在。✓
