# AI 助手快捷提示词 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 AI 助手面板空状态区域添加便利贴风格的快捷提示词，用户点击蓝色下划线问题直接发送消息。

**Architecture:** 新增 QuickPrompts 组件渲染黄色便利贴卡片，修改 AIChatPanel 空状态区域调用该组件。提示词数据通过前端常量提供，api/ai.ts 预留后端获取函数供后续扩展。

**Tech Stack:** React 18 + TypeScript + Zustand + Ant Design 5（内联样式，与现有 AI 组件一致）

---

### Task 1: 添加 QuickPrompt 类型定义

**Files:**
- Create: `mes/frontend/src/types/ai.ts`

- [ ] **Step 1: 创建类型文件**

```typescript
/** 快捷提示词 */
export interface QuickPrompt {
  /** 唯一标识 */
  id: string
  /** 实际发送给 AI 的完整问题文本 */
  text: string
  /** 便利贴上显示的简短文本 */
  displayText: string
  /** emoji 图标 */
  icon?: string
}
```

- [ ] **Step 2: 验证 TypeScript 编译通过**

Run: `cd mes/frontend && npx tsc --noEmit`
Expected: 无新增错误

- [ ] **Step 3: Commit**

```bash
git add mes/frontend/src/types/ai.ts
git commit -m "feat: add QuickPrompt type definition"
```

---

### Task 2: 在 api/ai.ts 中预留 fetchQuickPrompts

**Files:**
- Modify: `mes/frontend/src/api/ai.ts`

- [ ] **Step 1: 添加 fetchQuickPrompts 函数和默认提示词常量**

在 `api/ai.ts` 文件末尾追加以下代码：

```typescript
import type { QuickPrompt } from '@/types/ai'

/** 默认快捷提示词（前端常量，后续可从后端获取） */
const DEFAULT_QUICK_PROMPTS: QuickPrompt[] = [
  {
    id: '1',
    text: '今天有哪些待处理的工单？',
    displayText: '今日待处理工单',
    icon: '📋',
  },
  {
    id: '2',
    text: '当前产线运行状态如何？',
    displayText: '当前产线运行状态',
    icon: '📊',
  },
  {
    id: '3',
    text: '设备OEE数据怎么看？',
    displayText: '设备OEE数据分析',
    icon: '🏭',
  },
  {
    id: '4',
    text: '如何创建工艺路线？',
    displayText: '创建工艺路线的方法',
    icon: '🔄',
  },
  {
    id: '5',
    text: 'BOM表如何录入和维护？',
    displayText: 'BOM表录入与维护',
    icon: '📝',
  },
]

/**
 * 获取快捷提示词列表
 *
 * 当前返回前端默认常量，后续可改为 HTTP GET 请求从后端获取，
 * 以支持后台动态配置提示词。
 */
export function fetchQuickPrompts(): Promise<QuickPrompt[]> {
  // TODO: 后续替换为后端 API 调用
  // return fetch('/api/admin/ai/prompts', { credentials: 'include' })
  //   .then(res => res.json())
  return Promise.resolve(DEFAULT_QUICK_PROMPTS)
}
```

- [ ] **Step 2: 验证 TypeScript 编译通过**

Run: `cd mes/frontend && npx tsc --noEmit`
Expected: 无新增错误

- [ ] **Step 3: Commit**

```bash
git add mes/frontend/src/api/ai.ts
git commit -m "feat: add fetchQuickPrompts with default prompt constants"
```

---

### Task 3: 创建 QuickPrompts 便利贴组件

**Files:**
- Create: `mes/frontend/src/components/ai/QuickPrompts.tsx`

- [ ] **Step 1: 创建组件文件**

```typescript
import type { QuickPrompt } from '@/types/ai'

interface QuickPromptsProps {
  /** 提示词列表 */
  prompts: QuickPrompt[]
  /** 用户点击某个提示词时的回调 */
  onPromptClick: (prompt: QuickPrompt) => void
}

/** 便利贴样式的快捷提示词卡片 */
export default function QuickPrompts({ prompts, onPromptClick }: QuickPromptsProps) {
  if (!prompts || prompts.length === 0) return null

  return (
    <div
      style={{
        background: '#fffef0',
        border: '1px solid #f0e8c0',
        borderRadius: 8,
        padding: 18,
        maxWidth: 320,
        margin: '0 auto',
        boxShadow: '2px 2px 8px rgba(0,0,0,0.08)',
        lineHeight: 2.2,
        fontSize: 13,
        color: '#555',
      }}
    >
      <p style={{ margin: '0 0 8px 0' }}>👋 您好！我可以帮您：</p>
      {prompts.map((prompt) => (
        <p key={prompt.id} style={{ margin: '4px 0' }}>
          {prompt.icon && <span style={{ marginRight: 4 }}>{prompt.icon}</span>}
          <span
            onClick={() => onPromptClick(prompt)}
            style={{
              color: '#1677ff',
              borderBottom: '1px dashed #1677ff',
              cursor: 'pointer',
              transition: 'color 0.2s, border-color 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#0958d9'
              e.currentTarget.style.borderBottomColor = '#0958d9'
              e.currentTarget.style.borderBottomStyle = 'solid'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#1677ff'
              e.currentTarget.style.borderBottomColor = '#1677ff'
              e.currentTarget.style.borderBottomStyle = 'dashed'
            }}
          >
            {prompt.displayText}
          </span>
        </p>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: 验证 TypeScript 编译通过**

Run: `cd mes/frontend && npx tsc --noEmit`
Expected: 无新增错误

- [ ] **Step 3: Commit**

```bash
git add mes/frontend/src/components/ai/QuickPrompts.tsx
git commit -m "feat: add QuickPrompts sticky-note component"
```

---

### Task 4: 修改 AIChatPanel 集成 QuickPrompts

**Files:**
- Modify: `mes/frontend/src/components/ai/AIChatPanel.tsx`

- [ ] **Step 1: 添加 import 语句**

在文件顶部现有 imports 下方添加：

```typescript
import QuickPrompts from './QuickPrompts'
import { fetchQuickPrompts } from '@/api/ai'
import type { QuickPrompt } from '@/types/ai'
```

- [ ] **Step 2: 添加 useState 管理快捷提示词数据**

在现有 `useState` 行（`const [inputValue, setInputValue] = useState('')`）后添加：

```typescript
const [quickPrompts, setQuickPrompts] = useState<QuickPrompt[]>([])

// 加载快捷提示词
useEffect(() => {
  fetchQuickPrompts().then(setQuickPrompts)
}, [])
```

- [ ] **Step 3: 添加 handlePromptClick**

在 `handleKeyDown` 函数定义之后添加：

```typescript
const handlePromptClick = (prompt: QuickPrompt) => {
  sendMessage(prompt.text)
}
```

- [ ] **Step 4: 替换空状态区域**

将现有的空状态 JSX（`messages.length === 0 && (...)` 块，原第 109-123 行）替换为：

```typescript
{messages.length === 0 && quickPrompts.length > 0 && (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100%',
      paddingTop: 40,
    }}
  >
    <QuickPrompts
      prompts={quickPrompts}
      onPromptClick={handlePromptClick}
    />
  </div>
)}
```

> **说明：** 完整替换后，空状态区域的第 109-123 行（原问候文本）改为上述代码块。便利贴居中显示在消息区域内。

- [ ] **Step 5: 验证 TypeScript 编译通过**

Run: `cd mes/frontend && npx tsc --noEmit`
Expected: 无新增错误

- [ ] **Step 6: Commit**

```bash
git add mes/frontend/src/components/ai/AIChatPanel.tsx
git commit -m "feat: integrate QuickPrompts into AI chat panel empty state"
```

---

### Task 5: 端到端验证

- [ ] **Step 1: 确认前端 dev server 正在运行**

Run: `lsof -i :3000 | grep LISTEN`
Expected: 有进程监听 3000 端口

- [ ] **Step 2: 确认后端正在运行**

Run: `lsof -i :9090 | grep LISTEN`
Expected: 有进程监听 9090 端口

- [ ] **Step 3: 访问页面并手动验证**

在浏览器打开 http://localhost:3000：
1. 登录后，点击右下角浮动按钮打开 AI 助手面板
2. 验证空状态显示黄色便利贴，内含 5 条快捷提示词
3. 验证蓝色下划线文字 hover 时颜色加深
4. 点击某条快捷提示词（如"今日待处理工单"）
5. 验证消息直接发送，AI 开始流式回复
6. 验证便利贴消失，进入正常对话
7. 点击清除按钮清空消息
8. 验证便利贴重新出现

- [ ] **Step 4: Commit（如有调整）**

根据验证结果进行必要修改后提交。

---

### 改动文件汇总

| 文件 | 操作 | 说明 |
|------|------|------|
| `mes/frontend/src/types/ai.ts` | 新增 | QuickPrompt 类型定义 |
| `mes/frontend/src/api/ai.ts` | 修改 | 新增 fetchQuickPrompts + 默认常量 |
| `mes/frontend/src/components/ai/QuickPrompts.tsx` | 新增 | 便利贴卡片组件 |
| `mes/frontend/src/components/ai/AIChatPanel.tsx` | 修改 | 空状态集成 QuickPrompts |
