# MES-New 周期2b-1 基础数据(物料/元器件)实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `apps/mes-new` 实现基础数据的物料、元器件两页(标准 CRUD),并新增可复用的 `ImageUpload` 组件,确立 basedata 端点 form/JSON 混合编码的处理范式。

**Architecture:** 沿用周期 1/2a 标杆范式(PageContainer/SearchForm/DataTable/ModalForm/useQuery$/useMutation$/invalidate/AlertDialog + react-hook-form + zod)。图片上传用 mes-new 现有 `http` 单例直传 FormData(不引入 `@workspace/utils` 的 HttpContext)。每个 API 函数按后端 Controller 签名显式声明 form 或 JSON 编码。

**Tech Stack:** React 19 + TS + Vite + React Router v7 + @ngify/http(rxjs) + react-hook-form + zod + @tanstack/react-table + @workspace/ui + vitest。

---

## 关键事实(已核对 mes1 源码 + 后端 Controller + 种子 SQL)

- **编码**:`http.post(url, obj)` 默认经 `formEncodingInterceptor` 表单化;传 `{ headers: { 'Content-Type': 'application/json' } }` 则 `shouldFormEncode` 跳过、按 JSON 发送;body 为 `FormData` 时 `shouldFormEncode` 返回 false(原样透传,XHR 自动设 multipart 边界)。
- **物料 Materile**:
  - `/basedata/materile/page`(POST form);`/basedata/materile/add-or-update`(POST **form**,Controller `addOrUpdate(SpMaterile record)` 无 `@RequestBody`);`/basedata/materile/upload-image`(POST **multipart**,响应 `Result.data = { url }`)。
  - **无独立 delete 端点** → 删除走软删 `materileAddOrUpdate({ ...record, deleted: '1' })`。
  - `materiel`(物料编码)后端自动生成,表单只读;新建不传、编辑只读显示。
  - `matType` 必填(产品/零件/标准件/其他);`source`(自制/外购);`matType` 变更自动带出 `source`/`leadTime` 默认值。
  - `flowId`(工艺关联)本批次**省略**(可选字段,依赖工艺域,2c 再补)。
- **元器件 Component**:
  - `/basedata/component/page`(POST form);`/basedata/component/add-or-update`(POST **form**,Controller 无 `@RequestBody`);`/basedata/component/delete`(POST **JSON**,Controller `delete(@RequestBody Map)`)。
  - `code`(组件编码)后端自动生成,表单只读;删除为**硬删** `componentDelete(id)`(JSON)。
- **权限串**(种子 SQL):`materile:add`、`component:add` 存在(无 update/delete 粒度)。策略同 2a:新建按钮用 `<模块>:add` 门禁;编辑/删除不门禁。
- **路由映射**:`utils/urlMap.ts` 已含 `materile → /basedata/materile`、`component → /basedata/component`,侧栏无需改;路由 path 用 `basedata/materile`、`basedata/component`。
- **行记录完整**:`page` 返回完整实体,编辑直接用行记录(无需 get-by-id),与 2a UserForm 模式一致。

## 对 spec 的偏离(已记录)

- **ImageUpload 用 mes-new `http` 单例直传,不用 `@workspace/utils` 的 `createHttpUpload`**:因 mes-new 未挂 `HttpContextProvider`,`createHttpUpload` 的 `useHttp()` 不可用;`http` 单例已含正确拦截器且对 FormData 透传。更正确、零额外依赖。
- **物料 `flowId` 工艺下拉本批次省略**(避免引入工艺域依赖;字段可选,不影响保存)。

## 文件结构

| 文件 | 职责 | 动作 |
|---|---|---|
| `apps/mes-new/src/types/basedata.ts` | `Materiel` / `SpComponent` 类型 | 新建 |
| `apps/mes-new/src/components/ImageUpload.tsx` | 单图上传(预览/清除/重传) | 新建 |
| `apps/mes-new/src/api/basedata/component.ts` | 元器件 API | 新建 |
| `apps/mes-new/src/api/basedata/materile.ts` | 物料 API | 新建 |
| `apps/mes-new/src/pages/basedata/component/{ComponentList,ComponentForm}.tsx` | 元器件页 | 新建 |
| `apps/mes-new/src/pages/basedata/materile/{MaterileList,MaterileForm}.tsx` | 物料页 | 新建 |
| `apps/mes-new/src/router.tsx` | 注册 2 条路由 | 修改 |

所有命令在 `mes/frontend` 执行。

---

### Task 1: 基础数据类型定义

**Files:**
- Create: `apps/mes-new/src/types/basedata.ts`

- [ ] **Step 1: 写类型**

```ts
// apps/mes-new/src/types/basedata.ts

export interface Materiel {
  id: string
  materiel: string // 物料编码,后端自动生成
  materielDesc: string
  unit?: string
  productGroup?: string
  matType?: string
  size?: string
  flowDesc?: string
  flowId?: string
  model?: string
  source?: string
  leadTime?: number
  safetyStock?: number
  imageUrl?: string
  deleted: string // 0=正常 1=删除
  createTime?: string
  createUsername?: string
  updateTime?: string
  updateUsername?: string
}

export interface SpComponent {
  id: string
  code: string // 组件编码,后端自动生成
  name: string
  descr?: string
  deleted: string
  createTime?: string
  createUsername?: string
  updateTime?: string
  updateUsername?: string
}
```

- [ ] **Step 2: 类型检查**

Run: `pnpm --filter mes-new exec tsc --noEmit`
Expected: 通过。

- [ ] **Step 3: Commit**

```bash
git add apps/mes-new/src/types/basedata.ts
git commit -m "🏷️ feat(mes-new): 基础数据类型(Materiel/SpComponent)"
```

---

### Task 2: ImageUpload 组件

**Files:**
- Create: `apps/mes-new/src/components/ImageUpload.tsx`

- [ ] **Step 1: 写组件**

```tsx
// apps/mes-new/src/components/ImageUpload.tsx
import { useRef, useState } from 'react'
import { firstValueFrom } from 'rxjs'
import { Button, toast, cn } from '@workspace/ui'
import { ImagePlus, Loader2, X } from 'lucide-react'
import { http } from '@/http/client'

interface ImageUploadProps {
  value?: string
  onChange: (url: string) => void
  uploadUrl?: string
  className?: string
}

export default function ImageUpload({
  value,
  onChange,
  uploadUrl = '/basedata/materile/upload-image',
  className,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (inputRef.current) inputRef.current.value = '' // 允许重选同一文件
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('仅支持图片文件')
      return
    }
    if (file.size / 1024 / 1024 >= 2) {
      toast.error('图片大小不能超过 2MB')
      return
    }
    const fd = new FormData()
    fd.append('file', file)
    setUploading(true)
    try {
      // FormData 经 formEncodingInterceptor 原样透传;resultUnwrap 解包得 { url }
      const data = await firstValueFrom(http.post<{ url: string }>(uploadUrl, fd))
      onChange(data?.url ?? '')
      toast.success('上传成功')
    } catch {
      /* 拦截器已 toast */
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onPick} />
      {value ? (
        <div className="relative size-20 overflow-hidden rounded-md border border-border">
          <img src={value} alt="预览" className="size-full object-cover" />
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute right-0 top-0 inline-flex size-5 items-center justify-center rounded-bl bg-black/50 text-white hover:bg-black/70"
            aria-label="移除图片"
          >
            <X className="size-3" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex size-20 flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary disabled:opacity-50"
        >
          {uploading ? <Loader2 className="size-5 animate-spin" /> : <ImagePlus className="size-5" />}
          <span className="text-xs">{uploading ? '上传中' : '上传图片'}</span>
        </button>
      )}
      {value && (
        <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={uploading}>
          重新上传
        </Button>
      )}
    </div>
  )
}
```

- [ ] **Step 2: 类型检查**

Run: `pnpm --filter mes-new exec tsc --noEmit`
Expected: 通过。

- [ ] **Step 3: Commit**

```bash
git add apps/mes-new/src/components/ImageUpload.tsx
git commit -m "✨ feat(mes-new): ImageUpload 单图上传组件(http 单例直传 FormData)"
```

---

### Task 3: 元器件页(标准 CRUD)

**Files:**
- Create: `apps/mes-new/src/api/basedata/component.ts`
- Create: `apps/mes-new/src/pages/basedata/component/ComponentForm.tsx`
- Create: `apps/mes-new/src/pages/basedata/component/ComponentList.tsx`
- Modify: `apps/mes-new/src/router.tsx`

- [ ] **Step 1: 写 API**(注意 add-or-update=form、delete=JSON)

```ts
// apps/mes-new/src/api/basedata/component.ts
import { http } from '@/http/client'
import type { PageParams, PageResult } from '@/types/api'
import type { SpComponent } from '@/types/basedata'

export interface ComponentPageParams extends PageParams {
  name?: string
  code?: string
}

export function componentPage(params: ComponentPageParams) {
  return http.post<PageResult<SpComponent>>('/basedata/component/page', params)
}

/** add-or-update 为 form 编码(后端无 @RequestBody) */
export function componentAddOrUpdate(record: Partial<SpComponent>) {
  return http.post<void>('/basedata/component/add-or-update', record)
}

/** delete 为 JSON(后端 @RequestBody Map),显式设 json 头跳过表单化 */
export function componentDelete(id: string) {
  return http.post<void>('/basedata/component/delete', { id }, {
    headers: { 'Content-Type': 'application/json' },
  })
}
```

- [ ] **Step 2: 写 ComponentForm**

```tsx
// apps/mes-new/src/pages/basedata/component/ComponentForm.tsx
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input, Label, Textarea, toast } from '@workspace/ui'
import ModalForm from '@/components/ModalForm'
import { useMutation$ } from '@/http/hooks'
import { invalidate } from '@/http/queryCache'
import { componentAddOrUpdate } from '@/api/basedata/component'
import type { SpComponent } from '@/types/basedata'

interface ComponentFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  record?: SpComponent | null
  onSaved: () => void
}

const schema = z.object({
  name: z.string().min(1, '请输入组件名称'),
  descr: z.string().optional(),
})

export default function ComponentForm({ open, onOpenChange, record, onSaved }: ComponentFormProps) {
  const isEdit = !!record
  const { mutate, loading } = useMutation$((dto: Partial<SpComponent>) => componentAddOrUpdate(dto))
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', descr: '' },
  })

  useEffect(() => {
    if (open) reset({ name: record?.name ?? '', descr: record?.descr ?? '' })
  }, [open, record, reset])

  const onSubmit = handleSubmit(async (values) => {
    const dto: Partial<SpComponent> = {
      ...(record ?? { deleted: '0' }),
      name: values.name,
      descr: values.descr ?? '',
    }
    try {
      await mutate(dto)
      toast.success(isEdit ? '修改成功' : '新增成功')
      invalidate('["basedata","component"')
      onOpenChange(false)
      onSaved()
    } catch {
      /* 拦截器已 toast */
    }
  })

  return (
    <ModalForm open={open} onOpenChange={onOpenChange} title={isEdit ? '编辑组件' : '新增组件'} onSubmit={onSubmit} submitting={loading}>
      {isEdit && (
        <div className="space-y-1.5">
          <Label htmlFor="c-code">组件编码</Label>
          <Input id="c-code" value={record?.code ?? ''} disabled />
        </div>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="c-name">组件名称</Label>
        <Input id="c-name" {...register('name')} />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="c-descr">描述</Label>
        <Textarea id="c-descr" {...register('descr')} />
      </div>
    </ModalForm>
  )
}
```

- [ ] **Step 3: 写 ComponentList**

```tsx
// apps/mes-new/src/pages/basedata/component/ComponentList.tsx
import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  DataTable,
  Input,
  Label,
  toast,
} from '@workspace/ui'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import PageContainer from '@/components/PageContainer'
import SearchForm from '@/components/SearchForm'
import PermissionGuard from '@/components/PermissionGuard'
import ComponentForm from './ComponentForm'
import { useQuery$, useMutation$ } from '@/http/hooks'
import { invalidate } from '@/http/queryCache'
import { componentPage, componentDelete, type ComponentPageParams } from '@/api/basedata/component'
import type { SpComponent } from '@/types/basedata'

const PAGE_SIZE = 10

export default function ComponentList() {
  const [params, setParams] = useState<ComponentPageParams>({ current: 1, size: PAGE_SIZE })
  const [draftCode, setDraftCode] = useState('')
  const [draftName, setDraftName] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<SpComponent | null>(null)
  const [deleting, setDeleting] = useState<SpComponent | null>(null)

  const { data, loading } = useQuery$(['basedata', 'component', 'page', params], () => componentPage(params))
  const { mutate: removeComponent } = useMutation$((id: string) => componentDelete(id))

  const onSearch = () =>
    setParams({ current: 1, size: PAGE_SIZE, code: draftCode || undefined, name: draftName || undefined })
  const onReset = () => {
    setDraftCode('')
    setDraftName('')
    setParams({ current: 1, size: PAGE_SIZE })
  }

  const confirmDelete = async () => {
    if (!deleting) return
    try {
      await removeComponent(deleting.id)
      toast.success('删除成功')
      invalidate('["basedata","component"')
    } catch {
      /* 拦截器已 toast */
    } finally {
      setDeleting(null)
    }
  }

  const columns = useMemo<ColumnDef<SpComponent>[]>(
    () => [
      { accessorKey: 'code', header: '组件编码' },
      { accessorKey: 'name', header: '组件名称' },
      { accessorKey: 'descr', header: '描述', cell: ({ row }) => row.original.descr || '—' },
      { accessorKey: 'createTime', header: '创建时间', cell: ({ row }) => row.original.createTime ?? '—' },
      {
        id: 'actions',
        header: '操作',
        cell: ({ row }) => (
          <div className="flex gap-1">
            <Button variant="ghost" size="icon-sm" onClick={() => { setEditing(row.original); setFormOpen(true) }}>
              <Pencil className="size-4" />
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={() => setDeleting(row.original)}>
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </div>
        ),
      },
    ],
    [],
  )

  return (
    <PageContainer
      title="元器件管理"
      description="维护元器件主数据"
      actions={
        <PermissionGuard perm="component:add">
          <Button onClick={() => { setEditing(null); setFormOpen(true) }}>
            <Plus className="size-4" />
            新建元器件
          </Button>
        </PermissionGuard>
      }
    >
      <SearchForm onSearch={onSearch} onReset={onReset}>
        <div className="space-y-1.5">
          <Label htmlFor="s-comp-code">组件编码</Label>
          <Input id="s-comp-code" className="h-9 w-44" value={draftCode} onChange={(e) => setDraftCode(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="s-comp-name">组件名称</Label>
          <Input id="s-comp-name" className="h-9 w-44" value={draftName} onChange={(e) => setDraftName(e.target.value)} />
        </div>
      </SearchForm>

      <div className="rounded-lg border border-border bg-card p-2">
        <DataTable
          columns={columns}
          data={data?.records ?? []}
          loading={loading}
          loadingRowCount={PAGE_SIZE}
          pagination={{
            mode: 'server',
            pageIndex: (data?.current ?? params.current) - 1,
            pageSize: PAGE_SIZE,
            totalPages: data?.pages ?? 1,
            totalRows: data?.total,
            onPageChange: (idx) => setParams((p) => ({ ...p, current: idx + 1 })),
          }}
        />
      </div>

      <ComponentForm open={formOpen} onOpenChange={setFormOpen} record={editing} onSaved={() => {}} />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>确定删除元器件「{deleting?.name}」吗?此操作不可撤销。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer>
  )
}
```

- [ ] **Step 4: 注册路由**

`router.tsx` import 区(`import DeptList ...` 行后)追加:

```tsx
import ComponentList from '@/pages/basedata/component/ComponentList'
```

children 数组 `{ path: 'system/department', element: <DeptList /> },` 行后追加:

```tsx
          { path: 'basedata/component', element: <ComponentList /> },
```

- [ ] **Step 5: 校验**

Run: `pnpm --filter mes-new exec tsc --noEmit`
Expected: 通过。

Run: `pnpm --filter mes-new build`
Expected: `✓ built` 成功。

- [ ] **Step 6: Commit**

```bash
git add apps/mes-new/src/api/basedata/component.ts apps/mes-new/src/pages/basedata/component apps/mes-new/src/router.tsx
git commit -m "✨ feat(mes-new): 元器件管理页(标准 CRUD)"
```

---

### Task 4: 物料页(标准 CRUD + 图片上传)

**Files:**
- Create: `apps/mes-new/src/api/basedata/materile.ts`
- Create: `apps/mes-new/src/pages/basedata/materile/MaterileForm.tsx`
- Create: `apps/mes-new/src/pages/basedata/materile/MaterileList.tsx`
- Modify: `apps/mes-new/src/router.tsx`

- [ ] **Step 1: 写 API**(add-or-update=form;删除走软删,无独立端点)

```ts
// apps/mes-new/src/api/basedata/materile.ts
import { http } from '@/http/client'
import type { PageParams, PageResult } from '@/types/api'
import type { Materiel } from '@/types/basedata'

export interface MaterilePageParams extends PageParams {
  materiel?: string
  materielDesc?: string
}

export function materilePage(params: MaterilePageParams) {
  return http.post<PageResult<Materiel>>('/basedata/materile/page', params)
}

/** add-or-update 为 form 编码(后端无 @RequestBody);新建不传 materiel(后端自动生成);删除=软删传 deleted='1' */
export function materileAddOrUpdate(record: Partial<Materiel>) {
  return http.post<void>('/basedata/materile/add-or-update', record)
}
```

- [ ] **Step 2: 写 MaterileForm**(多字段 + matType 联动默认 + ImageUpload)

```tsx
// apps/mes-new/src/pages/basedata/materile/MaterileForm.tsx
import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
} from '@workspace/ui'
import ModalForm from '@/components/ModalForm'
import ImageUpload from '@/components/ImageUpload'
import { useMutation$ } from '@/http/hooks'
import { invalidate } from '@/http/queryCache'
import { materileAddOrUpdate } from '@/api/basedata/materile'
import type { Materiel } from '@/types/basedata'

interface MaterileFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  record?: Materiel | null
  onSaved: () => void
}

const MAT_TYPES = ['产品', '零件', '标准件', '其他'] as const
const SOURCES = ['自制', '外购'] as const
const TYPE_DEFAULTS: Record<string, { source: string; leadTime: number }> = {
  产品: { source: '自制', leadTime: 3 },
  零件: { source: '外购', leadTime: 1 },
  标准件: { source: '外购', leadTime: 1 },
  其他: { source: '外购', leadTime: 1 },
}

const schema = z.object({
  matType: z.string().min(1, '请选择物料类型'),
  materielDesc: z.string().min(1, '请输入物料描述'),
  model: z.string().optional(),
  unit: z.string().optional(),
  source: z.string().optional(),
  size: z.string().optional(),
  productGroup: z.string().optional(),
  leadTime: z.coerce.number().int().min(1, '提前期最小为 1'),
  safetyStock: z.coerce.number().int().min(0, '安全库存不能为负'),
  imageUrl: z.string().optional(),
})

export default function MaterileForm({ open, onOpenChange, record, onSaved }: MaterileFormProps) {
  const isEdit = !!record
  const { mutate, loading } = useMutation$((dto: Partial<Materiel>) => materileAddOrUpdate(dto))
  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors },
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { matType: '', materielDesc: '', model: '', unit: '', source: '', size: '', productGroup: '', leadTime: 1, safetyStock: 0, imageUrl: '' },
  })

  useEffect(() => {
    if (open) {
      reset({
        matType: record?.matType ?? '',
        materielDesc: record?.materielDesc ?? '',
        model: record?.model ?? '',
        unit: record?.unit ?? '',
        source: record?.source ?? '',
        size: record?.size ?? '',
        productGroup: record?.productGroup ?? '',
        leadTime: record?.leadTime ?? 1,
        safetyStock: record?.safetyStock ?? 0,
        imageUrl: record?.imageUrl ?? '',
      })
    }
  }, [open, record, reset])

  const onSubmit = handleSubmit(async (values) => {
    const dto: Partial<Materiel> = {
      ...(record ?? { deleted: '0' }),
      matType: values.matType,
      materielDesc: values.materielDesc,
      model: values.model ?? '',
      unit: values.unit ?? '',
      source: values.source ?? '',
      size: values.size ?? '',
      productGroup: values.productGroup ?? '',
      leadTime: values.leadTime,
      safetyStock: values.safetyStock,
      imageUrl: values.imageUrl ?? '',
    }
    try {
      await mutate(dto)
      toast.success(isEdit ? '修改成功' : '新增成功')
      invalidate('["basedata","materile"')
      onOpenChange(false)
      onSaved()
    } catch {
      /* 拦截器已 toast */
    }
  })

  return (
    <ModalForm open={open} onOpenChange={onOpenChange} title={isEdit ? '编辑物料' : '新增物料'} onSubmit={onSubmit} submitting={loading}>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>物料类型</Label>
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
          {errors.matType && <p className="text-xs text-destructive">{errors.matType.message}</p>}
        </div>
        {isEdit && (
          <div className="space-y-1.5">
            <Label htmlFor="m-materiel">物料编码</Label>
            <Input id="m-materiel" value={record?.materiel ?? ''} disabled />
          </div>
        )}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="m-desc">物料描述</Label>
        <Input id="m-desc" {...register('materielDesc')} />
        {errors.materielDesc && <p className="text-xs text-destructive">{errors.materielDesc.message}</p>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="m-model">型号</Label>
          <Input id="m-model" {...register('model')} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="m-unit">单位</Label>
          <Input id="m-unit" {...register('unit')} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>物料来源</Label>
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
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="m-size">规格</Label>
          <Input id="m-size" {...register('size')} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="m-lead">提前期(天)</Label>
          <Input id="m-lead" type="number" {...register('leadTime')} />
          {errors.leadTime && <p className="text-xs text-destructive">{errors.leadTime.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="m-stock">安全库存</Label>
          <Input id="m-stock" type="number" {...register('safetyStock')} />
          {errors.safetyStock && <p className="text-xs text-destructive">{errors.safetyStock.message}</p>}
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="m-group">产品组</Label>
        <Input id="m-group" {...register('productGroup')} />
      </div>
      <div className="space-y-1.5">
        <Label>物料图片</Label>
        <Controller
          control={control}
          name="imageUrl"
          render={({ field }) => <ImageUpload value={field.value} onChange={field.onChange} />}
        />
      </div>
    </ModalForm>
  )
}
```

- [ ] **Step 3: 写 MaterileList**(含图片缩略图列 + 软删)

```tsx
// apps/mes-new/src/pages/basedata/materile/MaterileList.tsx
import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  DataTable,
  Input,
  Label,
  toast,
} from '@workspace/ui'
import { ImageOff, Pencil, Plus, Trash2 } from 'lucide-react'
import PageContainer from '@/components/PageContainer'
import SearchForm from '@/components/SearchForm'
import PermissionGuard from '@/components/PermissionGuard'
import MaterileForm from './MaterileForm'
import { useQuery$, useMutation$ } from '@/http/hooks'
import { invalidate } from '@/http/queryCache'
import { materilePage, materileAddOrUpdate, type MaterilePageParams } from '@/api/basedata/materile'
import type { Materiel } from '@/types/basedata'

const PAGE_SIZE = 10

export default function MaterileList() {
  const [params, setParams] = useState<MaterilePageParams>({ current: 1, size: PAGE_SIZE })
  const [draftMateriel, setDraftMateriel] = useState('')
  const [draftDesc, setDraftDesc] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Materiel | null>(null)
  const [deleting, setDeleting] = useState<Materiel | null>(null)

  const { data, loading } = useQuery$(['basedata', 'materile', 'page', params], () => materilePage(params))
  const { mutate: softDelete } = useMutation$((record: Materiel) => materileAddOrUpdate({ ...record, deleted: '1' }))

  const onSearch = () =>
    setParams({ current: 1, size: PAGE_SIZE, materiel: draftMateriel || undefined, materielDesc: draftDesc || undefined })
  const onReset = () => {
    setDraftMateriel('')
    setDraftDesc('')
    setParams({ current: 1, size: PAGE_SIZE })
  }

  const confirmDelete = async () => {
    if (!deleting) return
    try {
      await softDelete(deleting)
      toast.success('删除成功')
      invalidate('["basedata","materile"')
    } catch {
      /* 拦截器已 toast */
    } finally {
      setDeleting(null)
    }
  }

  const columns = useMemo<ColumnDef<Materiel>[]>(
    () => [
      {
        id: 'image',
        header: '图片',
        cell: ({ row }) =>
          row.original.imageUrl ? (
            <img src={row.original.imageUrl} alt="" className="size-10 rounded object-cover" />
          ) : (
            <div className="flex size-10 items-center justify-center rounded bg-muted text-muted-foreground">
              <ImageOff className="size-4" />
            </div>
          ),
      },
      { accessorKey: 'materiel', header: '物料编码' },
      { accessorKey: 'materielDesc', header: '物料描述' },
      { accessorKey: 'matType', header: '类型', cell: ({ row }) => row.original.matType || '—' },
      { accessorKey: 'unit', header: '单位', cell: ({ row }) => row.original.unit || '—' },
      {
        id: 'actions',
        header: '操作',
        cell: ({ row }) => (
          <div className="flex gap-1">
            <Button variant="ghost" size="icon-sm" onClick={() => { setEditing(row.original); setFormOpen(true) }}>
              <Pencil className="size-4" />
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={() => setDeleting(row.original)}>
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </div>
        ),
      },
    ],
    [],
  )

  return (
    <PageContainer
      title="物料管理"
      description="维护物料主数据与图片"
      actions={
        <PermissionGuard perm="materile:add">
          <Button onClick={() => { setEditing(null); setFormOpen(true) }}>
            <Plus className="size-4" />
            新建物料
          </Button>
        </PermissionGuard>
      }
    >
      <SearchForm onSearch={onSearch} onReset={onReset}>
        <div className="space-y-1.5">
          <Label htmlFor="s-mat-code">物料编码</Label>
          <Input id="s-mat-code" className="h-9 w-44" value={draftMateriel} onChange={(e) => setDraftMateriel(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="s-mat-desc">物料描述</Label>
          <Input id="s-mat-desc" className="h-9 w-44" value={draftDesc} onChange={(e) => setDraftDesc(e.target.value)} />
        </div>
      </SearchForm>

      <div className="rounded-lg border border-border bg-card p-2">
        <DataTable
          columns={columns}
          data={data?.records ?? []}
          loading={loading}
          loadingRowCount={PAGE_SIZE}
          pagination={{
            mode: 'server',
            pageIndex: (data?.current ?? params.current) - 1,
            pageSize: PAGE_SIZE,
            totalPages: data?.pages ?? 1,
            totalRows: data?.total,
            onPageChange: (idx) => setParams((p) => ({ ...p, current: idx + 1 })),
          }}
        />
      </div>

      <MaterileForm open={formOpen} onOpenChange={setFormOpen} record={editing} onSaved={() => {}} />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>确定删除物料「{deleting?.materielDesc}」吗?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer>
  )
}
```

- [ ] **Step 4: 注册路由**

`router.tsx` import 区(`import ComponentList ...` 行后)追加:

```tsx
import MaterileList from '@/pages/basedata/materile/MaterileList'
```

children 数组 `{ path: 'basedata/component', element: <ComponentList /> },` 行后追加:

```tsx
          { path: 'basedata/materile', element: <MaterileList /> },
```

- [ ] **Step 5: 校验**

Run: `pnpm --filter mes-new exec tsc --noEmit`
Expected: 通过。

Run: `pnpm --filter mes-new build`
Expected: `✓ built` 成功。

- [ ] **Step 6: Commit**

```bash
git add apps/mes-new/src/api/basedata/materile.ts apps/mes-new/src/pages/basedata/materile apps/mes-new/src/router.tsx
git commit -m "✨ feat(mes-new): 物料管理页(标准 CRUD + 图片上传)"
```

---

### Task 5: 全量验证 + 运行时验收

**Files:** 无(仅验证)

- [ ] **Step 1: 静态门禁全过**

Run: `pnpm --filter mes-new exec tsc --noEmit`
Expected: 通过。

Run: `pnpm --filter mes-new lint`
Expected: exit 0(允许 warning)。

Run: `pnpm --filter mes-new test`
Expected: 既有用例全 PASS(本批次未新增纯函数测试)。

Run: `pnpm --filter mes-new build`
Expected: `✓ built` 成功。

- [ ] **Step 2: 运行时验收(后端 :9090,admin/123,贴现象)**

`pnpm --filter mes-new dev`,登录后:

1. 侧栏「基础数据」进入 物料、元器件。
2. **元器件**:搜索(编码/名称)、新建(编码自动生成只读)、编辑、删除(硬删,JSON 端点)、分页正常。
3. **物料**:搜索、新建(类型联动来源/提前期默认值;编码自动生成)、**上传图片→预览→重传/移除**、保存后列表缩略图显示;编辑、删除(软删 deleted='1')。
4. **图片上传**:确认 `/basedata/materile/upload-image` 返回 `{ url }` 被正确取用(若响应形态不同导致预览空,按 systematic-debugging 核对响应结构后修正 ImageUpload 取值)。
5. D/B 主题切换下两页与 ImageUpload 无异常。

- [ ] **Step 3: 记录验收结果**(通过/问题;有问题用 systematic-debugging 处理后再勾选)

---

## 自检(Self-Review)

- **Spec 覆盖**:物料(Task 4)、元器件(Task 3)两页 + ImageUpload(Task 2)+ 类型(Task 1)+ 验收(Task 5),覆盖 spec §3/§4/§5/§7。
- **占位符**:无 TBD/TODO;每步含完整代码与确切命令/预期。
- **类型一致性**:`Materiel`/`SpComponent` 跨 api/页面一致;`http.post(url,body,{headers})` 第三参用于 component delete 的 JSON 头;`invalidate` 前缀(`["basedata","component"`/`["basedata","materile"`)与 query key 前缀对应;`ImageUpload` 的 `value/onChange` 与表单 `Controller name="imageUrl"` 对接一致。
- **编码差异**:component add-or-update=form、delete=JSON(显式头);materile add-or-update=form、上传=FormData 透传、删除=软删——与 Controller 核对一致。
- **已知风险**:上传响应形态(`{url}`)运行时确认;物料编码/元器件编码由后端生成(表单只读)。已在计划标注。
- **偏离**:ImageUpload 用 http 单例(非 createHttpUpload)、materile flowId 省略——已在"对 spec 的偏离"记录。
