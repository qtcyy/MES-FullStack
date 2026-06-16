# 表单弹窗视觉重设计 — 设计规格

- 日期：2026-06-16
- 范围：`mes/frontend/apps/mes-new`（当前活跃前端，shadcn/Radix + Tailwind 4 + react-hook-form + zod）
- 状态：已通过可视化方案评审，方向 = **B2 轻分区线**

---

## 1. 背景与目标

当前全站表单已统一到 `src/components/FormDialog.tsx`，但视觉「模板感」偏重：

- 标题栏堆叠了「渐变背景 + 竖条 + 图标块」三件套，略显繁琐；
- 每个表单页都手写 `<div className="space-y-1.5"><Label/><Input/>{error}</div>`，重复且容易不一致（错误样式、必填标记、helper 文案各页不统一）；
- 复杂表单（菜单 8 字段、物料 11 字段、仓库 8 字段）字段平铺，缺少层次与呼吸感。

**目标**：在不改动设计 token（主色蓝 `#2563eb`、8px 圆角、Input 高 36px）、不改动任何业务逻辑/接口/校验的前提下，把表单弹窗重做成更克制、更有层次、全站一致的视觉系统，并落地到全部 10 个表单。

**非目标（YAGNI）**：

- 不改后端、不改 API、不改 zod 校验规则与提交 DTO 逻辑；
- 不改设计 token（颜色/圆角/字号），不引入新依赖；
- 不做暗色模式专项调整（沿用现有 CSS 变量自动适配）；
- 不做表单字段的增删（仅调整布局与封装，字段集合保持现状）；
- 不引入 floating-label、不引入双栏侧边弹窗（评审已否决 C/D 方向）。

---

## 2. 设计决策（已评审确认）

评审在浏览器并排对比了 4 个方向（A 极简 / B 分区卡片 / C 双栏侧边 / D 紧凑左标签），用户选定 **B 分区卡片**，并在精修轮进一步选定 **B2 轻分区线**（而非 B1 描边盒子）。

**核心规则：分区是自适应的**

- 复杂表单（字段 > 4 个，或含明显独立子块如「菜单权限树」「库位规格」）→ 按语义分成若干 **轻分区**；
- 简单表单（字段 ≤ 4 个）→ **不分区**，单组干净布局；
- 无论是否分区，全站共用同一套：头部、字段控件、必填标记、聚焦/错误态、helper 文案、底部按钮。

---

## 3. 视觉语言规格

统一规格（全站强制一致）：

| 元素 | 规格 |
| --- | --- |
| 弹窗头部 | 去渐变、去竖条；保留图标徽标：`size-10 rounded-xl bg-primary/10 text-primary`（图标 `size-5`）+ 标题（`text-base font-semibold`）+ 副标题（`text-xs text-muted-foreground`）；头部下方一条 `Separator` 分隔线 |
| 内容区 | `px-6 py-5`，顶层块间距 `space-y-5`（包在 `ScrollArea max-h-[70vh]` 内） |
| 轻分区头 | 小图标（`size-3.5 text-primary`，可选）+ 标题（`text-xs font-semibold text-foreground/80`）+ 自动延伸细线（`Separator flex-1`）+ 右侧可选小标签（`text-[11px] text-muted-foreground`，如「必填 / 选填」）；分区内字段 `space-y-4` |
| 字段 | `space-y-1.5`：Label（`text-sm font-medium`，必填追加 `<span className="text-destructive"> *</span>`）→ 控件 → helper/error 行 |
| 两列网格 | `grid grid-cols-2 gap-4`（由 `gap-3` 调整为 `gap-4`，更透气） |
| 聚焦态 | 复用 Input 自带 `focus-visible:border-ring focus-visible:ring-[3px] ring-ring/50` |
| 错误态 | 控件传 `aria-invalid={!!errors.x}`（Input 自带 `aria-invalid:border-destructive aria-invalid:ring-destructive/20`）+ 下方 `text-xs text-destructive` 错误文案 |
| helper | 无错误时显示，`text-xs text-muted-foreground` |
| 禁用态 | 控件 `disabled`（Input 自带 `disabled:opacity-50 disabled:cursor-not-allowed`），配 helper 说明（如「登录名创建后不可修改」）。**简化决定**：不做带锁图标的输入框内嵌附饰（Input 无 adornment 槽位，避免改底层组件）。 |
| 底部按钮 | 右对齐：`取消`（`variant="outline"`）+ 提交（主色，带 `Check` 图标；提交中显示「提交中…」）。沿用现状。 |

---

## 4. 组件改造

三处共享组件改动。改完后所有表单的头部/分区/按钮自动升级；各表单页再逐个改用 `FormField` 并按需补分区。

### 4.1 `FormDialog`（头部去三件套）— `src/components/FormDialog.tsx`

仅改头部 `DialogHeader` 与内容区间距，`form`/`ScrollArea`/`DialogFooter` 结构不动。

```tsx
<DialogHeader className="space-y-0 px-6 py-4 text-left">
  <div className="flex items-center gap-3">
    {Icon && (
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
        <Icon className="size-5" />
      </span>
    )}
    <div className="min-w-0">
      <DialogTitle className="truncate text-base font-semibold">{title}</DialogTitle>
      {description && <DialogDescription className="truncate text-xs">{description}</DialogDescription>}
    </div>
  </div>
</DialogHeader>
<Separator />
<form onSubmit={(e) => { e.preventDefault(); onSubmit() }}>
  <ScrollArea className="max-h-[70vh]">
    <div className="space-y-5 px-6 py-5">{children}</div>
  </ScrollArea>
  {/* …Separator + DialogFooter 保持不变… */}
</form>
```

变更点：删除 `bg-gradient-to-r from-primary/5 to-transparent`；删除竖条 `<span className="h-10 w-1 …" />`；图标徽标 `rounded-lg size-9` → `rounded-xl size-10`；标题加 `text-base font-semibold`；副标题加 `text-xs`；内容区 `space-y-4` → `space-y-5`。`FormDialogProps` 接口不变。

### 4.2 `FormSection`（升级为 B2 轻分区）— 同文件

```tsx
import type { LucideIcon } from 'lucide-react'

export function FormSection({
  title, icon: Icon, tag, children,
}: { title: string; icon?: LucideIcon; tag?: string; children: ReactNode }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="size-3.5 shrink-0 text-primary" />}
        <span className="text-xs font-semibold text-foreground/80">{title}</span>
        <Separator className="flex-1" />
        {tag && <span className="shrink-0 text-[11px] text-muted-foreground">{tag}</span>}
      </div>
      {children}
    </div>
  )
}
```

变更点：标题由 `uppercase tracking-wide text-muted-foreground` 改为 `font-semibold text-foreground/80`（中文不适合 uppercase）；新增可选 `icon`、`tag`；外层 `space-y-3` → `space-y-4`。**向后兼容**：现有只传 `title` 的调用（Warehouse / ProcessUnit）无需改即可继续工作。

### 4.3 新增 `FormField`（字段封装）— `src/components/FormField.tsx`

```tsx
import type { ReactNode } from 'react'
import { Label, cn } from '@workspace/ui'

interface FormFieldProps {
  label: string
  htmlFor?: string
  required?: boolean
  error?: string
  help?: string
  /** 跨列/自定义容器类,如 'col-span-2' */
  className?: string
  children: ReactNode
}

export default function FormField({
  label, htmlFor, required, error, help, className, children,
}: FormFieldProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={htmlFor}>
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      {children}
      {error
        ? <p className="text-xs text-destructive">{error}</p>
        : help
          ? <p className="text-xs text-muted-foreground">{help}</p>
          : null}
    </div>
  )
}
```

用法（文本输入需自行传 `aria-invalid` 以获得红框；Select/ParentSelect 等受控组件仅显示错误文案）：

```tsx
<FormField label="编码" htmlFor="m-code" required error={errors.code?.message}>
  <Input id="m-code" aria-invalid={!!errors.code} {...register('code')} />
</FormField>
```

> 说明：不采用 `cloneElement` 自动注入 `aria-invalid`，因为受控组件（Controller 包裹的 Select/ParentSelect/Switch）无法可靠透传该属性；保持显式更可预测。

---

## 5. 全站表单改造清单（10 个）

每个表单：① 字段 JSX 改用 `FormField`；② 必填项加 `required`；③ 文本输入加 `aria-invalid`；④ 按下表决定是否分区。**逻辑零改动**（schema/useForm/onSubmit/useEffect 全部保持）。

### system 模块

| 表单 | 字段数 | 分区方案 |
| --- | --- | --- |
| **MenuForm** | 8 | 分区：**基本信息**(编码/名称、上级菜单、类型/排序) · **展示与权限**(路由 URL、权限标识/图标)。section icon 用 `CircleDot`/`Shield`，tag 用「必填 / 选填」 |
| **UserForm** | 3 | 不分区。登录名编辑态 `disabled` + helper「登录名创建后不可修改」；密码 helper「留空表示不修改密码，至少 6 位」 |
| **DeptForm** | 3 | 不分区（部门名称、上级部门、排序） |
| **DictForm** | 6 | 分区：**基本信息**(标签名、数据值、类型) · **归类与描述**(排序、上级 ID、描述) |
| **RoleForm** | 3 + 树 | 分区：**基本信息**(角色名/角色编码、描述) · **菜单权限**(权限树) |

### basedata 模块

| 表单 | 字段数 | 分区方案 |
| --- | --- | --- |
| **MaterileForm** | 11 | 分区：**基本信息**(物料类型/物料编码(禁用)、物料描述、型号/单位) · **采购与库存**(物料来源/规格、提前期/安全库存、产品组) · **图片**(物料图片)。弹窗宽度提至 `sm:max-w-2xl` |
| **DeviceGroupForm** | 3 | 不分区（编组代码、编组名称、描述） |
| **ProcessUnitForm** | 5 | 保持分区（已用 FormSection）：**基本信息**；Switch「是否有线边库」沿用 Controller |
| **WarehouseForm** | 8 | 保持分区（已用 FormSection）：**基本信息** · **库位规格**(4 列网格) |
| **ComponentForm** | 3 | 不分区（组件编码(禁用)、组件名称、描述） |

> 边界判断：RoleForm 虽字段少，但「菜单权限树」是独立子块，故分区；DictForm 6 字段超过阈值，故分区。

---

## 6. 验证方式

- `cd mes/frontend && pnpm --filter mes-new exec tsc --noEmit` 通过（零类型错误）；
- `pnpm lint` 通过；
- `pnpm --filter mes-new dev`（:4100）逐页人工核对：
  - 头部无渐变/竖条、图标徽标居中；
  - 复杂表单分区线正确、简单表单不分区；
  - 必填星号、聚焦蓝环、错误红框+红字（故意留空必填触发校验）、禁用置灰、helper 文案；
  - 提交/取消按钮、提交中态正常；
  - 明暗主题切换无异常。

---

## 7. 涉及文件清单

**改共享组件（2 个文件）**

- `src/components/FormDialog.tsx`（头部 + FormSection）
- `src/components/FormField.tsx`（新增）

**改表单页（10 个文件）**

- `src/pages/system/{menu/MenuForm,user/UserForm,dept/DeptForm,dict/DictForm,role/RoleForm}.tsx`
- `src/pages/basedata/{materile/MaterileForm,device-group/DeviceGroupForm,process-unit/ProcessUnitForm,warehouse/WarehouseForm,component/ComponentForm}.tsx`

合计 12 个文件，全部位于 `mes/frontend/apps/mes-new/`。
