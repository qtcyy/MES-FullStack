# 表单弹窗视觉重设计 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 `apps/mes-new` 全站 10 个表单弹窗重做成 B2「轻分区」视觉系统：去三件套头部、引入 `FormField` 字段封装、复杂表单按语义分区，全程零业务逻辑改动。

**Architecture:** 三处共享组件先行（新增 `FormField`；改 `FormDialog` 头部 + 升级 `FormSection`），其升级自动惠及所有表单的头部/分区/按钮；随后逐页把字段 JSX 改用 `FormField`、复杂表单加 `FormSection`。每个表单的 `schema`/`useForm`/`useEffect`/`onSubmit` 完全保留。

**Tech Stack:** React 19 + TypeScript + Vite + shadcn/Radix (`@workspace/ui`) + Tailwind 4 + react-hook-form + zod；包名 `mes-new`，pnpm workspace。

**测试策略说明（重要）：** 本项目 vitest `environment: 'node'`、`include: ['src/**/*.test.ts']`，无 jsdom/RTL 等组件测试设施，且本次 spec 明确「不引入新依赖」。因此本计划为**纯视觉重构、不写组件级测试**（与项目现有「仅逻辑测试」约定一致）。每个任务的验证 = `tsc --noEmit` 类型检查 + 提交；最后一个任务统一跑 `lint` + `build` + dev(:4100) 人工核对清单。

**参考 spec：** `docs/superpowers/specs/2026-06-16-form-redesign-design.md`

---

## 约定（Conventions）

所有任务遵循以下统一转换规则。**每个任务下方仍给出完整代码**，本节仅作总览，不替代任务代码。

### 字段转换模式

旧写法 →

```tsx
<div className="space-y-1.5">
  <Label htmlFor="x-id">字段名</Label>
  <Input id="x-id" {...register('field')} />
  {errors.field && <p className="text-xs text-destructive">{errors.field.message}</p>}
</div>
```

新写法（文本输入需传 `aria-invalid` 才有红框；受控组件仅显示错误文案）→

```tsx
<FormField label="字段名" htmlFor="x-id" required error={errors.field?.message}>
  <Input id="x-id" aria-invalid={!!errors.field} {...register('field')} />
</FormField>
```

### 关键执行注意

1. **删除页面对 `Label` 的导入**：重构后页面不再直接渲染 `<Label>`（已封进 `FormField`），必须从该文件的 `@workspace/ui` 导入中删掉 `Label`，否则 eslint 报 `no-unused-vars`。**唯一例外：`ProcessUnitForm`** 的开关行仍用 `<Label htmlFor="pu-lw">`，保留 `Label`。
2. **两列网格间距** `gap-3` → `gap-4`（4 列网格保持 `gap-3`）。
3. **必填星号** `required` 依据 zod schema 的 `.min(1)`/必选语义设置。
4. **分区**：复杂表单用 `<FormSection title icon tag>` 包裹；简单表单直接平铺 `FormField`。

### 分区图标表（lucide-react，v0.475 均存在）

| 分区 | icon | 用于 |
| --- | --- | --- |
| 基本信息 | `Info` | menu / dict / role / process-unit / warehouse / materile |
| 展示与权限 | `KeyRound` | menu |
| 归类与描述 | `Tags` | dict |
| 菜单权限 | `ListChecks` | role |
| 采购与库存 | `Boxes` | materile |
| 物料图片 | `Image as ImageIcon` | materile |
| 库位规格 | `LayoutGrid` | warehouse |

---

## File Structure

| 文件 | 责任 | 动作 |
| --- | --- | --- |
| `src/components/FormField.tsx` | 单字段封装：label + 必填星号 + 控件槽 + helper/error | 新建 |
| `src/components/FormDialog.tsx` | 弹窗外壳（头部去三件套）+ `FormSection`（升级 B2 轻分区） | 改 |
| `src/pages/system/user/UserForm.tsx` | 用户表单（简单，不分区） | 改 |
| `src/pages/system/dept/DeptForm.tsx` | 部门表单（简单） | 改 |
| `src/pages/basedata/device-group/DeviceGroupForm.tsx` | 设备组表单（简单） | 改 |
| `src/pages/basedata/component/ComponentForm.tsx` | 构件表单（简单） | 改 |
| `src/pages/system/menu/MenuForm.tsx` | 菜单表单（2 分区） | 改 |
| `src/pages/system/dict/DictForm.tsx` | 字典表单（2 分区） | 改 |
| `src/pages/system/role/RoleForm.tsx` | 角色表单（2 分区，含权限树） | 改 |
| `src/pages/basedata/process-unit/ProcessUnitForm.tsx` | 工艺单元（1 分区 + 开关行） | 改 |
| `src/pages/basedata/warehouse/WarehouseForm.tsx` | 仓库表单（2 分区，4 列网格） | 改 |
| `src/pages/basedata/materile/MaterileForm.tsx` | 物料表单（3 分区，宽弹窗） | 改 |

所有路径相对 `mes/frontend/apps/mes-new/`。验证命令统一在 `mes/frontend/` 目录下执行。

---

## Task 1：新增 FormField 组件

**Files:**
- Create: `mes/frontend/apps/mes-new/src/components/FormField.tsx`

- [ ] **Step 1：创建 FormField.tsx**

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

- [ ] **Step 2：类型检查**

Run: `cd mes/frontend && pnpm --filter mes-new exec tsc --noEmit`
Expected: PASS（无错误输出）

- [ ] **Step 3：提交**

```bash
git add mes/frontend/apps/mes-new/src/components/FormField.tsx
git commit -m "✨ feat(mes-new): 新增 FormField 字段封装(label/必填/helper/error 统一)"
```

---

## Task 2：FormDialog 头部去三件套 + FormSection 升级 B2

**Files:**
- Modify: `mes/frontend/apps/mes-new/src/components/FormDialog.tsx`

- [ ] **Step 1：替换整个文件内容**

```tsx
import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Check } from 'lucide-react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  ScrollArea,
  Separator,
} from '@workspace/ui'

interface FormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  icon?: LucideIcon
  onSubmit: () => void
  submitting?: boolean
  submitText?: string
  /** 覆盖弹窗宽度,默认 sm:max-w-lg */
  contentClassName?: string
  children: ReactNode
}

export default function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  icon: Icon,
  onSubmit,
  submitting,
  submitText = '确定',
  contentClassName = 'sm:max-w-lg',
  children,
}: FormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`gap-0 overflow-hidden p-0 ${contentClassName}`}>
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
          <Separator />
          <DialogFooter className="px-6 py-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? '提交中…' : <><Check className="size-4" />{submitText}</>}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/** 表单分区:小图标 + 标题 + 细线 + 可选标签(B2 轻分区) */
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

变更点：删 `bg-gradient-to-r from-primary/5 to-transparent`、删竖条 `<span className="h-10 w-1 …" />`、图标 `size-9 rounded-lg` → `size-10 rounded-xl`、标题加 `text-base font-semibold`、副标题加 `text-xs`、内容区 `space-y-4` → `space-y-5`；`FormSection` 新增可选 `icon`/`tag`，标题去 `uppercase`，外层 `space-y-3` → `space-y-4`。`LucideIcon` 类型已导入。

- [ ] **Step 2：类型检查**

Run: `cd mes/frontend && pnpm --filter mes-new exec tsc --noEmit`
Expected: PASS（Warehouse/ProcessUnit 仍只传 `title`，向后兼容，无错误）

- [ ] **Step 3：提交**

```bash
git add mes/frontend/apps/mes-new/src/components/FormDialog.tsx
git commit -m "💄 style(mes-new): FormDialog 头部去渐变/竖条,FormSection 升级 B2 轻分区"
```

---

## Task 3：UserForm（简单，不分区）

**Files:**
- Modify: `mes/frontend/apps/mes-new/src/pages/system/user/UserForm.tsx`

- [ ] **Step 1：改导入**——把第 6 行 `import { Input, Label, toast } from '@workspace/ui'` 改为：

```tsx
import { Input, toast } from '@workspace/ui'
import FormField from '@/components/FormField'
```

（`import FormDialog from '@/components/FormDialog'` 一行保持不动；新增的 `FormField` 导入加在它附近即可）

- [ ] **Step 2：替换 `return (...)` 内的 `<FormDialog>...</FormDialog>` 整段**

```tsx
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? '编辑用户' : '新增用户'}
      icon={User}
      description="维护系统用户账号"
      onSubmit={onSubmit}
      submitting={loading}
    >
      <FormField label="登录名" htmlFor="f-username" required error={errors.username?.message} help={isEdit ? '登录名创建后不可修改' : undefined}>
        <Input id="f-username" disabled={isEdit} aria-invalid={!!errors.username} {...register('username')} />
      </FormField>
      <FormField label="姓名" htmlFor="f-name" required error={errors.name?.message}>
        <Input id="f-name" aria-invalid={!!errors.name} {...register('name')} />
      </FormField>
      <FormField label={isEdit ? '重置密码' : '初始密码'} htmlFor="f-password" required={!isEdit} error={errors.password?.message} help={isEdit ? '留空表示不修改密码' : '新用户的初始登录密码'}>
        <Input id="f-password" type="password" aria-invalid={!!errors.password} {...register('password')} />
      </FormField>
    </FormDialog>
```

- [ ] **Step 3：类型检查** — Run: `cd mes/frontend && pnpm --filter mes-new exec tsc --noEmit` → Expected: PASS
- [ ] **Step 4：提交**

```bash
git add mes/frontend/apps/mes-new/src/pages/system/user/UserForm.tsx
git commit -m "💄 style(mes-new): UserForm 改用 FormField(锁定/helper/必填)"
```

---

## Task 4：DeptForm（简单，不分区）

**Files:**
- Modify: `mes/frontend/apps/mes-new/src/pages/system/dept/DeptForm.tsx`

- [ ] **Step 1：改导入**——把 `import { Input, Label, toast } from '@workspace/ui'` 改为：

```tsx
import { Input, toast } from '@workspace/ui'
import FormField from '@/components/FormField'
```

（`ParentSelect`、`Controller` 等其余导入不动）

- [ ] **Step 2：替换 `<FormDialog>...</FormDialog>` 整段**

```tsx
    <FormDialog open={open} onOpenChange={onOpenChange} title={isEdit ? '编辑部门' : '新增部门'} icon={Building2} description="维护组织部门" onSubmit={onSubmit} submitting={loading}>
      <FormField label="部门名称" htmlFor="dept-name" required error={errors.name?.message}>
        <Input id="dept-name" aria-invalid={!!errors.name} {...register('name')} />
      </FormField>
      <FormField label="上级部门" required>
        <Controller
          control={control}
          name="parentId"
          render={({ field }) => (
            <ParentSelect nodes={treeNodes} value={field.value} onChange={field.onChange} excludeId={record?.id} />
          )}
        />
      </FormField>
      <FormField label="排序" htmlFor="dept-sort" required error={errors.sortNum?.message}>
        <Input id="dept-sort" type="number" aria-invalid={!!errors.sortNum} {...register('sortNum')} />
      </FormField>
    </FormDialog>
```

- [ ] **Step 3：类型检查** — Run: `cd mes/frontend && pnpm --filter mes-new exec tsc --noEmit` → Expected: PASS
- [ ] **Step 4：提交**

```bash
git add mes/frontend/apps/mes-new/src/pages/system/dept/DeptForm.tsx
git commit -m "💄 style(mes-new): DeptForm 改用 FormField"
```

---

## Task 5：DeviceGroupForm（简单，不分区）

**Files:**
- Modify: `mes/frontend/apps/mes-new/src/pages/basedata/device-group/DeviceGroupForm.tsx`

- [ ] **Step 1：改导入**——把 `import { Input, Label, Textarea, toast } from '@workspace/ui'` 改为：

```tsx
import { Input, Textarea, toast } from '@workspace/ui'
import FormField from '@/components/FormField'
```

- [ ] **Step 2：替换 `<FormDialog>...</FormDialog>` 整段**

```tsx
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? '编辑设备组' : '新增设备组'}
      description="维护设备编组主数据"
      icon={Boxes}
      onSubmit={onSubmit}
      submitting={loading}
    >
      <FormField label="编组代码" htmlFor="dg-code" required error={errors.code?.message}>
        <Input id="dg-code" aria-invalid={!!errors.code} {...register('code')} />
      </FormField>
      <FormField label="编组名称" htmlFor="dg-name" required error={errors.name?.message}>
        <Input id="dg-name" aria-invalid={!!errors.name} {...register('name')} />
      </FormField>
      <FormField label="描述" htmlFor="dg-descr">
        <Textarea id="dg-descr" {...register('descr')} />
      </FormField>
    </FormDialog>
```

- [ ] **Step 3：类型检查** — Run: `cd mes/frontend && pnpm --filter mes-new exec tsc --noEmit` → Expected: PASS
- [ ] **Step 4：提交**

```bash
git add mes/frontend/apps/mes-new/src/pages/basedata/device-group/DeviceGroupForm.tsx
git commit -m "💄 style(mes-new): DeviceGroupForm 改用 FormField"
```

---

## Task 6：ComponentForm（简单，不分区）

**Files:**
- Modify: `mes/frontend/apps/mes-new/src/pages/basedata/component/ComponentForm.tsx`

- [ ] **Step 1：改导入**——把 `import { Input, Label, Textarea, toast } from '@workspace/ui'` 改为：

```tsx
import { Input, Textarea, toast } from '@workspace/ui'
import FormField from '@/components/FormField'
```

- [ ] **Step 2：替换 `<FormDialog>...</FormDialog>` 整段**

```tsx
    <FormDialog open={open} onOpenChange={onOpenChange} title={isEdit ? '编辑组件' : '新增组件'} icon={CircuitBoard} description="维护元器件主数据" onSubmit={onSubmit} submitting={loading}>
      {isEdit && (
        <FormField label="组件编码" htmlFor="c-code">
          <Input id="c-code" value={record?.code ?? ''} disabled />
        </FormField>
      )}
      <FormField label="组件名称" htmlFor="c-name" required error={errors.name?.message}>
        <Input id="c-name" aria-invalid={!!errors.name} {...register('name')} />
      </FormField>
      <FormField label="描述" htmlFor="c-descr">
        <Textarea id="c-descr" {...register('descr')} />
      </FormField>
    </FormDialog>
```

- [ ] **Step 3：类型检查** — Run: `cd mes/frontend && pnpm --filter mes-new exec tsc --noEmit` → Expected: PASS
- [ ] **Step 4：提交**

```bash
git add mes/frontend/apps/mes-new/src/pages/basedata/component/ComponentForm.tsx
git commit -m "💄 style(mes-new): ComponentForm 改用 FormField"
```

---

## Task 7：MenuForm（2 分区）

**Files:**
- Modify: `mes/frontend/apps/mes-new/src/pages/system/menu/MenuForm.tsx`

- [ ] **Step 1：改导入**
  - 把 `import { Input, Label, Select, ... toast } from '@workspace/ui'` 中的 `Label` 删除（保留 `Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, toast`）。
  - 把 `import { ListTree } from 'lucide-react'` 改为 `import { ListTree, Info, KeyRound } from 'lucide-react'`。
  - 把 `import FormDialog from '@/components/FormDialog'` 改为 `import FormDialog, { FormSection } from '@/components/FormDialog'`。
  - 新增一行 `import FormField from '@/components/FormField'`。

- [ ] **Step 2：替换 `<FormDialog>...</FormDialog>` 整段**

```tsx
    <FormDialog open={open} onOpenChange={onOpenChange} title={isEdit ? '编辑菜单' : '新增菜单'} icon={ListTree} description="维护菜单与权限项" onSubmit={onSubmit} submitting={loading}>
      <FormSection title="基本信息" icon={Info} tag="必填">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="编码" htmlFor="m-code" required error={errors.code?.message}>
            <Input id="m-code" aria-invalid={!!errors.code} {...register('code')} />
          </FormField>
          <FormField label="名称" htmlFor="m-name" required error={errors.name?.message}>
            <Input id="m-name" aria-invalid={!!errors.name} {...register('name')} />
          </FormField>
        </div>
        <FormField label="上级菜单" required>
          <Controller
            control={control}
            name="parentId"
            render={({ field }) => (
              <ParentSelect
                nodes={treeNodes.map((n) => toSelectNode(n))}
                value={field.value}
                onChange={field.onChange}
                excludeId={record?.id}
                rootLabel="顶级菜单"
              />
            )}
          />
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="类型" required>
            <Controller
              control={control}
              name="type"
              render={({ field }) => (
                <Select value={String(field.value)} onValueChange={(v) => field.onChange(Number(v))}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">目录</SelectItem>
                    <SelectItem value="1">菜单</SelectItem>
                    <SelectItem value="2">按钮</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
          <FormField label="排序" htmlFor="m-sort" required error={errors.sortNum?.message}>
            <Input id="m-sort" type="number" aria-invalid={!!errors.sortNum} {...register('sortNum')} />
          </FormField>
        </div>
      </FormSection>
      <FormSection title="展示与权限" icon={KeyRound} tag="选填">
        <FormField label="路由 URL" htmlFor="m-url">
          <Input id="m-url" {...register('url')} />
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="权限标识" htmlFor="m-perm">
            <Input id="m-perm" {...register('permission')} />
          </FormField>
          <FormField label="图标(lucide 名)" htmlFor="m-icon">
            <Input id="m-icon" {...register('icon')} />
          </FormField>
        </div>
      </FormSection>
    </FormDialog>
```

- [ ] **Step 3：类型检查** — Run: `cd mes/frontend && pnpm --filter mes-new exec tsc --noEmit` → Expected: PASS（`toSelectNode` 辅助函数仍在文件底部，保持不动）
- [ ] **Step 4：提交**

```bash
git add mes/frontend/apps/mes-new/src/pages/system/menu/MenuForm.tsx
git commit -m "💄 style(mes-new): MenuForm 改用 FormField + B2 双分区(基本信息/展示与权限)"
```

---

## Task 8：DictForm（2 分区）

**Files:**
- Modify: `mes/frontend/apps/mes-new/src/pages/system/dict/DictForm.tsx`

- [ ] **Step 1：改导入**
  - 把 `import { Input, Label, Textarea, toast } from '@workspace/ui'` 改为 `import { Input, Textarea, toast } from '@workspace/ui'`。
  - 把 `import { BookText } from 'lucide-react'` 改为 `import { BookText, Info, Tags } from 'lucide-react'`。
  - 把 `import FormDialog from '@/components/FormDialog'` 改为 `import FormDialog, { FormSection } from '@/components/FormDialog'`。
  - 新增 `import FormField from '@/components/FormField'`。

- [ ] **Step 2：替换 `<FormDialog>...</FormDialog>` 整段**

```tsx
    <FormDialog open={open} onOpenChange={onOpenChange} title={isEdit ? '编辑字典' : '新增字典'} icon={BookText} description="维护数据字典" onSubmit={onSubmit} submitting={loading}>
      <FormSection title="基本信息" icon={Info} tag="必填">
        <FormField label="标签名" htmlFor="d-name" required error={errors.name?.message}>
          <Input id="d-name" aria-invalid={!!errors.name} {...register('name')} />
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="数据值" htmlFor="d-value" required error={errors.value?.message}>
            <Input id="d-value" aria-invalid={!!errors.value} {...register('value')} />
          </FormField>
          <FormField label="类型" htmlFor="d-type" required error={errors.type?.message}>
            <Input id="d-type" aria-invalid={!!errors.type} {...register('type')} />
          </FormField>
        </div>
      </FormSection>
      <FormSection title="归类与描述" icon={Tags} tag="选填">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="排序" htmlFor="d-sort" required error={errors.sortNum?.message}>
            <Input id="d-sort" type="number" aria-invalid={!!errors.sortNum} {...register('sortNum')} />
          </FormField>
          <FormField label="上级 ID" htmlFor="d-parent">
            <Input id="d-parent" {...register('parentId')} />
          </FormField>
        </div>
        <FormField label="描述" htmlFor="d-descr">
          <Textarea id="d-descr" {...register('descr')} />
        </FormField>
      </FormSection>
    </FormDialog>
```

- [ ] **Step 3：类型检查** — Run: `cd mes/frontend && pnpm --filter mes-new exec tsc --noEmit` → Expected: PASS
- [ ] **Step 4：提交**

```bash
git add mes/frontend/apps/mes-new/src/pages/system/dict/DictForm.tsx
git commit -m "💄 style(mes-new): DictForm 改用 FormField + B2 双分区"
```

---

## Task 9：RoleForm（2 分区，含权限树）

**Files:**
- Modify: `mes/frontend/apps/mes-new/src/pages/system/role/RoleForm.tsx`

- [ ] **Step 1：改导入**
  - 把 `import { Input, Label, Textarea, toast } from '@workspace/ui'` 改为 `import { Input, Textarea, toast } from '@workspace/ui'`。
  - 把 `import { ShieldCheck } from 'lucide-react'` 改为 `import { ShieldCheck, Info, ListChecks } from 'lucide-react'`。
  - 把 `import FormDialog from '@/components/FormDialog'` 改为 `import FormDialog, { FormSection } from '@/components/FormDialog'`。
  - 新增 `import FormField from '@/components/FormField'`。

- [ ] **Step 2：替换 `<FormDialog>...</FormDialog>` 整段**

```tsx
    <FormDialog open={open} onOpenChange={onOpenChange} title={isEdit ? '编辑角色' : '新增角色'} icon={ShieldCheck} description="维护角色与权限" onSubmit={onSubmit} submitting={loading}>
      <FormSection title="基本信息" icon={Info} tag="必填">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="角色名" htmlFor="r-name" required error={errors.name?.message}>
            <Input id="r-name" aria-invalid={!!errors.name} {...register('name')} />
          </FormField>
          <FormField label="角色编码" htmlFor="r-code" required error={errors.code?.message}>
            <Input id="r-code" aria-invalid={!!errors.code} {...register('code')} />
          </FormField>
        </div>
        <FormField label="描述" htmlFor="r-descr">
          <Textarea id="r-descr" {...register('descr')} />
        </FormField>
      </FormSection>
      <FormSection title="菜单权限" icon={ListChecks}>
        <div className="max-h-64 overflow-auto rounded-md border border-border p-2">
          <TreeView nodes={menuNodes} checkedIds={checkedIds} onCheckedChange={setCheckedIds} />
        </div>
      </FormSection>
    </FormDialog>
```

- [ ] **Step 3：类型检查** — Run: `cd mes/frontend && pnpm --filter mes-new exec tsc --noEmit` → Expected: PASS
- [ ] **Step 4：提交**

```bash
git add mes/frontend/apps/mes-new/src/pages/system/role/RoleForm.tsx
git commit -m "💄 style(mes-new): RoleForm 改用 FormField + B2 双分区(基本信息/菜单权限)"
```

---

## Task 10：ProcessUnitForm（1 分区 + 开关行，保留 Label）

**Files:**
- Modify: `mes/frontend/apps/mes-new/src/pages/basedata/process-unit/ProcessUnitForm.tsx`

- [ ] **Step 1：改导入**
  - **保留 `Label`**（开关行仍用）：`import { Input, Label, Switch, Textarea, toast } from '@workspace/ui'` 不动。
  - 把 `import { Factory } from 'lucide-react'` 改为 `import { Factory, Info } from 'lucide-react'`。
  - `import FormDialog, { FormSection } from '@/components/FormDialog'` 已存在，不动。
  - 新增 `import FormField from '@/components/FormField'`。

- [ ] **Step 2：替换 `<FormDialog>...</FormDialog>` 整段**

```tsx
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? '编辑工艺单元' : '新增工艺单元'}
      description="维护加工单元主数据"
      icon={Factory}
      onSubmit={onSubmit}
      submitting={loading}
    >
      <FormSection title="基本信息" icon={Info}>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="单元代码" htmlFor="pu-code" required error={errors.code?.message}>
            <Input id="pu-code" aria-invalid={!!errors.code} {...register('code')} />
          </FormField>
          <FormField label="单元名称" htmlFor="pu-name" required error={errors.name?.message}>
            <Input id="pu-name" aria-invalid={!!errors.name} {...register('name')} />
          </FormField>
        </div>
        <FormField label="单元类型" htmlFor="pu-type">
          <Input id="pu-type" placeholder="如:人员作业单元 / 设备作业单元" {...register('type')} />
        </FormField>
        <div className="flex items-center justify-between rounded-md border px-3 py-2">
          <Label htmlFor="pu-lw">是否有线边库</Label>
          <Controller
            control={control}
            name="hasLineWarehouse"
            render={({ field }) => <Switch id="pu-lw" checked={field.value} onCheckedChange={field.onChange} />}
          />
        </div>
        <FormField label="描述" htmlFor="pu-descr">
          <Textarea id="pu-descr" {...register('descr')} />
        </FormField>
      </FormSection>
    </FormDialog>
```

- [ ] **Step 3：类型检查** — Run: `cd mes/frontend && pnpm --filter mes-new exec tsc --noEmit` → Expected: PASS
- [ ] **Step 4：提交**

```bash
git add mes/frontend/apps/mes-new/src/pages/basedata/process-unit/ProcessUnitForm.tsx
git commit -m "💄 style(mes-new): ProcessUnitForm 字段改用 FormField,分区加图标(保留开关行)"
```

---

## Task 11：WarehouseForm（2 分区，4 列网格）

**Files:**
- Modify: `mes/frontend/apps/mes-new/src/pages/basedata/warehouse/WarehouseForm.tsx`

- [ ] **Step 1：改导入**
  - 把 `import { Input, Label, Textarea, toast } from '@workspace/ui'` 改为 `import { Input, Textarea, toast } from '@workspace/ui'`。
  - 把 `import { Warehouse as WarehouseIcon } from 'lucide-react'` 改为 `import { Warehouse as WarehouseIcon, Info, LayoutGrid } from 'lucide-react'`。
  - `import FormDialog, { FormSection } from '@/components/FormDialog'` 已存在，不动。
  - 新增 `import FormField from '@/components/FormField'`。

- [ ] **Step 2：替换 `<FormDialog>...</FormDialog>` 整段**

```tsx
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? '编辑仓库' : '新增仓库'}
      description="维护库房主数据;库位将按规格自动生成"
      icon={WarehouseIcon}
      onSubmit={onSubmit}
      submitting={loading}
    >
      <FormSection title="基本信息" icon={Info} tag="必填">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="库房编码" htmlFor="wh-code" required error={errors.code?.message}>
            <Input id="wh-code" aria-invalid={!!errors.code} {...register('code')} />
          </FormField>
          <FormField label="库房名称" htmlFor="wh-name" required error={errors.name?.message}>
            <Input id="wh-name" aria-invalid={!!errors.name} {...register('name')} />
          </FormField>
        </div>
        <FormField label="库房类型" htmlFor="wh-type">
          <Input id="wh-type" placeholder="如:零件库 / 产品库" {...register('type')} />
        </FormField>
        <FormField label="描述" htmlFor="wh-descr">
          <Textarea id="wh-descr" {...register('descr')} />
        </FormField>
      </FormSection>
      <FormSection title="库位规格" icon={LayoutGrid} tag="必填">
        <div className="grid grid-cols-4 gap-3">
          <FormField label="组" htmlFor="wh-groups" required error={errors.groups?.message}>
            <Input id="wh-groups" type="number" min={1} aria-invalid={!!errors.groups} {...register('groups')} />
          </FormField>
          <FormField label="排" htmlFor="wh-rows" required error={errors.rows?.message}>
            <Input id="wh-rows" type="number" min={1} aria-invalid={!!errors.rows} {...register('rows')} />
          </FormField>
          <FormField label="层" htmlFor="wh-layers" required error={errors.layers?.message}>
            <Input id="wh-layers" type="number" min={1} aria-invalid={!!errors.layers} {...register('layers')} />
          </FormField>
          <FormField label="列" htmlFor="wh-columns" required error={errors.columns?.message}>
            <Input id="wh-columns" type="number" min={1} aria-invalid={!!errors.columns} {...register('columns')} />
          </FormField>
        </div>
        <p className="text-xs text-muted-foreground">保存后后端按「组 × 排 × 层 × 列」自动生成库位。</p>
      </FormSection>
    </FormDialog>
```

- [ ] **Step 3：类型检查** — Run: `cd mes/frontend && pnpm --filter mes-new exec tsc --noEmit` → Expected: PASS
- [ ] **Step 4：提交**

```bash
git add mes/frontend/apps/mes-new/src/pages/basedata/warehouse/WarehouseForm.tsx
git commit -m "💄 style(mes-new): WarehouseForm 改用 FormField,分区加图标"
```

---

## Task 12：MaterileForm（3 分区，宽弹窗）

**Files:**
- Modify: `mes/frontend/apps/mes-new/src/pages/basedata/materile/MaterileForm.tsx`

- [ ] **Step 1：改导入**
  - 把多行 `@workspace/ui` 导入中的 `Label` 删除（保留 `Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, toast`）。
  - 把 `import { Package } from 'lucide-react'` 改为 `import { Package, Info, Boxes, Image as ImageIcon } from 'lucide-react'`。
  - 把 `import FormDialog from '@/components/FormDialog'` 改为 `import FormDialog, { FormSection } from '@/components/FormDialog'`。
  - 新增 `import FormField from '@/components/FormField'`。
  - `import ImageUpload from '@/components/ImageUpload'` 不动。

- [ ] **Step 2：替换 `<FormDialog>...</FormDialog>` 整段**（保留 `contentClassName="sm:max-w-2xl"`）

```tsx
    <FormDialog open={open} onOpenChange={onOpenChange} title={isEdit ? '编辑物料' : '新增物料'} icon={Package} description="维护物料主数据与图片" onSubmit={onSubmit} submitting={loading} contentClassName="sm:max-w-2xl">
      <FormSection title="基本信息" icon={Info} tag="必填">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="物料类型" required error={errors.matType?.message}>
            <Controller
              control={control}
              name="matType"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(v) => {
                    field.onChange(v)
                    const d = TYPE_DEFAULTS[v]
                    if (d) {
                      setValue('source', d.source)
                      setValue('leadTime', d.leadTime)
                    }
                  }}
                >
                  <SelectTrigger className="w-full"><SelectValue placeholder="请选择类型" /></SelectTrigger>
                  <SelectContent>
                    {MAT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
          {isEdit && (
            <FormField label="物料编码" htmlFor="m-materiel">
              <Input id="m-materiel" value={record?.materiel ?? ''} disabled />
            </FormField>
          )}
        </div>
        <FormField label="物料描述" htmlFor="m-desc" required error={errors.materielDesc?.message}>
          <Input id="m-desc" aria-invalid={!!errors.materielDesc} {...register('materielDesc')} />
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="型号" htmlFor="m-model">
            <Input id="m-model" {...register('model')} />
          </FormField>
          <FormField label="单位" htmlFor="m-unit">
            <Input id="m-unit" {...register('unit')} />
          </FormField>
        </div>
      </FormSection>
      <FormSection title="采购与库存" icon={Boxes} tag="选填">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="物料来源">
            <Controller
              control={control}
              name="source"
              render={({ field }) => (
                <Select value={field.value || undefined} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="请选择来源" /></SelectTrigger>
                  <SelectContent>
                    {SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
          <FormField label="规格" htmlFor="m-size">
            <Input id="m-size" {...register('size')} />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="提前期(天)" htmlFor="m-lead" required error={errors.leadTime?.message}>
            <Input id="m-lead" type="number" aria-invalid={!!errors.leadTime} {...register('leadTime')} />
          </FormField>
          <FormField label="安全库存" htmlFor="m-stock" required error={errors.safetyStock?.message}>
            <Input id="m-stock" type="number" aria-invalid={!!errors.safetyStock} {...register('safetyStock')} />
          </FormField>
        </div>
        <FormField label="产品组" htmlFor="m-group">
          <Input id="m-group" {...register('productGroup')} />
        </FormField>
      </FormSection>
      <FormSection title="物料图片" icon={ImageIcon}>
        <Controller
          control={control}
          name="imageUrl"
          render={({ field }) => <ImageUpload value={field.value} onChange={field.onChange} />}
        />
      </FormSection>
    </FormDialog>
```

- [ ] **Step 3：类型检查** — Run: `cd mes/frontend && pnpm --filter mes-new exec tsc --noEmit` → Expected: PASS
- [ ] **Step 4：提交**

```bash
git add mes/frontend/apps/mes-new/src/pages/basedata/materile/MaterileForm.tsx
git commit -m "💄 style(mes-new): MaterileForm 改用 FormField + B2 三分区(基本/采购库存/图片)"
```

---

## Task 13：全量验证 + 人工核对

**Files:** 无（仅验证）

- [ ] **Step 1：类型检查（全量）**

Run: `cd mes/frontend && pnpm --filter mes-new exec tsc --noEmit`
Expected: PASS（无任何错误）

- [ ] **Step 2：Lint**

Run: `cd mes/frontend && pnpm --filter mes-new lint`
Expected: PASS（无 `Label` 等未使用导入报错；如有，回到对应表单删除残留导入）

- [ ] **Step 3：构建**

Run: `cd mes/frontend && pnpm --filter mes-new build`
Expected: 构建成功（`tsc -b && vite build` 通过，产出 dist）

- [ ] **Step 4：启动 dev 人工核对**

Run: `cd mes/frontend && pnpm --filter mes-new dev`（浏览器开 http://localhost:4100）

逐页核对清单（系统管理 + 主数据各页，点「新增」「编辑」打开弹窗）：
- [ ] 头部：无渐变、无竖条；图标徽标 `rounded-xl` 居中；标题/副标题层次正常
- [ ] 复杂表单（菜单/字典/角色/工艺单元/仓库/物料）分区线 + 图标 + 「必填/选填」标签正确；简单表单（用户/部门/设备组/构件）不分区
- [ ] 必填项显示红色星号
- [ ] 故意清空必填项点保存 → 输入框红框 + 下方红字错误（聚焦态为蓝色 3px 环）
- [ ] 禁用字段（用户·编辑态登录名 / 物料·物料编码 / 构件·组件编码）置灰，且 helper 文案正确
- [ ] 物料弹窗更宽（`max-w-2xl`）；仓库「库位规格」为 4 列
- [ ] 工艺单元「是否有线边库」开关行正常
- [ ] 提交成功 toast、提交中按钮态、取消关闭正常
- [ ] 顶部切换明/暗主题，表单无异常

- [ ] **Step 5：（无新文件改动则跳过）** 若 Step 2/4 触发了额外修复，按文件分别 `git add` + `git commit -m "🐛 fix(mes-new): 修复表单重构遗留的 <具体问题>"`。

---

## Self-Review（计划自检结果）

- **Spec coverage**：spec §4 三处共享组件 → Task 1/2；§5 全站 10 表单清单 → Task 3–12 一一对应；§6 验证方式 → Task 13。无遗漏。
- **Placeholder scan**：无 TBD/TODO；每个改动步骤均含完整代码与确切命令。
- **Type consistency**：`FormField` props（`label/htmlFor/required/error/help/className`）在 Task 1 定义，Task 3–12 用法一致；`FormSection` 新增 `icon/tag` 在 Task 2 定义，后续调用一致；分区图标名与图标表一致；各表单 `Label` 导入删除规则已逐一标注（仅 ProcessUnit 保留）。
