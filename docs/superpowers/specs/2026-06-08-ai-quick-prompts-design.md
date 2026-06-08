# AI 助手快捷提示词 — 设计文档

**日期**: 2026-06-08
**状态**: 已确认

## 概述

为 AI 助手面板的空状态添加快捷提示词功能。用户打开 AI 助手时，看到一张便利贴样式的卡片，内含可点击的推荐问题。点击蓝色下划线问题直接发送，无需手动输入。

## 设计决策

| 维度 | 选择 | 说明 |
|------|------|------|
| 布局风格 | 清单式便利贴 | 单张便利贴内每行一个 🔹 + 可点击蓝色问题 |
| 点击行为 | 直接发送 | 点击即发送，一步到位 |
| 显示时机 | 仅空状态 | 无消息时显示便利贴，发送第一条消息后消失 |
| 数据来源 | 前端常量 + 预留接口 | 第一版硬编码，架构支持后续切换后端 API |

## 交互流程

```
用户打开 AI 助手面板
  → 空状态：显示便利贴（含 5 条快捷提问）
  → 用户点击蓝色问题文字
  → 自动发送该问题到 AI
  → 便利贴消失，进入正常对话
  → 清空消息后，便利贴重新出现
```

## 组件设计

### 新增组件

**QuickPrompts.tsx** (`mes/frontend/src/components/ai/QuickPrompts.tsx`)

- Props: `onPromptClick(prompt: QuickPrompt): void`
- 渲染黄色便利贴样式的卡片容器
- 内部渲染提示词列表，每条为一个 `<span>` 蓝色下划线可点击文字
- 点击时调用 `onPromptClick`

### 修改组件

**AIChatPanel.tsx**

- 空状态区域（`messages.length === 0` 时）替换：
  - 移除当前简单问候文本
  - 替换为 `<QuickPrompts>` 组件
- `onPromptClick` 回调：调用 store 的 `sendMessage(prompt.text)`

### 类型定义

**types/ai.ts** — 新增 `QuickPrompt` 接口：

```typescript
export interface QuickPrompt {
  id: string;
  text: string;       // 实际发送的问题文本
  displayText: string; // 便利贴上显示的文本（如 "今日待处理工单"）
  icon?: string;       // emoji 图标，如 "📋"
}
```

### Store 修改

**aiChatStore.ts**

- 新增 `quickPrompts: QuickPrompt[]` 状态（从常量初始化）
- 预留 `fetchQuickPrompts()` action（后续从后端获取时调用）

### API 预留

**api/ai.ts**

- 预留 `fetchQuickPrompts(): Promise<QuickPrompt[]>` 函数，当前直接返回常量
- 后续只需改为 HTTP GET 调用即可切换后端数据源

## 默认快捷提示词

```typescript
const DEFAULT_QUICK_PROMPTS: QuickPrompt[] = [
  { id: '1', text: '今天有哪些待处理的工单？', displayText: '今日待处理工单', icon: '📋' },
  { id: '2', text: '当前产线运行状态如何？', displayText: '当前产线运行状态', icon: '📊' },
  { id: '3', text: '设备OEE数据怎么看？', displayText: '设备OEE数据分析', icon: '🏭' },
  { id: '4', text: '如何创建工艺路线？', displayText: '创建工艺路线的方法', icon: '🔄' },
  { id: '5', text: 'BOM表如何录入和维护？', displayText: 'BOM表录入与维护', icon: '📝' },
];
```

## 便利贴视觉规格

- 背景色：`#fffef0`（浅黄），模拟真实便利贴
- 边框：`1px solid #f0e8c0`
- 圆角：`8px`
- 阴影：`2px 2px 8px rgba(0,0,0,0.08)`，微立体感
- 可点击文字：`#1677ff` 蓝色 + `border-bottom: 1px dashed` 虚线下划线
- Hover 时文字颜色加深 + 下划线变实线

## 改动范围

| 文件 | 操作 | 说明 |
|------|------|------|
| `components/ai/QuickPrompts.tsx` | 新增 | 便利贴卡片组件 |
| `components/ai/AIChatPanel.tsx` | 修改 | 空状态替换为 QuickPrompts |
| `types/ai.ts` | 修改 | 新增 QuickPrompt 类型 |
| `stores/aiChatStore.ts` | 修改 | 新增 prompts 配置 |
| `api/ai.ts` | 修改 | 预留 fetchQuickPrompts |

无后端改动。

## 后续扩展

- 后端 `GET /admin/ai/prompts` 接口支持动态配置提示词
- 后台管理页面可编辑提示词内容
- 根据用户角色展示不同的提示词
- 根据当前页面上下文推荐相关提示词
