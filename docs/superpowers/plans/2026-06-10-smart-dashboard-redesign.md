# 智慧大屏（生产指挥中心）重构 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `PlanDashboard.tsx` 从可滚动的 ECharts 卡片网格，重构为固定满屏、科技蓝风格、富动效的"生产指挥中心"大屏（数据保持 mock，不动后端）。

**Architecture:** 单一 537 行大文件拆为 `dashboard/` 子目录下职责清晰的小单元：`theme.ts`（色板/尺寸单一可信源）、`mockData.ts`（数据/视图分离）、两个 hook（数字滚动、轮播高亮）、`PanelFrame`（炫酷外框）、`DashboardHeader`、`KpiBar/KpiCard`、6 个图表组件。主容器用 CSS Grid 三行（标题/KPI/三列）+ flex 弹性填充实现自适应。动画混合分工：`motion` 管 DOM 外壳、CSS 管纯循环装饰、ECharts 管 canvas 内部。

**Tech Stack:** React 19、TypeScript 6、Vite 8、ECharts 6 + echarts-for-react 3、**motion 12**（新增）、Ant Design 6（仅用于现有壳，本页基本不依赖）。

**测试说明:** 该前端项目无单元测试框架（spec 第 8 节确认不新建）。因此本计划用 **`npx tsc --noEmit` 类型检查** 作为每个任务的自动化验证关；最终任务追加 `npm run lint` + `npm run build` + dev server `curl` HTTP 200；视觉/动效由用户在浏览器实际查看确认。所有命令均在 `mes/frontend/` 目录下执行。

**关键约束（实现前必读）:**
- `@/` 别名 → `src/`；`PlanDashboard` 为默认导出，路径不变 → **不需要修改 `App.tsx`**。
- 大屏嵌在 `AdminLayout` 的 `Layout.Content`（`margin:16; padding:24; overflowY:auto`）内，上方还有 Header + Tabs、左侧有 Sider → **绝对不能用 `100vw/100vh`**，否则溢出。正确做法：根容器 `height:100%` + 负边距 `margin:-24` 抵消 Content 的 padding 实现出血（Task 14 有精确代码）。
- 全局已有 reset：`* { margin:0; padding:0; box-sizing:border-box }`，`html,body,#root { height:100% }`。
- flex 嵌套 ECharts：面板 body 必须 `min-height:0`，否则图表无法收缩、撑爆布局。
- `motion` 在 React 中的导入路径是 `motion/react`（不是 `framer-motion`）。

---

## 文件结构总览

```
mes/frontend/src/pages/digitization/
├── PlanDashboard.tsx              # 改写：主容器（CSS Grid 编排）
└── dashboard/                     # 新建目录
    ├── dashboard.css              # 大屏专属 CSS（流光、网格、粒子 keyframes）
    ├── theme.ts                   # 色板 + 尺寸 + ECharts 公共样式助手
    ├── mockData.ts                # 全部 mock 数据 + TS 类型
    ├── useCountUp.ts              # 数字滚动 hook（motion animate）
    ├── useRotatingHighlight.ts    # 轮播高亮 hook
    ├── PanelFrame.tsx             # 通用面板外框（SVG 边角 + 标题 + 流光 + 入场）
    ├── DashboardHeader.tsx        # 顶部标题栏（标题 + 实时时钟）
    ├── KpiCard.tsx                # 单个 KPI 数字卡
    ├── KpiBar.tsx                 # KPI 卡排（4 个，错峰入场）
    └── charts/
        ├── TrendChart.tsx         # 年度计划与工单趋势（中列主图）
        ├── FactoryBarChart.tsx    # 各工厂产量（含轮播高亮）
        ├── WorkshopBarChart.tsx   # 各车间产量
        ├── QualityAreaChart.tsx   # 良品率/不良率
        ├── RegionDonutChart.tsx   # 地区对比（3 环形，含轮播高亮）
        └── GaugePanel.tsx         # 设备仪表盘（4 gauge）
```

---

## Task 1: 安装 motion + 建立 theme.ts + dashboard.css

**Files:**
- Modify: `mes/frontend/package.json`（新增 motion 依赖，由 npm 自动写入）
- Create: `mes/frontend/src/pages/digitization/dashboard/theme.ts`
- Create: `mes/frontend/src/pages/digitization/dashboard/dashboard.css`

- [ ] **Step 1: 安装 motion**

Run（在 `mes/frontend/` 下）:
```bash
cd mes/frontend && npm install motion@^12.40.0
```
Expected: 安装成功，`package.json` 的 `dependencies` 出现 `"motion": "^12.40.0"`，无 peer 冲突报错。

- [ ] **Step 2: 创建 theme.ts**

Create `mes/frontend/src/pages/digitization/dashboard/theme.ts`:
```ts
// 科技蓝大屏主题 —— 颜色 / 尺寸 / ECharts 公共样式的单一可信源
import type { CSSProperties } from 'react'

export const COLORS = {
  // 背景
  bgGradient: 'radial-gradient(ellipse at top, #0a2a52 0%, #061325 70%)',
  bgSolid: '#061325',
  // 主色
  primary: '#00d4ff', // 青蓝发光
  primaryDeep: '#1565c0', // 渐变底
  // 辅色
  cyan: '#3bc9db',
  green: '#51cf66',
  orange: '#f59f00',
  red: '#f03e3e',
  purple: '#9775fa',
  // 文字
  text: '#c5e4ff',
  textSub: '#7fb5e0',
  label: '#5ad8ff',
  // 面板
  panelBg: 'rgba(20, 60, 110, 0.35)',
  panelBorder: '#1e5a9e',
  axis: '#2d4a6e',
} as const

// 面板外框基础样式（PanelFrame 使用）
export const panelBaseStyle: CSSProperties = {
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  background: COLORS.panelBg,
  border: `1px solid ${COLORS.panelBorder}`,
  borderRadius: 6,
  boxShadow: 'inset 0 0 18px rgba(30,144,255,0.18)',
  overflow: 'hidden',
  minHeight: 0,
}

// ECharts 坐标轴公共样式 —— 避免各图表重复
export function axisStyle(): Record<string, unknown> {
  return {
    axisLine: { lineStyle: { color: COLORS.axis } },
    axisLabel: { color: COLORS.textSub, fontSize: 11 },
    splitLine: { lineStyle: { color: COLORS.axis, opacity: 0.25 } },
    axisTick: { show: false },
  }
}

// 生成竖向渐变（柱状/面积常用）
export function vGradient(from: string, to: string) {
  return {
    type: 'linear' as const,
    x: 0, y: 0, x2: 0, y2: 1,
    colorStops: [
      { offset: 0, color: from },
      { offset: 1, color: to },
    ],
  }
}
```

- [ ] **Step 3: 创建 dashboard.css（纯循环装饰动画）**

Create `mes/frontend/src/pages/digitization/dashboard/dashboard.css`:
```css
/* 大屏专属动画 —— 仅作用于 .dash-* 类，不污染全局 */

/* 面板顶部流光扫描 */
@keyframes dash-scan {
  0%   { left: -30%; opacity: 0; }
  20%  { opacity: 1; }
  80%  { opacity: 1; }
  100% { left: 100%; opacity: 0; }
}
.dash-scan {
  position: absolute;
  top: 0;
  left: -30%;
  width: 30%;
  height: 2px;
  background: linear-gradient(90deg, transparent, #00d4ff, transparent);
  filter: blur(0.5px);
  animation: dash-scan 4.5s linear infinite;
  pointer-events: none;
  z-index: 3;
}

/* 背景网格纹理 */
.dash-grid-bg {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(30, 144, 255, 0.06) 1px, transparent 1px),
    linear-gradient(90deg, rgba(30, 144, 255, 0.06) 1px, transparent 1px);
  background-size: 44px 44px;
  pointer-events: none;
  z-index: 0;
}

/* 漂浮粒子 */
@keyframes dash-float {
  0%   { transform: translateY(0) scale(1); opacity: 0; }
  10%  { opacity: 0.8; }
  90%  { opacity: 0.8; }
  100% { transform: translateY(-120px) scale(1.4); opacity: 0; }
}
.dash-particle {
  position: absolute;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #5ad8ff;
  box-shadow: 0 0 8px 2px rgba(90, 216, 255, 0.6);
  animation: dash-float linear infinite;
  pointer-events: none;
  z-index: 0;
}

/* 面板四角 L 型科技边角 */
.dash-corner {
  position: absolute;
  width: 12px;
  height: 12px;
  border-color: #00d4ff;
  border-style: solid;
  border-width: 0;
  z-index: 2;
  pointer-events: none;
}
.dash-corner.tl { top: 4px; left: 4px; border-top-width: 2px; border-left-width: 2px; }
.dash-corner.tr { top: 4px; right: 4px; border-top-width: 2px; border-right-width: 2px; }
.dash-corner.bl { bottom: 4px; left: 4px; border-bottom-width: 2px; border-left-width: 2px; }
.dash-corner.br { bottom: 4px; right: 4px; border-bottom-width: 2px; border-right-width: 2px; }
```

- [ ] **Step 4: 类型检查**

Run:
```bash
cd mes/frontend && npx tsc --noEmit
```
Expected: PASS（无报错）。CSS 不参与 tsc，theme.ts 应零错误。

- [ ] **Step 5: Commit**

```bash
cd mes/frontend && git add package.json package-lock.json src/pages/digitization/dashboard/theme.ts src/pages/digitization/dashboard/dashboard.css
git commit -m "✨ feat(dashboard): 新增 motion 依赖、科技蓝主题与装饰动画样式"
```

---

## Task 2: mockData.ts（数据/视图分离）

**Files:**
- Create: `mes/frontend/src/pages/digitization/dashboard/mockData.ts`

- [ ] **Step 1: 创建 mockData.ts**

Create `mes/frontend/src/pages/digitization/dashboard/mockData.ts`:
```ts
// 全部大屏 mock 数据集中于此，带 TS 类型 —— 将来接真实 API 只改本文件

export interface KpiDatum {
  key: string
  label: string
  value: number
  unit: string
  decimals: number
  trend: 'up' | 'down'
  delta: string // 同比，如 "+12.5%"
  color: string
}

export interface NameValue {
  name: string
  value: number
}

// ---- 顶部 KPI ----
export const kpis: KpiDatum[] = [
  { key: 'output', label: '本年总产量', value: 2265, unit: '万件', decimals: 0, trend: 'up', delta: '+12.5%', color: '#00d4ff' },
  { key: 'complete', label: '计划完成率', value: 95.6, unit: '%', decimals: 1, trend: 'up', delta: '+1.8%', color: '#51cf66' },
  { key: 'yield', label: '综合良品率', value: 98.4, unit: '%', decimals: 1, trend: 'up', delta: '+0.6%', color: '#3bc9db' },
  { key: 'oee', label: '设备综合效率', value: 87.2, unit: '%', decimals: 1, trend: 'down', delta: '-0.4%', color: '#f59f00' },
]

// ---- 年度趋势 ----
export const months = Array.from({ length: 12 }, (_, i) => `${i + 1}月`)
export const planData = [120, 135, 150, 165, 180, 200, 190, 210, 195, 220, 240, 260]
export const orderData = [110, 128, 142, 158, 172, 190, 185, 200, 188, 210, 230, 250]
export const completionRate = [91.7, 94.8, 94.7, 95.8, 95.6, 95.0, 97.4, 95.2, 96.4, 95.5, 95.8, 96.2]

// ---- 各工厂产量 ----
export const factories = ['一厂', '二厂', '三厂', '四厂', '五厂', '六厂', '七厂']
export const factoryOutput = [420, 380, 510, 460, 390, 530, 470]

// ---- 各车间产量 ----
export const workshops = ['冲压', '焊接', '涂装', '总装', '机加', '热处理', '电镀', '质检']
export const workshopOutput = [180, 220, 160, 310, 195, 140, 125, 200]

// ---- 良品率 / 不良率 ----
export const yieldRate = [97.2, 97.5, 97.8, 98.1, 97.9, 98.3, 98.5, 98.2, 98.4, 98.6, 98.7, 98.9]
export const defectRate = [2.8, 2.5, 2.2, 1.9, 2.1, 1.7, 1.5, 1.8, 1.6, 1.4, 1.3, 1.1]

// ---- 地区对比 ----
export const regionNorth: NameValue[] = [
  { name: '北京', value: 285 },
  { name: '天津', value: 210 },
  { name: '河北', value: 175 },
]
export const regionEast: NameValue[] = [
  { name: '上海', value: 320 },
  { name: '江苏', value: 290 },
  { name: '浙江', value: 260 },
]
export const regionSouth: NameValue[] = [
  { name: '广东', value: 350 },
  { name: '福建', value: 195 },
  { name: '广西', value: 120 },
]

// ---- 设备仪表盘 ----
export interface GaugeDatum {
  name: string
  value: number
  max: number
  color: string
}
export const gauges: GaugeDatum[] = [
  { name: '主轴转速', value: 78, max: 100, color: '#00d4ff' },
  { name: '产线速度', value: 72, max: 100, color: '#3bc9db' },
  { name: '能耗指数', value: 62, max: 100, color: '#51cf66' },
  { name: '水位', value: 83, max: 100, color: '#9775fa' },
]
```

- [ ] **Step 2: 类型检查**

Run:
```bash
cd mes/frontend && npx tsc --noEmit
```
Expected: PASS。

- [ ] **Step 3: Commit**

```bash
cd mes/frontend && git add src/pages/digitization/dashboard/mockData.ts
git commit -m "✨ feat(dashboard): 抽离集中式 mock 数据与类型定义"
```

---

## Task 3: useCountUp.ts（数字滚动 hook）

**Files:**
- Create: `mes/frontend/src/pages/digitization/dashboard/useCountUp.ts`

- [ ] **Step 1: 创建 useCountUp.ts**

从当前值缓动到目标值（目标变化时不回弹到 0，适配实时跳动）。

Create `mes/frontend/src/pages/digitization/dashboard/useCountUp.ts`:
```ts
import { useEffect, useRef, useState } from 'react'
import { animate } from 'motion/react'

/**
 * 数字滚动增长 hook。
 * @param target   目标值
 * @param decimals 小数位
 * @param duration 动画时长（秒）
 * @returns 当前显示值（已按 decimals 取整/截断）
 */
export function useCountUp(target: number, decimals = 0, duration = 1.2): number {
  const [value, setValue] = useState(0)
  const fromRef = useRef(0)

  useEffect(() => {
    const controls = animate(fromRef.current, target, {
      duration,
      ease: 'easeOut',
      onUpdate: (v) => {
        fromRef.current = v
        setValue(v)
      },
    })
    return () => controls.stop()
  }, [target, duration])

  return decimals > 0 ? Number(value.toFixed(decimals)) : Math.round(value)
}
```

- [ ] **Step 2: 类型检查**

Run:
```bash
cd mes/frontend && npx tsc --noEmit
```
Expected: PASS。验证 `animate` 从 `motion/react` 正确导入、`controls.stop()` 类型存在。若报 `animate` 不存在，说明 motion 版本导出路径不符——改用 `import { animate } from 'motion'` 重试。

- [ ] **Step 3: Commit**

```bash
cd mes/frontend && git add src/pages/digitization/dashboard/useCountUp.ts
git commit -m "✨ feat(dashboard): 数字滚动增长 hook"
```

---

## Task 4: useRotatingHighlight.ts（轮播高亮 hook）

**Files:**
- Create: `mes/frontend/src/pages/digitization/dashboard/useRotatingHighlight.ts`

- [ ] **Step 1: 创建 useRotatingHighlight.ts**

Create `mes/frontend/src/pages/digitization/dashboard/useRotatingHighlight.ts`:
```ts
import { useEffect, useState } from 'react'

/**
 * 轮播高亮 hook：每隔 intervalMs 让 activeIndex 在 [0, count) 间循环。
 * count<=0 时不启动定时器。
 */
export function useRotatingHighlight(count: number, intervalMs = 2800): number {
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    if (count <= 0) return
    const timer = setInterval(() => {
      setActiveIndex((i) => (i + 1) % count)
    }, intervalMs)
    return () => clearInterval(timer)
  }, [count, intervalMs])

  return activeIndex
}
```

- [ ] **Step 2: 类型检查**

Run:
```bash
cd mes/frontend && npx tsc --noEmit
```
Expected: PASS。

- [ ] **Step 3: Commit**

```bash
cd mes/frontend && git add src/pages/digitization/dashboard/useRotatingHighlight.ts
git commit -m "✨ feat(dashboard): 轮播高亮 hook"
```

---

## Task 5: PanelFrame.tsx（通用面板外框）

**Files:**
- Create: `mes/frontend/src/pages/digitization/dashboard/PanelFrame.tsx`

- [ ] **Step 1: 创建 PanelFrame.tsx**

承载炫酷感：motion 入场 + hover、SVG/CSS 边角、流光扫描、标题条。body 区 `flex:1; min-height:0` 供图表填充。

Create `mes/frontend/src/pages/digitization/dashboard/PanelFrame.tsx`:
```tsx
import type { ReactNode, CSSProperties } from 'react'
import { motion } from 'motion/react'
import { COLORS, panelBaseStyle } from './theme'

interface PanelFrameProps {
  title: string
  children: ReactNode
  delay?: number // 错峰入场延迟（秒）
  style?: CSSProperties // 额外样式（如 flex 比例）
}

const titleBarStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '8px 12px',
  borderBottom: `1px solid rgba(94,216,255,0.25)`,
  flexShrink: 0,
}

const titleTextStyle: CSSProperties = {
  color: COLORS.label,
  fontSize: 'clamp(13px, 0.95vw, 17px)',
  fontWeight: 600,
  letterSpacing: 1,
  textShadow: '0 0 8px rgba(30,144,255,0.6)',
}

export default function PanelFrame({ title, children, delay = 0, style }: PanelFrameProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay, ease: 'easeOut' }}
      whileHover={{ boxShadow: 'inset 0 0 18px rgba(30,144,255,0.25), 0 0 16px rgba(0,212,255,0.35)' }}
      style={{ ...panelBaseStyle, ...style }}
    >
      {/* 四角科技边角 */}
      <span className="dash-corner tl" />
      <span className="dash-corner tr" />
      <span className="dash-corner bl" />
      <span className="dash-corner br" />
      {/* 顶部流光扫描 */}
      <span className="dash-scan" />

      {/* 标题条 */}
      <div style={titleBarStyle}>
        <span
          style={{
            width: 4,
            height: 16,
            borderRadius: 2,
            background: COLORS.primary,
            boxShadow: `0 0 8px ${COLORS.primary}`,
          }}
        />
        <span style={titleTextStyle}>{title}</span>
        <span style={{ flex: 1 }} />
        <span style={{ display: 'flex', gap: 4 }}>
          <i style={{ width: 5, height: 5, borderRadius: '50%', background: COLORS.primary, display: 'inline-block', boxShadow: `0 0 6px ${COLORS.primary}` }} />
          <i style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(0,212,255,0.4)', display: 'inline-block' }} />
          <i style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(0,212,255,0.2)', display: 'inline-block' }} />
        </span>
      </div>

      {/* 图表 body —— min-height:0 是 flex 嵌套 ECharts 不塌陷的关键 */}
      <div style={{ flex: 1, minHeight: 0, position: 'relative', padding: 6 }}>
        {children}
      </div>
    </motion.div>
  )
}
```

- [ ] **Step 2: 类型检查**

Run:
```bash
cd mes/frontend && npx tsc --noEmit
```
Expected: PASS。验证 `motion` 的 `motion.div`、`whileHover` 类型正确。

- [ ] **Step 3: Commit**

```bash
cd mes/frontend && git add src/pages/digitization/dashboard/PanelFrame.tsx
git commit -m "✨ feat(dashboard): 通用面板外框（边角+流光+入场动效）"
```

---

## Task 6: DashboardHeader.tsx（顶部标题栏 + 实时时钟）

**Files:**
- Create: `mes/frontend/src/pages/digitization/dashboard/DashboardHeader.tsx`

- [ ] **Step 1: 创建 DashboardHeader.tsx**

Create `mes/frontend/src/pages/digitization/dashboard/DashboardHeader.tsx`:
```tsx
import { useEffect, useState, type CSSProperties } from 'react'
import { motion } from 'motion/react'
import { COLORS } from './theme'

function useClock(): string {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])
  const pad = (n: number) => String(n).padStart(2, '0')
  const w = ['日', '一', '二', '三', '四', '五', '六'][now.getDay()]
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} 周${w} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
}

const sideStyle: CSSProperties = {
  flex: 1,
  color: COLORS.textSub,
  fontSize: 'clamp(12px, 0.85vw, 15px)',
  display: 'flex',
  alignItems: 'center',
  gap: 6,
}

export default function DashboardHeader() {
  const clock = useClock()
  return (
    <motion.div
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '6px 24px',
        position: 'relative',
      }}
    >
      <div style={sideStyle}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS.green, boxShadow: `0 0 8px ${COLORS.green}` }} />
        系统运行中
      </div>

      <h1
        style={{
          margin: 0,
          flexShrink: 0,
          fontSize: 'clamp(20px, 1.8vw, 34px)',
          fontWeight: 700,
          letterSpacing: 4,
          color: '#eaf6ff',
          textShadow: '0 0 18px rgba(0,212,255,0.8), 0 0 4px rgba(0,212,255,0.9)',
          background: 'linear-gradient(180deg, #eaf6ff 0%, #5ad8ff 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        ◈ MES 生产指挥中心 ◈
      </h1>

      <div style={{ ...sideStyle, justifyContent: 'flex-end' }}>{clock}</div>

      {/* 底部装饰渐变线 */}
      <span
        style={{
          position: 'absolute',
          left: '10%',
          right: '10%',
          bottom: 0,
          height: 2,
          background: 'linear-gradient(90deg, transparent, #00d4ff, transparent)',
        }}
      />
    </motion.div>
  )
}
```

- [ ] **Step 2: 类型检查**

Run:
```bash
cd mes/frontend && npx tsc --noEmit
```
Expected: PASS。

- [ ] **Step 3: Commit**

```bash
cd mes/frontend && git add src/pages/digitization/dashboard/DashboardHeader.tsx
git commit -m "✨ feat(dashboard): 顶部标题栏与实时时钟"
```

---

## Task 7: KpiCard.tsx + KpiBar.tsx（KPI 数字卡排）

**Files:**
- Create: `mes/frontend/src/pages/digitization/dashboard/KpiCard.tsx`
- Create: `mes/frontend/src/pages/digitization/dashboard/KpiBar.tsx`

- [ ] **Step 1: 创建 KpiCard.tsx**

Create `mes/frontend/src/pages/digitization/dashboard/KpiCard.tsx`:
```tsx
import type { CSSProperties } from 'react'
import { motion } from 'motion/react'
import { COLORS } from './theme'
import { useCountUp } from './useCountUp'
import type { KpiDatum } from './mockData'

interface KpiCardProps {
  datum: KpiDatum
  index: number
}

const cardStyle: CSSProperties = {
  flex: 1,
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  gap: 4,
  padding: '10px 18px',
  background: 'linear-gradient(135deg, rgba(20,60,110,0.5), rgba(10,30,60,0.3))',
  border: `1px solid ${COLORS.panelBorder}`,
  borderRadius: 8,
  boxShadow: 'inset 0 0 16px rgba(30,144,255,0.15)',
  overflow: 'hidden',
}

export default function KpiCard({ datum, index }: KpiCardProps) {
  const display = useCountUp(datum.value, datum.decimals)
  const up = datum.trend === 'up'
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.12, ease: 'easeOut' }}
      whileHover={{ y: -4, boxShadow: 'inset 0 0 16px rgba(30,144,255,0.25), 0 0 14px rgba(0,212,255,0.3)' }}
      style={cardStyle}
    >
      {/* 左侧色条 */}
      <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: datum.color, boxShadow: `0 0 10px ${datum.color}` }} />

      <span style={{ color: COLORS.textSub, fontSize: 'clamp(11px, 0.8vw, 14px)', letterSpacing: 1 }}>
        {datum.label}
      </span>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span
          style={{
            fontSize: 'clamp(22px, 2vw, 40px)',
            fontWeight: 700,
            color: datum.color,
            textShadow: `0 0 14px ${datum.color}99`,
            fontVariantNumeric: 'tabular-nums',
            lineHeight: 1,
          }}
        >
          {datum.decimals > 0 ? display.toFixed(datum.decimals) : display.toLocaleString()}
        </span>
        <span style={{ color: COLORS.textSub, fontSize: 'clamp(11px, 0.8vw, 14px)' }}>{datum.unit}</span>
      </div>

      <span style={{ fontSize: 'clamp(10px, 0.75vw, 13px)', color: up ? COLORS.green : COLORS.red }}>
        {up ? '▲' : '▼'} {datum.delta} <span style={{ color: COLORS.textSub }}>同比</span>
      </span>
    </motion.div>
  )
}
```

- [ ] **Step 2: 创建 KpiBar.tsx**

Create `mes/frontend/src/pages/digitization/dashboard/KpiBar.tsx`:
```tsx
import KpiCard from './KpiCard'
import { kpis } from './mockData'

export default function KpiBar() {
  return (
    <div style={{ display: 'flex', gap: 14, padding: '4px 24px' }}>
      {kpis.map((k, i) => (
        <KpiCard key={k.key} datum={k} index={i} />
      ))}
    </div>
  )
}
```

- [ ] **Step 3: 类型检查**

Run:
```bash
cd mes/frontend && npx tsc --noEmit
```
Expected: PASS。

- [ ] **Step 4: Commit**

```bash
cd mes/frontend && git add src/pages/digitization/dashboard/KpiCard.tsx src/pages/digitization/dashboard/KpiBar.tsx
git commit -m "✨ feat(dashboard): KPI 数字卡排（数字滚动+发光）"
```

---

## Task 8: charts/TrendChart.tsx（年度趋势主图）

**Files:**
- Create: `mes/frontend/src/pages/digitization/dashboard/charts/TrendChart.tsx`

- [ ] **Step 1: 创建 TrendChart.tsx**

Create `mes/frontend/src/pages/digitization/dashboard/charts/TrendChart.tsx`:
```tsx
import ReactECharts from 'echarts-for-react'
import { COLORS, axisStyle, vGradient } from '../theme'
import { months, planData, orderData, completionRate } from '../mockData'

const option = {
  tooltip: { trigger: 'axis' as const },
  legend: {
    data: ['计划量', '订单量', '完成率(%)'],
    textStyle: { color: COLORS.textSub },
    top: 2,
  },
  grid: { left: 48, right: 48, bottom: 28, top: 38 },
  xAxis: { type: 'category', data: months, boundaryGap: true, ...axisStyle() },
  yAxis: [
    { type: 'value', name: '数量', nameTextStyle: { color: COLORS.textSub }, ...axisStyle() },
    { type: 'value', name: '%', max: 100, nameTextStyle: { color: COLORS.textSub }, ...axisStyle() },
  ],
  series: [
    {
      name: '计划量', type: 'line', data: planData, smooth: true,
      symbol: 'circle', symbolSize: 7,
      lineStyle: { color: COLORS.primary, width: 2.5, shadowColor: COLORS.primary, shadowBlur: 10 },
      itemStyle: { color: COLORS.primary, borderColor: '#fff', borderWidth: 1 },
      areaStyle: { color: vGradient('rgba(0,212,255,0.35)', 'rgba(0,212,255,0.02)') },
    },
    {
      name: '订单量', type: 'line', data: orderData, smooth: true,
      symbol: 'diamond', symbolSize: 7,
      lineStyle: { color: COLORS.cyan, width: 2.5, shadowColor: COLORS.cyan, shadowBlur: 8 },
      itemStyle: { color: COLORS.cyan },
    },
    {
      name: '完成率(%)', type: 'bar', yAxisIndex: 1, data: completionRate, barWidth: 9,
      itemStyle: { color: vGradient(COLORS.green, '#2b8a3e'), borderRadius: [4, 4, 0, 0] },
    },
  ],
}

export default function TrendChart() {
  return <ReactECharts option={option} style={{ width: '100%', height: '100%' }} opts={{ renderer: 'canvas' }} />
}
```

- [ ] **Step 2: 类型检查**

Run:
```bash
cd mes/frontend && npx tsc --noEmit
```
Expected: PASS。

- [ ] **Step 3: Commit**

```bash
cd mes/frontend && git add src/pages/digitization/dashboard/charts/TrendChart.tsx
git commit -m "✨ feat(dashboard): 年度趋势主图（发光折线+渐变面积）"
```

---

## Task 9: charts/FactoryBarChart.tsx（各工厂产量 + 轮播高亮）

**Files:**
- Create: `mes/frontend/src/pages/digitization/dashboard/charts/FactoryBarChart.tsx`

- [ ] **Step 1: 创建 FactoryBarChart.tsx**

用 `onChartReady` 捕获 echarts 实例，配合轮播高亮 hook 周期性 `highlight`。

Create `mes/frontend/src/pages/digitization/dashboard/charts/FactoryBarChart.tsx`:
```tsx
import { useEffect, useRef } from 'react'
import ReactECharts from 'echarts-for-react'
import type { ECharts } from 'echarts'
import { COLORS, axisStyle, vGradient } from '../theme'
import { factories, factoryOutput } from '../mockData'
import { useRotatingHighlight } from '../useRotatingHighlight'

const option = {
  tooltip: { trigger: 'axis' as const },
  grid: { left: 40, right: 16, bottom: 24, top: 16 },
  xAxis: { type: 'category', data: factories, ...axisStyle() },
  yAxis: { type: 'value', ...axisStyle() },
  series: [
    {
      type: 'bar',
      data: factoryOutput,
      barWidth: '45%',
      itemStyle: { color: vGradient(COLORS.primary, COLORS.primaryDeep), borderRadius: [6, 6, 0, 0] },
      emphasis: { itemStyle: { color: vGradient('#7fffd4', COLORS.primary), shadowColor: COLORS.primary, shadowBlur: 16 } },
    },
  ],
}

export default function FactoryBarChart() {
  const instRef = useRef<ECharts | null>(null)
  const active = useRotatingHighlight(factories.length)

  useEffect(() => {
    const inst = instRef.current
    if (!inst) return
    inst.dispatchAction({ type: 'downplay', seriesIndex: 0 })
    inst.dispatchAction({ type: 'highlight', seriesIndex: 0, dataIndex: active })
  }, [active])

  return (
    <ReactECharts
      option={option}
      style={{ width: '100%', height: '100%' }}
      onChartReady={(inst: ECharts) => { instRef.current = inst }}
    />
  )
}
```

- [ ] **Step 2: 类型检查**

Run:
```bash
cd mes/frontend && npx tsc --noEmit
```
Expected: PASS。验证 `import type { ECharts } from 'echarts'` 可解析（echarts v6 导出 ECharts 类型）。若不可解析，改为 `import type * as echarts from 'echarts'` 并用 `echarts.ECharts`。

- [ ] **Step 3: Commit**

```bash
cd mes/frontend && git add src/pages/digitization/dashboard/charts/FactoryBarChart.tsx
git commit -m "✨ feat(dashboard): 各工厂产量柱状图（轮播高亮）"
```

---

## Task 10: charts/WorkshopBarChart.tsx（各车间产量）

**Files:**
- Create: `mes/frontend/src/pages/digitization/dashboard/charts/WorkshopBarChart.tsx`

- [ ] **Step 1: 创建 WorkshopBarChart.tsx**

Create `mes/frontend/src/pages/digitization/dashboard/charts/WorkshopBarChart.tsx`:
```tsx
import ReactECharts from 'echarts-for-react'
import { COLORS, axisStyle, vGradient } from '../theme'
import { workshops, workshopOutput } from '../mockData'

const palette = [COLORS.purple, COLORS.cyan, COLORS.green, COLORS.orange, COLORS.primary, COLORS.red, '#845ef7', '#20c997']

const option = {
  tooltip: { trigger: 'axis' as const },
  grid: { left: 40, right: 16, bottom: 24, top: 16 },
  xAxis: { type: 'category', data: workshops, ...axisStyle() },
  yAxis: { type: 'value', ...axisStyle() },
  series: [
    {
      type: 'bar',
      barWidth: '50%',
      data: workshopOutput.map((v, i) => ({
        value: v,
        itemStyle: { color: vGradient(palette[i % palette.length], '#1c2a4a'), borderRadius: [4, 4, 0, 0] },
      })),
    },
  ],
}

export default function WorkshopBarChart() {
  return <ReactECharts option={option} style={{ width: '100%', height: '100%' }} />
}
```

- [ ] **Step 2: 类型检查**

Run:
```bash
cd mes/frontend && npx tsc --noEmit
```
Expected: PASS。

- [ ] **Step 3: Commit**

```bash
cd mes/frontend && git add src/pages/digitization/dashboard/charts/WorkshopBarChart.tsx
git commit -m "✨ feat(dashboard): 各车间产量柱状图（多彩渐变）"
```

---

## Task 11: charts/QualityAreaChart.tsx（良品率/不良率）

**Files:**
- Create: `mes/frontend/src/pages/digitization/dashboard/charts/QualityAreaChart.tsx`

- [ ] **Step 1: 创建 QualityAreaChart.tsx**

Create `mes/frontend/src/pages/digitization/dashboard/charts/QualityAreaChart.tsx`:
```tsx
import ReactECharts from 'echarts-for-react'
import { COLORS, axisStyle, vGradient } from '../theme'
import { months, yieldRate, defectRate } from '../mockData'

const option = {
  tooltip: { trigger: 'axis' as const },
  legend: { data: ['良品率(%)', '不良率(%)'], textStyle: { color: COLORS.textSub }, top: 2 },
  grid: { left: 44, right: 24, bottom: 24, top: 34 },
  xAxis: { type: 'category', data: months, ...axisStyle() },
  yAxis: { type: 'value', max: 100, ...axisStyle() },
  series: [
    {
      name: '良品率(%)', type: 'line', data: yieldRate, smooth: true,
      lineStyle: { color: COLORS.green, width: 2.5, shadowColor: COLORS.green, shadowBlur: 8 },
      itemStyle: { color: COLORS.green },
      areaStyle: { color: vGradient('rgba(81,207,102,0.4)', 'rgba(81,207,102,0.02)') },
    },
    {
      name: '不良率(%)', type: 'line', data: defectRate, smooth: true,
      lineStyle: { color: COLORS.red, width: 2.5, shadowColor: COLORS.red, shadowBlur: 8 },
      itemStyle: { color: COLORS.red },
      areaStyle: { color: vGradient('rgba(240,62,62,0.4)', 'rgba(240,62,62,0.02)') },
    },
  ],
}

export default function QualityAreaChart() {
  return <ReactECharts option={option} style={{ width: '100%', height: '100%' }} />
}
```

- [ ] **Step 2: 类型检查**

Run:
```bash
cd mes/frontend && npx tsc --noEmit
```
Expected: PASS。

- [ ] **Step 3: Commit**

```bash
cd mes/frontend && git add src/pages/digitization/dashboard/charts/QualityAreaChart.tsx
git commit -m "✨ feat(dashboard): 良品率/不良率面积趋势图"
```

---

## Task 12: charts/RegionDonutChart.tsx（地区对比 3 环形 + 轮播高亮）

**Files:**
- Create: `mes/frontend/src/pages/digitization/dashboard/charts/RegionDonutChart.tsx`

- [ ] **Step 1: 创建 RegionDonutChart.tsx**

三个环形横向并排，每个独立 ECharts 实例；统一一个轮播高亮驱动各环当前扇区。

Create `mes/frontend/src/pages/digitization/dashboard/charts/RegionDonutChart.tsx`:
```tsx
import { useEffect, useRef } from 'react'
import ReactECharts from 'echarts-for-react'
import type { ECharts } from 'echarts'
import { COLORS } from '../theme'
import { regionNorth, regionEast, regionSouth, type NameValue } from '../mockData'
import { useRotatingHighlight } from '../useRotatingHighlight'

function donutOption(title: string, data: NameValue[], colors: string[]) {
  return {
    tooltip: { trigger: 'item' as const, formatter: '{b}: {c} ({d}%)' },
    title: { text: title, left: 'center', bottom: 4, textStyle: { color: COLORS.textSub, fontSize: 12 } },
    series: [
      {
        type: 'pie',
        radius: ['42%', '66%'],
        center: ['50%', '46%'],
        avoidLabelOverlap: false,
        label: { show: true, color: COLORS.textSub, formatter: '{d}%', fontSize: 10 },
        labelLine: { length: 6, length2: 6, lineStyle: { color: COLORS.axis } },
        itemStyle: { borderColor: COLORS.bgSolid, borderWidth: 2 },
        emphasis: { itemStyle: { shadowBlur: 16, shadowColor: 'rgba(0,212,255,0.6)' }, scale: true, scaleSize: 6 },
        data,
        color: colors,
      },
    ],
  }
}

const charts = [
  { title: '华北', data: regionNorth, colors: ['#4a90d9', '#3bc9db', '#51cf66'] },
  { title: '华东', data: regionEast, colors: ['#f59f00', '#f76707', '#f03e3e'] },
  { title: '华南', data: regionSouth, colors: ['#9775fa', '#845ef7', '#20c997'] },
]

export default function RegionDonutChart() {
  const refs = useRef<(ECharts | null)[]>([])
  // 三个环形的扇区数一致（均为 3），用同一 hook 驱动
  const active = useRotatingHighlight(3)

  useEffect(() => {
    refs.current.forEach((inst) => {
      if (!inst) return
      inst.dispatchAction({ type: 'downplay', seriesIndex: 0 })
      inst.dispatchAction({ type: 'highlight', seriesIndex: 0, dataIndex: active })
    })
  }, [active])

  return (
    <div style={{ display: 'flex', width: '100%', height: '100%' }}>
      {charts.map((c, i) => (
        <div key={c.title} style={{ flex: 1, minWidth: 0, height: '100%' }}>
          <ReactECharts
            option={donutOption(c.title, c.data, c.colors)}
            style={{ width: '100%', height: '100%' }}
            onChartReady={(inst: ECharts) => { refs.current[i] = inst }}
          />
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: 类型检查**

Run:
```bash
cd mes/frontend && npx tsc --noEmit
```
Expected: PASS。验证 `import { type NameValue }` 从 mockData 正确导入。

- [ ] **Step 3: Commit**

```bash
cd mes/frontend && git add src/pages/digitization/dashboard/charts/RegionDonutChart.tsx
git commit -m "✨ feat(dashboard): 地区对比三环形图（轮播高亮）"
```

---

## Task 13: charts/GaugePanel.tsx（设备仪表盘 4 gauge）

**Files:**
- Create: `mes/frontend/src/pages/digitization/dashboard/charts/GaugePanel.tsx`

- [ ] **Step 1: 创建 GaugePanel.tsx**

Create `mes/frontend/src/pages/digitization/dashboard/charts/GaugePanel.tsx`:
```tsx
import ReactECharts from 'echarts-for-react'
import { COLORS } from '../theme'
import { gauges } from '../mockData'

// 4 个仪表横向分布，圆心 x: 12.5% / 37.5% / 62.5% / 87.5%
const centers = ['12.5%', '37.5%', '62.5%', '87.5%']

const option = {
  series: gauges.map((g, i) => ({
    type: 'gauge',
    center: [centers[i], '52%'],
    radius: '72%',
    startAngle: 210,
    endAngle: -30,
    min: 0,
    max: g.max,
    progress: { show: true, width: 9, itemStyle: { color: g.color, shadowColor: g.color, shadowBlur: 10 } },
    axisLine: { lineStyle: { width: 9, color: [[0.6, 'rgba(45,74,110,0.6)'], [0.85, 'rgba(45,74,110,0.8)'], [1, 'rgba(45,74,110,1)']] } },
    axisTick: { show: false },
    splitLine: { show: false },
    axisLabel: { show: false },
    pointer: { width: 4, itemStyle: { color: g.color } },
    anchor: { show: true, size: 8, itemStyle: { color: g.color } },
    detail: { valueAnimation: true, fontSize: 15, color: g.color, offsetCenter: [0, '58%'], formatter: '{value}' },
    title: { offsetCenter: [0, '82%'], fontSize: 12, color: COLORS.textSub },
    data: [{ value: g.value, name: g.name }],
  })),
}

export default function GaugePanel() {
  return <ReactECharts option={option} style={{ width: '100%', height: '100%' }} />
}
```

- [ ] **Step 2: 类型检查**

Run:
```bash
cd mes/frontend && npx tsc --noEmit
```
Expected: PASS。

- [ ] **Step 3: Commit**

```bash
cd mes/frontend && git add src/pages/digitization/dashboard/charts/GaugePanel.tsx
git commit -m "✨ feat(dashboard): 设备仪表盘（分段轨道+指针发光）"
```

---

## Task 14: PlanDashboard.tsx 主容器（CSS Grid 三列编排）

**Files:**
- Modify (整体改写): `mes/frontend/src/pages/digitization/PlanDashboard.tsx`

- [ ] **Step 1: 整体改写 PlanDashboard.tsx**

替换全部内容。背景层（网格+粒子）+ 三行 Grid（标题/KPI/三列）。负边距 `-24` 抵消 Content padding 实现出血。

Replace entire content of `mes/frontend/src/pages/digitization/PlanDashboard.tsx`:
```tsx
import './dashboard/dashboard.css'
import { COLORS } from './dashboard/theme'
import DashboardHeader from './dashboard/DashboardHeader'
import KpiBar from './dashboard/KpiBar'
import PanelFrame from './dashboard/PanelFrame'
import TrendChart from './dashboard/charts/TrendChart'
import FactoryBarChart from './dashboard/charts/FactoryBarChart'
import WorkshopBarChart from './dashboard/charts/WorkshopBarChart'
import QualityAreaChart from './dashboard/charts/QualityAreaChart'
import RegionDonutChart from './dashboard/charts/RegionDonutChart'
import GaugePanel from './dashboard/charts/GaugePanel'

// 漂浮粒子（固定 8 个，避免 Math.random 影响 SSR/可复现；用静态分布）
const PARTICLES = [
  { left: '8%', delay: '0s', dur: '13s' },
  { left: '21%', delay: '3s', dur: '16s' },
  { left: '35%', delay: '6s', dur: '12s' },
  { left: '48%', delay: '1.5s', dur: '15s' },
  { left: '62%', delay: '4.5s', dur: '14s' },
  { left: '75%', delay: '2s', dur: '17s' },
  { left: '86%', delay: '7s', dur: '13s' },
  { left: '94%', delay: '5s', dur: '15s' },
]

const colStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  minHeight: 0,
}

export default function PlanDashboard() {
  return (
    <div
      style={{
        // 负边距抵消 AdminLayout Content 的 padding:24，实现满屏出血
        margin: -24,
        width: 'calc(100% + 48px)',
        height: 'calc(100% + 48px)',
        background: COLORS.bgGradient,
        position: 'relative',
        overflow: 'hidden',
        display: 'grid',
        gridTemplateRows: 'auto auto 1fr',
        gap: 10,
        padding: 14,
      }}
    >
      {/* 背景层：网格 + 粒子 */}
      <div className="dash-grid-bg" />
      {PARTICLES.map((p, i) => (
        <span
          key={i}
          className="dash-particle"
          style={{ left: p.left, bottom: 0, animationDelay: p.delay, animationDuration: p.dur }}
        />
      ))}

      {/* 第1行：标题栏 */}
      <DashboardHeader />

      {/* 第2行：KPI 卡排 */}
      <KpiBar />

      {/* 第3行：三列 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1.4fr 1fr',
          gap: 12,
          minHeight: 0,
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* 左列 */}
        <div style={colStyle}>
          <PanelFrame title="各工厂产量" delay={0.1} style={{ flex: 1 }}>
            <FactoryBarChart />
          </PanelFrame>
          <PanelFrame title="各车间产量" delay={0.2} style={{ flex: 1 }}>
            <WorkshopBarChart />
          </PanelFrame>
        </div>

        {/* 中列 */}
        <div style={colStyle}>
          <PanelFrame title="年度计划与工单趋势" delay={0.15} style={{ flex: 1.5 }}>
            <TrendChart />
          </PanelFrame>
          <PanelFrame title="良品率与不良率趋势" delay={0.25} style={{ flex: 1 }}>
            <QualityAreaChart />
          </PanelFrame>
        </div>

        {/* 右列 */}
        <div style={colStyle}>
          <PanelFrame title="地区产量对比" delay={0.2} style={{ flex: 1 }}>
            <RegionDonutChart />
          </PanelFrame>
          <PanelFrame title="设备仪表盘" delay={0.3} style={{ flex: 1 }}>
            <GaugePanel />
          </PanelFrame>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 类型检查**

Run:
```bash
cd mes/frontend && npx tsc --noEmit
```
Expected: PASS（全部组件 import 解析正确、无类型错误）。

- [ ] **Step 3: Commit**

```bash
cd mes/frontend && git add src/pages/digitization/PlanDashboard.tsx
git commit -m "✨ feat(dashboard): 重构主容器为满屏三列指挥中心布局"
```

---

## Task 15: 最终验证（lint + build + dev server）

**Files:** 无（仅验证）

- [ ] **Step 1: Lint**

Run:
```bash
cd mes/frontend && npm run lint
```
Expected: 无 error（warning 可接受）。若 `react-hooks/exhaustive-deps` 或 `no-explicit-any` 报错，按提示修正对应文件后重跑直到通过。

- [ ] **Step 2: 类型检查（最终）**

Run:
```bash
cd mes/frontend && npx tsc --noEmit
```
Expected: PASS。

- [ ] **Step 3: 生产构建**

Run:
```bash
cd mes/frontend && npm run build
```
Expected: `vite build` 成功，输出 `dist/`，无 error。贴出最后的 `✓ built in ...` 行作为证据。

- [ ] **Step 4: 启动 dev server 并验证 HTTP 200**

Run（后台启动 + 探测）:
```bash
cd mes/frontend && (npm run dev > /tmp/dash-dev.log 2>&1 &) && sleep 6 && curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/
```
Expected: 输出 `200`。若非 200，`cat /tmp/dash-dev.log` 查看 Vite 报错并修复。

- [ ] **Step 5: 用户浏览器视觉确认**

提示用户：开发服务器运行在 `http://localhost:3000`，登录后进入「数字化 → 工单计划看板」路由（`/digitization/plan`），确认：
- 满屏铺满、不滚动、无白边溢出
- 科技蓝配色、面板边角/流光/粒子动效正常
- 4 个 KPI 数字滚动增长
- 6 个图表正常渲染、轮播高亮生效
- 缩放浏览器窗口时布局自适应、图表跟随 resize

- [ ] **Step 6: 关闭 dev server（验证完成后）**

Run:
```bash
pkill -f "vite" || true
```

- [ ] **Step 7: 最终提示用户提交**

提示用户：所有任务完成，建议 `git status` 检查后已分任务提交完毕；如需可创建 PR 或合并。

---

## Self-Review（计划自检结果）

**1. Spec 覆盖核对：**
- spec §4 文件结构 → Task 1-14 逐一创建，文件路径完全一致 ✓
- spec §5 布局与自适应（Grid 三行、三列 1fr/1.4fr/1fr、min-height:0、clamp、负边距出血）→ Task 14 + PanelFrame body ✓
- spec §6 视觉（色板、SVG 边角、标题条、流光、网格、粒子、KPI）→ theme.ts + dashboard.css + PanelFrame + KpiCard + Task14 背景层 ✓
- spec §7 动效（数字滚动/入场/hover/轮播高亮/实时时钟/图表内部/流光/网格粒子）→ useCountUp、motion initial/animate/whileHover、useRotatingHighlight、DashboardHeader 时钟、ECharts 自带、CSS ✓
  - 注：spec §7 列了"实时刷新跳动（KPI 抖动）"。本计划 useCountUp 已支持目标变化时从当前值平滑滚动（适配抖动），但未加定时抖动 setInterval。**这是有意的 YAGNI 收敛**——首版聚焦稳定炫酷，避免数字不停跳动干扰阅读；如需可在 KpiBar 加一个 setInterval 包一层 state 即可，不影响架构。已在此显式记录，非遗漏。
- spec §8 数据/错误/测试 → mockData.ts；min-height:0 防塌陷；hook cleanup 销毁定时器/animate；tsc/lint/build/curl 验证 ✓
- spec §9 不做什么 → 未碰后端、未碰 Simulation3D、未引入 datav、未建测试框架 ✓

**2. Placeholder 扫描：** 无 TBD/TODO/"类似上文"；每个代码步骤均为完整可运行代码 ✓

**3. 类型一致性核对：**
- `useCountUp(target, decimals?, duration?)` 定义（Task 3）与调用 `useCountUp(datum.value, datum.decimals)`（Task 7）一致 ✓
- `useRotatingHighlight(count, intervalMs?)` 定义（Task 4）与调用（Task 9/12）一致 ✓
- `PanelFrame` props `{title, children, delay?, style?}`（Task 5）与 Task 14 用法一致 ✓
- `KpiDatum`/`NameValue`/`GaugeDatum` 类型（Task 2）与各消费组件一致 ✓
- `COLORS`/`axisStyle`/`vGradient`/`panelBaseStyle` 导出（Task 1）与各 import 一致 ✓
- ECharts 实例类型统一用 `import type { ECharts } from 'echarts'` + `onChartReady`（Task 9/12），Task 9 备注了 fallback 写法 ✓

无遗留问题。
