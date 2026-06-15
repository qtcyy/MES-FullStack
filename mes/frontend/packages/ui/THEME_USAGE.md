# 主题切换Hook使用指南

增强版 `useTheme` hook 支持三种主题模式，并允许通过hex字符串自定义primary颜色。

## 功能特性

- ✅ 支持三种主题：`light`（浅色）、`dark`（深色）、`custom`（自定义）
- ✅ 自定义primary颜色（传入hex字符串）
- ✅ localStorage持久化自定义颜色
- ✅ 自动计算对比色确保可访问性
- ✅ 使用OKLch色彩空间（匹配项目标准）
- ✅ 类型安全的TypeScript支持

## API 文档

### UseThemeReturn 接口

```typescript
interface UseThemeReturn {
  /** 当前主题模式 */
  theme: 'light' | 'dark' | 'custom' | undefined

  /** 设置主题模式 */
  setTheme: (theme: 'light' | 'dark' | 'custom') => void

  /** 解析后的主题（考虑系统偏好） */
  resolvedTheme: string | undefined

  /** 是否为暗色主题 */
  isDark: boolean

  /** 是否为自定义主题 */
  isCustom: boolean

  /** 切换 light/dark 主题 */
  toggleTheme: () => void

  /** 设置自定义主题的primary颜色（hex格式） */
  setCustomTheme: (hex: string) => void

  /** 当前自定义的primary颜色 */
  customPrimaryColor: string | null

  /** 主题系统是否已挂载（避免SSR/CSR不一致） */
  isReady: boolean
}
```

## 使用示例

### 1. 基础使用：切换light/dark主题

```tsx
import { useTheme } from "@workspace/ui"

function ThemeToggleButton() {
  const { theme, toggleTheme, isDark } = useTheme()

  return (
    <button onClick={toggleTheme}>
      当前主题: {theme}
      {isDark ? '🌙' : '☀️'}
    </button>
  )
}
```

### 2. 设置自定义主题

```tsx
import { useTheme } from "@workspace/ui"

function CustomThemePicker() {
  const { setCustomTheme, isCustom, customPrimaryColor } = useTheme()

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomTheme(e.target.value)
  }

  return (
    <div>
      <input
        type="color"
        value={customPrimaryColor || '#3b82f6'}
        onChange={handleColorChange}
      />
      {isCustom && <p>当前使用自定义主题</p>}
    </div>
  )
}
```

### 3. 完整的主题控制面板

```tsx
import { useTheme, type ThemeMode } from "@workspace/ui"

function ThemeControlPanel() {
  const {
    theme,
    setTheme,
    setCustomTheme,
    isDark,
    isCustom,
    customPrimaryColor,
    isReady
  } = useTheme()

  // 避免SSR/CSR不一致
  if (!isReady) {
    return <div>加载中...</div>
  }

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold">主题设置</h2>

      {/* 预设主题选择 */}
      <div className="space-x-2">
        <button
          onClick={() => setTheme('light')}
          className={theme === 'light' ? 'font-bold' : ''}
        >
          浅色主题
        </button>
        <button
          onClick={() => setTheme('dark')}
          className={theme === 'dark' ? 'font-bold' : ''}
        >
          深色主题
        </button>
      </div>

      {/* 自定义颜色选择器 */}
      <div className="space-y-2">
        <label className="block text-sm font-medium">
          自定义Primary颜色
        </label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={customPrimaryColor || '#3b82f6'}
            onChange={(e) => setCustomTheme(e.target.value)}
            className="w-12 h-12 rounded cursor-pointer"
          />
          <span className="text-sm text-muted-foreground">
            {customPrimaryColor || '未设置'}
          </span>
        </div>
      </div>

      {/* 常用颜色快捷选择 */}
      <div className="space-y-2">
        <p className="text-sm font-medium">快速选择颜色：</p>
        <div className="flex gap-2">
          {['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'].map((color) => (
            <button
              key={color}
              onClick={() => setCustomTheme(color)}
              className="w-10 h-10 rounded-md border-2 border-border hover:scale-110 transition-transform"
              style={{ backgroundColor: color }}
              aria-label={`设置主题颜色为 ${color}`}
            />
          ))}
        </div>
      </div>

      {/* 状态显示 */}
      <div className="text-sm text-muted-foreground">
        <p>当前主题: {theme}</p>
        <p>是否深色: {isDark ? '是' : '否'}</p>
        <p>是否自定义: {isCustom ? '是' : '否'}</p>
      </div>
    </div>
  )
}
```

### 4. 使用颜色工具函数

```tsx
import { hexToOklch, isDarkColor, generateContrastColor } from "@workspace/ui"

function ColorConverter() {
  const hex = '#3b82f6'

  console.log(hexToOklch(hex))              // "oklch(0.620 0.228 252.583)"
  console.log(isDarkColor(hex))             // false
  console.log(generateContrastColor(hex))   // "oklch(0.985 0 0)" (浅色文字)

  return <div>查看控制台输出</div>
}
```

## 持久化机制

- **主题模式**：由 `next-themes` 自动保存到 localStorage（键名：`theme`）
- **自定义颜色**：保存到 localStorage（键名：`custom-theme-primary-color`）
- 刷新页面后自动还原用户设置

## 技术细节

### 颜色转换流程

```
Hex (#3b82f6)
  ↓ hexToRgb
RGB (59, 130, 246)
  ↓ rgbToLinearRgb (移除gamma校正)
Linear RGB
  ↓ linearRgbToXyz
XYZ (D65白点)
  ↓ xyzToOklab
OKLab
  ↓ oklabToOklch
OKLch (0.620 0.228 252.583)
```

### CSS变量应用

当设置自定义主题时，hook会自动设置以下CSS变量：

```css
:root {
  --custom-primary: oklch(...);               /* 来自hex转换 */
  --custom-primary-foreground: oklch(...);    /* 自动生成对比色 */
}
```

这些变量在 `globals.css` 的 `.custom` 类中被使用：

```css
.custom {
  --primary: var(--custom-primary, oklch(0.205 0 0));
  --primary-foreground: var(--custom-primary-foreground, oklch(0.985 0 0));
  /* ... */
}
```

## 最佳实践

1. **避免SSR不一致**：使用 `isReady` 判断主题系统是否已挂载
2. **验证hex格式**：hook内部会自动验证，无效的hex会在控制台警告
3. **颜色对比度**：自动生成的 `primary-foreground` 确保WCAG可访问性
4. **恢复默认**：调用 `setTheme('light')` 或 `setTheme('dark')` 可恢复预设主题

## 相关文件

- Hook实现: [packages/ui/src/hooks/use-theme.ts](../../packages/ui/src/hooks/use-theme.ts)
- 颜色工具: [packages/ui/src/lib/color-utils.ts](../../packages/ui/src/lib/color-utils.ts)
- 样式定义: [packages/ui/src/styles/globals.css](../../packages/ui/src/styles/globals.css)
- ThemeProvider配置: [apps/web/src/App.tsx](../../apps/web/src/App.tsx)
