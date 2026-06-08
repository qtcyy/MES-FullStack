# AI 对话助手 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 MES 平台右下角添加 AI 对话助手，让用户通过自然语言了解系统功能

**Architecture:** 后端通过 Spring Boot Controller 代理 DeepSeek API 调用（SSE 流式），前端在 AdminLayout 中嵌入 FloatButton + AIChatPanel 组件，使用 Zustand 管理对话状态

**Tech Stack:** Java 8 / Spring Boot 2.1.7 / RestTemplate / SseEmitter / React 19 / TypeScript / Ant Design 6 / Zustand 5

---

### Task 1: Backend — 添加 DeepSeek 配置

**Files:**
- Modify: `mes/src/main/resources/application.yml`

- [ ] **Step 1: 添加配置项**

```yaml
# application.yml — 在文件末尾追加
deepseek:
  api-key: ${DEEPSEEK_API_KEY:}
  base-url: https://api.deepseek.com
  model: deepseek-chat
```

- [ ] **Step 2: 在 application-dev.yml 中添加本地开发默认值**

```yaml
# application-dev.yml — 在文件末尾追加（空值，运行时通过环境变量或直接填写）
deepseek:
  api-key:
```

- [ ] **Step 3: 验证配置可被 Spring 读取**

```bash
cd mes && mvn validate
```

- [ ] **Step 4: Commit**

```bash
git add mes/src/main/resources/application.yml mes/src/main/resources/application-dev.yml
git commit -m "feat: add DeepSeek API configuration"
```

---

### Task 2: Backend — 创建 DTO 类

**Files:**
- Create: `mes/src/main/java/com/wangziyang/mes/system/dto/AiChatRequest.java`
- Create: `mes/src/main/java/com/wangziyang/mes/system/dto/AiMessage.java`

- [ ] **Step 1: 创建 AiMessage DTO**

```java
package com.wangziyang.mes.system.dto;

import java.io.Serializable;

/**
 * AI 对话消息
 */
public class AiMessage implements Serializable {

    private static final long serialVersionUID = 1L;

    private String role;
    private String content;

    public AiMessage() {
    }

    public AiMessage(String role, String content) {
        this.role = role;
        this.content = content;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }
}
```

- [ ] **Step 2: 创建 AiChatRequest DTO**

```java
package com.wangziyang.mes.system.dto;

import java.io.Serializable;
import java.util.List;

/**
 * AI 对话请求
 */
public class AiChatRequest implements Serializable {

    private static final long serialVersionUID = 1L;

    private List<AiMessage> messages;

    public List<AiMessage> getMessages() {
        return messages;
    }

    public void setMessages(List<AiMessage> messages) {
        this.messages = messages;
    }
}
```

- [ ] **Step 3: 验证编译**

```bash
cd mes && mvn compile -pl . -q
```

- [ ] **Step 4: Commit**

```bash
git add mes/src/main/java/com/wangziyang/mes/system/dto/
git commit -m "feat: add AI chat DTO classes"
```

---

### Task 3: Backend — 创建 AiChatService

**Files:**
- Create: `mes/src/main/java/com/wangziyang/mes/system/service/IAiChatService.java`
- Create: `mes/src/main/java/com/wangziyang/mes/system/service/impl/AiChatServiceImpl.java`

- [ ] **Step 1: 创建服务接口**

```java
package com.wangziyang.mes.system.service;

import com.wangziyang.mes.system.dto.AiMessage;

import java.util.List;
import java.util.function.Consumer;

/**
 * AI 对话服务
 */
public interface IAiChatService {

    /**
     * 流式聊天 — 每收到一个 token 回调 onChunk
     *
     * @param messages 用户消息列表
     * @param onChunk  每个 token 的回调
     */
    void streamChat(List<AiMessage> messages, Consumer<String> onChunk) throws Exception;
}
```

- [ ] **Step 2: 创建服务实现**

```java
package com.wangziyang.mes.system.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.wangziyang.mes.system.dto.AiMessage;
import com.wangziyang.mes.system.service.IAiChatService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Consumer;

/**
 * AI 对话服务实现 — DeepSeek API 代理
 */
@Service
public class AiChatServiceImpl implements IAiChatService {

    private static final Logger logger = LoggerFactory.getLogger(AiChatServiceImpl.class);

    private static final String SYSTEM_PROMPT =
        "你是 MES 章鱼师兄平台的 AI 助手，帮助用户了解和使用该制造执行系统。\n\n" +
        "平台包含以下功能模块：\n\n" +
        "1. 系统管理：用户管理（新增/编辑/删除用户，管理用户角色）、角色权限（定义角色并分配菜单权限）、" +
        "菜单配置（管理侧边栏导航菜单，支持目录/菜单/按钮三级）、部门管理（组织架构树）、" +
        "数据字典（管理系统中的枚举值和代码表）、团队管理（管理团队及成员工作日历）\n\n" +
        "2. 基础数据：物料管理（原材料/成品/半成品等物料主数据）、通用管理（动态表配置，自定义业务数据表结构）、" +
        "通用管理项（动态表的行数据管理）、设备组（管理设备分组和设备信息）、" +
        "工序单元（定义生产工序）、仓库管理、组件管理\n\n" +
        "3. 工艺技术：BOM 管理（物料清单）、产品 BOM 编辑器（可视化编辑产品 BOM 结构）、" +
        "工艺流程（定义产品的生产流程路线）、流程工序（Transfer Shuttle — 为流程分配工序步骤）、" +
        "工序管理、工艺流程图（可视化查看流程）、工艺内容、工艺查询\n\n" +
        "4. 生产订单：创建和管理生产订单，跟踪生产进度\n\n" +
        "5. 数字化看板：计划仪表盘（ECharts 数据可视化大屏）、3D 仿真（Three.js 工厂 3D 场景）\n\n" +
        "6. 系统工具：图标选择器、颜色选择器、富文本编辑器、分步表单\n\n" +
        "回答风格：简洁、准确。当用户询问某个功能在哪里时，给出明确的导航路径（例如：'系统管理 → 用户管理'）。" +
        "当用户询问如何操作时，给出步骤说明。如果不确定某个细节，诚实告知并建议用户查阅官方文档。";

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    @Value("${deepseek.api-key}")
    private String apiKey;

    @Value("${deepseek.base-url}")
    private String baseUrl;

    @Value("${deepseek.model}")
    private String model;

    public AiChatServiceImpl() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setBufferRequestBody(false);
        this.restTemplate = new RestTemplate(factory);
        this.objectMapper = new ObjectMapper();
    }

    @Override
    public void streamChat(List<AiMessage> messages, Consumer<String> onChunk) throws Exception {
        String url = baseUrl + "/v1/chat/completions";

        // 构建完整消息列表（系统提示词 + 用户消息）
        List<Map<String, String>> fullMessages = new ArrayList<>();
        Map<String, String> systemMsg = new HashMap<>();
        systemMsg.put("role", "system");
        systemMsg.put("content", SYSTEM_PROMPT);
        fullMessages.add(systemMsg);

        for (AiMessage msg : messages) {
            Map<String, String> m = new HashMap<>();
            m.put("role", msg.getRole());
            m.put("content", msg.getContent());
            fullMessages.add(m);
        }

        // 构建请求体
        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("model", model);
        requestBody.put("messages", fullMessages);
        requestBody.put("stream", true);

        // 发起流式请求
        restTemplate.execute(url, HttpMethod.POST, request -> {
            request.getHeaders().setContentType(MediaType.APPLICATION_JSON);
            request.getHeaders().set("Authorization", "Bearer " + apiKey);
            objectMapper.writeValue(request.getBody(), requestBody);
        }, response -> {
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(response.getBody()))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    if (line.startsWith("data: ")) {
                        String data = line.substring(6).trim();
                        if ("[DONE]".equals(data)) {
                            break;
                        }
                        try {
                            onChunk.accept(data);
                        } catch (Exception e) {
                            logger.warn("Error processing chunk: {}", e.getMessage());
                        }
                    }
                }
            }
            return null;
        });
    }
}
```

- [ ] **Step 3: 验证编译**

```bash
cd mes && mvn compile -q
```

- [ ] **Step 4: Commit**

```bash
git add mes/src/main/java/com/wangziyang/mes/system/service/IAiChatService.java mes/src/main/java/com/wangziyang/mes/system/service/impl/AiChatServiceImpl.java
git commit -m "feat: add AI chat service with DeepSeek streaming"
```

---

### Task 4: Backend — 创建 AiChatController

**Files:**
- Create: `mes/src/main/java/com/wangziyang/mes/system/controller/admin/AiChatController.java`

- [ ] **Step 1: 创建控制器**

```java
package com.wangziyang.mes.system.controller.admin;

import com.wangziyang.mes.common.BaseController;
import com.wangziyang.mes.system.dto.AiChatRequest;
import com.wangziyang.mes.system.service.IAiChatService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * AI 对话控制器
 */
@Controller("adminAiChatController")
@RequestMapping("/admin/ai")
public class AiChatController extends BaseController {

    private static final Logger logger = LoggerFactory.getLogger(AiChatController.class);

    private final ExecutorService executor = Executors.newCachedThreadPool();

    @Autowired
    private IAiChatService aiChatService;

    @PostMapping(value = "/chat", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    @ResponseBody
    public SseEmitter chat(@RequestBody AiChatRequest request) {
        // 超时 5 分钟
        SseEmitter emitter = new SseEmitter(300_000L);

        executor.execute(() -> {
            try {
                aiChatService.streamChat(request.getMessages(), chunk -> {
                    try {
                        emitter.send(SseEmitter.event().data(chunk));
                    } catch (IOException e) {
                        logger.error("SSE send error", e);
                    }
                });
                emitter.send(SseEmitter.event().data("[DONE]"));
                emitter.complete();
            } catch (Exception e) {
                logger.error("AI chat error", e);
                try {
                    emitter.send(SseEmitter.event()
                        .data("{\"error\":\"" + e.getMessage() + "\"}"));
                    emitter.complete();
                } catch (IOException ex) {
                    emitter.completeWithError(ex);
                }
            }
        });

        emitter.onCompletion(() -> logger.debug("SSE completed"));
        emitter.onTimeout(() -> logger.debug("SSE timeout"));

        return emitter;
    }
}
```

- [ ] **Step 2: 验证编译**

```bash
cd mes && mvn compile -q
```

- [ ] **Step 3: Commit**

```bash
git add mes/src/main/java/com/wangziyang/mes/system/controller/admin/AiChatController.java
git commit -m "feat: add AI chat SSE controller"
```

---

### Task 5: Frontend — 创建 API 函数

**Files:**
- Create: `mes/frontend/src/api/ai.ts`

- [ ] **Step 1: 创建流式请求函数**

```typescript
interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface DeltaChunk {
  choices?: Array<{
    delta?: {
      content?: string
    }
  }>
}

/**
 * 发送消息到 AI 助手（SSE 流式）
 *
 * @param messages 当前对话消息列表
 * @param onToken  每收到一个 token 的回调
 * @param signal   AbortController signal，用于取消请求
 */
export async function streamChat(
  messages: ChatMessage[],
  onToken: (text: string) => void,
  signal: AbortSignal,
): Promise<void> {
  const response = await fetch('/api/admin/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    }),
    signal,
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || `HTTP ${response.status}`)
  }

  const reader = response.body?.getReader()
  if (!reader) throw new Error('Stream not supported')

  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      // 最后一行可能不完整，保留到下次
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed.startsWith('data: ')) continue

        const data = trimmed.slice(6)
        if (data === '[DONE]') return

        try {
          const parsed = JSON.parse(data) as DeltaChunk
          const content = parsed.choices?.[0]?.delta?.content
          if (content) onToken(content)
        } catch {
          // 跳过无法解析的行
        }
      }
    }
  } finally {
    reader.cancel()
  }
}
```

- [ ] **Step 2: 验证 TypeScript 类型检查**

```bash
cd mes/frontend && npx tsc --noEmit src/api/ai.ts
```

- [ ] **Step 3: Commit**

```bash
git add mes/frontend/src/api/ai.ts
git commit -m "feat: add AI chat streaming API function"
```

---

### Task 6: Frontend — 创建 Zustand Store

**Files:**
- Create: `mes/frontend/src/stores/aiChatStore.ts`

- [ ] **Step 1: 创建 store**

```typescript
import { create } from 'zustand'
import { streamChat } from '@/api/ai'

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

interface AIChatState {
  isOpen: boolean
  messages: Message[]
  isLoading: boolean
  error: string | null

  toggle: () => void
  open: () => void
  close: () => void
  sendMessage: (content: string) => Promise<void>
  clearMessages: () => void
  clearError: () => void
}

let abortController: AbortController | null = null

const useAIChatStore = create<AIChatState>((set, get) => ({
  isOpen: false,
  messages: [],
  isLoading: false,
  error: null,

  toggle: () => set((s) => ({ isOpen: !s.isOpen })),

  open: () => set({ isOpen: true }),

  close: () => {
    // 关闭时取消进行中的请求
    if (abortController) {
      abortController.abort()
      abortController = null
    }
    set({ isOpen: false, isLoading: false })
  },

  sendMessage: async (content: string) => {
    const { messages, isLoading } = get()
    if (isLoading || !content.trim()) return

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: content.trim(),
      timestamp: Date.now(),
    }

    const assistantMsg: Message = {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
    }

    set({
      messages: [...messages, userMsg, assistantMsg],
      isLoading: true,
      error: null,
    })

    // 发送时只传历史消息（不含刚添加的空 assistant）
    const chatMessages = [...get().messages]
      .filter((m) => m.content !== '') // 排除空的 assistant 消息
      .map((m) => ({ role: m.role, content: m.content }))

    abortController = new AbortController()

    try {
      await streamChat(
        chatMessages,
        (token) => {
          set((s) => {
            const msgs = [...s.messages]
            const last = msgs[msgs.length - 1]
            if (last && last.role === 'assistant') {
              msgs[msgs.length - 1] = {
                ...last,
                content: last.content + token,
              }
            }
            return { messages: msgs }
          })
        },
        abortController.signal,
      )
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return

      const errorMsg =
        err instanceof Error ? err.message : '网络连接失败，请稍后重试'
      set((s) => {
        const msgs = [...s.messages]
        // 如果 assistant 消息为空，补充错误提示
        const last = msgs[msgs.length - 1]
        if (last && last.role === 'assistant' && last.content === '') {
          msgs[msgs.length - 1] = {
            ...last,
            content: `⚠️ ${errorMsg}`,
          }
        }
        return { messages: msgs, error: errorMsg }
      })
    } finally {
      abortController = null
      set({ isLoading: false })
    }
  },

  clearMessages: () => set({ messages: [], error: null }),

  clearError: () => set({ error: null }),
}))

export default useAIChatStore
```

- [ ] **Step 2: 验证 TypeScript**

```bash
cd mes/frontend && npx tsc --noEmit src/stores/aiChatStore.ts
```

- [ ] **Step 3: Commit**

```bash
git add mes/frontend/src/stores/aiChatStore.ts
git commit -m "feat: add AI chat Zustand store"
```

---

### Task 7: Frontend — 创建 ChatMessage 组件

**Files:**
- Create: `mes/frontend/src/components/ai/ChatMessage.tsx`

- [ ] **Step 1: 创建消息气泡组件**

```tsx
import { UserOutlined, RobotOutlined } from '@ant-design/icons'
import type { Message } from '@/stores/aiChatStore'

interface ChatMessageProps {
  message: Message
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user'

  return (
    <div
      style={{
        display: 'flex',
        gap: 10,
        marginBottom: 16,
        flexDirection: isUser ? 'row-reverse' : 'row',
      }}
    >
      {/* Avatar */}
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          background: isUser ? '#1677ff' : '#52c41a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {isUser ? (
          <UserOutlined style={{ color: '#fff', fontSize: 14 }} />
        ) : (
          <RobotOutlined style={{ color: '#fff', fontSize: 14 }} />
        )}
      </div>

      {/* Bubble */}
      <div
        style={{
          maxWidth: '80%',
          padding: '10px 14px',
          borderRadius: 12,
          borderTopRightRadius: isUser ? 4 : 12,
          borderTopLeftRadius: isUser ? 12 : 4,
          background: isUser ? '#e8f4fd' : '#f5f5f5',
          color: '#333',
          fontSize: 14,
          lineHeight: 1.6,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {message.content || (
          <span
            style={{
              display: 'inline-block',
              width: 24,
              height: 16,
              background:
                'linear-gradient(90deg, #1677ff 25%, #e8f4fd 50%, #1677ff 75%)',
              backgroundSize: '200% 100%',
              animation: 'loading 1.5s infinite',
              borderRadius: 2,
            }}
          />
        )}
      </div>
    </div>
  )
}
```

附带动画样式：在 `AIChatPanel` 的容器 CSS 中定义 `@keyframes loading`，或者通过全局样式注入。

- [ ] **Step 2: Commit**

```bash
git add mes/frontend/src/components/ai/ChatMessage.tsx
git commit -m "feat: add ChatMessage bubble component"
```

---

### Task 8: Frontend — 创建 AIChatPanel 组件

**Files:**
- Create: `mes/frontend/src/components/ai/AIChatPanel.tsx`

- [ ] **Step 1: 创建对话面板组件**

```tsx
import { useEffect, useRef, useState } from 'react'
import { Input, Button, Space, Typography } from 'antd'
import { CloseOutlined, SendOutlined, DeleteOutlined } from '@ant-design/icons'
import ChatMessage from './ChatMessage'
import useAIChatStore from '@/stores/aiChatStore'

const { Text } = Typography

export default function AIChatPanel() {
  const {
    messages,
    isLoading,
    isOpen,
    close,
    sendMessage,
    clearMessages,
  } = useAIChatStore()

  const [inputValue, setInputValue] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 新消息自动滚底
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // 面板关闭时清空输入
  useEffect(() => {
    if (!isOpen) setInputValue('')
  }, [isOpen])

  const handleSend = () => {
    if (!inputValue.trim() || isLoading) return
    sendMessage(inputValue)
    setInputValue('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
    if (e.key === 'Escape') {
      close()
    }
  }

  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 96,
        right: 24,
        width: 420,
        height: 540,
        background: '#fff',
        borderRadius: 12,
        boxShadow: '0 8px 40px rgba(0, 0, 0, 0.12)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 999,
        overflow: 'hidden',
        border: '1px solid #f0f0f0',
      }}
    >
      {/* Header */}
      <div
        style={{
          background: '#1677ff',
          color: '#fff',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 15,
          fontWeight: 500,
        }}
      >
        <span>🤖 AI 助手</span>
        <Space size={4}>
          <Button
            type="text"
            size="small"
            icon={<DeleteOutlined />}
            onClick={clearMessages}
            style={{ color: 'rgba(255,255,255,0.8)' }}
          />
          <Button
            type="text"
            size="small"
            icon={<CloseOutlined />}
            onClick={close}
            style={{ color: 'rgba(255,255,255,0.8)' }}
          />
        </Space>
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: 16,
          background: '#fafafa',
        }}
      >
        {messages.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              color: '#bbb',
              marginTop: 120,
            }}
          >
            <Text type="secondary">
              👋 你好！我是 MES 章鱼师兄的 AI 助手
              <br />
              可以问我关于系统功能的任何问题
            </Text>
          </div>
        )}
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div
        style={{
          borderTop: '1px solid #f0f0f0',
          padding: 12,
          background: '#fff',
        }}
      >
        <Space.Compact style={{ width: '100%' }}>
          <Input.TextArea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入消息... (Enter 发送)"
            autoSize={{ minRows: 1, maxRows: 4 }}
            disabled={isLoading}
            style={{ resize: 'none' }}
          />
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={handleSend}
            loading={isLoading}
            disabled={!inputValue.trim() || isLoading}
          />
        </Space.Compact>
      </div>

      {/* Loading animation style */}
      <style>{`
        @keyframes loading {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  )
}
```

- [ ] **Step 2: 提交**

```bash
git add mes/frontend/src/components/ai/AIChatPanel.tsx
git commit -m "feat: add AIChatPanel component"
```

---

### Task 9: Frontend — 创建 FloatButton 组件

**Files:**
- Create: `mes/frontend/src/components/ai/FloatButton.tsx`

- [ ] **Step 1: 创建浮动按钮组件**

```tsx
import { RobotOutlined, CloseOutlined } from '@ant-design/icons'
import useAIChatStore from '@/stores/aiChatStore'

export default function FloatButton() {
  const isOpen = useAIChatStore((s) => s.isOpen)
  const toggle = useAIChatStore((s) => s.toggle)

  return (
    <div
      onClick={toggle}
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        width: 56,
        height: 56,
        borderRadius: '50%',
        background: isOpen
          ? '#ff4d4f'
          : 'linear-gradient(135deg, #1677ff, #69b1ff)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        boxShadow: isOpen
          ? '0 4px 14px rgba(255, 77, 79, 0.35)'
          : '0 4px 14px rgba(22, 119, 255, 0.35)',
        zIndex: 1000,
        transition: 'all 0.25s ease',
        transform: isOpen ? 'scale(1)' : 'scale(1)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.07)'
        e.currentTarget.style.boxShadow = isOpen
          ? '0 6px 20px rgba(255, 77, 79, 0.5)'
          : '0 6px 20px rgba(22, 119, 255, 0.5)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)'
        e.currentTarget.style.boxShadow = isOpen
          ? '0 4px 14px rgba(255, 77, 79, 0.35)'
          : '0 4px 14px rgba(22, 119, 255, 0.35)'
      }}
      title={isOpen ? '关闭 AI 助手' : '打开 AI 助手'}
    >
      {isOpen ? (
        <CloseOutlined style={{ color: '#fff', fontSize: 22 }} />
      ) : (
        <RobotOutlined style={{ color: '#fff', fontSize: 24 }} />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add mes/frontend/src/components/ai/FloatButton.tsx
git commit -m "feat: add AI FloatButton component"
```

---

### Task 10: Frontend — 集成到 AdminLayout

**Files:**
- Modify: `mes/frontend/src/layouts/AdminLayout.tsx`

- [ ] **Step 1: 添加导入**

在文件顶部的 import 区域末尾添加：

```tsx
import FloatButton from '@/components/ai/FloatButton'
import AIChatPanel from '@/components/ai/AIChatPanel'
```

- [ ] **Step 2: 在 AdminLayout 的 return JSX 中插入组件**

在 `</Layout>` 闭合标签（最外层 Layout）之前、`{contextHolder}` 之后，添加 FloatButton 和 AIChatPanel：

```tsx
        {/* AI Chat Assistant */}
        <AIChatPanel />
        <FloatButton />
      </Layout>
```

具体位置：在 `Layout.Content` 段落之后，`</Layout>` 闭合之前（即主区域 Layout 的结束标签前，确保面板在正确的 z-index 层级）。

实际上，FloatButton 和 AIChatPanel 使用 `position: fixed`，应该放在最外层以保证不随内容滚动。修改 AdminLayout 返回的 JSX，在最外层的 `</Layout>` 之前添加：

```tsx
      {/* AI Chat Assistant — fixed positioned, place at root level */}
      <AIChatPanel />
      <FloatButton />
    </Layout>
```

- [ ] **Step 3: 验证 TypeScript 编译**

```bash
cd mes/frontend && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add mes/frontend/src/layouts/AdminLayout.tsx
git commit -m "feat: integrate AI chat into AdminLayout"
```

---

### Task 11: End-to-End 验证

- [ ] **Step 1: 构建后端**

```bash
cd mes && mvn compile -q
```

预期：BUILD SUCCESS

- [ ] **Step 2: 构建前端**

```bash
cd mes/frontend && npx tsc --noEmit && npm run build
```

预期：TypeScript 无错误，Vite build 成功

- [ ] **Step 3: 启动后端并验证端点可达**

```bash
cd mes && mvn spring-boot:run
# 在另一个终端
curl -X POST http://localhost:9090/admin/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"你好"}]}'
```

预期：SSE 流式返回 AI 回复（需要配置有效的 `deepseek.api-key`）

- [ ] **Step 4: Commit 最终验证结果**

```bash
git add -A
git commit -m "chore: final verification after integration"
```
