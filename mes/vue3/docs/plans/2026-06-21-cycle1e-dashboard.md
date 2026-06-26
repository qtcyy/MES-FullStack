# 子周期 1e 数字化大屏 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `mes/vue3` 落地一块独立全屏深色 kiosk「智慧大屏」,只用后端 `GET /digitization/dashboard/overview` 的 5 组真实数据做可视化(KPI 条 + 三环形饼 + 近12月折线),30s 轮询 + 克制动画。

**Architecture:** 顶层 `ScreenLayout` 壳(已有,强制 dark)挂 `PlanDashboard` 编排页;页内 `onMounted` 取数 + `setInterval` 30s 静默刷新,数据切片下发给纯展示面板;各饼/折线面板调 `utils/dashboard` 纯函数构造 ECharts option,渲染复用既有 `@/components/EChart.vue`。

**Tech Stack:** Vue3 `<script setup>` + TS + vue-router(顶层路由) + axios `http` 封装 + echarts/vue-echarts(经 EChart.vue) + `@vueuse/core` useTransition(数字滚动) + `@vueuse/motion`(入场) + vitest(纯函数 TDD)。

---

## 文件结构

```
src/types/digitization.ts                          # 新建:5 组 VO 镜像类型
src/api/digitization/dashboard.ts                  # 新建:dashboardOverview() GET
src/utils/dashboard.ts                             # 新建:ECharts option 纯函数(TDD)
tests/dashboard.spec.ts                            # 新建:utils/dashboard 单测
src/layouts/components/ScreenHeader.vue            # 新建:大屏顶栏(标题/时钟/最后更新/刷新/返回,1f 复用)
src/views/digitization/dashboard/PlanDashboard.vue # 新建:编排页(取数+轮询+布局)
src/views/digitization/dashboard/panels/PanelFrame.vue     # 新建:带标题边框容器
src/views/digitization/dashboard/panels/KpiStrip.vue       # 新建:4 张 count-up 卡
src/views/digitization/dashboard/panels/DistPie.vue        # 新建:通用环形饼(订单/设备/工单类型复用)
src/views/digitization/dashboard/panels/TrendLine.vue      # 新建:近12月折线
src/router/index.ts                                # 修改:加顶层 ScreenLayout 路由块
src/utils/urlMap.ts                                # 修改:加 /digitization/plan/plan-ui 映射
```

约定提醒:vue3 组件不做渲染单测(沿用既有约定),TDD 只覆盖 `utils/dashboard` 纯函数;门禁 `pnpm typecheck && pnpm test && pnpm lint:check && pnpm build`。所有 `pnpm`/`git` 命令在 `mes/vue3` 目录或用 `git -C <repo-root>`。

---

## Task 1: 类型 + API

**Files:**
- Create: `src/types/digitization.ts`
- Create: `src/api/digitization/dashboard.ts`

- [ ] **Step 1: 写类型文件**

`src/types/digitization.ts`:

```ts
/** 名称-数值项(饼图) */
export interface NameValue {
  name: string
  value: number
}

/** 月度趋势点;month 为 yyyy-MM */
export interface MonthlyTrendPoint {
  month: string
  orderCount: number
  totalQty: number
  completedCount: number
}

/** 顶部 KPI 计数 */
export interface DashboardKpi {
  orderCount: number
  deviceCount: number
  materielCount: number
  flowCount: number
}

/** 大屏总览聚合(对应后端 DashboardOverviewVO) */
export interface DashboardOverview {
  kpi: DashboardKpi
  orderStatus: NameValue[]
  deviceStatus: NameValue[]
  orderType: NameValue[]
  monthlyTrend: MonthlyTrendPoint[]
}
```

- [ ] **Step 2: 写 API 文件**

`src/api/digitization/dashboard.ts`:

```ts
import { http } from '@/api/request'
import type { DashboardOverview } from '@/types/digitization'

/** 大屏总览(GET,只读聚合;响应已解包为业务数据) */
export const dashboardOverview = () =>
  http.get<DashboardOverview>('/digitization/dashboard/overview')
```

- [ ] **Step 3: 类型检查**

Run: `pnpm typecheck`
Expected: PASS(无新增报错)

- [ ] **Step 4: 提交**

```bash
git -C <repo-root> add mes/vue3/src/types/digitization.ts mes/vue3/src/api/digitization/dashboard.ts
git -C <repo-root> commit -m "✨ feat(vue3): 1e 大屏类型与 overview API"
```

---

## Task 2: utils/dashboard.ts ECharts option 纯函数(TDD)

**Files:**
- Create: `src/utils/dashboard.ts`
- Test: `tests/dashboard.spec.ts`

设计:深色色板常量 + 4 个纯函数。`buildDonutOption(title, data)` 供三个分布饼复用;`buildTrendOption(points)` 折线;`sortTrendByMonth(points)` 按 yyyy-MM 升序兜底;`isEmptyDist(data)` 空态判定。

- [ ] **Step 1: 写失败测试**

`tests/dashboard.spec.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  buildDonutOption,
  buildTrendOption,
  sortTrendByMonth,
  isEmptyDist,
} from '@/utils/dashboard'
import type { MonthlyTrendPoint, NameValue } from '@/types/digitization'

const dist: NameValue[] = [
  { name: '已下发', value: 3 },
  { name: '已派工', value: 5 },
]

describe('isEmptyDist', () => {
  it('空数组为空', () => {
    expect(isEmptyDist([])).toBe(true)
  })
  it('全 0 值视为空', () => {
    expect(isEmptyDist([{ name: 'a', value: 0 }])).toBe(true)
  })
  it('有正值不为空', () => {
    expect(isEmptyDist(dist)).toBe(false)
  })
})

describe('buildDonutOption', () => {
  it('标题与单一 pie 系列,数据透传', () => {
    const opt = buildDonutOption('订单状态', dist) as Record<string, any>
    expect(opt.title.text).toBe('订单状态')
    expect(opt.series).toHaveLength(1)
    expect(opt.series[0].type).toBe('pie')
    expect(opt.series[0].data).toEqual(dist)
  })
  it('环形(radius 为内外双值)', () => {
    const opt = buildDonutOption('设备状态', dist) as Record<string, any>
    expect(Array.isArray(opt.series[0].radius)).toBe(true)
    expect(opt.series[0].radius).toHaveLength(2)
  })
})

describe('sortTrendByMonth', () => {
  it('按 yyyy-MM 升序,跨年正确', () => {
    const pts: MonthlyTrendPoint[] = [
      { month: '2026-01', orderCount: 1, totalQty: 0, completedCount: 0 },
      { month: '2025-12', orderCount: 2, totalQty: 0, completedCount: 0 },
    ]
    expect(sortTrendByMonth(pts).map((p) => p.month)).toEqual(['2025-12', '2026-01'])
  })
  it('不改原数组', () => {
    const pts: MonthlyTrendPoint[] = [
      { month: '2026-02', orderCount: 0, totalQty: 0, completedCount: 0 },
      { month: '2026-01', orderCount: 0, totalQty: 0, completedCount: 0 },
    ]
    sortTrendByMonth(pts)
    expect(pts[0].month).toBe('2026-02')
  })
})

describe('buildTrendOption', () => {
  it('x 轴为排序后的月份,三条折线系列', () => {
    const pts: MonthlyTrendPoint[] = [
      { month: '2026-02', orderCount: 2, totalQty: 20, completedCount: 1 },
      { month: '2026-01', orderCount: 1, totalQty: 10, completedCount: 1 },
    ]
    const opt = buildTrendOption(pts) as Record<string, any>
    expect(opt.xAxis.data).toEqual(['2026-01', '2026-02'])
    expect(opt.series).toHaveLength(3)
    expect(opt.series.map((s: any) => s.name)).toEqual(['订单数', '总数量', '完工数'])
    expect(opt.series[0].data).toEqual([1, 2])
    expect(opt.series[1].data).toEqual([10, 20])
    expect(opt.series[2].data).toEqual([1, 1])
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm test`
Expected: FAIL(`@/utils/dashboard` 不存在 / 函数未定义)

- [ ] **Step 3: 写实现**

`src/utils/dashboard.ts`:

```ts
import type { EChartsOption } from 'echarts'
import type { MonthlyTrendPoint, NameValue } from '@/types/digitization'

/** 大屏固定深色科技色板(kiosk 始终深色,不随站点主题切换) */
export const SCREEN_PALETTE = {
  series: ['#36e0ff', '#5b8cff', '#7d5bff', '#34e3b0', '#ffc24b', '#ff6b6b'],
  text: '#c7d6f5',
  textDim: '#8aa0c4',
  axis: 'rgba(120,160,220,0.25)',
  split: 'rgba(120,160,220,0.12)',
  tooltipBg: '#0d1530',
  tooltipBorder: 'rgba(120,160,220,0.3)',
}

/** 分布为空(无项或全 0)时返回 true,用于面板空态占位 */
export function isEmptyDist(data: NameValue[]): boolean {
  return !data.length || data.every((d) => !d.value)
}

const tooltipBase = {
  backgroundColor: SCREEN_PALETTE.tooltipBg,
  borderColor: SCREEN_PALETTE.tooltipBorder,
  textStyle: { color: SCREEN_PALETTE.text },
}

/** 环形饼(订单状态/设备状态/工单类型 共用) */
export function buildDonutOption(title: string, data: NameValue[]): EChartsOption {
  return {
    color: SCREEN_PALETTE.series,
    title: {
      text: title,
      left: 'center',
      top: 4,
      textStyle: { color: SCREEN_PALETTE.text, fontSize: 14 },
    },
    tooltip: { trigger: 'item', ...tooltipBase, formatter: '{b}: {c} ({d}%)' },
    legend: {
      bottom: 0,
      textStyle: { color: SCREEN_PALETTE.textDim },
      icon: 'circle',
    },
    series: [
      {
        type: 'pie',
        radius: ['42%', '66%'],
        center: ['50%', '52%'],
        avoidLabelOverlap: true,
        itemStyle: { borderColor: SCREEN_PALETTE.tooltipBg, borderWidth: 2 },
        label: { color: SCREEN_PALETTE.textDim },
        data,
      },
    ],
  }
}

/** 按 yyyy-MM 升序(返回新数组,不改原数组) */
export function sortTrendByMonth(points: MonthlyTrendPoint[]): MonthlyTrendPoint[] {
  return [...points].sort((a, b) => a.month.localeCompare(b.month))
}

/** 近12月趋势:订单数/总数量/完工数 三折线 */
export function buildTrendOption(points: MonthlyTrendPoint[]): EChartsOption {
  const sorted = sortTrendByMonth(points)
  const months = sorted.map((p) => p.month)
  const mkLine = (name: string, vals: number[], color: string) => ({
    name,
    type: 'line' as const,
    smooth: true,
    symbol: 'circle',
    symbolSize: 6,
    data: vals,
    lineStyle: { width: 2, color },
    itemStyle: { color },
  })
  return {
    color: SCREEN_PALETTE.series,
    tooltip: { trigger: 'axis', ...tooltipBase },
    legend: {
      top: 4,
      data: ['订单数', '总数量', '完工数'],
      textStyle: { color: SCREEN_PALETTE.textDim },
    },
    grid: { top: 40, left: 48, right: 24, bottom: 32 },
    xAxis: {
      type: 'category',
      data: months,
      axisLine: { lineStyle: { color: SCREEN_PALETTE.axis } },
      axisLabel: { color: SCREEN_PALETTE.textDim },
    },
    yAxis: {
      type: 'value',
      axisLine: { lineStyle: { color: SCREEN_PALETTE.axis } },
      axisLabel: { color: SCREEN_PALETTE.textDim },
      splitLine: { lineStyle: { color: SCREEN_PALETTE.split } },
    },
    series: [
      mkLine('订单数', sorted.map((p) => p.orderCount), SCREEN_PALETTE.series[0]),
      mkLine('总数量', sorted.map((p) => p.totalQty), SCREEN_PALETTE.series[1]),
      mkLine('完工数', sorted.map((p) => p.completedCount), SCREEN_PALETTE.series[3]),
    ],
  }
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm test`
Expected: PASS(新增用例全绿,既有测试不破)

- [ ] **Step 5: 提交**

```bash
git -C <repo-root> add mes/vue3/src/utils/dashboard.ts mes/vue3/tests/dashboard.spec.ts
git -C <repo-root> commit -m "✨ feat(vue3): 1e 大屏 ECharts option 纯函数(TDD)"
```

---

## Task 3: PanelFrame.vue(带标题边框容器)

**Files:**
- Create: `src/views/digitization/dashboard/panels/PanelFrame.vue`

- [ ] **Step 1: 写组件**

```vue
<template>
  <section class="panel-frame">
    <header class="panel-frame__title">
      <span class="panel-frame__bar" />
      {{ title }}
    </header>
    <div class="panel-frame__body">
      <div v-if="empty" class="panel-frame__empty">暂无数据</div>
      <slot v-else />
    </div>
  </section>
</template>

<script setup lang="ts">
defineProps<{ title: string; empty?: boolean }>()
</script>

<style scoped>
.panel-frame {
  display: flex;
  flex-direction: column;
  height: 100%;
  border: 1px solid rgba(120, 160, 220, 0.18);
  border-radius: 8px;
  background: linear-gradient(180deg, rgba(20, 32, 66, 0.55), rgba(12, 20, 44, 0.45));
  backdrop-filter: blur(2px);
  overflow: hidden;
}
.panel-frame__title {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  font-size: 14px;
  font-weight: 600;
  color: #cfe0ff;
  border-bottom: 1px solid rgba(120, 160, 220, 0.14);
}
.panel-frame__bar {
  width: 4px;
  height: 14px;
  border-radius: 2px;
  background: #36e0ff;
  box-shadow: 0 0 8px #36e0ff;
}
.panel-frame__body {
  position: relative;
  flex: 1;
  min-height: 0;
  padding: 8px;
}
.panel-frame__empty {
  display: grid;
  place-items: center;
  height: 100%;
  color: #6b7da6;
  font-size: 13px;
}
</style>
```

- [ ] **Step 2: 类型检查**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 3: 提交**

```bash
git -C <repo-root> add mes/vue3/src/views/digitization/dashboard/panels/PanelFrame.vue
git -C <repo-root> commit -m "✨ feat(vue3): 1e 大屏 PanelFrame 容器"
```

---

## Task 4: KpiStrip.vue(4 张 count-up 卡)

**Files:**
- Create: `src/views/digitization/dashboard/panels/KpiStrip.vue`

count-up 用 `@vueuse/core` 的 `useTransition`,源为 `ref`;`prefers-reduced-motion` 时禁用补间(duration 0)。

- [ ] **Step 1: 写组件**

```vue
<template>
  <div class="kpi-strip">
    <div v-for="item in items" :key="item.key" class="kpi-card">
      <div class="kpi-card__icon" :style="{ color: item.color }">
        <component :is="item.icon" />
      </div>
      <div class="kpi-card__main">
        <div class="kpi-card__value">{{ displays[item.key] }}</div>
        <div class="kpi-card__label">{{ item.label }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useTransition } from '@vueuse/core'
import { Document, Cpu, Box, Share } from '@element-plus/icons-vue'
import type { DashboardKpi } from '@/types/digitization'

const props = defineProps<{ kpi: DashboardKpi }>()

const reduceMotion =
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

const items = [
  { key: 'orderCount', label: '生产订单', color: '#36e0ff', icon: Document },
  { key: 'deviceCount', label: '设备总数', color: '#5b8cff', icon: Cpu },
  { key: 'materielCount', label: '物料种类', color: '#34e3b0', icon: Box },
  { key: 'flowCount', label: '工艺路线', color: '#ffc24b', icon: Share },
] as const

// 每个 KPI 一个 ref 源 + useTransition 补间;reduce-motion 时 duration 0
const sources = reactive<Record<string, number>>({
  orderCount: 0,
  deviceCount: 0,
  materielCount: 0,
  flowCount: 0,
})
const opts = { duration: reduceMotion ? 0 : 600 }
const tOrder = useTransition(toRefSrc('orderCount'), opts)
const tDevice = useTransition(toRefSrc('deviceCount'), opts)
const tMateriel = useTransition(toRefSrc('materielCount'), opts)
const tFlow = useTransition(toRefSrc('flowCount'), opts)

function toRefSrc(key: keyof typeof sources) {
  return computed(() => sources[key])
}

const tweens = { orderCount: tOrder, deviceCount: tDevice, materielCount: tMateriel, flowCount: tFlow }
const displays = computed(() => ({
  orderCount: Math.round(tweens.orderCount.value),
  deviceCount: Math.round(tweens.deviceCount.value),
  materielCount: Math.round(tweens.materielCount.value),
  flowCount: Math.round(tweens.flowCount.value),
}))

watch(
  () => props.kpi,
  (k) => {
    sources.orderCount = k.orderCount ?? 0
    sources.deviceCount = k.deviceCount ?? 0
    sources.materielCount = k.materielCount ?? 0
    sources.flowCount = k.flowCount ?? 0
  },
  { immediate: true, deep: true },
)
</script>

<style scoped>
.kpi-strip {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}
.kpi-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 20px;
  border: 1px solid rgba(120, 160, 220, 0.18);
  border-radius: 10px;
  background: linear-gradient(135deg, rgba(28, 44, 90, 0.6), rgba(12, 20, 44, 0.5));
}
.kpi-card__icon {
  font-size: 30px;
  width: 30px;
  height: 30px;
}
.kpi-card__value {
  font-size: 30px;
  font-weight: 700;
  line-height: 1.1;
  color: #eaf2ff;
  font-variant-numeric: tabular-nums;
}
.kpi-card__label {
  margin-top: 4px;
  font-size: 13px;
  color: #8aa0c4;
}
@media (max-width: 1100px) {
  .kpi-strip {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
```

> 注:`toRefSrc`/`useTransition` 顺序——`toRefSrc` 是函数声明(hoisted),在 `useTransition` 调用前可用。若 lint 报 `no-use-before-define`,把 4 行 `toRefSrc` 定义上移到 `const tOrder` 之前。

- [ ] **Step 2: 类型检查**

Run: `pnpm typecheck`
Expected: PASS。若 `@element-plus/icons-vue` 某图标名不存在(版本差异),改用存在的等价图标(`pnpm exec node -e "console.log(Object.keys(require('@element-plus/icons-vue')).slice(0,50))"` 查可用名)。

- [ ] **Step 3: 提交**

```bash
git -C <repo-root> add mes/vue3/src/views/digitization/dashboard/panels/KpiStrip.vue
git -C <repo-root> commit -m "✨ feat(vue3): 1e 大屏 KPI 数字滚动卡"
```

---

## Task 5: DistPie.vue + TrendLine.vue(图表面板)

**Files:**
- Create: `src/views/digitization/dashboard/panels/DistPie.vue`
- Create: `src/views/digitization/dashboard/panels/TrendLine.vue`

复用既有 `@/components/EChart.vue`(已注册 Pie/Line/Bar + Grid/Tooltip/Legend/Title)。

- [ ] **Step 1: 写 DistPie.vue**

```vue
<template>
  <PanelFrame :title="title" :empty="empty">
    <EChart :option="option" />
  </PanelFrame>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import EChart from '@/components/EChart.vue'
import PanelFrame from './PanelFrame.vue'
import { buildDonutOption, isEmptyDist } from '@/utils/dashboard'
import type { NameValue } from '@/types/digitization'

const props = defineProps<{ title: string; data: NameValue[] }>()
const empty = computed(() => isEmptyDist(props.data))
const option = computed(() => buildDonutOption(props.title, props.data))
</script>
```

- [ ] **Step 2: 写 TrendLine.vue**

```vue
<template>
  <PanelFrame title="近 12 月生产趋势" :empty="empty">
    <EChart :option="option" />
  </PanelFrame>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import EChart from '@/components/EChart.vue'
import PanelFrame from './PanelFrame.vue'
import { buildTrendOption } from '@/utils/dashboard'
import type { MonthlyTrendPoint } from '@/types/digitization'

const props = defineProps<{ points: MonthlyTrendPoint[] }>()
const empty = computed(() => !props.points.length)
const option = computed(() => buildTrendOption(props.points))
</script>
```

- [ ] **Step 3: 类型检查**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 4: 提交**

```bash
git -C <repo-root> add mes/vue3/src/views/digitization/dashboard/panels/DistPie.vue mes/vue3/src/views/digitization/dashboard/panels/TrendLine.vue
git -C <repo-root> commit -m "✨ feat(vue3): 1e 大屏 分布饼/趋势折线面板"
```

---

## Task 6: ScreenHeader.vue(大屏顶栏,1f 复用)

**Files:**
- Create: `src/layouts/components/ScreenHeader.vue`

职责:标题 + 实时时钟 + 「最后更新」时间 + 手动刷新按钮 + 返回后台。时钟用 `setInterval` 每秒更新,卸载清理。`lastUpdated`/`loading` 由父传入;`refresh`/`back` 用 emit。

- [ ] **Step 1: 写组件**

```vue
<template>
  <header class="screen-header">
    <div class="screen-header__left">
      <span class="screen-header__dot" />
      <h1 class="screen-header__title">{{ title }}</h1>
    </div>
    <div class="screen-header__right">
      <span class="screen-header__clock">{{ clock }}</span>
      <span v-if="lastUpdated" class="screen-header__updated">
        最后更新 {{ lastUpdatedText }}
      </span>
      <el-button :loading="loading" size="small" @click="emit('refresh')">刷新</el-button>
      <el-button size="small" @click="emit('back')">返回后台</el-button>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'

const props = defineProps<{ title: string; lastUpdated?: number | null; loading?: boolean }>()
const emit = defineEmits<{ refresh: []; back: [] }>()

const now = ref(Date.now())
let timer: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  timer = setInterval(() => (now.value = Date.now()), 1000)
})
onUnmounted(() => {
  if (timer) clearInterval(timer)
})

const pad = (n: number) => String(n).padStart(2, '0')
const fmt = (ms: number) => {
  const d = new Date(ms)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}
const clock = computed(() => {
  const d = new Date(now.value)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${fmt(now.value)}`
})
const lastUpdatedText = computed(() => (props.lastUpdated ? fmt(props.lastUpdated) : ''))
</script>

<style scoped>
.screen-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  height: 64px;
  border-bottom: 1px solid rgba(120, 160, 220, 0.18);
}
.screen-header__left {
  display: flex;
  align-items: center;
  gap: 12px;
}
.screen-header__dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #36e0ff;
  box-shadow: 0 0 10px #36e0ff;
  animation: pulse 2s ease-in-out infinite;
}
.screen-header__title {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  letter-spacing: 2px;
  color: #eaf2ff;
}
.screen-header__right {
  display: flex;
  align-items: center;
  gap: 14px;
}
.screen-header__clock {
  font-size: 15px;
  color: #c7d6f5;
  font-variant-numeric: tabular-nums;
}
.screen-header__updated {
  font-size: 12px;
  color: #6b7da6;
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.35; }
}
@media (prefers-reduced-motion: reduce) {
  .screen-header__dot { animation: none; }
}
</style>
```

- [ ] **Step 2: 类型检查**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 3: 提交**

```bash
git -C <repo-root> add mes/vue3/src/layouts/components/ScreenHeader.vue
git -C <repo-root> commit -m "✨ feat(vue3): 1e 大屏顶栏 ScreenHeader(1f 复用)"
```

---

## Task 7: PlanDashboard.vue(编排页:取数 + 30s 轮询 + 布局 + 入场)

**Files:**
- Create: `src/views/digitization/dashboard/PlanDashboard.vue`

取数:`ref` 状态 + `load()`(try/catch/finally,失败 ElMessage)。`onMounted` 首次 load + `setInterval(load, 30000)`,卸载清理。入场用 `@vueuse/motion` 的 `v-motion`,`prefers-reduced-motion` 时不加。

- [ ] **Step 1: 写组件**

```vue
<template>
  <div class="dashboard">
    <ScreenHeader
      title="MES 智慧生产大屏"
      :last-updated="lastUpdated"
      :loading="loading"
      @refresh="load"
      @back="goBack"
    />

    <div v-if="error && !data" class="dashboard__error">
      <p>数据加载失败</p>
      <el-button type="primary" @click="load">重试</el-button>
    </div>

    <div v-else class="dashboard__body">
      <KpiStrip :kpi="data?.kpi ?? emptyKpi" />

      <div class="dashboard__grid">
        <DistPie title="订单状态分布" :data="data?.orderStatus ?? []" />
        <DistPie title="设备状态分布" :data="data?.deviceStatus ?? []" />
        <DistPie title="工单类型分布" :data="data?.orderType ?? []" />
      </div>

      <div class="dashboard__trend">
        <TrendLine :points="data?.monthlyTrend ?? []" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { dashboardOverview } from '@/api/digitization/dashboard'
import type { DashboardKpi, DashboardOverview } from '@/types/digitization'
import ScreenHeader from '@/layouts/components/ScreenHeader.vue'
import KpiStrip from './panels/KpiStrip.vue'
import DistPie from './panels/DistPie.vue'
import TrendLine from './panels/TrendLine.vue'

const router = useRouter()
const data = ref<DashboardOverview | null>(null)
const loading = ref(false)
const error = ref(false)
const lastUpdated = ref<number | null>(null)
const emptyKpi: DashboardKpi = { orderCount: 0, deviceCount: 0, materielCount: 0, flowCount: 0 }

let timer: ReturnType<typeof setInterval> | undefined

async function load() {
  loading.value = true
  try {
    data.value = await dashboardOverview()
    lastUpdated.value = Date.now()
    error.value = false
  } catch {
    error.value = true
    // http 拦截器已 toast,这里仅标记态
  } finally {
    loading.value = false
  }
}

function goBack() {
  router.push('/welcome')
}

onMounted(() => {
  load()
  timer = setInterval(load, 30000)
})
onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<style scoped>
.dashboard {
  display: flex;
  flex-direction: column;
  height: 100vh;
  padding: 0;
  background:
    radial-gradient(1200px 600px at 50% -10%, rgba(54, 224, 255, 0.08), transparent),
    var(--bg-body);
  color: #eaf2ff;
}
.dashboard__body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px 24px 24px;
  overflow: auto;
}
.dashboard__grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  min-height: 320px;
}
.dashboard__grid > * {
  min-height: 320px;
}
.dashboard__trend {
  min-height: 300px;
}
.dashboard__trend > * {
  height: 100%;
}
.dashboard__error {
  flex: 1;
  display: grid;
  place-content: center;
  gap: 16px;
  text-align: center;
  color: #8aa0c4;
}
@media (max-width: 1100px) {
  .dashboard__grid {
    grid-template-columns: 1fr;
  }
}
</style>
```

> 入场动画(可选增强):若 `@vueuse/motion` 已全局注册 `v-motion` 指令,可给 `.dashboard__grid > *` 包装或在各 PanelFrame 加 `v-motion`(淡入+上滑,交错 delay)。先确认指令可用(`grep -rn "motion" src/main.ts`);不可用则跳过,不阻断本任务。

- [ ] **Step 2: 类型检查 + 构建**

Run: `pnpm typecheck && pnpm build`
Expected: PASS

- [ ] **Step 3: 提交**

```bash
git -C <repo-root> add mes/vue3/src/views/digitization/dashboard/PlanDashboard.vue
git -C <repo-root> commit -m "✨ feat(vue3): 1e 大屏编排页(取数+30s 轮询+布局)"
```

---

## Task 8: 路由 + urlMap 接线

**Files:**
- Modify: `src/router/index.ts`
- Modify: `src/utils/urlMap.ts`

- [ ] **Step 1: router 加顶层 ScreenLayout 路由块**

在 `src/router/index.ts` 的 `routes` 数组里,AdminLayout 路由块(以 `path: '/'` 开头、`children: [...]` 结尾的对象)**之后、`/403` 之前**插入:

```ts
  {
    path: '/digitization/dashboard',
    component: () => import('@/layouts/ScreenLayout.vue'),
    children: [
      {
        path: '',
        name: 'digitization-dashboard',
        component: () => import('@/views/digitization/dashboard/PlanDashboard.vue'),
        meta: { title: '智慧大屏', perm: 'user:add' },
      },
    ],
  },
```

- [ ] **Step 2: urlMap 加映射**

在 `src/utils/urlMap.ts` 的 `URL_MAP` 对象里,`'/order/gantt': '/order/gantt',` 之后加:

```ts
  '/digitization/plan/plan-ui': '/digitization/dashboard',
```

- [ ] **Step 3: 加 urlMap 单测**

在 `tests/urlMap.spec.ts` 里(找到现有 `describe`)新增一条:

```ts
  it('数字化智慧大屏映射到干净路由', () => {
    expect(toSpaRoute('/digitization/plan/plan-ui')).toBe('/digitization/dashboard')
  })
```

- [ ] **Step 4: 跑测试 + 类型 + 构建**

Run: `pnpm test && pnpm typecheck && pnpm build`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git -C <repo-root> add mes/vue3/src/router/index.ts mes/vue3/src/utils/urlMap.ts mes/vue3/tests/urlMap.spec.ts
git -C <repo-root> commit -m "✨ feat(vue3): 1e 大屏路由接入 ScreenLayout + urlMap 映射"
```

---

## Task 9: 后端端点审查(按 [[backend-deepseek-review-each-cycle]])

**Files:**
- Read only: `mes/src/main/java/com/wangziyang/mes/digitization/service/impl/DashboardServiceImpl.java`
- Read only: `mes/src/main/java/com/wangziyang/mes/digitization/mapper/DashboardMapper.java`(+ 对应 XML 若有)
- Read only: `mes/src/main/java/com/wangziyang/mes/digitization/dto/*.java`

- [ ] **Step 1: 读审聚合逻辑**

逐项核对 5 组聚合语义正确:KPI 四计数(订单/设备/物料/工艺路线;是否过滤软删 is_deleted)、orderStatus/deviceStatus/orderType 三组 group-by 分布(状态码→名称映射是否齐全)、monthlyTrend 近 12 月按月聚合(月份连续性/排序/completedCount 口径)。记录任何可疑点。

- [ ] **Step 2: 起后端 + 实测端点**

按 [[backend-build-mvnw-broken]]:JDK11 + 系统 `mvn`(`./mvnw` 已坏)起后端 :9090(连 `mes_data` localhost:3306 root/12345678),dev 验证码已关。

```bash
bash scripts/verify/login.sh                      # admin/123 拿 JSESSIONID(脚本已存在)
# 用拿到的 cookie 调:
curl -s -b "JSESSIONID=<token>" http://localhost:9090/digitization/dashboard/overview | head -c 2000
```

Expected: 返回 `{"code":0,"data":{kpi,orderStatus,deviceStatus,orderType,monthlyTrend}}` 结构正确、计数合理。

- [ ] **Step 3: 按需修复**

若 Step1/Step2 发现真 bug,走「最小修正」先例改 `DashboardServiceImpl`/Mapper,并补/改 Mockito 守卫单测(JUnit4,`@RunWith(MockitoJUnitRunner)`,参考同包既有 `DashboardServiceImplTest`)。运行 `mvn -o test -Dtest=DashboardServiceImplTest`(JDK11)确认绿。若无 bug,在验证记录里写明"读审 + curl 实测无暴露 bug"。

- [ ] **Step 4: 写验证记录**

把审查结论 + curl 证据写入 `mes/vue3/docs/specs/2026-06-21-cycle1e-verify-results.md`(若有后端改动一并记录),提交:

```bash
git -C <repo-root> add mes/vue3/docs/specs/2026-06-21-cycle1e-verify-results.md  # + 任何后端改动文件
git -C <repo-root> commit -m "✅ test(vue3): 1e 大屏后端端点审查 + curl 实测记录"
```

---

## Task 10: 全门禁 + 收尾

- [ ] **Step 1: 跑全门禁**

Run(在 `mes/vue3`): `pnpm typecheck && pnpm test && pnpm lint:check && pnpm build`
Expected: 全 PASS(typecheck 0 err / 新增 spec 全绿 / lint 0 err / build 成功)

- [ ] **Step 2: 修任何门禁失败**

针对失败逐项修复后重跑直至全绿。常见点:lint 的 `no-use-before-define`(见 Task4 注)、未使用导入。

- [ ] **Step 3: 浏览器冒烟(交用户)**

提示用户在 :4200 登录(admin/123,需后端 :9090)→ 侧栏「数字化平台 → 智慧大屏」→ 核对:KPI 数字滚动、三饼/折线渲染、30s 自动刷新「最后更新」时间跳动、手动刷新、返回后台、reduced-motion 降级。

- [ ] **Step 4: 最终提交(若有遗留)**

```bash
git -C <repo-root> status
git -C <repo-root> add -A && git -C <repo-root> commit -m "🔧 chore(vue3): 1e 大屏门禁修复与收尾"
```

---

## 自查(spec 覆盖)

- spec §2 决策 1 纯真实数据 5 组 → Task1 类型/Task5 三饼+折线/Task7 编排 ✅(无 mock 面板)
- §2 决策 2 独立全屏 kiosk → Task8 顶层 ScreenLayout 路由 + Task7 全屏布局 ✅
- §2 决策 3 30s 轮询+手动刷新+最后更新 → Task7 setInterval + Task6 ScreenHeader ✅
- §2 决策 4 克制动画(数字滚动/入场/reduced-motion)→ Task4 useTransition + Task6 脉冲点 + Task7 入场(可选)+ 各处 reduce-motion 守卫 ✅
- §2 决策 5 OrderType 环形饼 → Task5 DistPie 复用 buildDonutOption ✅
- §2 决策 6 ScreenHeader 可复用 → Task6 置于 `layouts/components` ✅
- §3 后端契约 → Task1 类型镜像 + Task9 实测 ✅
- §4 路由/菜单/urlMap → Task8(零菜单种子,仅 urlMap)✅
- §9 后端审查 → Task9 ✅
- §10 测试门禁 → Task2 TDD + Task8 urlMap 测 + Task10 全门禁 ✅

## 已知约定回顾

- vue3 组件不做渲染单测;TDD 仅 utils。
- `http.get<T>` 返回已解包业务数据(非 AxiosResponse)。
- `git` 用 `git -C <repo-root>`(shell cwd 可能在 `mes/vue3`,提交路径以仓库根为基准)。
- 菜单 14/141 原始 schema 预置,**零菜单种子**;若冒烟发现侧栏无「智慧大屏」,再补 menu seed(id 141)。
</content>
