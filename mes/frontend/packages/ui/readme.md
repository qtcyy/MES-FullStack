# UI 组件库包

本仓库包含基于 shadcn/ui 设计系统的现代 React 组件库核心包，采用 Radix UI 基础组件和 Tailwind CSS v4 构建。

## 📦 核心包

### [@workspace/ui](./ui/)

核心组件库，包含使用以下技术构建的 shadcn/ui 组件：

- **React 19.1.x** 配合 TypeScript
- **Radix UI** 基础组件，提供无障碍支持和交互行为
- **Tailwind CSS v4** 配合 CSS 变量实现主题系统
- **class-variance-authority (cva)** 用于变体管理
- **Lucide React** 图标库

### [@workspace/typescript-config](./typescript-config/)

共享的 TypeScript 配置，确保项目间类型检查的一致性。

## 🚀 快速开始

### 环境要求

- Node.js 18+ 
- pnpm 包管理器

### 安装

```bash
# 安装依赖
pnpm install

# 构建所有包
pnpm build
```

## 📖 组件架构

UI 包中的组件遵循一致的模式：

```typescript
import { cva, type VariantProps } from "class-variance-authority"
import * as RadixPrimitive from "@radix-ui/react-primitive"
import { cn } from "../lib/utils"

const componentVariants = cva("base-classes", {
  variants: {
    size: { sm: "...", md: "..." },
    variant: { default: "...", destructive: "..." }
  },
  defaultVariants: { size: "md", variant: "default" }
})

export interface ComponentProps 
  extends React.ComponentPropsWithoutRef<typeof RadixPrimitive.Root>,
  VariantProps<typeof componentVariants> {}

const Component = React.forwardRef<HTMLDivElement, ComponentProps>(
  ({ className, variant, size, ...props }, ref) => (
    <RadixPrimitive.Root 
      ref={ref} 
      className={cn(componentVariants({ variant, size, className }))} 
      {...props} 
    />
  )
)
Component.displayName = "Component"

export { Component, componentVariants }
```

## 🎨 主题系统

UI 包包含完整的主题系统：

- **CSS 自定义属性**：定义颜色、间距和其他设计令牌
- **浅色/深色主题**：通过 CSS 类自动切换主题
- **Tailwind 集成**：主题变量与 Tailwind 工具类无缝集成

主题变量遵循模式：`--{元素}-{属性}: {值}`

## 📁 目录结构

```text
packages/
├── ui/                          # 核心 UI 组件库
│   ├── src/
│   │   ├── components/          # React 组件
│   │   ├── hooks/              # 自定义 React Hooks
│   │   ├── lib/                # 工具函数
│   │   └── styles/             # 全局样式和主题
│   ├── package.json
│   └── tsconfig.json
│
└── typescript-config/          # 共享 TypeScript 配置
    ├── base.json
    ├── nextjs.json
    ├── react-library.json
    └── package.json
```

## 🛠 可用组件

UI 包包含以下组件：

### 基础组件

- **Button**: 按钮组件，支持多种变体和尺寸
- **Input**: 输入框组件
- **Label**: 标签组件
- **Badge**: 徽章组件

### 布局组件

- **Card**: 卡片容器组件
- **Separator**: 分隔线组件
- **Sidebar**: 侧边栏组件系列

### 表单组件

- **Checkbox**: 复选框
- **Combobox**: 组合框
- **Select**: 下拉选择器
- **Calendar**: 日历选择器

### 数据展示

- **Table**: 基础表格组件
- **DataTable**: 数据表格（集成排序、筛选等功能）
- **Avatar**: 头像组件
- **Progress**: 进度条

### 反馈组件

- **Alert**: 警告提示
- **AlertDialog**: 警告对话框
- **Dialog**: 对话框
- **Popover**: 弹出层
- **Tooltip**: 工具提示

### 导航组件

- **Command**: 命令面板
- **NavigationMenu**: 导航菜单
- **Menubar**: 菜单栏
- **Breadcrumb**: 面包屑导航

### 媒体组件

- **Carousel**: 轮播图
- **Accordion**: 折叠面板

## 🔧 开发

### 构建包

```bash
# 构建所有包
pnpm build

# 构建特定包
pnpm build --filter @workspace/ui
```

### TypeScript 配置

包使用共享的 TypeScript 配置：

- `base.json`: 所有项目的基础配置
- `react-library.json`: React 库包的配置
- `nextjs.json`: Next.js 应用程序的配置

## 📚 使用方法

### 在项目中安装

```bash
# 安装 UI 包
pnpm add @workspace/ui

# 安装对等依赖
pnpm add react react-dom
```

### 导入组件

```typescript
import { Button, Card, Input } from "@workspace/ui"
import "@workspace/ui/globals.css"

function App() {
  return (
    <Card>
      <Input placeholder="输入文本..." />
      <Button>点击我</Button>
    </Card>
  )
}
```

### 主题配置

导入全局样式以启用主题系统：

```typescript
import "@workspace/ui/globals.css"
```

## 📋 Package.json 导出

UI 包提供以下导出：

- `@workspace/ui`: 主要组件导出
- `@workspace/ui/globals.css`: 全局样式和主题
- `@workspace/ui/lib/*`: 工具函数
- `@workspace/ui/components/*`: 单独组件
- `@workspace/ui/hooks/*`: 自定义 Hooks

## 🤝 贡献

1. **代码风格**：遵循现有模式和约定
2. **组件**：使用 forwardRef、cva 变体和 Radix 基础组件
3. **主题**：使用 CSS 自定义属性实现可定制样式
4. **TypeScript**：保持严格的类型安全
5. **无障碍性**：确保所有组件符合 WCAG 指南

## 📄 许可证

此项目为私有和专有项目。

## 🏗 架构决策

### 组件设计

- **Radix UI 基础组件**：提供强大的无障碍支持和键盘导航
- **Class Variance Authority**：类型安全的变体管理
- **Tailwind Merge**：智能的 className 合并，支持样式组合
- **ForwardRef**：正确的 ref 转发以访问 DOM

### 构建系统

- **TypeScript**：严格的类型检查确保可靠性
- **现代 ES 模块**：ESM 优先的方法，更好的 tree shaking
- **工作区依赖**：跨包的高效依赖管理

### 主题架构

- **CSS 自定义属性**：运行时主题切换能力
- **设计令牌**：一致的间距、颜色和排版
- **Tailwind 集成**：与工具类的无缝集成