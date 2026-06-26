# 设计文档：Vue3 登录页重设计（玻璃拟态 · 科技蓝光）

- 日期：2026-06-24
- 范围：`mes/vue3` 前端（独立 Vite，端口 4200）
- 目标文件：`mes/vue3/src/views/login/LoginView.vue`
- 风格定稿：**B1 · 居中单卡** —— 深色极光背景 + 毛玻璃发光登录卡（"大厂"科技风，优雅而有呼吸感）

---

## 1. 背景与目标

现有 `LoginView.vue` 是「左蓝色渐变品牌区 + 右 `el-card` 表单」的左右分栏，功能完整但视觉偏模板感。本次**只重做登录页的视觉与交互层**，把它升级成与系统科技定位（3D 数字孪生、数据大屏、AI 助手）同源的玻璃拟态科技风，同时**原样保留全部登录业务逻辑**。

成功标准：第一眼"赏心悦目、像大厂产品"；登录、校验、验证码、记住我、开发态等行为与现状完全一致；性能流畅、可降级、响应式可用。

经过 4 轮可视化选型，最终方向已锁定（见下）。

---

## 2. 设计定稿（视觉）

### 2.1 整体方案
- 全屏（`100vh`）深色场景，**单张毛玻璃登录卡居中漂浮**在动态极光背景之上。
- 登录页**固定深色**，独立于后台浅/深主题（它是全屏独立场景，不跟随 `html.dark`）。

### 2.2 背景层（由后至前）
1. **底色**：`#070b1a`（深空蓝黑）。
2. **极光层 `.aurora`**：3 团大半径模糊圆（`filter: blur(70px)`）
   - 蓝 `#2f7cff`（左上，静止）
   - 青 `#36e0ff`（右上，`drift` 13s 漂移）
   - 紫 `#7a5cff`（中下，`drift` 16s 反向漂移）
3. **科技网格 `.mesh`**：1px 白色细网格（`rgba(255,255,255,.045)`，间距 38px），用径向遮罩从中心向外淡出（`mask: radial-gradient(... transparent 78%)`）。
4. **浮动粒子 `.pt` ×6**：发光小圆点（`box-shadow` 辉光），`float` 9s 上下浮动、错相位。
5. **暗角 `.vignette`**：径向渐变压暗四周，聚焦中心。
6. **细噪点 `.noise`**：见 2.5③。

### 2.3 玻璃登录卡 `.login-card`
- 居中：`position:absolute; left/top:50%; transform:translate(-50%,-52%)`。
- 尺寸：`width:380px; max-width:74vw`（窄屏见 2.8）；内边距 `36px 34px 30px`；圆角 `22px`。
- 玻璃质感：`background: rgba(255,255,255,.08)`；`backdrop-filter: blur(20px) saturate(120%)`（含 `-webkit-` 前缀）；`border: 1px solid rgba(255,255,255,.18)`；阴影 `0 30px 70px rgba(0,0,0,.55)` + 顶部高光 `inset 0 1px 0 rgba(255,255,255,.3)`。
- `overflow:hidden`（用于裁剪流光）。**卡片本身不随 hover/鼠标移动而位移**（保持稳定，避免容器漂移的廉价感）。

### 2.4 卡内元素与文案（自上而下）
1. **品牌锁**：渐变方块 Logo「M」（`linear-gradient(135deg,#36e0ff,#2f7cff)` + 辉光）+ 文字「MES智慧管理系统」（青色 `#36e0ff`），居中。
2. **标题**：`欢迎登录`（26px / 800 / 字距 1px）。
3. **副标题**：`智能制造执行系统 · 请登录您的账户`（12px，`#8aa0c4`）。
4. **用户名**：玻璃输入框 + 人形图标，placeholder `请输入用户名`。
5. **密码**：玻璃输入框 + 锁图标 + 右侧显隐眼睛，placeholder `请输入密码`。
6. **验证码**（**仅生产环境显示**）：玻璃输入框 + 右侧验证码图（点击刷新）。
7. **行**：左「☑ 记住我」、右「忘记密码？」链接。
8. **登录按钮**：渐变发光主按钮，文案「登 录」（字距 6px）。
9. **开发提示**（**仅开发环境显示**）：`开发环境已关闭验证码，默认 admin / 123`。
10. **页脚**（卡外、贴屏底）：`© 2026 MES智慧管理系统 · 智能制造执行系统 | 仅限授权人员访问`。

> 文案沿用以上默认；「忘记密码？」仅作视觉占位（无后端流程，点击给出 `ElMessage` 提示"请联系管理员重置"，不新增页面）。

### 2.5 动效与点缀（基底 A 档 + 三点缀全加）
- **基底 = A 档·克制**：仅青/紫 2 团极光慢漂 + 6 粒子浮动，节奏舒缓不抢戏。
- **① 鼠标视差**：监听容器 `mousemove`，按光标相对中心的偏移用 `requestAnimationFrame` 平移**极光层** `translate(±22px)`；粒子反向 `translate(±16px)` 制造景深；**登录卡不动**。`mouseleave` 复位。
- **② 玻璃卡流光**：`.login-card::after` 一道斜向高光带（`linear-gradient(100deg, transparent, rgba(255,255,255,.16), transparent)` + `skewX(-12deg)`），`sweep` 7.5s 周期性扫过卡面，`pointer-events:none`。
- **③ 细噪点**：`.noise` 全屏覆盖一层 SVG `feTurbulence` 噪点（内联 data-uri，无需资源文件），`opacity:.085`、`mix-blend-mode:overlay`、`pointer-events:none`，消除蓝色渐变色带、增加胶片质感。

### 2.6 微交互与状态
- **输入框 hover**：边框微亮（`rgba(255,255,255,.3)`）。
- **输入框 focus**：青色光晕 `box-shadow: 0 0 0 3px rgba(54,224,255,.18), 0 0 22px rgba(54,224,255,.25)` + 边框点亮 + 图标转青。
- **登录按钮 hover**：上浮 2px + 渐变横移 + 辉光增强；`active` 回落。
- **链接/眼睛/验证码图 hover**：高亮（验证码图 `brightness(1.3)`）。
- **提交加载**：按钮转圈（spinner）并禁用，防重复提交。
- **校验失败**：红色描边 + 行内提示 + 轻微抖动（`shake`）。
- **入场动画**：沿用 `@vueuse/motion` `v-motion`，卡片淡入上移、品牌锁/标题轻微错峰。

### 2.7 配色与令牌
登录页配色为页面级局部变量（深色场景，独立于全站浅色后台），与 `theme.scss` 品牌色同源：
- 主蓝 `#2f7cff`、青 `#36e0ff`、紫 `#7a5cff`；底 `#070b1a`；
- 文字 `#eaf3ff`/`#e6f0ff`（主）、`#8aa0c4`（次）、`#62739a`（占位/提示）；
- 错误 `#ff6b81`。
- 复用全站 `--radius-lg / --shadow-* / --ease-* / --dur-*` 等令牌的取值口径，保持节奏一致。

### 2.8 响应式
- **宽屏**：卡片 380px 居中。
- **窄屏（≤ 480px）**：`max-width: 92vw`、内边距收敛、标题字号下调；粒子可减少；**视差在 coarse pointer（触屏）下关闭**。
- 最小到主流手机宽度仍可正常输入与登录。

### 2.9 无障碍与性能
- 所有装饰动画在 `@media (prefers-reduced-motion: reduce)` 下**全部关闭**（含视差、流光、漂移、浮动），降级为静态美图；JS 视差也先判断 reduced-motion 与 coarse pointer 再绑定。
- 动画只用 `transform` / `opacity`（GPU 合成）；极光层 `will-change: transform`。
- 表单保留 `<label>` 包裹与 Element Plus 原生可达性；颜色对比满足可读。

---

## 3. 功能行为（必须原样保留，不改业务逻辑）

来自现有 `LoginView.vue`：
- **表单模型**：`{ username, password, captcha, rememberMe }`。
- **校验规则**：用户名必填 + `^[\w.@-]{2,30}$`；密码 ≥ 3 位；验证码在 `!isDev` 时必填。
- **isDev（`import.meta.env.DEV`）**：隐藏验证码、预填 `admin/123`、显示开发提示。
- **提交流程**：`formRef.validate()` → `userStore.login(form)` → `permStore.loadMenu()` → `router.push(route.query.redirect || '/welcome')`；失败时（拦截器已统一提示）仅刷新验证码。
- **验证码**：`captchaUrl()` 取图，点击刷新。
- **回车提交**：`@keyup.enter`。
- **加载态**：`loading` ref 驱动按钮。

> 以上一行都不删；仅在 `<script setup>` 中**新增**：视差处理（鼠标 + rAF + reduced-motion/coarse 判断）与少量响应式判断。stores / api / router 不改动。

---

## 4. 技术实现要点

### 4.1 组件与文件
- **只改** `mes/vue3/src/views/login/LoginView.vue`（template + style 大改，script 增量）。
- **不新增**共享文件：视差逻辑内联在组件内（自包含，遵循 YAGNI）；噪点用内联 data-uri，无新增静态资源。
- 优先尝试 `@vueuse/core` 的 `useMouseInElement` / `useParallax`（已在依赖中）实现视差；若不顺手则用原生 `mousemove + rAF`。两者均需 reduced-motion / coarse pointer 守卫。

### 4.2 Element Plus 复用与深度改样
- **保留** `el-form` / `el-form-item` / `el-input` / `el-checkbox` / `el-button`，以继承校验、`clearable`、`show-password`、可达性。
- 通过 scoped `:deep()` 把 `el-input__wrapper` 改成玻璃风（透明底、去默认描边阴影、自定义边框与 focus 光晕、青色 caret）；按钮改成渐变发光主按钮。
- 图标沿用 `@element-plus/icons-vue`（`User` / `Lock` / `Key` / `View` 等）。

### 4.3 视差实现（要点）
- 容器 `@mousemove` → 计算 `(dx,dy)`（相对中心 −0.5..0.5）→ rAF 内写 `aurora.style.transform`；粒子用独立的 CSS `translate` 属性（与 `transform` 动画解耦，避免覆盖 `float`）。
- 进入前判断：`matchMedia('(prefers-reduced-motion: reduce)')`、`matchMedia('(pointer: coarse)')` → 命中则不绑定。

### 4.4 噪点实现
- 内联 `data:image/svg+xml,...feTurbulence...` 作为 `.noise` 的 `background-image`；`opacity`、`mix-blend-mode` 可微调（默认 `.085 / overlay`）。

---

## 5. 范围之外（YAGNI）
- 不做：登录页主题切换、第三方/社交登录、注册、找回密码后端流程、国际化、记住账号下拉历史。
- 不改：后端、stores、api、router、其他页面。

---

## 6. 验收标准
1. dev（:4200）下：`admin/123` 可正常登录并跳转；开发态隐藏验证码、显示开发提示。
2. 生产构建口径下验证码字段出现且可点击刷新（行为同现状）。
3. 校验失败正确显示红边 + 行内提示；回车可提交；加载态按钮转圈禁用。
4. hover/focus/视差/流光/噪点 五类视觉效果均按 2.5/2.6 呈现，且登录卡 hover 不位移。
5. `prefers-reduced-motion: reduce` 下所有动画关闭、页面静态可用；触屏下不绑视差。
6. 窄屏（≤480px）布局不溢出、可正常输入登录。
7. `pnpm typecheck`（vue-tsc）与 `pnpm lint` 通过；现有 vitest 用例不被破坏。
