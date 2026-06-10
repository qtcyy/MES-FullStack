# AI 助手窗口增强设计

> 日期：2026-06-10
> 状态：已确认
> 分支：feature/smart-dashboard-redesign

## 1. 概述

为 AI 助手聊天窗口增加三个交互能力：
1. 最大化/还原 — 填满全屏专注对话
2. 自由拖拽 — 小窗模式下拖动到任意位置
3. 开关动画 — motion spring 过渡

### 1.1 当前基线

- `AIChatPanel.tsx`：固定右下角，420×540，纯 div + inline style
- `aiChatStore.ts`：仅 isOpen 控制显隐
- `FloatButton.tsx`：圆形浮动按钮，toggle 显隐
- `motion` v12.40.0 已安装

### 1.2 约束

- 拖拽位置不记忆，每次打开重置右下角
- 最大化覆盖全视口（含侧边栏）
- 仅 Header 区域可拖拽
- 选 motion 原生 drag + AnimatePresence 方案

## 2. 架构

### 2.1 改动范围

| 文件 | 改动类型 | 说明 |
|------|----------|------|
| `stores/aiChatStore.ts` | 修改 | 新增 isMaximized + toggleMaximize |
| `components/ai/AIChatPanel.tsx` | 重写 | motion.div 包裹 + 最大化/拖拽/动画 |

不修改：FloatButton、ChatMessage、QuickPrompts、AdminLayout

### 2.2 状态

```
aiChatStore
  ├─ isOpen: boolean           → AnimatePresence 控制面板挂载/卸载
  ├─ isMaximized: boolean      → motion animate target 切换
  ├─ toggleMaximize(): void    → Header按钮 / 遮罩点击 / Escape
  └─ close(): void             → 不变
```

### 2.3 组件结构

```
<AnimatePresence>
  {isOpen && (
    <>
      {isMaximized && <motion.div key="backdrop" />}
      <div ref={constraintsRef} (pointer-events: none) />
      <motion.div key="panel" drag={!isMaximized} dragConstraints={constraintsRef}>
        ├─ Header（🤖 + 清空 + 最大化/还原 + 关闭）
        ├─ Messages
        ├─ Thinking
        └─ Input
      </motion.div>
    </>
  )}
</AnimatePresence>
```

## 3. 交互规格

### 3.1 小窗模式

| 属性 | 值 |
|------|-----|
| 位置 | 右下角（bottom: 96, right: 24），每次打开重置 |
| 尺寸 | 420 × 540 |
| 圆角 | 12px |
| 拖拽 | ✅ 仅 Header 触发，全视口范围约束，边界弹性 0.05 |
| Header 光标 | `grab` |

### 3.2 最大化模式

| 属性 | 值 |
|------|-----|
| 尺寸 | 100vw × 100vh |
| 圆角 | 0 |
| 遮罩 | 半透明黑色 rgba(0,0,0,0.3) |
| 拖拽 | ❌ 禁用 |
| Header 光标 | `default` |

### 3.3 触发方式

| 操作 | 行为 |
|------|------|
| 点击 🔲 最大化按钮 | 小窗 → 最大化（spring） |
| 点击 🔳 还原按钮 | 最大化 → 小窗（spring） |
| 点击遮罩 | 最大化 → 还原 |
| Escape（最大化时） | 先还原，再按关闭 |
| Escape（小窗时） | 关闭面板 |

### 3.4 动画

```
入场: opacity 0→1, scale 0.85→1, y +40→0
退场: opacity 1→0, scale 1→0.9, y 0→+30
切换: 小窗 ↔ 最大化，spring stiffness:400 damping:35
过渡: duration 0.25s
```

## 4. 关键边界

- **拖拽约束**：面板不能完全拖出视口，使用 `dragConstraints` ref 限制
- **遮罩动画**：fade in/out 0.2s，与面板弹簧动画独立
- **Escape 双重义**：最大化先还原，小窗直接关闭 — 在 `handleKeyDown` 中按优先级处理
- **拖拽不记忆**：关闭时 `isOpen` 变 false，AnimatePresence 卸载组件，motion 重置所有 animate 值
- **Header 不影响拖拽**：Header 上的按钮点击不触发拖拽（motion 的 `dragListener` 默认排除 interactive 元素）

## 5. 验证清单

- [ ] 打开面板：右下角弹出带 spring 动画
- [ ] 关闭面板：缩小淡出动画
- [ ] 拖拽：小窗下按住 Header 拖动，面板跟随，松手停住
- [ ] 最大化：点击展开按钮，面板铺满全屏 + 遮罩出现
- [ ] 还原：点击还原/遮罩/Escape，回到小窗
- [ ] Header 按钮：清空、最大化、关闭三个按钮正常工作
- [ ] 键盘：Enter 发送、Escape 关闭/还原
- [ ] 构建：tsc + vite build 无错误
