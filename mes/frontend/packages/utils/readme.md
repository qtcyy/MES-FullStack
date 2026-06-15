# @workspace/utils

基于 RxJS 和 @ngify/http 的 React HTTP 工具库，为 Eye Agent Platform 提供强大的 HTTP 请求管理能力。

## ✨ 特性

- 🚀 **HTTP Context** - React Context 的 HTTP 客户端管理
- 🌊 **流式响应** - 支持 Server-Sent Events (SSE) 流式数据处理
- 🔄 **智能轮询** - 灵活的 HTTP 轮询机制
- 📤 **文件上传** - 带进度跟踪的文件上传 (Observable & Promise)
- ⚡ **加载状态** - 优雅的加载状态管理
- 🛡️ **错误拦截** - 统一的错误处理和业务逻辑拦截

## 📦 安装

在 monorepo 项目中，已自动配置为 workspace 包。在其他包中使用：

```json
{
  "dependencies": {
    "@workspace/utils": "workspace:^"
  }
}
```

## 🚀 快速开始

### 1. 配置 HTTP Context Provider

在应用根组件中配置 `HttpContextProvider`：

```tsx
import { HttpContextProvider } from "@workspace/utils";
import { ErrorInterceptor } from "@workspace/utils/http/ErrorInterceptor";

function App() {
  return (
    <HttpContextProvider fnInterceptors={[ErrorInterceptor]}>
      <YourApp />
    </HttpContextProvider>
  );
}
```

### 2. 在组件中使用

```tsx
import { useHttp } from "@workspace/utils";

function MyComponent() {
  const http = useHttp();

  const fetchData = () => {
    http?.get("/api/data").subscribe({
      next: (response) => console.log(response),
      error: (error) => console.error(error),
    });
  };

  return <button onClick={fetchData}>获取数据</button>;
}
```

---

## 📚 API 文档

### HttpContext

HTTP 客户端的 React Context 管理，提供全局 HTTP 实例和拦截器配置。

#### `HttpContextProvider`

Context Provider 组件，用于在应用中注入 HTTP 客户端实例。

**Props**

- `children: React.ReactNode` - 子组件
- `fnInterceptors?: HttpInterceptorFn[]` - HTTP 拦截器函数数组

**使用示例**

```tsx
import { HttpContextProvider } from "@workspace/utils";
import { ErrorInterceptor } from "@workspace/utils/http/ErrorInterceptor";

function App() {
  // 配置多个拦截器
  const interceptors = [
    ErrorInterceptor,
    // 可以添加其他自定义拦截器
  ];

  return (
    <HttpContextProvider fnInterceptors={interceptors}>
      <Routes />
    </HttpContextProvider>
  );
}
```

#### `useHttp()`

获取 HTTP 客户端实例的 Hook。

**返回值:** `HttpClient | null`

**使用示例**

```tsx
import { useHttp } from "@workspace/utils";

function UserList() {
  const http = useHttp();
  const [users, setUsers] = useState([]);

  useEffect(() => {
    http?.get("/api/users").subscribe({
      next: (response) => setUsers(response.data),
      error: (error) => console.error("获取用户列表失败", error),
    });
  }, []);

  return <div>{/* 渲染用户列表 */}</div>;
}
```

---

### HttpEventSource

创建 Server-Sent Events (SSE) 流式响应处理器，适用于 AI 对话、实时数据推送等场景。

#### `createEventSource(options)`

创建 SSE 事件源处理器。

**参数 `CreateEventSourceOptions`**

```typescript
interface CreateEventSourceOptions {
  api: string; // API 端点
  body?: any; // 请求体
  headers?: Record<string, string>; // 请求头
  onMessage?: (event: EventSourceMessage, completion?: string) => any; // 消息回调
  onOpen?: (body: any) => any; // 连接建立回调
  isFinal?: (event: EventSourceMessage) => boolean; // 判断是否为最后一条消息
  onError?: () => any; // 错误回调
  onFinal?: () => any; // 完成回调
}
```

**返回值**

```typescript
{
  complete: (body: any) => Observable<unknown>; // 开始请求
  cancel: () => void; // 取消请求
  completion: string | undefined; // 当前累积的完成文本
  loading: boolean; // 加载状态
}
```

**使用示例 - AI 流式对话**

```tsx
import { createEventSource } from "@workspace/utils";

function ChatBox() {
  const eventSource = createEventSource({
    api: "/api/chat/stream",
    onMessage: (event, currentCompletion) => {
      const data = JSON.parse(event.data);
      // 累积返回的文本
      return (currentCompletion || "") + data.content;
    },
    isFinal: (event) => {
      const data = JSON.parse(event.data);
      return data.done === true;
    },
    onError: () => {
      console.error("流式请求失败");
    },
    onFinal: () => {
      console.log("流式请求完成");
    },
  });

  const handleSend = (message: string) => {
    eventSource.complete({ message }).subscribe({
      next: (event) => console.log("流式响应完成", event),
      error: (error) => console.error("错误", error),
    });
  };

  return (
    <div>
      <div>{eventSource.completion}</div>
      <button onClick={() => handleSend("你好")} disabled={eventSource.loading}>
        {eventSource.loading ? "发送中..." : "发送"}
      </button>
      <button onClick={eventSource.cancel}>取消</button>
    </div>
  );
}
```

---

### HttpPolling

HTTP 轮询功能，支持条件轮询和最大次数限制。

#### `HttpPolling<T>(options)`

创建轮询请求。

**参数 `RetryOptions<T>`**

```typescript
interface RetryOptions<T = any> {
  try: Observable<T>; // 要轮询的请求
  retryUntil: (response: T, index?: number) => boolean; // 停止轮询的条件
  maxTimes?: number; // 最大轮询次数（默认 20）
  tick?: number; // 轮询间隔（毫秒，默认 1000）
}
```

**常量**

- `HTTP_POLLING_INFINITE = -1` - 无限轮询

**返回值:** `Observable<T>`

**使用示例 1 - 轮询任务状态**

```tsx
import { HttpPolling, HTTP_POLLING_INFINITE, useHttp } from "@workspace/utils";

function TaskStatus({ taskId }: { taskId: string }) {
  const http = useHttp();
  const [status, setStatus] = useState("pending");

  useEffect(() => {
    const polling$ = HttpPolling({
      try: http!.get(`/api/tasks/${taskId}`),
      retryUntil: (response) => {
        setStatus(response.status);
        // 当任务完成或失败时停止轮询
        return response.status === "completed" || response.status === "failed";
      },
      maxTimes: 30, // 最多轮询 30 次
      tick: 2000, // 每 2 秒轮询一次
    });

    const subscription = polling$.subscribe({
      next: (response) => console.log("任务状态", response),
      error: (error) => console.error("轮询失败", error),
      complete: () => console.log("轮询完成"),
    });

    return () => subscription.unsubscribe();
  }, [taskId]);

  return <div>任务状态: {status}</div>;
}
```

**使用示例 2 - 无限轮询数据刷新**

```tsx
import { HttpPolling, HTTP_POLLING_INFINITE, useHttp } from "@workspace/utils";

function RealTimeData() {
  const http = useHttp();
  const [data, setData] = useState([]);

  useEffect(() => {
    const polling$ = HttpPolling({
      try: http!.get("/api/realtime-data"),
      retryUntil: () => false, // 永不停止
      maxTimes: HTTP_POLLING_INFINITE, // 无限轮询
      tick: 5000, // 每 5 秒刷新
    });

    const subscription = polling$.subscribe({
      next: (response) => setData(response.data),
    });

    return () => subscription.unsubscribe();
  }, []);

  return <div>{/* 渲染数据 */}</div>;
}
```

---

### HttpLoading

React Hook，用于管理 HTTP 请求的加载状态。

#### `HttpLoading()`

创建加载状态管理器。

**返回值**

```typescript
{
  loading: boolean; // 当前加载状态
  setLoading: (loading: boolean) => void; // 手动设置加载状态
  loadingOperator: <T>(source: Observable<T>) => Observable<T>; // RxJS 操作符
}
```

**使用示例**

```tsx
import { HttpLoading, useHttp } from "@workspace/utils";

function DataFetcher() {
  const http = useHttp();
  const { loading, loadingOperator } = HttpLoading();
  const [data, setData] = useState(null);

  const fetchData = () => {
    http!
      .get("/api/data")
      .pipe(loadingOperator) // 自动管理 loading 状态
      .subscribe({
        next: (response) => setData(response.data),
        error: (error) => console.error(error),
      });
  };

  return (
    <div>
      <button onClick={fetchData} disabled={loading}>
        {loading ? "加载中..." : "获取数据"}
      </button>
      {data && <div>{JSON.stringify(data)}</div>}
    </div>
  );
}
```

---

### HttpUpload

文件上传功能，提供 Observable 和 Promise 两种方式，支持进度跟踪和取消上传。

#### 类型定义

```typescript
// 上传文件对象
interface UploadFile<T = any> {
  source: string; // 文件预览 URL
  name: string; // 文件名
  size: number; // 文件大小（字节）
  file: File; // File 对象
  uploadFile?: T; // 服务器返回的文件信息
  id: string; // 唯一标识
  status?: FileUploadStatus; // 上传状态
  progress?: number; // 上传进度
}

// 上传状态
type FileUploadStatus =
  | "pending" // 等待上传
  | "uploading" // 上传中
  | "processing" // 服务器处理中
  | "success" // 上传成功
  | "done" // 完成
  | "error"; // 上传失败

// 上传状态信息
interface FileUploadState {
  progress: number; // 上传进度 (0-100)
  restTime: number; // 剩余时间（秒）
  speed: number; // 上传速度（字节/秒）
}

// 进度回调
type OnProgress = (status: FileUploadStatus, state: FileUploadState) => void;
```

#### `createHttpUpload()`

创建基于 Observable 的文件上传器。

**返回值**

```typescript
{
  uploadWithProgress: <T>(
    url: string,
    file: UploadFile,
    onProgress?: OnProgress,
    params?: Record<string, any>
  ) => Observable<T>;
}
```

**使用示例 - Observable 方式上传**

```tsx
import { createHttpUpload, UploadFile } from "@workspace/utils";

function FileUploader() {
  const { uploadWithProgress } = createHttpUpload();
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<FileUploadStatus>("pending");

  const handleUpload = (file: File) => {
    const uploadFile: UploadFile = {
      source: URL.createObjectURL(file),
      name: file.name,
      size: file.size,
      file: file,
      id: `upload-${Date.now()}`,
    };

    uploadWithProgress(
      "/api/upload",
      uploadFile,
      (uploadStatus, state) => {
        setStatus(uploadStatus);
        setProgress(state.progress);
        console.log(`上传速度: ${(state.speed / 1024).toFixed(2)} KB/s`);
        console.log(`剩余时间: ${state.restTime.toFixed(0)} 秒`);
      },
      { category: "documents" } // 额外参数
    ).subscribe({
      next: (response) => {
        console.log("上传成功", response);
      },
      error: (error) => {
        console.error("上传失败", error);
      },
    });
  };

  return (
    <div>
      <input type="file" onChange={(e) => handleUpload(e.target.files![0])} />
      <div>状态: {status}</div>
      <div>进度: {progress}%</div>
    </div>
  );
}
```

#### `createHttpUploadPromise()`

创建基于 Promise 的文件上传器，支持取消上传。

**返回值**

```typescript
{
  uploadWithProgress: <T>(
    url: string,
    file: UploadFile,
    onProgress?: OnProgress,
    params?: Record<string, any>
  ) => {
    promise: Promise<T>;
    cancel: () => void;
  };
}
```

**使用示例 - Promise 方式上传（支持取消）**

```tsx
import { createHttpUploadPromise, UploadFile } from "@workspace/utils";

function FileUploaderWithCancel() {
  const { uploadWithProgress } = createHttpUploadPromise();
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const cancelRef = useRef<(() => void) | null>(null);

  const handleUpload = async (file: File) => {
    const uploadFile: UploadFile = {
      source: URL.createObjectURL(file),
      name: file.name,
      size: file.size,
      file: file,
      id: `upload-${Date.now()}`,
    };

    setUploading(true);

    const { promise, cancel } = uploadWithProgress(
      "/api/upload",
      uploadFile,
      (status, state) => {
        setProgress(state.progress);
      }
    );

    cancelRef.current = cancel;

    try {
      const response = await promise;
      console.log("上传成功", response);
    } catch (error) {
      console.error("上传失败", error);
    } finally {
      setUploading(false);
      cancelRef.current = null;
    }
  };

  const handleCancel = () => {
    cancelRef.current?.();
    setUploading(false);
  };

  return (
    <div>
      <input
        type="file"
        onChange={(e) => handleUpload(e.target.files![0])}
        disabled={uploading}
      />
      <div>进度: {progress}%</div>
      {uploading && <button onClick={handleCancel}>取消上传</button>}
    </div>
  );
}
```

---

### ErrorInterceptor

HTTP 错误拦截器，提供统一的错误处理、业务逻辑检查和 401 重定向。

#### `ErrorInterceptor(req, next)`

拦截器函数，处理 HTTP 响应错误和业务逻辑错误。

**功能**

- ✅ 自动检查业务响应状态 (`success` 字段)
- ✅ 401 错误自动跳转登录页
- ✅ 显示错误提示消息
- ✅ Blob 响应特殊处理 (跳过业务逻辑检查)

**参数**

- `req: HttpRequest<unknown>` - HTTP 请求对象
- `next: HttpHandlerFn` - 下一个处理函数

**返回值:** `Observable<HttpEvent<unknown>>`

**使用示例 - 配置拦截器**

```tsx
import { HttpContextProvider } from "@workspace/utils";
import { ErrorInterceptor } from "@workspace/utils/http/ErrorInterceptor";

function App() {
  return (
    <HttpContextProvider fnInterceptors={[ErrorInterceptor]}>
      <Routes />
    </HttpContextProvider>
  );
}
```

**自定义拦截器示例**

```tsx
import { HttpRequest, HttpHandlerFn, HttpEvent } from "@ngify/http";
import { Observable, tap } from "rxjs";

// 添加认证 Token 的拦截器
function AuthInterceptor(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> {
  const token = localStorage.getItem("token");

  if (token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  return next(req);
}

// 日志拦截器
function LoggingInterceptor(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> {
  console.log("Request:", req.method, req.url);
  const startTime = Date.now();

  return next(req).pipe(
    tap({
      next: (event) => {
        if (event.type === HttpEventType.Response) {
          console.log(`Response: ${req.url} (${Date.now() - startTime}ms)`);
        }
      },
      error: (error) => {
        console.error(`Error: ${req.url}`, error);
      },
    })
  );
}

// 配置多个拦截器
function App() {
  return (
    <HttpContextProvider
      fnInterceptors={[AuthInterceptor, LoggingInterceptor, ErrorInterceptor]}
    >
      <Routes />
    </HttpContextProvider>
  );
}
```

---

## 🔧 依赖

- **@ngify/http** `^2.0.6` - 基于 RxJS 的 HTTP 客户端库
- **rxjs** `^7.0.0` - 响应式编程库 (peer dependency)
- **react** - React 库 (peer dependency)

## 📝 类型定义

所有主要类型都已导出，可直接导入使用：

```typescript
import type {
  // HttpEventSource
  CreateEventSourceOptions,
  EventSourceMessage,
  // HttpPolling
  RetryOptions,
  // HttpUpload
  UploadFile,
  FileUploadStatus,
  FileUploadState,
  OnProgress,
} from "@workspace/utils";
```

## 💡 最佳实践

### 1. 统一配置拦截器

在应用入口统一配置所有拦截器，确保全局生效：

```tsx
// App.tsx
import { HttpContextProvider } from "@workspace/utils";
import { ErrorInterceptor } from "@workspace/utils/http/ErrorInterceptor";
import { AuthInterceptor, LoggingInterceptor } from "./interceptors";

function App() {
  return (
    <HttpContextProvider
      fnInterceptors={[AuthInterceptor, LoggingInterceptor, ErrorInterceptor]}
    >
      <AppRoutes />
    </HttpContextProvider>
  );
}
```

### 2. 合理使用轮询

避免过于频繁的轮询，设置合理的 `tick` 间隔和 `maxTimes`：

```typescript
// ❌ 不推荐：轮询过于频繁
HttpPolling({
  try: http!.get("/api/status"),
  retryUntil: (res) => res.done,
  tick: 100, // 每 100ms 轮询一次，过于频繁
});

// ✅ 推荐：合理的轮询间隔
HttpPolling({
  try: http!.get("/api/status"),
  retryUntil: (res) => res.done,
  tick: 2000, // 每 2 秒轮询一次
  maxTimes: 30, // 最多轮询 30 次
});
```

### 3. 清理订阅

使用 RxJS Observable 时，记得在组件卸载时取消订阅：

```tsx
useEffect(() => {
  const subscription = http!.get("/api/data").subscribe({
    next: (data) => setData(data),
  });

  // 清理订阅
  return () => subscription.unsubscribe();
}, []);
```

### 4. 错误处理

始终为 HTTP 请求添加错误处理：

```tsx
http!.get("/api/data").subscribe({
  next: (data) => {
    // 处理成功响应
  },
  error: (error) => {
    // 处理错误
    console.error("请求失败", error);
    // 显示错误提示
  },
});
```

### 5. 文件上传优化

对于大文件上传，建议：

- 显示上传进度和速度
- 提供取消上传功能
- 添加文件大小和类型验证

```tsx
const handleUpload = (file: File) => {
  // 验证文件
  if (file.size > 100 * 1024 * 1024) {
    alert("文件不能超过 100MB");
    return;
  }

  if (!["image/jpeg", "image/png"].includes(file.type)) {
    alert("仅支持 JPG 和 PNG 格式");
    return;
  }

  // 执行上传...
};
```

---

## 📄 License

MIT

## 🤝 贡献

欢迎提交 Issue 和 Pull Request
