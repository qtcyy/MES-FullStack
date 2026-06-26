# mes-new 吸收 Vue3 优雅设计 — 设计文档

- **日期**: 2026-06-25
- **目标 app**: `mes/frontend/apps/mes-new`（当前唯一活跃的 React 前端）
- **参考来源**: `mes/vue3`（Vue3 课程作业前端，设计/动画优点的来源）
- **本轮范围**: 样板层先行（令牌层 + 动画基元 + 布局外壳 + 登录页 + 欢迎页 + 1 个列表页样板）

---

## 1. 背景与目标

React 前端 `mes-new` 技术栈成熟（React 19 + Tailwind v4 + shadcn/Radix `@workspace/ui` + RHF/zod），设计令牌完整（60+ CSS 变量、light/dark/custom 三主题），但**视觉朴素、应用层几乎无动画**：登录页极简、无路由过渡、无页面入场、表格行无 hover、表单无聚焦反馈，整体"后台模板感"。

Vue3 前端在同一业务域上做出了"优雅而不浮夸"的观感，核心可复用手法：

1. **统一设计令牌**：`--sp-*` 间距、三档圆角、三档动画时长（160/240/360ms）、克制缓动（仅 2 条标准曲线 + 1 条弹性）——节奏统一是"优雅"的根。
2. **入场动画**：页面/卡片 `opacity+translateY` 梯级 stagger；路由切换 fade-slide。
3. **微交互**：hover 用缩放/阴影而非变色；表单聚焦品牌色光晕；列表 FLIP 自动动画。
4. **登录页**：玻璃拟态卡 + 极光 blob + 网格 + 暗角 + 流光 + 鼠标视差。
5. **无障碍**：全程 `prefers-reduced-motion` 降级。
6. **科技蓝品牌色**：`#2f7cff → #36e0ff`（青霓虹渐变），深色大屏延续科技蓝光。

**目标**：把上述设计语言翻译成 Tailwind/shadcn 写法 + 补齐动画层，确立一套可复用的设计语言与基元，让后续业务页面按样板批量套用。

### 已确认的方向性决策

| 决策 | 结论 |
|------|------|
| 改造范围 | 样板层先行（非全量、非仅门面） |
| 动画技术 | 引入 `motion`（framer-motion） |
| 配色方向 | 采用科技蓝品牌色 `#2f7cff → #36e0ff` |

---

## 2. 非目标（Scope Out）

- **不**改造除"用户列表"以外的业务模块页面（basedata / technology / order / inventory / workflow 的列表与表单页留待后续按样板套用）。
- **不**改造 `digitization/PlanDashboard`（数字大屏，已自带 `dashboard.css` + count-up，属另一套视觉体系，本轮不动）。
- **不**碰已弃用的 `apps/mes1`。
- **不**引入新的状态管理 / 路由 / 表单方案；沿用现有 Zustand + react-router v7 + RHF/zod。
- **不**做 AI 助手浮窗等功能性移植（属功能而非视觉，超出本轮）。

---

## 3. 架构决策

### 3.1 令牌与品牌色放在应用本地覆盖层

`mes-new/src/styles.css` 在 `@workspace/ui/globals.css` **之后**导入（见 `src/styles.css:1`），CSS 级联天然覆盖。因此：

- 品牌色（覆盖 `--primary` / `--ring` / sidebar 强调）、新增令牌（渐变/缓动/时长/阴影/玻璃）、keyframes、`prefers-reduced-motion` 降级 —— **全部写在 `mes-new/src/styles.css`**。
- 不改共享 `packages/ui/src/styles/globals.css` 的令牌定义 → **不波及共享包/弃用的 mes1**。
- Tailwind v4 的 `@theme inline` 已用 `var(--primary)` 等映射，覆盖 `:root`/`.dark` 的变量值即可自动流经所有 `bg-primary`/`ring-ring` 等工具类，无需改 `@theme`。

### 3.2 共享基础组件的微交互润色（最小、纯增量）

`@workspace/ui` 的 Button / Input / Card / DataTable 是"可复用设计"的天然归属。本轮对其做**最小且纯增量**的润色：

- Button：`transition` + `active:scale-[0.98]`（按压反馈）；新增 `brand` variant（品牌渐变背景 + `--shadow-brand`，hover 渐变位移）。
- Input：聚焦时 ring 改用品牌色光晕（`focus-visible` 双层 box-shadow）。
- Card：可选 `hover` 抬升（通过 className 控制，不强制全局）。
- DataTable：行 `hover:bg-muted/50 transition-colors`。

**代价（已知并接受）**：这些改动同时改变 mes1 的观感（纯视觉、无破坏；mes1 已弃用）。
**备选**：若 review 时决定共享包一律不碰，则改为在 mes-new 侧用 wrapper 组件 / 工具类实现，效果一致但代码略散。**默认采用"改共享包"方案**。

---

## 4. 详细设计

### 4.1 设计令牌层

**`mes-new/src/styles.css`** 追加（在 `@import` 之后）：

```css
:root {
  /* 品牌色覆盖（科技蓝 → 青霓虹）*/
  --primary: #2f7cff;
  --ring: #2f7cff;
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
  --primary: #36e0ff;   /* 深色大屏延续青霓虹 */
  --ring: #36e0ff;
  --shadow-card: 0 2px 12px rgba(0, 0, 0, 0.35);
  --shadow-pop: 0 12px 32px rgba(0, 0, 0, 0.5);
}
```

**工具类**（`@layer utilities`）：
- `.bg-brand-gradient { background: var(--brand-gradient); }`
- `.text-brand { color: var(--brand-from); }`
- `.glass`：半透背景 + `backdrop-filter: blur(20px) saturate(120%)` + 细边框（复用 globals 已有的 backdrop-blur 兼容前缀写法）。
- keyframes：`drift`（极光漂移）、`float`（粒子上下）、`sweep`（卡片流光）。
- `@media (prefers-reduced-motion: reduce)`：上述 keyframes 动画 `animation: none`，全局 `transition-duration: 0.01ms`。

**`mes-new/src/lib/motion.ts`**（给 framer-motion 用的 JS 常量，与 CSS 令牌对齐）：

```ts
export const EASE = {
  standard: [0.4, 0, 0.2, 1] as const,
  out: [0, 0, 0.2, 1] as const,
  spring: [0.16, 1, 0.3, 1] as const,
}
export const DUR = { fast: 0.16, base: 0.24, slow: 0.36 }

export const fadeSlide = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: DUR.base, ease: EASE.out },
}
export const staggerContainer = {
  animate: { transition: { staggerChildren: 0.06 } },
}
export const staggerItem = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: DUR.base, ease: EASE.out } },
}
```

### 4.2 动画基元 `src/components/motion/`

新增依赖 `motion`（framer-motion；monorepo 中 mes1 已装 `^12`，pnpm workspace 可复用解析，加入 `mes-new/package.json` 后 `pnpm install`）。

四个组件，**全部内置 `useReducedMotion()` 降级**（降级时直接渲染静态内容、不加 motion）：

| 组件 | 职责 | API |
|------|------|-----|
| `PageTransition` | 路由内容 fade-slide 过渡 | `<PageTransition routeKey={pathname}>{children}</PageTransition>`，内部 `AnimatePresence mode="wait"` + `motion.div` |
| `Reveal` | 单元素入场 | `<Reveal delay?>{children}</Reveal>` |
| `Stagger` | 容器，梯级编排子项 | `<Stagger className?>...</Stagger>` |
| `StaggerItem` | 配合 `Stagger` 的子项 | `<StaggerItem>...</StaggerItem>` |

### 4.3 布局外壳

- **`AppSidebar`**（`src/layouts/components/AppSidebar.tsx`）
  - 激活态：品牌色微染（保留 `bg-sidebar-accent`）+ 左侧 2px 品牌条（伪元素或 `border-l-2 border-primary`）。
  - nav item：hover 轻微高亮 + 过渡走 `--ease-standard`（已有 `transition`，补 duration/easing）。
  - 收起/展开宽度过渡：`transition-[width] duration-[240ms] ease-[var(--ease-standard)]`。
  - 顶部 logo 芯片：`bg-brand-gradient`。
- **`AppHeader`**（`src/layouts/components/AppHeader.tsx`）：折叠/主题/通知/用户按钮补 hover 反馈（icon 按钮 hover 背景 + 轻微 scale）。
- **`AppTabs`**（`src/layouts/components/AppTabs.tsx`）：激活标签用 framer-motion `layoutId="tab-underline"` 做**滑动下划线指示器**（标签切换时下划线平滑滑动）。
- **`AdminLayout`**（`src/layouts/AdminLayout.tsx`）：用 `PageTransition` 包裹 `<Outlet/>`，`routeKey={location.pathname}`。

### 4.4 登录页（门面，对齐 Vue3 的克制版）

**`src/pages/login/LoginPage.tsx`** 重构为分层背景 + 玻璃卡：

| 层 | 实现 |
|----|------|
| 基底 | 深色 `#070b1a`（仅登录页局部，不依赖全局主题） |
| 极光 blob ×2~3 | 绝对定位渐变圆 + `blur(70px)` + `drift` 动画 |
| 细网格 | `background-image` 线性渐变网格 + radial 遮罩淡出 |
| 暗角 | radial-gradient 中心透明→边缘深 |
| 玻璃卡 | `.glass`（backdrop-blur + 半透 + 内外阴影），`Reveal` 入场（duration 偏长 ~0.46s） |
| 登录按钮 | `.bg-brand-gradient` + `background-size:160%` + hover `background-position` 位移流光 + `--shadow-brand` |
| 鼠标视差 | 移植 Vue3 `usePointerParallax` → `src/hooks/usePointerParallax.ts`，纯函数 `pointerFraction(x,y,rect)` 可单测；极光 +22px / 粒子 -16px 制造景深 |

- 表单控件（Input）聚焦：品牌色光晕（复用 4.1 的 Input 润色）。
- 粒子 / SVG 噪点设为**可选轻量**（默认仅极光+网格+暗角，避免浮夸）。
- 全程 reduced-motion / 触屏禁用视差（`pointerFraction` 调用方 + hook 内部双重判断）。
- 保留全部现有逻辑：RHF + zod 校验、验证码刷新、记住我、登录跳转。

### 4.5 欢迎页（门面）

**`src/pages/welcome/WelcomePage.tsx`** 升级为"设计样板展示":

- **问候横幅卡**：`bg-brand-gradient` 背景 + 问候语 + 玻璃芯片（系统状态/待办数）。
- **KPI 卡**（复用现有 4 项数据）：左侧品牌强调竖条 + 图标芯片 + **数字 count-up**（复用 `src/pages/digitization/useCountUp.ts`）+ `Stagger/StaggerItem` 梯级入场。
- **快捷入口网格**：`grid auto-fill minmax(120px,1fr)`，每项圆形图标 + 标签，hover 上浮 `-4px` + 阴影加深。

### 4.6 列表页样板 = 用户列表

**`src/pages/system/user/UserList.tsx`**（CLAUDE.md 指定的 CRUD 基准）：

- `PageContainer` 用 `Reveal` 入场（见 4.7）。
- 表格行 `hover:bg-muted/50 transition-colors`（经 4.2 DataTable 润色自动获得）。
- 搜索表单 / 操作按钮微交互（经 Button 润色自动获得）。
- 空态 / 加载态润色（skeleton 已有，补脉动过渡可选）。
- **定位为模板**：实现后在文档/注释中标注，其余列表页后续照此套用。

### 4.7 `PageContainer` 入场

**`src/components/PageContainer.tsx`**：根节点用 `Reveal` 包裹（opacity+y 入场，对齐 Vue3 `PageContainer.vue`），使所有调用它的业务页面自动获得统一入场动画。

---

## 5. 无障碍

- framer-motion 路径：`useReducedMotion()` 为真时渲染静态版本（无初始/动画位移）。
- CSS keyframes 路径：`@media (prefers-reduced-motion: reduce)` 关闭 `drift/float/sweep` 与长过渡。
- 鼠标视差：`prefers-reduced-motion` 或 `pointer: coarse`（触屏）时禁用。

---

## 6. 测试与验证

- **单测**（vitest，mes-new 已配置）：
  - `pointerFraction(x, y, rect)` 纯函数：边界（中心=0、四角=±0.5）。
  - motion 基元 smoke 测试：`Reveal/Stagger/PageTransition` 能正常渲染子节点（含 reduced-motion 分支）。
- **类型 / 构建**：`pnpm --filter mes-new check-types`、`pnpm --filter mes-new lint`、`pnpm --filter mes-new build` 全过。
- **手验**：dev server（:4100）跑通，登录页 / 欢迎页 / 用户列表 / 路由切换 / 侧栏收展 的动画与品牌色观感符合预期；`prefers-reduced-motion` 下动画退化正常。

---

## 7. 文件改动清单（供 writing-plans 分解）

**新增**
- `src/lib/motion.ts` — JS 动画令牌与 variants
- `src/components/motion/PageTransition.tsx`
- `src/components/motion/Reveal.tsx`
- `src/components/motion/Stagger.tsx`（含 `StaggerItem`）
- `src/hooks/usePointerParallax.ts` + `pointerFraction` 纯函数
- 对应单测文件（`__tests__`）

**修改（mes-new）**
- `src/styles.css` — 令牌覆盖 + 工具类 + keyframes + reduced-motion
- `package.json` — 加 `motion` 依赖
- `src/layouts/AdminLayout.tsx` — PageTransition 包裹 Outlet
- `src/layouts/components/AppSidebar.tsx` / `AppHeader.tsx` / `AppTabs.tsx`
- `src/pages/login/LoginPage.tsx`
- `src/pages/welcome/WelcomePage.tsx`
- `src/pages/system/user/UserList.tsx`
- `src/components/PageContainer.tsx`

**修改（共享 `@workspace/ui`，最小增量；见 §3.2，review 可否决）**
- `packages/ui/src/components/button.tsx`
- `packages/ui/src/components/input.tsx`
- `packages/ui/src/components/card.tsx`
- `packages/ui/src/components/data-table.tsx`

---

## 8. 风险

| 风险 | 缓解 |
|------|------|
| 改共享包波及 mes1 | mes1 已弃用、改动纯视觉无破坏；如不接受可切 §3.2 备选方案 |
| framer-motion 与 React 19 兼容 | mes1 已用 motion^12 + React 19，已验证可行 |
| 玻璃/backdrop-blur 性能 | 仅登录页使用；blob 数量克制（2~3 个） |
| 动画过度→"浮夸" | 严守 Vue3 的克制缓动与时长令牌；粒子/噪点设为可选 |
| StrictMode 关闭下的副作用 | 不重开 StrictMode（见 main.tsx 注释，R3F/WebGL 约束） |
