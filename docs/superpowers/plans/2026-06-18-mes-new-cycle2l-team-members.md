# 班组员工定义页 实现计划 (cycle2l)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `apps/mes-new` 新建 `/system/team`「班组员工定义」主从页（左班组 CRUD + 右选中班组成员维护），消除当前 404。

**Architecture:** 复用既有主从页范式——`MasterDetailLayout`（左 `DataTable` + `SearchForm` + `FormDialog`，右 `RelatedPanel` + `DualListTransfer`）。后端 `/admin/sys/team` 已完整（班组 CRUD + 成员增删 + 候选用户池），本周期**仅做前端 + 接线 + 后端顺带审查**。生产线/车间无数据源，不入表单。

**Tech Stack:** React 18 + TS + Vite + `@workspace/ui`(shadcn/Radix) + react-hook-form + zod + rxjs 版 `useQuery$`/`useMutation$` + vitest。

**关键约定（实现前必读）：**
- HTTP：`http.post<T>(url, body)` 默认 **form 编码**；`@RequestBody` 端点需第三参 `{ headers: { 'Content-Type': 'application/json' } }`（见 `api/basedata/process-unit.ts`）。`http.get<T>(url)`。均返回 rxjs `Observable<T>`，`Result` 由拦截器解包、错误/401 自动 toast/跳转。
- 分页：请求 `current`(1基)/`size`；响应 `PageResult{records,total,size,current,pages}`。DataTable `pageIndex` 为 0 基，需 `current-1` 换算。
- 缓存失效：`invalidate(prefix)` 对「序列化 key 以 prefix 开头」的查询触发重拉。本页统一用 `invalidate('["sys","team"')` 覆盖 page/users/available-users 三类 key（过度失效无害）。
- **权限**：同级系统页 `DictList` 不加按钮级 `PermissionGuard`，本页对齐——**不使用 PermissionGuard**。
- **RHF 字段名**：`code/name/descr/startTime/endTime` 用 `register`（`DictForm` 已证 `register('name')` 安全）；`workdays`(数组多选) 用 `Controller`，规避 [[rhf-field-name-dom-clobbering]]。

**工作目录约定：**
- 前端命令在 `mes/frontend/apps/mes-new` 下执行：`cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack/mes/frontend/apps/mes-new`
- git 命令在仓库根执行：`cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack`

---

### Task 1: teamUtils 纯函数 + 单测（TDD）

**Files:**
- Create: `mes/frontend/apps/mes-new/src/pages/system/team/teamUtils.ts`
- Test: `mes/frontend/apps/mes-new/src/pages/system/team/__tests__/teamUtils.test.ts`

- [ ] **Step 1: 写失败测试**

`mes/frontend/apps/mes-new/src/pages/system/team/__tests__/teamUtils.test.ts`
```ts
import { describe, it, expect } from 'vitest'
import { WEEKDAYS, parseWorkdays, formatWorkdays, workdaysLabel } from '../teamUtils'

describe('WEEKDAYS', () => {
  it('含周一至周日共 7 项,值为 1..7', () => {
    expect(WEEKDAYS).toHaveLength(7)
    expect(WEEKDAYS.map((w) => w.value)).toEqual(['1', '2', '3', '4', '5', '6', '7'])
    expect(WEEKDAYS[0].label).toBe('周一')
    expect(WEEKDAYS[6].label).toBe('周日')
  })
})

describe('parseWorkdays', () => {
  it('空/undefined → []', () => {
    expect(parseWorkdays(undefined)).toEqual([])
    expect(parseWorkdays('')).toEqual([])
  })
  it('CSV 拆分并去空白与空段,保序', () => {
    expect(parseWorkdays('3, 1 ,2')).toEqual(['3', '1', '2'])
    expect(parseWorkdays('1,,2,')).toEqual(['1', '2'])
  })
})

describe('formatWorkdays', () => {
  it('空/undefined → 空串', () => {
    expect(formatWorkdays(undefined)).toBe('')
    expect(formatWorkdays([])).toBe('')
  })
  it('数值升序、去重、过滤非法值', () => {
    expect(formatWorkdays(['3', '1', '2'])).toBe('1,2,3')
    expect(formatWorkdays(['2', '2', '1'])).toBe('1,2')
    expect(formatWorkdays(['8', '0', 'x', '5'])).toBe('5')
  })
})

describe('workdaysLabel', () => {
  it('空 → "-"', () => {
    expect(workdaysLabel(undefined)).toBe('-')
    expect(workdaysLabel('')).toBe('-')
  })
  it('CSV → 中文星期(升序,空格连接)', () => {
    expect(workdaysLabel('1,2,3,4,5')).toBe('周一 周二 周三 周四 周五')
    expect(workdaysLabel('7,6')).toBe('周六 周日')
  })
  it('忽略非法值', () => {
    expect(workdaysLabel('1,9,2')).toBe('周一 周二')
  })
})

describe('parse↔format 往返', () => {
  it('format(parse(csv)) 归一化为升序去重', () => {
    expect(formatWorkdays(parseWorkdays('3,1,2'))).toBe('1,2,3')
    expect(formatWorkdays(parseWorkdays('5,5,1'))).toBe('1,5')
  })
})
```

- [ ] **Step 2: 运行测试,确认失败**

Run: `cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack/mes/frontend/apps/mes-new && pnpm test src/pages/system/team`
Expected: FAIL — 无法解析 `../teamUtils`（模块不存在）。

- [ ] **Step 3: 实现 teamUtils**

`mes/frontend/apps/mes-new/src/pages/system/team/teamUtils.ts`
```ts
export interface Weekday {
  value: string
  label: string
}

/** 周一(1)..周日(7) */
export const WEEKDAYS: Weekday[] = [
  { value: '1', label: '周一' },
  { value: '2', label: '周二' },
  { value: '3', label: '周三' },
  { value: '4', label: '周四' },
  { value: '5', label: '周五' },
  { value: '6', label: '周六' },
  { value: '7', label: '周日' },
]

const LABEL_MAP: Record<string, string> = Object.fromEntries(
  WEEKDAYS.map((w) => [w.value, w.label]),
)

const isValidDay = (v: string): boolean => /^[1-7]$/.test(v)

/** CSV "3, 1 ,2" → ['3','1','2']:去空白、去空段、保序 */
export function parseWorkdays(csv?: string): string[] {
  if (!csv) return []
  return csv
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

/** ['3','1','2'] → "1,2,3":过滤非法值、去重、数值升序;空 → '' */
export function formatWorkdays(days?: string[]): string {
  if (!days || days.length === 0) return ''
  const uniq = Array.from(new Set(days.map((d) => d.trim()).filter(isValidDay)))
  uniq.sort((a, b) => Number(a) - Number(b))
  return uniq.join(',')
}

/** CSV → "周一 周二 周三"(升序、空格连接);空/全非法 → '-' */
export function workdaysLabel(csv?: string): string {
  const labels = parseWorkdays(csv)
    .filter(isValidDay)
    .sort((a, b) => Number(a) - Number(b))
    .map((v) => LABEL_MAP[v])
  return labels.length > 0 ? labels.join(' ') : '-'
}
```

- [ ] **Step 4: 运行测试,确认通过**

Run: `cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack/mes/frontend/apps/mes-new && pnpm test src/pages/system/team`
Expected: PASS（teamUtils 全部用例绿）。

- [ ] **Step 5: 提交**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack
git add mes/frontend/apps/mes-new/src/pages/system/team/teamUtils.ts mes/frontend/apps/mes-new/src/pages/system/team/__tests__/teamUtils.test.ts
git commit -m "✨ feat(mes-new): 2l 班组工作日工具 teamUtils(parse/format/label, TDD 全绿)"
```

---

### Task 2: 类型 + API 层

**Files:**
- Modify: `mes/frontend/apps/mes-new/src/types/system.ts`（追加 `SpTeamDTO`）
- Modify: `mes/frontend/apps/mes-new/src/api/system/team.ts`（重写,补全端点）

- [ ] **Step 1: 追加 SpTeamDTO 类型**

在 `mes/frontend/apps/mes-new/src/types/system.ts` **文件顶部**加导入（若已有 import 区则并入）：
```ts
import type { SpTeam } from './process-unit'
import type { SysUser } from './user'
```
在文件**末尾**追加：
```ts
/** 班组分页 DTO:在 SpTeam 基础上带关联展示字段(userList 仅 detail 接口返回) */
export interface SpTeamDTO extends SpTeam {
  lineName?: string
  workshopName?: string
  userCount?: number
  userList?: SysUser[]
}
```

- [ ] **Step 2: 重写 api/system/team.ts(补全全部端点)**

`mes/frontend/apps/mes-new/src/api/system/team.ts`（整文件覆盖）
```ts
import { http } from '@/http/client'
import type { PageParams, PageResult } from '@/types/api'
import type { SpTeam } from '@/types/process-unit'
import type { SpTeamDTO } from '@/types/system'
import type { SysUser } from '@/types/user'

const JSON_HEADERS = { headers: { 'Content-Type': 'application/json' } }

export interface TeamPageParams extends PageParams {
  name?: string
  code?: string
}

/** 班组分页(form 编码);记录含 userCount/lineName/workshopName。亦用于工艺单元绑定候选 */
export function teamPage(params: TeamPageParams) {
  return http.post<PageResult<SpTeamDTO>>('/admin/sys/team/page', params)
}

/** 新增/编辑班组(form 编码;后端 SpTeam record,非 @RequestBody) */
export function teamAddOrUpdate(record: SpTeam) {
  return http.post<string>('/admin/sys/team/add-or-update', record)
}

/** 软删除班组(JSON;后端 @RequestBody {id},置 is_deleted='1') */
export function teamDelete(id: string) {
  return http.post<void>('/admin/sys/team/delete', { id }, JSON_HEADERS)
}

/** 查询某班组成员 */
export function teamUsers(teamId: string) {
  return http.get<SysUser[]>(`/admin/sys/team/users/${teamId}`)
}

/** 全部可选用户(is_deleted='0');候选池由前端 excludeSelected 排除已在组者 */
export function teamAvailableUsers() {
  return http.get<SysUser[]>('/admin/sys/team/available-users')
}

/** 批量添加成员(JSON;{teamId,userIds});后端按 (team_id,user_id) 去重 */
export function teamUsersAdd(teamId: string, userIds: string[]) {
  return http.post<void>('/admin/sys/team/users/add', { teamId, userIds }, JSON_HEADERS)
}

/** 移除单个成员(JSON;{teamId,userId}) */
export function teamUserRemove(teamId: string, userId: string) {
  return http.post<void>('/admin/sys/team/users/remove', { teamId, userId }, JSON_HEADERS)
}
```

- [ ] **Step 3: 类型检查**

Run: `cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack/mes/frontend/apps/mes-new && pnpm check-types`
Expected: 退出码 0,无报错（`teamPage` 返回类型由 `PageResult<SpTeam>` 改为 `PageResult<SpTeamDTO>`;因 `SpTeamDTO extends SpTeam`,`ProcessUnitTeams.tsx` 中 `toItem(t: SpTeam)`/`.map(t=>t.id)` 仍兼容）。

- [ ] **Step 4: 提交**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack
git add mes/frontend/apps/mes-new/src/types/system.ts mes/frontend/apps/mes-new/src/api/system/team.ts
git commit -m "✨ feat(mes-new): 2l 班组 API 全端点+SpTeamDTO(注意 form/JSON 编码差异)"
```

---

### Task 3: TeamForm 班组新增/编辑弹窗

**Files:**
- Create: `mes/frontend/apps/mes-new/src/pages/system/team/TeamForm.tsx`

- [ ] **Step 1: 实现 TeamForm**

`mes/frontend/apps/mes-new/src/pages/system/team/TeamForm.tsx`
```tsx
import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Users, Info, Clock } from 'lucide-react'
import { Input, Textarea, Checkbox, toast } from '@workspace/ui'
import FormDialog, { FormSection } from '@/components/FormDialog'
import FormField from '@/components/FormField'
import { useMutation$ } from '@/http/hooks'
import { invalidate } from '@/http/queryCache'
import { teamAddOrUpdate } from '@/api/system/team'
import type { SpTeam } from '@/types/process-unit'
import { WEEKDAYS, parseWorkdays, formatWorkdays } from './teamUtils'

interface TeamFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  record?: SpTeam | null
  onSaved?: (saved: SpTeam) => void
}

const schema = z.object({
  code: z.string().min(1, '请输入班组代码'),
  name: z.string().min(1, '请输入班组名称'),
  descr: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  workdays: z.array(z.string()).optional(),
})

type FormValues = z.infer<typeof schema>

export default function TeamForm({ open, onOpenChange, record, onSaved }: TeamFormProps) {
  const isEdit = !!record
  const { mutate, loading } = useMutation$((dto: SpTeam) => teamAddOrUpdate(dto))
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { code: '', name: '', descr: '', startTime: '', endTime: '', workdays: [] },
  })

  useEffect(() => {
    if (open) {
      reset({
        code: record?.code ?? '',
        name: record?.name ?? '',
        descr: record?.descr ?? '',
        startTime: record?.startTime ?? '',
        endTime: record?.endTime ?? '',
        workdays: parseWorkdays(record?.workdays),
      })
    }
  }, [open, record, reset])

  const onSubmit = handleSubmit(async (values) => {
    const dto: SpTeam = {
      ...(record ?? {
        id: '',
        code: '',
        name: '',
        descr: '',
        lineId: '',
        workshopId: '',
        startTime: '',
        endTime: '',
        workdays: '',
        deleted: '0',
      }),
      code: values.code,
      name: values.name,
      descr: values.descr ?? '',
      startTime: values.startTime ?? '',
      endTime: values.endTime ?? '',
      workdays: formatWorkdays(values.workdays),
    }
    try {
      await mutate(dto)
      toast.success(isEdit ? '修改成功' : '新增成功')
      invalidate('["sys","team"')
      onOpenChange(false)
      onSaved?.(dto)
    } catch {
      /* 拦截器已 toast */
    }
  })

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? '编辑班组' : '新增班组'}
      icon={Users}
      description="维护班组基本信息与排班"
      onSubmit={onSubmit}
      submitting={loading}
    >
      <FormSection title="基本信息" icon={Info} tag="必填">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="班组代码" htmlFor="t-code" required error={errors.code?.message}>
            <Input id="t-code" aria-invalid={!!errors.code} {...register('code')} />
          </FormField>
          <FormField label="班组名称" htmlFor="t-name" required error={errors.name?.message}>
            <Input id="t-name" aria-invalid={!!errors.name} {...register('name')} />
          </FormField>
        </div>
        <FormField label="备注" htmlFor="t-descr">
          <Textarea id="t-descr" {...register('descr')} />
        </FormField>
      </FormSection>

      <FormSection title="排班" icon={Clock} tag="选填">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="上班时间" htmlFor="t-start">
            <Input id="t-start" type="time" {...register('startTime')} />
          </FormField>
          <FormField label="下班时间" htmlFor="t-end">
            <Input id="t-end" type="time" {...register('endTime')} />
          </FormField>
        </div>
        <FormField label="工作日">
          <Controller
            control={control}
            name="workdays"
            render={({ field }) => {
              const value = field.value ?? []
              return (
                <div className="flex flex-wrap gap-3 pt-1">
                  {WEEKDAYS.map((w) => (
                    <label key={w.value} className="flex cursor-pointer items-center gap-1.5 text-sm">
                      <Checkbox
                        checked={value.includes(w.value)}
                        onCheckedChange={(v) =>
                          field.onChange(
                            v ? [...value, w.value] : value.filter((x) => x !== w.value),
                          )
                        }
                      />
                      {w.label}
                    </label>
                  ))}
                </div>
              )
            }}
          />
        </FormField>
      </FormSection>
    </FormDialog>
  )
}
```

- [ ] **Step 2: 类型检查**

Run: `cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack/mes/frontend/apps/mes-new && pnpm check-types`
Expected: 退出码 0,无报错。

- [ ] **Step 3: 提交**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack
git add mes/frontend/apps/mes-new/src/pages/system/team/TeamForm.tsx
git commit -m "✨ feat(mes-new): 2l 班组表单 TeamForm(基础+排班, workdays 用 Controller 多选)"
```

---

### Task 4: TeamMembers 右侧成员维护面板

**Files:**
- Create: `mes/frontend/apps/mes-new/src/pages/system/team/TeamMembers.tsx`

- [ ] **Step 1: 实现 TeamMembers**

`mes/frontend/apps/mes-new/src/pages/system/team/TeamMembers.tsx`
```tsx
import { useState } from 'react'
import {
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  toast,
} from '@workspace/ui'
import { UserPlus, Trash2, Users } from 'lucide-react'
import RelatedPanel from '@/components/RelatedPanel'
import DualListTransfer from '@/components/DualListTransfer'
import { useQuery$, useMutation$ } from '@/http/hooks'
import { invalidate } from '@/http/queryCache'
import {
  teamUsers,
  teamAvailableUsers,
  teamUsersAdd,
  teamUserRemove,
} from '@/api/system/team'
import { excludeSelected, type TransferItem } from '@/utils/transfer'
import type { SpTeamDTO } from '@/types/system'
import type { SysUser } from '@/types/user'

interface Props {
  team: SpTeamDTO
}

export default function TeamMembers({ team }: Props) {
  const [transferOpen, setTransferOpen] = useState(false)
  const { data: members } = useQuery$(['sys', 'team', 'users', team.id], () => teamUsers(team.id))
  const { data: available } = useQuery$(
    ['sys', 'team', 'available-users'],
    () => teamAvailableUsers(),
    { enabled: transferOpen },
  )
  const { mutate: addUsers } = useMutation$((userIds: string[]) => teamUsersAdd(team.id, userIds))
  const { mutate: removeUser } = useMutation$((userId: string) => teamUserRemove(team.id, userId))

  const memberList = members ?? []
  const refresh = () => invalidate('["sys","team"')

  const toItem = (u: SysUser): TransferItem => ({ id: u.id, primary: u.name, secondary: u.username })
  const selectedItems = memberList.map(toItem)
  const candidates = excludeSelected(available ?? [], memberList.map((u) => u.id)).map(toItem)

  const handleAdd = async (ids: string[]) => {
    try {
      await addUsers(ids)
      toast.success('已添加成员')
      refresh()
    } catch {
      /* 拦截器已 toast */
    }
  }
  const handleRemove = async (id: string) => {
    try {
      await removeUser(id)
      toast.success('已移除成员')
      refresh()
    } catch {
      /* 拦截器已 toast */
    }
  }

  return (
    <>
      <RelatedPanel
        icon={Users}
        title={`「${team.name}」成员`}
        count={memberList.length}
        actions={
          <Button size="sm" variant="outline" onClick={() => setTransferOpen(true)}>
            <UserPlus className="size-4" />
            添加成员
          </Button>
        }
      >
        {memberList.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            暂无成员,点击「添加成员」分配员工
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>姓名</TableHead>
                <TableHead>登录名</TableHead>
                <TableHead className="w-16">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {memberList.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>{u.name}</TableCell>
                  <TableCell>{u.username}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon-sm" onClick={() => handleRemove(u.id)}>
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </RelatedPanel>

      <DualListTransfer
        open={transferOpen}
        onOpenChange={setTransferOpen}
        title={`为「${team.name}」添加成员`}
        description="勾选候选员工加入班组,或移除已在组成员"
        candidates={candidates}
        selected={selectedItems}
        onAdd={handleAdd}
        onRemove={handleRemove}
      />
    </>
  )
}
```

- [ ] **Step 2: 类型检查**

Run: `cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack/mes/frontend/apps/mes-new && pnpm check-types`
Expected: 退出码 0,无报错。

- [ ] **Step 3: 提交**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack
git add mes/frontend/apps/mes-new/src/pages/system/team/TeamMembers.tsx
git commit -m "✨ feat(mes-new): 2l 班组成员面板 TeamMembers(RelatedPanel+DualListTransfer 增删成员)"
```

---

### Task 5: TeamPage 主从页编排器

**Files:**
- Create: `mes/frontend/apps/mes-new/src/pages/system/team/TeamPage.tsx`

- [ ] **Step 1: 实现 TeamPage**

`mes/frontend/apps/mes-new/src/pages/system/team/TeamPage.tsx`
```tsx
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
import MasterDetailLayout from '@/components/MasterDetailLayout'
import SearchForm from '@/components/SearchForm'
import TeamForm from './TeamForm'
import TeamMembers from './TeamMembers'
import { useQuery$, useMutation$ } from '@/http/hooks'
import { invalidate } from '@/http/queryCache'
import { teamPage, teamDelete, type TeamPageParams } from '@/api/system/team'
import type { SpTeamDTO } from '@/types/system'
import { workdaysLabel } from './teamUtils'

const PAGE_SIZE = 10

export default function TeamPage() {
  const [params, setParams] = useState<TeamPageParams>({ current: 1, size: PAGE_SIZE })
  const [draftCode, setDraftCode] = useState('')
  const [draftName, setDraftName] = useState('')
  const [selected, setSelected] = useState<SpTeamDTO | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<SpTeamDTO | null>(null)
  const [deleting, setDeleting] = useState<SpTeamDTO | null>(null)

  const { data, loading } = useQuery$(['sys', 'team', 'page', params], () => teamPage(params))
  const { mutate: removeTeam } = useMutation$((id: string) => teamDelete(id))

  const onSearch = () =>
    setParams({
      current: 1,
      size: PAGE_SIZE,
      code: draftCode || undefined,
      name: draftName || undefined,
    })
  const onReset = () => {
    setDraftCode('')
    setDraftName('')
    setParams({ current: 1, size: PAGE_SIZE })
  }

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const confirmDelete = async () => {
    if (!deleting) return
    try {
      await removeTeam(deleting.id)
      toast.success('删除成功')
      invalidate('["sys","team"')
      if (selected?.id === deleting.id) setSelected(null)
    } catch {
      /* 拦截器已 toast */
    } finally {
      setDeleting(null)
    }
  }

  const columns = useMemo<ColumnDef<SpTeamDTO>[]>(
    () => [
      { accessorKey: 'code', header: '班组代码' },
      { accessorKey: 'name', header: '班组名称' },
      {
        id: 'workdays',
        header: '工作日',
        cell: ({ row }) => workdaysLabel(row.original.workdays),
      },
      {
        id: 'userCount',
        header: '成员数',
        cell: ({ row }) => row.original.userCount ?? 0,
      },
      {
        id: 'actions',
        header: '操作',
        cell: ({ row }) => (
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={(e) => {
                e.stopPropagation()
                setEditing(row.original)
                setFormOpen(true)
              }}
            >
              <Pencil className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={(e) => {
                e.stopPropagation()
                setDeleting(row.original)
              }}
            >
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </div>
        ),
      },
    ],
    [selected?.id],
  )

  return (
    <PageContainer
      title="班组员工定义"
      description="维护班组及其员工归属"
      actions={
        <Button onClick={openCreate}>
          <Plus className="size-4" />
          新增班组
        </Button>
      }
    >
      <MasterDetailLayout
        master={
          <div className="space-y-3">
            <SearchForm onSearch={onSearch} onReset={onReset}>
              <div className="space-y-1.5">
                <Label htmlFor="t-s-code">班组代码</Label>
                <Input
                  id="t-s-code"
                  className="h-9 w-40"
                  value={draftCode}
                  onChange={(e) => setDraftCode(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="t-s-name">班组名称</Label>
                <Input
                  id="t-s-name"
                  className="h-9 w-40"
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                />
              </div>
            </SearchForm>
            <DataTable
              columns={columns}
              data={data?.records ?? []}
              loading={loading}
              loadingRowCount={PAGE_SIZE}
              getRowId={(r) => r.id}
              onRowClick={(r) => setSelected(r)}
              rowClassName={(r) => (r.id === selected?.id ? 'bg-accent' : '')}
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
        }
        detail={
          !selected ? (
            <div className="rounded-lg border border-border bg-card p-8 text-center">
              <p className="text-sm text-muted-foreground">请选择左侧班组以维护其成员</p>
            </div>
          ) : (
            <TeamMembers key={selected.id} team={selected} />
          )
        }
      />

      <TeamForm
        open={formOpen}
        onOpenChange={setFormOpen}
        record={editing}
        onSaved={(saved) => {
          if (selected && saved.id && saved.id === selected.id) {
            setSelected({ ...selected, ...saved })
          }
        }}
      />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定删除班组「{deleting?.name}」吗?删除后该班组不再显示。
            </AlertDialogDescription>
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

> 说明：`columns` 依赖 `selected?.id`（操作列本身不读 selected,但保持依赖项稳定无害;DictList 用 `[]`,此处因无 selected 引用亦可用 `[]`——二选一,实现时若 lint 报 `react-hooks/exhaustive-deps` 以其提示为准）。选中班组用 `key={selected.id}` 让 `TeamMembers` 切换班组时**重新挂载**,自动清掉成员弹窗瞬态（防御性卫生）。

- [ ] **Step 2: 类型检查**

Run: `cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack/mes/frontend/apps/mes-new && pnpm check-types`
Expected: 退出码 0,无报错。

- [ ] **Step 3: 提交**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack
git add mes/frontend/apps/mes-new/src/pages/system/team/TeamPage.tsx
git commit -m "✨ feat(mes-new): 2l 班组主从页 TeamPage(左 CRUD+右成员, 切组重挂载清瞬态)"
```

---

### Task 6: 路由接线（消除 404）

**Files:**
- Modify: `mes/frontend/apps/mes-new/src/router.tsx`
- Modify: `mes/frontend/apps/mes-new/src/layouts/routeMeta.ts`

- [ ] **Step 1: router.tsx 加 import**

在 `mes/frontend/apps/mes-new/src/router.tsx` 第 11 行 `import DeptList ...` 之后新增一行：
```tsx
import TeamPage from '@/pages/system/team/TeamPage'
```

- [ ] **Step 2: router.tsx 加路由**

在 `{ path: 'system/department', element: <DeptList /> },` 之后新增一行：
```tsx
          { path: 'system/team', element: <TeamPage /> },
```

- [ ] **Step 3: routeMeta.ts 加标签元信息**

在 `mes/frontend/apps/mes-new/src/layouts/routeMeta.ts` 的「// 系统管理」块内,`'/system/department': ...` 之后新增一行：
```ts
  '/system/team': { title: '班组员工定义', icon: 'team' },
```

- [ ] **Step 4: 类型检查 + 构建**

Run: `cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack/mes/frontend/apps/mes-new && pnpm check-types && pnpm build`
Expected: `check-types` 退出码 0;`pnpm build`(= `tsc -b && vite build`) 成功,输出 `✓ built in ...`,无 TS/打包报错。

- [ ] **Step 5: 提交**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack
git add mes/frontend/apps/mes-new/src/router.tsx mes/frontend/apps/mes-new/src/layouts/routeMeta.ts
git commit -m "✨ feat(mes-new): 2l 接入 /system/team 路由+tab 元信息(对齐菜单 107, 消除 404)"
```

---

### Task 7: 后端顺带审查（按周期规约）

**Files（只读审查,仅在发现 bug 时修改）:**
- Read: `mes/src/main/java/com/wangziyang/mes/system/controller/admin/SpTeamController.java`
- Read: `mes/src/main/java/com/wangziyang/mes/system/service/impl/SpTeamServiceImpl.java`
- Read: `mes/src/main/java/com/wangziyang/mes/system/service/impl/SpTeamUserServiceImpl.java`
- Read: `mes/src/main/resources/mapper/system/SpTeamMapper.xml`

- [ ] **Step 1: 逐项核查清单（[[backend-deepseek-review-each-cycle]]）**

逐项确认下列点,记录结论；仅当为真实 bug 且修复点小、风险可控时才动代码：
1. **软删过滤**：`SpTeamMapper.xml#pageWithRelations` 含 `WHERE t.is_deleted != '1'`（✅ 已确认）。
2. **`delete` 软删**：`updateById` 仅置 `deleted='1'`——确认不会误清其他字段（MyBatis-Plus 仅更新非 null 字段;`update_time/username` 由 `SpMetaObjectHandler` 自动填充）。
3. **`users/add` 去重**：逐 id `getOne(team_id,user_id)` 存在才跳过,叠加唯一键 `idx_team_user`——确认重复添加不报错、不脏写。
4. **`getTeamUsers` 是否应过滤已删用户**：`listByIds(userIds)` 未过滤 `is_deleted`,被软删/禁用用户若仍在 `sp_team_user` 会显示为成员。**判断**：若易修则在查询加 `is_deleted='0'` 过滤;若涉及面广则仅记录为已知项,不在本周期改。
5. **`available-users` 不排除已在组用户**：设计如此,由前端 `excludeSelected` 处理,确认可接受。
6. **新增班组 id 行为**：前端新增发送 `id=''`(form),后端 `saveOrUpdate` 应走 insert 并由雪花生成 id（与 `dict` 同机制,既有可用）。在 Task 8 端到端验证“新建班组”时实测确认。

- [ ] **Step 2: 若有修改则编译验证**

仅当 Step 1 触发后端改动时执行（无改动则跳过本步与 Step 3）。
Run（[[backend-build-mvnw-broken]]：`./mvnw` 损坏,用系统 mvn + JDK11+）: `cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack/mes && mvn -q -DskipTests compile`
Expected: `BUILD SUCCESS`。

- [ ] **Step 3: 提交（仅当有后端改动）**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack
git add mes/src/main/java/com/wangziyang/mes/system/...
git commit -m "🐛 fix(mes): 2l 班组后端审查修正(<具体描述>)"
```

> 若审查结论为“无需修改”,在本任务完成说明里写明各项核查结论即可,不产生提交。

---

### Task 8: 全门禁 + 端到端验证

**Files:** 无新增（验证 + 证据留存）

- [ ] **Step 1: 四项门禁全绿(贴输出)**

Run: `cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack/mes/frontend/apps/mes-new && pnpm check-types && pnpm lint && pnpm test && pnpm build`
Expected:
- `check-types`: 退出码 0,无报错。
- `lint`: 退出码 0,无 error（注意 `TeamForm` 未用导入需清除、`columns` 依赖项告警需消除）。
- `test`: 全部测试通过,含 `teamUtils.test.ts` 套件。
- `build`: `✓ built in ...`,无报错。
**必须把实际输出贴入完成说明（反偷懒：claims require evidence）。**

- [ ] **Step 2: 启动后端 + 前端 dev**

后端（端口 9090）：`cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack/mes && mvn spring-boot:run`（mvnw 损坏用系统 mvn;需 JDK11+;后台运行）。
前端 dev（端口 4100,代理 /api→9090）：`cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack/mes/frontend/apps/mes-new && pnpm dev`（后台运行）。
确认 dev server 起在 `:4100`（pnpm dev 输出 Local: http://localhost:4100/）。

- [ ] **Step 3: 端到端手动验证（浏览器,登录需验证码无法脚本化——见 [[backend-build-mvnw-broken]]）**

登录后逐项走查,留存截图/录屏为证：
1. 点侧边栏「班组员工定义」→ 进入 `/system/team`,**不再 404**,渲染主从页(左班组表,右占位)。
2. 列表展示种子班组「生产作业班组1」,工作日列显示「周一 周二 周三 周四 周五」,成员数列为数字。
3. 点「新增班组」→ 填代码/名称/上下班时间/勾选工作日 → 确定 → toast「新增成功」,列表出现新行且工作日列正确（验证 Task 7 Step 1.6 的 id 行为）。
4. 点选一行 → 右栏出现「『xxx』成员(N)」面板。
5. 点「添加成员」→ 弹窗左候选(已排除在组者)/右已选 → 勾选若干 → 加入 → toast「已添加成员」,关闭后右栏成员增加、左表「成员数」+N。
6. 右栏点成员「移除」→ toast「已移除成员」,成员减少、成员数 -1。
7. 编辑该班组改名 → 右栏标题随之更新(onSaved 同步)。
8. 删除某班组 → 二次确认 → 消失;若删的是当前选中 → 右栏回占位。
9. 切换选中不同班组 → 右栏成员随之刷新,且上一班组若开着的成员弹窗已关闭(key 重挂载)。

- [ ] **Step 4: 收尾提交（如验证中有微调）**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack
git add -A
git commit -m "✅ test(mes-new): 2l 班组员工定义验证通过(四项门禁+端到端 CRUD/成员闭环)"
```

---

## 自检（Self-Review）

**1. Spec 覆盖**
- 404 根因(路由+元信息缺失) → Task 6 ✅
- 范围:表单代码/名称/备注/上下班/工作日 → Task 3 ✅;生产线/车间不入表单 ✅(未出现)
- 主从布局方案 A → Task 5(MasterDetailLayout) + Task 4(成员面板) ✅
- API 全端点+编码差异(form vs JSON) → Task 2 ✅
- teamUtils 规格 → Task 1 ✅
- 失效联动 `["sys","team"` → Task 3/4/5 ✅
- 错误处理(拦截器 toast + AlertDialog) → Task 5 ✅
- 防御性卫生(切组重挂载、删选中清选) → Task 5 ✅
- 测试 + 四项门禁 → Task 1 + Task 8 ✅
- 后端审查 → Task 7 ✅
- 权限(对齐 DictList 不加 PermissionGuard) → 已在头部约定 ✅

**2. 占位符扫描**：无 TBD/TODO;每个改代码步骤均含完整代码块。Task 7 的“仅发现 bug 才改”是显式条件分支,非占位。

**3. 类型/签名一致性**：
- `teamPage → PageResult<SpTeamDTO>`;`SpTeamDTO extends SpTeam`(Task 2 定义),`TeamPage`/`TeamMembers` 均 import 自 `@/types/system` ✅
- `teamAddOrUpdate(record: SpTeam)`;`TeamForm` 构造 `dto: SpTeam` 并 import 自 `@/types/process-unit` ✅
- `teamUsers/teamAvailableUsers → SysUser[]`(`@/types/user`);`TeamMembers.toItem(u: SysUser)` ✅
- `teamUsersAdd(teamId, userIds: string[])` ←→ `DualListTransfer.onAdd(ids: string[])` ✅
- `parseWorkdays/formatWorkdays/workdaysLabel/WEEKDAYS`(Task 1) ←→ `TeamForm`/`TeamPage` 调用一致 ✅
- `invalidate('["sys","team"')` 前缀匹配 page/users/available-users 三类 key ✅
