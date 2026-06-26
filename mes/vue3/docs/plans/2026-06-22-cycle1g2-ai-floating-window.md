# AI 对话栏改可拖拽缩放浮动窗 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 AI 助手对话栏从右侧 `el-drawer` 改为可自由拖拽 + 八方向缩放的浮动窗，带从悬浮球缩放淡入的开合动画，体验流畅跟手。

**Architecture:** 三层拆分——纯几何函数 `utils/floatingWindow.ts`（可单测）；`composables/useFloatingWindow.ts` 管理响应式 geometry + pointer 拖拽/缩放；`components/ai/AiChatWindow.vue` 替换 `AiChatDrawer.vue`（内部 header/列表/输入原样保留，外壳改定位 div + 8 缩放手柄 + 关闭按钮）。`AiAssistant.vue` 持有 geometry 状态（开关期间保留），用 `<Transition>` 做开合动画。

**Tech Stack:** Vue 3.5 `<script setup>` + Element Plus + Vitest 4。geometry 仅会话内存，不持久化，后端零改动。

**工作目录：** `pnpm` 命令在 `mes/vue3/` 下；git 在仓库根 `/Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack-Vue`。

---

## 文件结构

| 文件 | 职责 | 操作 |
|------|------|------|
| `src/utils/floatingWindow.ts` | 纯几何：`clampToViewport` / `resizeGeometry` + 类型 | 新建 |
| `src/composables/useFloatingWindow.ts` | 响应式 geometry + 拖拽/缩放 pointer 逻辑 | 新建 |
| `src/components/ai/AiChatWindow.vue` | 浮动窗外壳（拖拽 header + 8 手柄 + 关闭）+ 原内部内容 | 新建 |
| `src/components/ai/AiChatDrawer.vue` | 旧抽屉外壳 | 删除 |
| `src/components/ai/AiAssistant.vue` | 持有 geometry，Transition 包裹窗口，FAB toggle | 修改 |
| `tests/floatingWindow.spec.ts` | 纯函数单测 | 新建 |

---

## Task 1: 纯几何函数 + 单测（TDD）

**Files:**
- Create: `mes/vue3/src/utils/floatingWindow.ts`
- Test: `mes/vue3/tests/floatingWindow.spec.ts`

- [ ] **Step 1: 写失败测试** — Create `mes/vue3/tests/floatingWindow.spec.ts`：
```ts
import { describe, it, expect } from 'vitest'
import { clampToViewport, resizeGeometry, type SizeConstraints } from '@/utils/floatingWindow'

const C: SizeConstraints = { minW: 320, minH: 360, maxW: 2000, maxH: 2000 }
const START = { x: 100, y: 100, w: 380, h: 560 }
const VW = 5000
const VH = 5000 // 足够大，使 clampToViewport 不干扰 resize 断言

describe('resizeGeometry', () => {
  it('东边：从固定左边生长', () => {
    expect(resizeGeometry(START, 'e', 50, 0, C, VW, VH)).toMatchObject({ x: 100, w: 430 })
  })
  it('南边：从固定上边生长', () => {
    expect(resizeGeometry(START, 's', 40, 0 + 40, C, VW, VH)).toMatchObject({ y: 100, h: 600 })
  })
  it('西边：右边锚定，x 随之移动', () => {
    // right = 480；w = 380-50 = 330；x = 480-330 = 150
    expect(resizeGeometry(START, 'w', 50, 0, C, VW, VH)).toMatchObject({ x: 150, w: 330 })
  })
  it('北边：底边锚定，y 随之移动', () => {
    // bottom = 660；h = 560-40 = 520；y = 660-520 = 140
    expect(resizeGeometry(START, 'n', 0, 40, C, VW, VH)).toMatchObject({ y: 140, h: 520 })
  })
  it('西边触底 minW 时右边仍锚定', () => {
    // w = clamp(380-100,320,2000)=320；x = 480-320 = 160
    expect(resizeGeometry(START, 'w', 100, 0, C, VW, VH)).toMatchObject({ x: 160, w: 320 })
  })
  it('北边触底 minH 时底边仍锚定', () => {
    // h = clamp(560-300,360,2000)=360；y = 660-360 = 300
    expect(resizeGeometry(START, 'n', 0, 300, C, VW, VH)).toMatchObject({ y: 300, h: 360 })
  })
  it('东边触顶 maxW', () => {
    const c2: SizeConstraints = { ...C, maxW: 400 }
    expect(resizeGeometry(START, 'e', 100, 0, c2, VW, VH)).toMatchObject({ w: 400 })
  })
  it('右下角同时作用两轴', () => {
    expect(resizeGeometry(START, 'se', 40, 40, C, VW, VH)).toMatchObject({ x: 100, y: 100, w: 420, h: 600 })
  })
  it('左上角同时作用两轴，对侧锚定', () => {
    // w=340,x=480-340=140；h=520,y=660-520=140
    expect(resizeGeometry(START, 'nw', 40, 40, C, VW, VH)).toMatchObject({ x: 140, y: 140, w: 340, h: 520 })
  })
})

describe('clampToViewport', () => {
  it('超出右边界回拉', () => {
    expect(clampToViewport({ x: 1900, y: 10, w: 380, h: 560 }, 2000, 2000)).toMatchObject({ x: 1620, y: 10 })
  })
  it('超出下边界回拉', () => {
    expect(clampToViewport({ x: 10, y: 1900, w: 380, h: 560 }, 2000, 2000)).toMatchObject({ y: 1440 })
  })
  it('负坐标归零', () => {
    expect(clampToViewport({ x: -50, y: -50, w: 380, h: 560 }, 2000, 2000)).toMatchObject({ x: 0, y: 0 })
  })
  it('宽高超视口被夹且 x 归零', () => {
    expect(clampToViewport({ x: 100, y: 100, w: 3000, h: 3000 }, 2000, 2000)).toMatchObject({ x: 0, y: 0, w: 2000, h: 2000 })
  })
})
```

- [ ] **Step 2: 运行验证失败** — Run: `pnpm test -- floatingWindow` → Expected: FAIL（模块不存在）。

- [ ] **Step 3: 实现** — Create `mes/vue3/src/utils/floatingWindow.ts`：
```ts
/** 浮动窗几何纯函数 */

export type ResizeDir = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'

export interface Geometry {
  x: number
  y: number
  w: number
  h: number
}

export interface SizeConstraints {
  minW: number
  minH: number
  maxW: number
  maxH: number
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(Math.max(v, lo), hi)
}

/** 把窗口约束在视口内：先夹宽高，再夹位置使其完全可见 */
export function clampToViewport(geom: Geometry, vw: number, vh: number): Geometry {
  const w = clamp(geom.w, 0, vw)
  const h = clamp(geom.h, 0, vh)
  const x = clamp(geom.x, 0, Math.max(0, vw - w))
  const y = clamp(geom.y, 0, Math.max(0, vh - h))
  return { x, y, w, h }
}

/**
 * 按方向缩放：对侧边锚定（拖西边则右边固定、拖北边则底边固定），
 * 夹在 min/max 之间，最后 clampToViewport 兜底。
 * dx/dy 为相对拖拽起点 start 的累计位移。
 */
export function resizeGeometry(
  start: Geometry,
  dir: ResizeDir,
  dx: number,
  dy: number,
  c: SizeConstraints,
  vw: number,
  vh: number,
): Geometry {
  let { x, y, w, h } = start
  const right = start.x + start.w
  const bottom = start.y + start.h

  if (dir.includes('e')) {
    w = clamp(start.w + dx, c.minW, c.maxW)
  }
  if (dir.includes('w')) {
    w = clamp(start.w - dx, c.minW, c.maxW)
    x = right - w
  }
  if (dir.includes('s')) {
    h = clamp(start.h + dy, c.minH, c.maxH)
  }
  if (dir.includes('n')) {
    h = clamp(start.h - dy, c.minH, c.maxH)
    y = bottom - h
  }

  return clampToViewport({ x, y, w, h }, vw, vh)
}
```

- [ ] **Step 4: 运行验证通过** — Run: `pnpm test -- floatingWindow` → Expected: PASS（13 用例全过）。

- [ ] **Step 5: Commit**
```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack-Vue
git add mes/vue3/src/utils/floatingWindow.ts mes/vue3/tests/floatingWindow.spec.ts
git commit -m "✨ feat(vue3): 浮动窗几何纯函数(对侧锚定缩放+视口约束,TDD)"
```

---

## Task 2: useFloatingWindow composable

**Files:**
- Create: `mes/vue3/src/composables/useFloatingWindow.ts`

- [ ] **Step 1: 实现** — Create `mes/vue3/src/composables/useFloatingWindow.ts`：
```ts
import { reactive, ref, computed, onUnmounted } from 'vue'
import {
  clampToViewport,
  resizeGeometry,
  type Geometry,
  type ResizeDir,
  type SizeConstraints,
} from '@/utils/floatingWindow'

/**
 * 浮动窗交互状态机：持有响应式 geometry，提供拖拽 / 八方向缩放的 pointer 处理。
 * geometry 在调用方（AiAssistant）持有 → 开关期间位置/尺寸保留。
 */
export function useFloatingWindow(initial: Geometry, constraints: SizeConstraints) {
  const geom = reactive<Geometry>({ ...initial })
  const dragging = ref(false)

  const style = computed(() => ({
    left: `${geom.x}px`,
    top: `${geom.y}px`,
    width: `${geom.w}px`,
    height: `${geom.h}px`,
  }))

  /** 启动一次拖动会话：记录指针起点，move 时回调累计位移，up 时清理监听 */
  function beginSession(e: PointerEvent, onMove: (dx: number, dy: number) => void) {
    e.preventDefault()
    dragging.value = true
    const startX = e.clientX
    const startY = e.clientY
    const move = (ev: PointerEvent) => onMove(ev.clientX - startX, ev.clientY - startY)
    const up = () => {
      dragging.value = false
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  function startDrag(e: PointerEvent) {
    const base = { x: geom.x, y: geom.y, w: geom.w, h: geom.h }
    beginSession(e, (dx, dy) => {
      const next = clampToViewport(
        { x: base.x + dx, y: base.y + dy, w: base.w, h: base.h },
        window.innerWidth,
        window.innerHeight,
      )
      geom.x = next.x
      geom.y = next.y
    })
  }

  function startResize(e: PointerEvent, dir: ResizeDir) {
    e.stopPropagation()
    const base = { x: geom.x, y: geom.y, w: geom.w, h: geom.h }
    beginSession(e, (dx, dy) => {
      const next = resizeGeometry(base, dir, dx, dy, constraints, window.innerWidth, window.innerHeight)
      geom.x = next.x
      geom.y = next.y
      geom.w = next.w
      geom.h = next.h
    })
  }

  onUnmounted(() => {
    dragging.value = false
  })

  return { geom, dragging, style, startDrag, startResize }
}
```

- [ ] **Step 2: typecheck** — Run: `pnpm typecheck` → Expected: 无新增错误。

- [ ] **Step 3: Commit**
```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack-Vue
git add mes/vue3/src/composables/useFloatingWindow.ts
git commit -m "✨ feat(vue3): useFloatingWindow 拖拽/八方向缩放 composable"
```

---

## Task 3: AiChatWindow.vue 浮动窗组件

新建窗口组件（先不接线，standalone 即可 typecheck）。内部 header/列表/空状态/输入与旧抽屉完全一致，仅外壳与手柄不同。

**Files:**
- Create: `mes/vue3/src/components/ai/AiChatWindow.vue`

- [ ] **Step 1: 实现** — Create `mes/vue3/src/components/ai/AiChatWindow.vue`：
```vue
<template>
  <div class="ai-window" :class="{ 'is-dragging': fw.dragging.value }" :style="fw.style.value">
    <!-- 8 个缩放手柄（置于内容之上） -->
    <div
      v-for="dir in RESIZE_DIRS"
      :key="dir"
      :class="`ai-window__resize ai-window__resize--${dir}`"
      @pointerdown="(e) => fw.startResize(e as PointerEvent, dir)"
    />

    <!-- header = 拖拽手柄 -->
    <div class="ai-window__header" @pointerdown="fw.startDrag">
      <span class="ai-window__title">🐙 AI 智能助手</span>
      <div class="ai-window__hactions">
        <el-button
          text
          size="small"
          :disabled="!chat.messages.value.length"
          @pointerdown.stop
          @click="chat.reset()"
        >
          清空
        </el-button>
        <button
          class="ai-window__close"
          type="button"
          title="关闭"
          @pointerdown.stop
          @click="emit('update:modelValue', false)"
        >
          <el-icon><Close /></el-icon>
        </button>
      </div>
    </div>

    <div class="ai-window__body">
      <div ref="listEl" class="ai-window__list">
        <template v-if="chat.messages.value.length">
          <AiMessage v-for="(m, i) in chat.messages.value" :key="i" :message="m" />
        </template>
        <div v-else class="ai-window__empty">
          <p class="ai-window__empty-title">你好，我能查询 MES 实时数据并给出分析建议 👋</p>
          <div class="ai-window__chips">
            <button
              v-for="q in SUGGESTIONS"
              :key="q"
              class="ai-window__chip"
              type="button"
              @click="ask(q)"
            >
              {{ q }}
            </button>
          </div>
        </div>
      </div>

      <div class="ai-window__input">
        <el-input
          v-model="draft"
          type="textarea"
          :rows="2"
          resize="none"
          placeholder="输入问题，Enter 发送 / Shift+Enter 换行"
          @keydown="(e: Event) => onKeydown(e as KeyboardEvent)"
        />
        <div class="ai-window__actions">
          <el-button v-if="chat.sending.value" type="danger" plain size="small" @click="chat.stop()">
            停止
          </el-button>
          <el-button
            v-else
            type="primary"
            size="small"
            :disabled="!draft.trim()"
            @click="ask(draft)"
          >
            发送
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, watch } from 'vue'
import { Close } from '@element-plus/icons-vue'
import AiMessage from './AiMessage.vue'
import type { useAiChat } from '@/composables/useAiChat'
import type { useFloatingWindow } from '@/composables/useFloatingWindow'
import type { ResizeDir } from '@/utils/floatingWindow'

const props = defineProps<{
  modelValue: boolean
  chat: ReturnType<typeof useAiChat>
  fw: ReturnType<typeof useFloatingWindow>
}>()
const emit = defineEmits<{ 'update:modelValue': [boolean] }>()

const RESIZE_DIRS: ResizeDir[] = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw']

const SUGGESTIONS = [
  '本月生产工单完成情况如何？',
  '当前设备运行状态分布',
  '哪些物料低于安全库存？',
  '给我一份生产看板总览',
]

const draft = ref('')
const listEl = ref<HTMLElement | null>(null)

async function scrollToBottom() {
  await nextTick()
  if (listEl.value) listEl.value.scrollTop = listEl.value.scrollHeight
}

function ask(text: string) {
  const t = text.trim()
  if (!t || props.chat.sending.value) return
  draft.value = ''
  props.chat.send(t)
  scrollToBottom()
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    ask(draft.value)
  }
}

watch(
  () => props.chat.messages.value.map((m) => m.content + m.steps.length).join('|'),
  scrollToBottom,
)
</script>

<style scoped>
/* 开合动画：从右下角悬浮球缩放淡入 */
.ai-window-enter-active,
.ai-window-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.22s cubic-bezier(0.16, 1, 0.3, 1);
  transform-origin: bottom right;
}
.ai-window-enter-from,
.ai-window-leave-to {
  opacity: 0;
  transform: scale(0.85);
}

.ai-window {
  position: fixed;
  z-index: 2001;
  display: flex;
  flex-direction: column;
  background: var(--bg-card, #fff);
  border: 1px solid var(--border, #e4e7ed);
  border-radius: 12px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.18);
  overflow: hidden;
}
.ai-window.is-dragging {
  user-select: none;
}

.ai-window__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 44px;
  padding: 0 12px;
  border-bottom: 1px solid var(--border, #e4e7ed);
  cursor: move;
  user-select: none;
  flex: 0 0 auto;
}
.ai-window__title {
  font-weight: 600;
  font-size: 14px;
}
.ai-window__hactions {
  display: flex;
  align-items: center;
  gap: 4px;
}
.ai-window__close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border: none;
  border-radius: 6px;
  background: none;
  color: var(--text-secondary, #909399);
  cursor: pointer;
  transition: background 0.15s;
}
.ai-window__close:hover {
  background: var(--bg-body, #f5f7fa);
}

.ai-window__body {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  padding: 8px 12px 12px;
}
.ai-window__list {
  flex: 1;
  overflow-y: auto;
  padding: 4px 2px;
}
.ai-window__empty {
  padding: 24px 8px;
  text-align: center;
  color: var(--text-secondary, #909399);
}
.ai-window__empty-title {
  margin-bottom: 16px;
  font-size: 14px;
}
.ai-window__chips {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.ai-window__chip {
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-card);
  cursor: pointer;
  font-size: 13px;
  text-align: left;
  transition: border-color 0.2s;
}
.ai-window__chip:hover {
  border-color: var(--brand, #409eff);
  color: var(--brand, #409eff);
}
.ai-window__input {
  padding-top: 8px;
  border-top: 1px solid var(--border);
  flex: 0 0 auto;
}
.ai-window__actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 6px;
}

/* 缩放手柄：边 6px、角 12px，置于内容之上 */
.ai-window__resize {
  position: absolute;
  z-index: 5;
}
.ai-window__resize--n {
  top: 0;
  left: 0;
  right: 0;
  height: 6px;
  cursor: ns-resize;
}
.ai-window__resize--s {
  bottom: 0;
  left: 0;
  right: 0;
  height: 6px;
  cursor: ns-resize;
}
.ai-window__resize--e {
  top: 0;
  bottom: 0;
  right: 0;
  width: 6px;
  cursor: ew-resize;
}
.ai-window__resize--w {
  top: 0;
  bottom: 0;
  left: 0;
  width: 6px;
  cursor: ew-resize;
}
.ai-window__resize--ne,
.ai-window__resize--nw,
.ai-window__resize--se,
.ai-window__resize--sw {
  width: 12px;
  height: 12px;
  z-index: 6;
}
.ai-window__resize--ne {
  top: 0;
  right: 0;
  cursor: nesw-resize;
}
.ai-window__resize--nw {
  top: 0;
  left: 0;
  cursor: nwse-resize;
}
.ai-window__resize--se {
  bottom: 0;
  right: 0;
  cursor: nwse-resize;
}
.ai-window__resize--sw {
  bottom: 0;
  left: 0;
  cursor: nesw-resize;
}
</style>
```

> 已知细节：右上角 12px 角手柄可能与关闭按钮顶部极小区域重叠；手动验证时若关闭按钮难点，把 `--ne` 角手柄缩到 10px 或给 `__hactions` 增加 `padding-right`。非阻断。

- [ ] **Step 2: typecheck** — Run: `pnpm typecheck` → Expected: 无新增错误（AiChatWindow standalone 编译通过；旧 AiChatDrawer 仍在不冲突）。

- [ ] **Step 3: Commit**
```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack-Vue
git add mes/vue3/src/components/ai/AiChatWindow.vue
git commit -m "✨ feat(vue3): AiChatWindow 浮动窗组件(拖拽 header+8 缩放手柄+关闭)"
```

---

## Task 4: 接线 AiAssistant + 删除旧抽屉 + 动画收尾

**Files:**
- Modify: `mes/vue3/src/components/ai/AiAssistant.vue`
- Delete: `mes/vue3/src/components/ai/AiChatDrawer.vue`

- [ ] **Step 1: 改写 AiAssistant.vue** — 覆盖 `mes/vue3/src/components/ai/AiAssistant.vue`：
```vue
<template>
  <AiFab @click="open = !open" />
  <Transition name="ai-window">
    <AiChatWindow v-if="open" v-model="open" :chat="chat" :fw="fw" />
  </Transition>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import AiFab from './AiFab.vue'
import AiChatWindow from './AiChatWindow.vue'
import { useAiChat } from '@/composables/useAiChat'
import { useFloatingWindow } from '@/composables/useFloatingWindow'
import { clampToViewport, type Geometry, type SizeConstraints } from '@/utils/floatingWindow'

// 会话与开关状态持有于此，开关期间保留历史与窗口几何
const open = ref(false)
const chat = useAiChat()

const W = 380
const H = 560
const vw = window.innerWidth
const vh = window.innerHeight
const initial: Geometry = clampToViewport({ x: vw - W - 24, y: vh - H - 24, w: W, h: H }, vw, vh)
const constraints: SizeConstraints = { minW: 320, minH: 360, maxW: vw, maxH: vh }
const fw = useFloatingWindow(initial, constraints)
</script>
```

- [ ] **Step 2: 删除旧抽屉**
```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack-Vue
git rm mes/vue3/src/components/ai/AiChatDrawer.vue
```

- [ ] **Step 3: typecheck** — Run: `pnpm typecheck` → Expected: 无错误（已无对 AiChatDrawer 的引用）。

- [ ] **Step 4: build（同时让 unplugin 重新生成 components.d.ts）** — Run: `pnpm build` → Expected: 成功。`src/types/components.d.ts` 中 `AiChatDrawer` 条目移除、`AiChatWindow` 加入。

- [ ] **Step 5: lint** — Run: `pnpm lint` → Expected: 0 error（既有 warning 可忽略，勿引入新 error）。

- [ ] **Step 6: 全量测试** — Run: `pnpm test` → Expected: 全绿（含 Task 1 新增 13 用例；原 182 不回归）。

- [ ] **Step 7: Commit**
```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack-Vue
git add mes/vue3/src/components/ai/AiAssistant.vue mes/vue3/src/types/components.d.ts
git commit -m "✨ feat(vue3): AI 助手改浮动窗(FAB toggle+Transition 缩放淡入,删抽屉)"
```

---

## 手动验证清单（Task 4 后）

- [ ] 点击悬浮球：窗口从右下角缩放淡入；再次点击/关闭按钮：逆向淡出。
- [ ] 拖 header：窗口跟手移动，松手即停；拖到边界被夹在视口内。
- [ ] 八个方向手柄缩放：西/北边对侧锚定；到达最小尺寸不再缩；光标形状正确。
- [ ] 清空 / 发送 / 停止 / Enter 发送 / 建议 chip 均正常（拖拽手柄不误触发这些按钮）。
- [ ] 打字机 + Markdown + 步骤时间线显示正常。
- [ ] 关闭再打开：窗口位置/尺寸与会话历史保留。

---

## 完成标准（DoD）

- [ ] `tests/floatingWindow.spec.ts` 全绿；`pnpm test` 全量全绿
- [ ] `pnpm typecheck` / `pnpm build` / `pnpm lint`(0 error) 通过
- [ ] 浮动窗可拖拽、八方向缩放、开合动画优雅跟手
- [ ] 旧 `AiChatDrawer.vue` 删除，无残留引用
- [ ] 后端零改动，geometry 仅会话内存
