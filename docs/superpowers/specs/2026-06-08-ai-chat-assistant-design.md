# AI 对话助手 — 设计规范

> 日期：2026-06-08 | 状态：✅ 已确认

## 概述

在 MES 章鱼师兄平台右下角添加 AI 对话助手，帮助用户了解系统功能。用户点击浮动按钮弹出对话窗口，通过自然语言与 AI 交互，获取平台各模块的使用指导。

当前阶段仅做对话功能，后续逐步加入 Agent 和 MCP 能力，实现智能操作（如帮用户新建表单、管理物件等）。

---

## 一、前端设计

### 1.1 FloatButton

- 位置：`position: fixed; bottom: 24px; right: 24px; z-index: 1000`
- 外观：蓝色渐变圆形按钮（直径 56px），带 `box-shadow`
- 图标：默认 `RobotOutlined`（白色），面板打开时切换为 `CloseOutlined`
- 交互：点击切换面板开/关；hover 时放大至 60px + 加深阴影
- 放置位置：`AdminLayout` 内，仅认证用户可见

### 1.2 AIChatPanel

- 定位：FloatButton 上方，`position: fixed; bottom: 96px; right: 24px`
- 尺寸：宽 420px，高 540px
- 结构：
  - **Header**：蓝色背景（`#1677ff`），标题 "🤖 AI 助手"，右侧关闭按钮
  - **MessageList**：消息列表区域，`overflow-y: auto`，新消息自动滚底
  - **ChatInput**：底部输入区，`Input.TextArea` + 发送按钮，Enter 发送 / Shift+Enter 换行
- 动效：弹出/收起使用 `fadeIn` + `slideUp` 动画（CSS transition）
- 外部点击不关闭（用户可能需要参考页面内容进行提问）

### 1.3 ChatMessage

- User 消息：右对齐，蓝色气泡（`#e8f4fd` 背景）
- Assistant 消息：左对齐，浅灰气泡（`#f5f5f5` 背景），支持 Markdown 渲染
- 每条消息包含：头像（User / Robot 图标）、内容、时间戳

### 1.4 状态管理 (aiChatStore)

```ts
interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

interface AIChatState {
  isOpen: boolean
  messages: Message[]
  isLoading: boolean
  toggle: () => void
  open: () => void
  close: () => void
  sendMessage: (content: string) => Promise<void>
  clearMessages: () => void
}
```

- `sendMessage` 流程：
  1. 将用户消息追加到 `messages`
  2. 追加一条空的 assistant 消息（`content: ''`）
  3. 调用 `/api/ai/chat`（SSE 流），逐段更新 assistant content
  4. 流结束或出错后设置 `isLoading = false`

### 1.5 文件结构

```
src/
├── components/ai/
│   ├── FloatButton.tsx
│   ├── AIChatPanel.tsx
│   └── ChatMessage.tsx
├── stores/aiChatStore.ts
└── api/ai.ts
```

---

## 二、后端设计

### 2.1 API 端点

`POST /api/ai/chat`

**请求体：**
```json
{
  "messages": [
    { "role": "user", "content": "如何创建一个新用户？" }
  ]
}
```

**响应：** SSE 流式（`text/event-stream`）
```
data: {"id":"...","choices":[{"delta":{"content":"你好"}}]}
data: {"id":"...","choices":[{"delta":{"content":"！"}}]}
data: [DONE]
```

### 2.2 核心类

| 类 | 文件 | 职责 |
|---|---|---|
| `AiChatController` | `system/controller/admin/AiChatController.java` | 接收 POST 请求，SSE 响应 |
| `AiChatService` | `system/service/AiChatService.java` | 构建系统提示词，组装 messages，调用 DeepSeek API |

### 2.3 配置项 (`application.yml`)

```yaml
deepseek:
  api-key: ${DEEPSEEK_API_KEY:}
  base-url: https://api.deepseek.com
  model: deepseek-chat
```

### 2.4 系统提示词

AI 系统提示词描述 MES 章鱼师兄平台的全部功能模块：

- **系统管理**：用户管理、角色权限、菜单配置、部门管理、数据字典、团队管理
- **基础数据**：物料管理、通用管理（动态表配置）、设备组、工序单元、仓库、组件
- **工艺技术**：BOM 管理、产品 BOM 编辑器、工艺流程（Flow）、流程工序（Transfer Shuttle）、工序管理、工艺流程图、工艺内容、工艺查询
- **生产订单**：生产订单管理
- **数字化**：计划看板（ECharts）、3D 仿真（Three.js）
- **系统工具**：图标选择器、颜色选择器、富文本编辑器、分步表单

提示词定位：让用户了解"平台能做什么、某个功能在哪里、如何操作"。

### 2.5 安全

- Controller 路径 `/api/ai/chat` 在 Shiro 过滤器链的 `authc` 保护范围内
- 无需额外鉴权逻辑

---

## 三、对话历史管理

- 第一版：对话历史仅存浏览器内存（Zustand store），页面刷新后清空
- 后续可扩展：持久化到数据库，支持历史记录查看和继续对话

---

## 四、错误处理

| 场景 | 处理方式 |
|------|----------|
| 网络异常 | 消息列表末尾显示 "⚠️ 网络连接失败，请稍后重试" |
| API 返回错误 | 解析 `Result.msg`，展示具体错误信息 |
| 流式响应中断 | 已接收内容保留，末尾追加 "（响应中断）" 标记 |
| 空消息提交 | 发送按钮 disabled |
| 发送中重复提交 | `isLoading` 期间按钮显示 loading + disabled |
| 超长对话 | 消息列表区域内部滚动，不做硬限制 |
| XSS 安全 | React 默认转义；Markdown 使用安全渲染库 |
| 页面路由切换 | 面板不自动关闭，保持对话连续性 |
| 键盘操作 | Enter 发送 / Shift+Enter 换行 / Esc 关闭面板 |

---

## 五、后续扩展（不在当前范围）

- Agent 能力：AI 可调用平台 API 执行操作（新建表单、管理物件等）
- MCP 集成：通过 Model Context Protocol 接入外部工具
- 对话历史持久化到数据库
- 多轮对话上下文管理优化
