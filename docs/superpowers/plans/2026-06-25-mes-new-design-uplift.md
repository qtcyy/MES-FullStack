# mes-new 吸收 Vue3 优雅设计 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 Vue3 前端"优雅而不浮夸"的设计语言（科技蓝品牌色 + 统一动画令牌 + 入场/微交互动画 + 玻璃拟态登录页）移植到 React 活跃前端 `mes-new`，确立可复用的设计基元与一个列表页样板。

**Architecture:** 品牌色与设计令牌写在应用本地 `mes-new/src/styles.css`（在 `@workspace/ui/globals.css` 之后导入，CSS 级联覆盖，不动共享包令牌）。动画用 `motion`（framer-motion）库，封装 4 个内置 reduced-motion 降级的基元组件。共享 `@workspace/ui` 仅改 `button.tsx`（加品牌渐变变体 + 按压反馈）；表格行 hover 与表单聚焦光晕由既有 primitive + 令牌覆盖"免费"获得。

**Tech Stack:** React 19 · Tailwind v4 · shadcn/Radix (`@workspace/ui`) · react-hook-form/zod · motion ^12 · vitest（node 环境，仅 `*.test.ts` 纯逻辑测试）

---

## 关键约束与背景（实现者必读）

1. **测试基建**：`mes/frontend/apps/mes-new/vitest.config.ts` = `environment: 'node'`、`include: ['src/**/*.test.ts']`。**只能跑纯逻辑 `.ts` 测试，不能渲染 React 组件**（无 jsdom、不收 `.tsx`）。因此本计划只对 `pointerFraction` 纯函数做 TDD 单测；动画组件靠 `check-types` + `build` + 手动观感验证把关（不为加渲染测试而扩测试基建，YAGNI）。
2. **样式导入链**：`mes-new/src/main.tsx` → `import './styles.css'`；`styles.css:1` → `@import "@workspace/ui/globals.css"`。所以本地令牌覆盖写在 `styles.css` 的 `@import` 之后即可生效。
3. **不要重开 React.StrictMode**（`main.tsx` 已注释说明：R3F/WebGL 大屏会因 StrictMode 双挂载丢上下文白屏）。
4. **不要碰 `apps/mes1`**（已弃用）。
5. **运行目录**：所有 pnpm 命令在 `mes/frontend`（workspace 根）下执行，用 `--filter mes-new`。dev server 跑在 `:4100`。
6. **motion 导入路径**：`import { motion, useReducedMotion, AnimatePresence } from 'motion/react'`（`motion` v12 的 React 入口是 `motion/react`，不是 `framer-motion`）。

### 验证命令速查

```bash
cd mes/frontend
pnpm --filter mes-new check-types      # tsc --noEmit
pnpm --filter mes-new lint             # eslint .
pnpm --filter mes-new test             # vitest run
pnpm --filter mes-new exec vitest run src/hooks/usePointerParallax.test.ts   # 单测单文件
pnpm --filter mes-new build            # tsc -b && vite build
pnpm --filter mes-new dev              # 手验,:4100
```

---

## 文件结构（决定分解边界）

**新增（mes-new）**
- `src/lib/motion.ts` — JS 动画令牌（EASE/DUR）与共享 variants
- `src/hooks/usePointerParallax.ts` — 纯函数 `pointerFraction` + React hook
- `src/hooks/usePointerParallax.test.ts` — `pointerFraction` 单测
- `src/components/motion/Reveal.tsx`
- `src/components/motion/Stagger.tsx`（含 `Stagger` + `StaggerItem`）
- `src/components/motion/PageTransition.tsx`

**修改（mes-new）**
- `src/styles.css` — 令牌覆盖 + 工具类 + keyframes + reduced-motion
- `package.json` — 加 `motion` 依赖
- `src/layouts/AdminLayout.tsx` — PageTransition 包裹 Outlet
- `src/layouts/components/AppSidebar.tsx` / `AppHeader.tsx` / `AppTabs.tsx`
- `src/pages/login/LoginPage.tsx`
- `src/pages/welcome/WelcomePage.tsx`

**修改（共享包，最小增量）**
- `packages/ui/src/components/button.tsx` — `brand` 变体 + `active:scale`

> 说明（相对 spec 的精简）：spec §3.2 原列出 input/card/data-table 也要改。落地发现：① `packages/ui/src/components/table.tsx` 的 `TableRow` 已含 `transition-colors hover:bg-muted/50`（行 hover 已有）；② Input 的 `focus-visible:ring-ring/50` 在 `--ring` 被覆盖为品牌色后自动变品牌光晕。故二者无需改动，Card 抬升用调用处 className 实现。共享包仅改 `button.tsx`。

---

## Task 1: 加入 motion 依赖 + JS 动画令牌

**Files:**
- Modify: `mes/frontend/apps/mes-new/package.json`（加依赖）
- Create: `mes/frontend/apps/mes-new/src/lib/motion.ts`

- [ ] **Step 1: 安装 motion**

Run:
```bash
cd mes/frontend && pnpm --filter mes-new add motion@^12
```
Expected: `package.json` 的 dependencies 出现 `"motion": "^12...."`，安装成功无报错。

- [ ] **Step 2: 创建 JS 动画令牌**

Create `mes/frontend/apps/mes-new/src/lib/motion.ts`:
```ts
import type { Variants } from 'motion/react'

/** 与 styles.css 的 --ease-* 对齐的缓动（cubic-bezier 控制点） */
export const EASE = {
  standard: [0.4, 0, 0.2, 1] as [number, number, number, number],
  out: [0, 0, 0.2, 1] as [number, number, number, number],
  spring: [0.16, 1, 0.3, 1] as [number, number, number, number],
}

/** 与 --dur-* 对齐的时长（秒，framer-motion 用秒） */
export const DUR = { fast: 0.16, base: 0.24, slow: 0.36 }

/** 单元素入场：淡入 + 上移 */
export const revealVariants: Variants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: DUR.base, ease: EASE.out } },
}

/** 容器：梯级编排子项 */
export const staggerContainer: Variants = {
  initial: {},
  animate: { transition: { staggerChildren: 0.06 } },
}

/** 配合 staggerContainer 的子项 */
export const staggerItem: Variants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: DUR.base, ease: EASE.out } },
}
```

- [ ] **Step 3: 类型检查**

Run: `cd mes/frontend && pnpm --filter mes-new check-types`
Expected: PASS（无类型错误）。

- [ ] **Step 4: 提交**

```bash
cd mes/frontend/apps/mes-new && git add package.json src/lib/motion.ts ../../pnpm-lock.yaml 2>/dev/null; cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack && git add mes/frontend/apps/mes-new/package.json mes/frontend/apps/mes-new/src/lib/motion.ts mes/frontend/pnpm-lock.yaml && git commit -m "➕ chore(mes-new): 引入 motion 依赖 + JS 动画令牌(EASE/DUR/variants)"
```

---

## Task 2: 设计令牌 CSS 层

**Files:**
- Modify: `mes/frontend/apps/mes-new/src/styles.css`

- [ ] **Step 1: 写入令牌覆盖 + 工具类 + keyframes**

Replace the **entire** content of `mes/frontend/apps/mes-new/src/styles.css` with:
```css
@import "@workspace/ui/globals.css";

html,
body,
#root {
  height: 100%;
}

/* ===== Vue3 科技蓝设计令牌（本地覆盖，在 globals.css 之后生效）===== */
:root {
  /* 品牌色：科技蓝 → 青霓虹 */
  --primary: #2f7cff;
  --ring: #2f7cff;
  --sidebar-primary: #2f7cff;
  --sidebar-ring: #2f7cff;
  --brand-from: #2f7cff;
  --brand-to: #36e0ff;
  --brand-gradient: linear-gradient(90deg, var(--brand-from), var(--brand-to));
  /* 缓动 */
  --ease-standard: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-out: cubic-bezier(0, 0, 0.2, 1);
  --ease-spring: cubic-bezier(0.16, 1, 0.3, 1);
  /* 时长 */
  --dur-fast: 160ms;
  --dur: 240ms;
  --dur-slow: 360ms;
  /* 阴影 */
  --shadow-card: 0 2px 12px rgba(15, 23, 42, 0.06);
  --shadow-pop: 0 12px 32px rgba(15, 23, 42, 0.12);
  --shadow-brand: 0 12px 30px rgba(47, 124, 255, 0.28);
}

.dark {
  /* 深色大屏延续青霓虹 */
  --primary: #36e0ff;
  --ring: #36e0ff;
  --sidebar-primary: #36e0ff;
  --sidebar-ring: #36e0ff;
  --shadow-card: 0 2px 12px rgba(0, 0, 0, 0.35);
  --shadow-pop: 0 12px 32px rgba(0, 0, 0, 0.5);
  --shadow-brand: 0 14px 34px rgba(54, 224, 255, 0.30);
}

@layer utilities {
  .bg-brand-gradient {
    background-image: var(--brand-gradient);
  }
  .text-brand {
    color: var(--brand-from);
  }
  /* 玻璃拟态卡 */
  .glass {
    background: rgba(255, 255, 255, 0.08);
    -webkit-backdrop-filter: blur(20px) saturate(120%);
    backdrop-filter: blur(20px) saturate(120%);
    border: 1px solid rgba(255, 255, 255, 0.18);
    box-shadow: 0 30px 70px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.3);
  }

  /* 登录页背景动画 */
  @keyframes drift {
    0%, 100% { transform: translate(0, 0); }
    50% { transform: translate(-22px, 16px); }
  }
  @keyframes float {
    0%, 100% { transform: translateY(0); opacity: 0.7; }
    50% { transform: translateY(-12px); opacity: 1; }
  }
  @keyframes sweep {
    0% { transform: translateX(-180%) skewX(-12deg); }
    55%, 100% { transform: translateX(320%) skewX(-12deg); }
  }
}

/* 无障碍：尊重系统"减少动态效果"偏好 */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.001ms !important;
  }
}
```

- [ ] **Step 2: 构建验证 CSS 编译通过**

Run: `cd mes/frontend && pnpm --filter mes-new build`
Expected: 构建成功（Tailwind/PostCSS 无报错；产物含 CSS）。

- [ ] **Step 3: 手验主色已变科技蓝**

Run: `cd mes/frontend && pnpm --filter mes-new dev`，浏览器开 `http://localhost:4100`，确认主按钮、聚焦环已变为 `#2f7cff` 系（深色主题为 `#36e0ff`）。Ctrl-C 退出。

- [ ] **Step 4: 提交**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack && git add mes/frontend/apps/mes-new/src/styles.css && git commit -m "💄 style(mes-new): 科技蓝品牌令牌 + 缓动/时长/阴影/玻璃工具类 + reduced-motion 降级"
```

---

## Task 3: `pointerFraction` 纯函数 + `usePointerParallax` hook（TDD）

**Files:**
- Create: `mes/frontend/apps/mes-new/src/hooks/usePointerParallax.ts`
- Test: `mes/frontend/apps/mes-new/src/hooks/usePointerParallax.test.ts`

- [ ] **Step 1: 写失败的测试**

Create `mes/frontend/apps/mes-new/src/hooks/usePointerParallax.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { pointerFraction } from './usePointerParallax'

const rect = { left: 0, top: 0, width: 200, height: 100 } as DOMRect

describe('pointerFraction', () => {
  it('中心点返回 (0, 0)', () => {
    const { fx, fy } = pointerFraction(100, 50, rect)
    expect(fx).toBeCloseTo(0)
    expect(fy).toBeCloseTo(0)
  })

  it('右下角返回 (0.5, 0.5)', () => {
    const { fx, fy } = pointerFraction(200, 100, rect)
    expect(fx).toBeCloseTo(0.5)
    expect(fy).toBeCloseTo(0.5)
  })

  it('左上角返回 (-0.5, -0.5)', () => {
    const { fx, fy } = pointerFraction(0, 0, rect)
    expect(fx).toBeCloseTo(-0.5)
    expect(fy).toBeCloseTo(-0.5)
  })

  it('超出边界时裁剪到 [-0.5, 0.5]', () => {
    const { fx, fy } = pointerFraction(400, -100, rect)
    expect(fx).toBeCloseTo(0.5)
    expect(fy).toBeCloseTo(-0.5)
  })

  it('width 为 0 时不返回 NaN', () => {
    const zero = { left: 0, top: 0, width: 0, height: 0 } as DOMRect
    const { fx, fy } = pointerFraction(10, 10, zero)
    expect(Number.isNaN(fx)).toBe(false)
    expect(Number.isNaN(fy)).toBe(false)
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd mes/frontend && pnpm --filter mes-new exec vitest run src/hooks/usePointerParallax.test.ts`
Expected: FAIL（`Failed to resolve import './usePointerParallax'` 或 `pointerFraction is not a function`）。

- [ ] **Step 3: 实现 hook + 纯函数**

Create `mes/frontend/apps/mes-new/src/hooks/usePointerParallax.ts`:
```ts
import { useEffect, useRef, useState } from 'react'

export interface Fraction { fx: number; fy: number }

/** 把指针坐标归一化为相对元素中心的比例 [-0.5, 0.5]（纯函数，便于单测） */
export function pointerFraction(clientX: number, clientY: number, rect: DOMRect): Fraction {
  const clamp = (n: number) => Math.max(-0.5, Math.min(0.5, n))
  const fx = rect.width ? clamp((clientX - rect.left) / rect.width - 0.5) : 0
  const fy = rect.height ? clamp((clientY - rect.top) / rect.height - 0.5) : 0
  return { fx, fy }
}

/** 是否禁用视差：尊重 reduced-motion 偏好 + 触屏设备 */
function parallaxDisabled(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return true
  return (
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
    window.matchMedia('(pointer: coarse)').matches
  )
}

/**
 * 鼠标视差 hook：返回 ref 与归一化的 fx/fy（调用方自行放大倍数）。
 * 用 requestAnimationFrame 节流，禁用条件下恒为 0。
 */
export function usePointerParallax<T extends HTMLElement>() {
  const ref = useRef<T | null>(null)
  const [frac, setFrac] = useState<Fraction>({ fx: 0, fy: 0 })

  useEffect(() => {
    const el = ref.current
    if (!el || parallaxDisabled()) return
    let raf = 0
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        setFrac(pointerFraction(e.clientX, e.clientY, el.getBoundingClientRect()))
      })
    }
    window.addEventListener('pointermove', onMove)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onMove)
    }
  }, [])

  return { ref, ...frac }
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd mes/frontend && pnpm --filter mes-new exec vitest run src/hooks/usePointerParallax.test.ts`
Expected: PASS（5 个用例全过）。

- [ ] **Step 5: 提交**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack && git add mes/frontend/apps/mes-new/src/hooks/usePointerParallax.ts mes/frontend/apps/mes-new/src/hooks/usePointerParallax.test.ts && git commit -m "✨ feat(mes-new): 鼠标视差 hook usePointerParallax + pointerFraction 单测"
```

---

## Task 4: 动画基元组件

**Files:**
- Create: `mes/frontend/apps/mes-new/src/components/motion/Reveal.tsx`
- Create: `mes/frontend/apps/mes-new/src/components/motion/Stagger.tsx`
- Create: `mes/frontend/apps/mes-new/src/components/motion/PageTransition.tsx`

- [ ] **Step 1: Reveal（单元素入场）**

Create `mes/frontend/apps/mes-new/src/components/motion/Reveal.tsx`:
```tsx
import type { ReactNode } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { DUR, EASE } from '@/lib/motion'

interface RevealProps {
  children: ReactNode
  className?: string
  delay?: number
}

/** 淡入 + 上移的单元素入场；reduced-motion 下渲染静态内容 */
export default function Reveal({ children, className, delay = 0 }: RevealProps) {
  const reduce = useReducedMotion()
  if (reduce) return <div className={className}>{children}</div>
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DUR.base, ease: EASE.out, delay }}
    >
      {children}
    </motion.div>
  )
}
```

- [ ] **Step 2: Stagger + StaggerItem（容器梯级入场）**

Create `mes/frontend/apps/mes-new/src/components/motion/Stagger.tsx`:
```tsx
import type { ReactNode } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { staggerContainer, staggerItem } from '@/lib/motion'

interface StaggerProps {
  children: ReactNode
  className?: string
}

/** 容器：子项按 staggerChildren 梯级入场 */
export function Stagger({ children, className }: StaggerProps) {
  const reduce = useReducedMotion()
  if (reduce) return <div className={className}>{children}</div>
  return (
    <motion.div
      className={className}
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      {children}
    </motion.div>
  )
}

/** 子项：须作为 Stagger 的直接子节点 */
export function StaggerItem({ children, className }: StaggerProps) {
  const reduce = useReducedMotion()
  if (reduce) return <div className={className}>{children}</div>
  return (
    <motion.div className={className} variants={staggerItem}>
      {children}
    </motion.div>
  )
}
```

- [ ] **Step 3: PageTransition（路由级入场，enter-only 避免 stale-outlet）**

Create `mes/frontend/apps/mes-new/src/components/motion/PageTransition.tsx`:
```tsx
import type { ReactNode } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { DUR, EASE } from '@/lib/motion'

interface PageTransitionProps {
  /** 路由 key（通常 location.pathname）；变化时重挂载并重放入场 */
  routeKey: string
  children: ReactNode
}

/**
 * 路由切换时的 fade-slide 入场动画。
 * 用 key 触发重挂载实现 enter-only（不用 AnimatePresence exit，规避 Outlet
 * 在退出/进入间显示同一内容的 stale 问题）。
 */
export default function PageTransition({ routeKey, children }: PageTransitionProps) {
  const reduce = useReducedMotion()
  if (reduce) return <div className="h-full">{children}</div>
  return (
    <motion.div
      key={routeKey}
      className="h-full"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DUR.base, ease: EASE.out }}
    >
      {children}
    </motion.div>
  )
}
```

- [ ] **Step 4: 类型检查**

Run: `cd mes/frontend && pnpm --filter mes-new check-types`
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack && git add mes/frontend/apps/mes-new/src/components/motion && git commit -m "✨ feat(mes-new): 动画基元 Reveal/Stagger/PageTransition(内置 reduced-motion 降级)"
```

---

## Task 5: 共享 Button — 品牌渐变变体 + 按压反馈

**Files:**
- Modify: `mes/frontend/packages/ui/src/components/button.tsx`

- [ ] **Step 1: 加 `brand` 变体 + `active:scale`**

In `mes/frontend/packages/ui/src/components/button.tsx`，把 `cva(...)` 第一个参数（base class 字符串，第 8 行）末尾的 `[&_svg:not([class*='size-'])]:size-4` 之后追加 ` active:scale-[0.98]`，使其变为：
```ts
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 active:scale-[0.98]",
```

然后在 `variants.variant` 对象里（`link` 之后）新增 `brand` 变体：
```ts
        link: "text-primary underline-offset-4 hover:underline",
        brand:
          "bg-brand-gradient text-white shadow-[var(--shadow-brand)] hover:brightness-105 [background-size:160%_100%] [background-position:0%_0%] hover:[background-position:100%_0%] transition-[background-position,filter,transform] duration-300",
```

- [ ] **Step 2: 类型检查 + 构建**

Run: `cd mes/frontend && pnpm --filter mes-new check-types && pnpm --filter mes-new build`
Expected: PASS（`variant="brand"` 可用，构建通过）。

- [ ] **Step 3: 提交**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack && git add mes/frontend/packages/ui/src/components/button.tsx && git commit -m "💄 style(ui): Button 新增 brand 渐变变体 + active 按压反馈"
```

---

## Task 6: 布局外壳改造

**Files:**
- Modify: `mes/frontend/apps/mes-new/src/layouts/AdminLayout.tsx`
- Modify: `mes/frontend/apps/mes-new/src/layouts/components/AppSidebar.tsx`
- Modify: `mes/frontend/apps/mes-new/src/layouts/components/AppHeader.tsx`
- Modify: `mes/frontend/apps/mes-new/src/layouts/components/AppTabs.tsx`

- [ ] **Step 1: AdminLayout 用 PageTransition 包裹 Outlet**

In `mes/frontend/apps/mes-new/src/layouts/AdminLayout.tsx`：
1. 顶部加导入：`import PageTransition from '@/components/motion/PageTransition'`
2. 把 `<main>` 内容替换：
```tsx
        <main className="flex-1 overflow-auto p-4">
          <PageTransition routeKey={location.pathname}>
            <Outlet />
          </PageTransition>
        </main>
```
（`location` 已在该组件内通过 `useLocation()` 定义，无需新增。）

- [ ] **Step 2: AppSidebar 激活态品牌条 + 平滑过渡 + 渐变 logo**

In `mes/frontend/apps/mes-new/src/layouts/components/AppSidebar.tsx`：

替换 `NavItem` 的 `className` 函数为（加左侧品牌条 `border-l-2` + 过渡缓动）：
```tsx
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-md border-l-2 border-transparent px-3 py-2 text-sm transition-[background-color,color,border-color] duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]',
          'text-sidebar-foreground/85 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground',
          isActive && 'border-l-primary bg-sidebar-accent font-medium text-sidebar-accent-foreground',
          collapsed && 'justify-center border-l-0 px-0',
        )
      }
```

替换 `<aside>` 的 className（宽度过渡显式缓动）：
```tsx
      className={cn(
        'flex h-screen shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]',
        collapsed ? 'w-16' : 'w-60',
      )}
```

替换顶部 logo 图标芯片（用品牌渐变）：把
```tsx
        <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
```
改为
```tsx
        <span className="flex size-7 items-center justify-center rounded-md bg-brand-gradient text-white shadow-[var(--shadow-brand)]">
```

- [ ] **Step 3: AppHeader 图标按钮 hover 反馈**

In `mes/frontend/apps/mes-new/src/layouts/components/AppHeader.tsx`，给折叠按钮和通知按钮加 hover 背景（`variant="ghost"` 已有 hover:bg-accent，这里补轻微缩放）。把两处 `<Button variant="ghost" size="icon-sm" ...>` 分别加 `className="transition-transform hover:scale-105"`：
```tsx
      <Button variant="ghost" size="icon-sm" onClick={toggleCollapsed} aria-label="折叠侧栏" className="transition-transform hover:scale-105">
        <PanelLeft className="size-4" />
      </Button>
```
```tsx
      <Button variant="ghost" size="icon-sm" aria-label="通知" className="transition-transform hover:scale-105">
        <Bell className="size-4" />
      </Button>
```

- [ ] **Step 4: AppTabs 滑动激活药丸（framer-motion layoutId）**

Replace the **entire** content of `mes/frontend/apps/mes-new/src/layouts/components/AppTabs.tsx` with:
```tsx
import { useNavigate, useLocation } from 'react-router-dom'
import { X } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { cn } from '@workspace/ui'
import { useAppStore } from '@/stores/appStore'

export default function AppTabs() {
  const tabs = useAppStore((s) => s.tabs)
  const removeTab = useAppStore((s) => s.removeTab)
  const navigate = useNavigate()
  const location = useLocation()
  const reduce = useReducedMotion()

  const onClose = (e: React.MouseEvent, key: string) => {
    e.stopPropagation()
    removeTab(key)
    const next = useAppStore.getState().activeKey
    if (next !== location.pathname) navigate(next)
  }

  return (
    <div className="flex h-10 shrink-0 items-center gap-1 overflow-x-auto border-b border-border bg-background px-3">
      {tabs.map((tab) => {
        const active = tab.path === location.pathname
        return (
          <div
            key={tab.key}
            className={cn(
              'group relative flex items-center rounded-md text-xs transition-colors',
              active ? 'font-medium text-foreground' : 'text-muted-foreground hover:bg-muted',
            )}
          >
            {active &&
              (reduce ? (
                <span className="absolute inset-0 rounded-md bg-card shadow-sm ring-1 ring-border" />
              ) : (
                <motion.span
                  layoutId="tab-active-pill"
                  className="absolute inset-0 rounded-md bg-card shadow-sm ring-1 ring-border"
                  transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                />
              ))}
            <button
              type="button"
              onClick={() => navigate(tab.path)}
              className="relative z-10 inline-flex items-center gap-2 px-3 py-1.5"
            >
              {tab.title}
            </button>
            {tab.closable && (
              <button
                type="button"
                onClick={(e) => onClose(e, tab.key)}
                className="relative z-10 mr-1 rounded p-0.5 opacity-50 hover:bg-border hover:opacity-100"
                aria-label={`关闭 ${tab.title}`}
              >
                <X className="size-3" />
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 5: 类型检查 + 构建**

Run: `cd mes/frontend && pnpm --filter mes-new check-types && pnpm --filter mes-new build`
Expected: PASS。

- [ ] **Step 6: 手验**

`pnpm --filter mes-new dev` → 切换路由有淡入上移；侧栏收/展宽度平滑、激活项有品牌色左条；标签切换时高亮药丸平滑滑动。

- [ ] **Step 7: 提交**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack && git add mes/frontend/apps/mes-new/src/layouts && git commit -m "💫 ui(mes-new): 布局外壳动画(路由过渡/侧栏品牌条/标签滑动药丸/顶栏微交互)"
```

---

## Task 7: 登录页重设计

**Files:**
- Modify: `mes/frontend/apps/mes-new/src/pages/login/LoginPage.tsx`

- [ ] **Step 1: 重写登录页（分层深色背景 + 玻璃卡 + 品牌按钮 + 鼠标视差）**

Replace the **entire** content of `mes/frontend/apps/mes-new/src/pages/login/LoginPage.tsx` with:
```tsx
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import {
  Button,
  Input,
  Label,
  Checkbox,
  toast,
} from '@workspace/ui'
import { Factory, RefreshCw } from 'lucide-react'
import Reveal from '@/components/motion/Reveal'
import { usePointerParallax } from '@/hooks/usePointerParallax'
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
  const { ref, fx, fy } = usePointerParallax<HTMLDivElement>()

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
      setCaptcha(captchaUrl())
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      ref={ref}
      className="relative flex min-h-screen items-center justify-center overflow-hidden p-4"
      style={{ background: '#070b1a' }}
    >
      {/* 极光 blob 层（随鼠标 +22px） */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ transform: `translate(${(fx * 22).toFixed(1)}px, ${(fy * 22).toFixed(1)}px)` }}
        aria-hidden
      >
        <span className="absolute left-[12%] top-[18%] size-[42vmax] rounded-full" style={{ background: 'radial-gradient(circle, rgba(47,124,255,0.55), transparent 60%)', filter: 'blur(70px)', animation: 'drift 13s ease-in-out infinite' }} />
        <span className="absolute right-[8%] top-[24%] size-[36vmax] rounded-full" style={{ background: 'radial-gradient(circle, rgba(54,224,255,0.45), transparent 60%)', filter: 'blur(70px)', animation: 'drift 16s ease-in-out infinite reverse' }} />
        <span className="absolute bottom-[8%] left-[40%] size-[34vmax] rounded-full" style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.4), transparent 60%)', filter: 'blur(70px)', animation: 'drift 15s ease-in-out infinite' }} />
      </div>

      {/* 细网格层 */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px)',
          backgroundSize: '38px 38px',
          maskImage: 'radial-gradient(circle at 50% 45%, black, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(circle at 50% 45%, black, transparent 75%)',
        }}
      />

      {/* 暗角层 */}
      <div className="pointer-events-none absolute inset-0" aria-hidden style={{ background: 'radial-gradient(circle at 50% 50%, transparent 40%, rgba(0,0,0,0.55))' }} />

      {/* 玻璃卡 */}
      <Reveal className="relative w-full max-w-sm">
        <div className="glass rounded-2xl p-7">
          <div className="space-y-2 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-[var(--shadow-brand)]">
              <Factory className="size-6" />
            </div>
            <h1 className="text-xl font-semibold text-white">章鱼MES</h1>
            <p className="text-sm text-white/60">智能制造执行系统</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="username" className="text-white/80">登录名</Label>
              <Input id="username" autoComplete="username" className="border-white/15 bg-white/5 text-white placeholder:text-white/40" {...register('username')} />
              {errors.username && <p className="text-xs text-destructive">{errors.username.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-white/80">密码</Label>
              <Input id="password" type="password" autoComplete="current-password" className="border-white/15 bg-white/5 text-white placeholder:text-white/40" {...register('password')} />
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="captcha" className="text-white/80">验证码</Label>
              <div className="flex gap-2">
                <Input id="captcha" className="flex-1 border-white/15 bg-white/5 text-white placeholder:text-white/40" {...register('captcha')} />
                <button
                  type="button"
                  onClick={() => setCaptcha(captchaUrl())}
                  className="relative h-9 w-24 shrink-0 overflow-hidden rounded-md border border-white/15"
                  title="点击刷新"
                >
                  <img src={captcha} alt="验证码" className="h-full w-full object-cover" />
                  <RefreshCw className="absolute right-1 top-1 size-3 text-white/70" />
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
              <Label htmlFor="rememberMe" className="text-sm font-normal text-white/80">记住我</Label>
            </div>
            <Button type="submit" variant="brand" className="w-full" disabled={submitting}>
              {submitting ? '登录中…' : '登 录'}
            </Button>
          </form>
        </div>
      </Reveal>
    </div>
  )
}
```

- [ ] **Step 2: 类型检查 + 构建**

Run: `cd mes/frontend && pnpm --filter mes-new check-types && pnpm --filter mes-new build`
Expected: PASS。

- [ ] **Step 3: 手验**

`pnpm --filter mes-new dev` → `/login`：深色背景 + 极光漂移 + 网格 + 暗角；玻璃卡淡入；鼠标移动时极光视差；登录按钮品牌渐变 hover 流光；表单可正常登录（admin/123，dev 已关验证码逻辑校验则随意填）。

- [ ] **Step 4: 提交**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack && git add mes/frontend/apps/mes-new/src/pages/login/LoginPage.tsx && git commit -m "💫 ui(mes-new): 登录页玻璃拟态重设计(极光视差/网格/暗角/品牌渐变按钮)"
```

---

## Task 8: 欢迎页重设计

**Files:**
- Modify: `mes/frontend/apps/mes-new/src/pages/welcome/WelcomePage.tsx`

- [ ] **Step 1: 重写欢迎页（渐变横幅 + KPI count-up + Stagger + 快捷入口）**

Replace the **entire** content of `mes/frontend/apps/mes-new/src/pages/welcome/WelcomePage.tsx` with:
```tsx
import { useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@workspace/ui'
import { Boxes, CheckCircle2, Clock, Factory, ClipboardList, Package, Workflow, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Stagger, StaggerItem } from '@/components/motion/Stagger'
import { useCountUp } from '@/pages/digitization/useCountUp'
import { useAuthStore } from '@/stores/authStore'

interface Kpi { label: string; value: number; icon: LucideIcon }
const KPIS: Kpi[] = [
  { label: '在产工单', value: 128, icon: Factory },
  { label: '今日完工', value: 86, icon: CheckCircle2 },
  { label: '待排产', value: 23, icon: Clock },
  { label: '在库物料', value: 1204, icon: Boxes },
]

const QUICK = [
  { label: '生产订单', to: '/order/produce', icon: ClipboardList },
  { label: '物料管理', to: '/basedata/materile', icon: Package },
  { label: '工艺路线', to: '/technology/flow', icon: Workflow },
  { label: '用户管理', to: '/system/user', icon: Users },
]

function KpiCard({ kpi }: { kpi: Kpi }) {
  const n = useCountUp(kpi.value)
  return (
    <Card className="relative overflow-hidden transition-shadow hover:shadow-[var(--shadow-pop)]">
      <span className="absolute inset-y-0 left-0 w-1 bg-brand-gradient" aria-hidden />
      <CardContent className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{kpi.label}</p>
          <p className="mt-1 text-2xl font-bold tracking-tight tabular-nums">
            {Math.round(n).toLocaleString()}
          </p>
        </div>
        <span className="flex size-10 items-center justify-center rounded-lg bg-accent text-primary">
          <kpi.icon className="size-5" />
        </span>
      </CardContent>
    </Card>
  )
}

export default function WelcomePage() {
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()
  return (
    <div className="space-y-6">
      {/* 渐变问候横幅 */}
      <div className="relative overflow-hidden rounded-xl bg-brand-gradient p-6 text-white shadow-[var(--shadow-brand)]">
        <div className="relative z-10">
          <h2 className="text-2xl font-semibold tracking-tight">你好,{user?.name ?? '用户'} 👋</h2>
          <p className="mt-1 text-sm text-white/80">欢迎使用章鱼MES 智能制造执行系统</p>
        </div>
        <span className="pointer-events-none absolute -right-8 -top-8 size-40 rounded-full bg-white/10" aria-hidden />
        <span className="pointer-events-none absolute -bottom-10 right-24 size-28 rounded-full bg-white/10" aria-hidden />
      </div>

      {/* KPI 卡（梯级入场 + 数字滚动） */}
      <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {KPIS.map((kpi) => (
          <StaggerItem key={kpi.label}>
            <KpiCard kpi={kpi} />
          </StaggerItem>
        ))}
      </Stagger>

      {/* 快捷入口 */}
      <div>
        <p className="mb-3 text-sm font-medium text-muted-foreground">快捷入口</p>
        <Stagger className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {QUICK.map((q) => (
            <StaggerItem key={q.to}>
              <button
                type="button"
                onClick={() => navigate(q.to)}
                className="flex w-full flex-col items-center gap-2 rounded-xl border border-border bg-card p-4 transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-[var(--shadow-pop)]"
              >
                <span className="flex size-10 items-center justify-center rounded-full bg-accent text-primary">
                  <q.icon className="size-5" />
                </span>
                <span className="text-sm">{q.label}</span>
              </button>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </div>
  )
}
```

> 注：`QUICK` 的 `to` 路径需与现有路由匹配。实现时若某路径不存在，运行 `grep -rn "path:" mes/frontend/apps/mes-new/src/router.tsx` 核对后替换为真实路由（保持四个快捷入口即可）。

- [ ] **Step 2: 核对快捷入口路由真实存在**

Run: `cd mes/frontend/apps/mes-new && grep -nE "'/order|'/basedata|'/technology|'/system" src/router.tsx | head -20`
Expected: 看到对应路由；若 `QUICK` 中某 `to` 不在列表中，改成存在的等价路由。

- [ ] **Step 3: 类型检查 + 构建**

Run: `cd mes/frontend && pnpm --filter mes-new check-types && pnpm --filter mes-new build`
Expected: PASS。

- [ ] **Step 4: 手验**

`pnpm --filter mes-new dev` → `/welcome`：渐变横幅、KPI 卡梯级淡入 + 数字滚动、快捷入口 hover 上浮、点击跳转正确。

- [ ] **Step 5: 提交**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack && git add mes/frontend/apps/mes-new/src/pages/welcome/WelcomePage.tsx && git commit -m "💫 ui(mes-new): 欢迎页重设计(渐变横幅/KPI count-up 梯级入场/快捷入口)"
```

---

## Task 9: 列表页样板核验（UserList）

> UserList 的行 hover（来自 table.tsx primitive）、按钮按压（Task 5）、聚焦品牌光晕（Task 2 令牌）、路由入场（Task 6 PageTransition）均已"免费"获得。本任务核验样板效果成立，并把 UserList 标注为后续列表页的参考模板，无需大改。

**Files:**
- Modify: `mes/frontend/apps/mes-new/src/pages/system/user/UserList.tsx`（仅加一行模板标注注释）

- [ ] **Step 1: 加模板标注注释**

In `mes/frontend/apps/mes-new/src/pages/system/user/UserList.tsx`，在 `export default function UserList() {` 上一行插入注释：
```tsx
// ⭐ 设计样板：本页是列表页的视觉/动画参考模板（路由入场、行 hover、按压反馈、品牌聚焦光晕
// 均来自 PageTransition + 共享 primitive + styles.css 令牌，新列表页照此结构即可获得一致观感）。
export default function UserList() {
```

- [ ] **Step 2: 手验样板效果**

`pnpm --filter mes-new dev` → `/system/user`：进入有淡入上移；表格行 hover 高亮；新建/编辑/删除按钮按压有 0.98 缩放;搜索输入框聚焦为品牌色光晕。

- [ ] **Step 3: 提交**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack && git add mes/frontend/apps/mes-new/src/pages/system/user/UserList.tsx && git commit -m "📝 docs(mes-new): 标注 UserList 为列表页设计样板"
```

---

## Task 10: 全量验证

**Files:** 无（仅运行校验）

- [ ] **Step 1: 类型检查**

Run: `cd mes/frontend && pnpm --filter mes-new check-types`
Expected: PASS。

- [ ] **Step 2: Lint**

Run: `cd mes/frontend && pnpm --filter mes-new lint`
Expected: PASS（无 error；既有 warning 不阻断）。

- [ ] **Step 3: 单元测试**

Run: `cd mes/frontend && pnpm --filter mes-new test`
Expected: PASS（含 `pointerFraction` 5 用例 + 既有 smoke/multiImage 测试）。

- [ ] **Step 4: 生产构建**

Run: `cd mes/frontend && pnpm --filter mes-new build`
Expected: PASS（产物生成）。

- [ ] **Step 5: 综合手验（reduced-motion 降级）**

系统开启"减弱动态效果"（macOS: 系统设置→辅助功能→显示→减弱动态效果），重跑 `dev`，确认：登录页极光/视差停止、路由切换/卡片入场退化为静态、标签药丸不滑动但激活态正常。关闭该选项后动画恢复。

- [ ] **Step 6: 最终提交（如有遗留改动）**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack && git status && git add -A && git commit -m "✅ test(mes-new): 设计改造全量校验通过(types/lint/test/build)" || echo "无遗留改动"
```

---

## Self-Review（已执行）

**Spec 覆盖核对**：
- §4.1 令牌层 → Task 1（JS）+ Task 2（CSS）✓
- §4.2 动画基元 → Task 4 ✓（组件 smoke 测试因 node-only 测试基建改为 type-check/build/手验，已在"关键约束"说明）
- §4.3 布局外壳 → Task 6 ✓
- §4.4 登录页（含 usePointerParallax 移植）→ Task 3 + Task 7 ✓
- §4.5 欢迎页（count-up 复用）→ Task 8 ✓
- §4.6 列表页样板 → Task 9 ✓
- §4.7 PageContainer 入场 → **改为由 Task 6 的 PageTransition 统一承担路由级入场**（避免与 PageContainer 双重动画；Reveal 仍用于登录卡）。
- §5 无障碍 → Task 2（CSS media query）+ 各基元 useReducedMotion + Task 10 Step 5 手验 ✓
- §6 测试验证 → Task 3（单测）+ Task 10 ✓
- §3.2 共享包 → 收敛为仅 Task 5（button.tsx）；input/card/data-table 因既有 primitive/令牌覆盖无需改，已说明。

**占位符扫描**：无 TBD/TODO；所有代码步骤含完整代码。

**类型/命名一致性**：`pointerFraction`/`usePointerParallax`/`Reveal`/`Stagger`/`StaggerItem`/`PageTransition`/`EASE`/`DUR` 在定义与引用处一致；Button `variant="brand"` 与 cva 新增项一致；`useCountUp` 签名 `(target:number)` 与 Task 8 调用一致。
