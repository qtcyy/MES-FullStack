# 产品 BOM(树 + 物料行 + 锁定 + 版本)实现计划 — 周期 2e

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** 在 `apps/mes-new` 落地完整产品 BOM 维护(树浏览/节点 CRUD/物料行 CRUD/锁定整树/创建新版本),并修复后端 `SpProductBom` 3 个已确认 DeepSeek 缺陷。

**Architecture:** 后端沿用现有 `/technology/product-bom/*` 接口(修 3 bug);前端两态单页(浏览态 列表/树 + 编辑态 `MasterDetailLayout` 左子树右节点详情+物料行),数据层 rxjs `useQuery$/useMutation$` + `invalidate`,表单 `FormDialog`+react-hook-form+zod。

**Tech Stack:** React 19 + TS + Vite + `@workspace/ui`(shadcn/Radix)+ react-hook-form + zod + @ngify/http/rxjs;后端 Spring Boot 2.1 + MyBatis-Plus。

**设计依据:** `docs/superpowers/specs/2026-06-16-mes-new-cycle2e-product-bom-design.md`(契约表、bug 清单、积木 props 均已逐项核验源码)。

**共性约定(所有前端任务遵守):**
- 本地业务组件 default 导入:`import X from '@/components/X'`;`FormSection` 是 `@/components/FormDialog` 的命名导出。
- `@workspace/ui` barrel 导入:`import { Button, Badge, DataTable, TreeDataTable, toast, AlertDialog, ... } from '@workspace/ui'`。
- 数据层:`useQuery$(key, () => obs, { enabled })`、`useMutation$((...a)=>obs) → { mutate(Promise), loading, error }`、`invalidate(prefix)`(前缀匹配 `JSON.stringify(key)`)。
- 范式对照(实现者**必须先读**):列表/树页 → `src/pages/technology/flow/FlowList.tsx`;RHF+zod+物料下拉表单 → `src/pages/order/production/OrderForm.tsx`。
- 质量门槛(每个前端任务自检):`pnpm --filter mes-new exec tsc --noEmit` 干净、`pnpm --filter mes-new test` 全绿、`pnpm --filter mes-new lint` **0 error 且不新增 warning(基线 9)**。
- 提交用中文 message;subagent 提交加 `--no-verify`(本环境交互式 hook 限制)。

---

## Task 1: 后端 3 个缺陷修复(必须最先做)

**Files:**
- Modify: `mes/src/main/java/com/wangziyang/mes/technology/controller/SpProductBomController.java:135-139`
- Modify: `mes/src/main/java/com/wangziyang/mes/technology/service/impl/SpProductBomServiceImpl.java:32-39,49-50`

- [ ] **Step 1: 修复 add-or-update 更新分支漏 locked 校验**

在 `SpProductBomController.java` 的 `addOrUpdate` 方法,把(约 135-139 行):
```java
            if (StringUtils.isEmpty(record.getStatus())) {
                record.setStatus("draft");
            }
        }
        spProductBomService.saveOrUpdate(record);
```
替换为:
```java
            if (StringUtils.isEmpty(record.getStatus())) {
                record.setStatus("draft");
            }
        } else {
            SpProductBom existing = spProductBomService.getById(record.getId());
            if (existing == null) {
                return Result.failure("节点不存在");
            }
            if ("locked".equals(existing.getStatus())) {
                return Result.failure("BOM 已锁定，无法修改节点");
            }
        }
        spProductBomService.saveOrUpdate(record);
```
要点:用 **DB 中的 `existing.getStatus()`** 判断(不信任入参 `record.getStatus()`,防前端伪造 status='draft' 绕过)。

- [ ] **Step 2: 修复 lockBom 的 N+1 逐条 update**

在 `SpProductBomServiceImpl.java` 的 `lockBom`,把(约 34-39 行)循环内的 `updateById(node)` 移出循环改批量:
```java
        List<SpProductBom> allNodes = collectAllNodes(rootId);
        LocalDateTime now = LocalDateTime.now();
        for (SpProductBom node : allNodes) {
            node.setStatus("locked");
            node.setLockedAt(now);
            node.setLockedBy(username);
            updateById(node);
        }
```
替换为:
```java
        List<SpProductBom> allNodes = collectAllNodes(rootId);
        LocalDateTime now = LocalDateTime.now();
        for (SpProductBom node : allNodes) {
            node.setStatus("locked");
            node.setLockedAt(now);
            node.setLockedBy(username);
        }
        updateBatchById(allNodes);
```

- [ ] **Step 3: 修复 createNewVersion 版本号解析**

在 `SpProductBomServiceImpl.java` 的 `createNewVersion`,把(约 49-50 行):
```java
        String oldVer = oldRoot.getVersion();
        String newVer = "V" + (Integer.parseInt(oldVer.replace("V", "").replace(".0", "")) + 1) + ".0";
```
替换为:
```java
        String oldVer = oldRoot.getVersion();
        String newVer;
        try {
            String num = oldVer == null ? "1.0" : oldVer.replaceFirst("^[Vv]", "");
            int major = Integer.parseInt(num.split("\\.")[0]);
            newVer = "V" + (major + 1) + ".0";
        } catch (NumberFormatException e) {
            newVer = "V1.0";
        }
```

- [ ] **Step 4: 编译验证**

Run: `cd mes && ./mvnw -DskipTests compile`
Expected: `BUILD SUCCESS`,EXIT 0。若 `updateBatchById` 报符号未找到,确认 `ServiceImpl` 已提供该方法(MyBatis-Plus 内置,无需 import)。

- [ ] **Step 5: Commit**
```bash
git -C /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack add mes/src/main/java/com/wangziyang/mes/technology
git -C /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack commit --no-verify -m "🐛 fix(technology): 产品BOM后端审查修复(更新态locked校验+lockBom批量+版本号解析健壮化)"
```

---

## Task 2: 前端类型 + 工具函数 + 单测

**Files:**
- Modify: `mes/frontend/apps/mes-new/src/types/technology.ts`(追加,勿覆盖现有 SpOper/SpFlow 等)
- Create: `mes/frontend/apps/mes-new/src/utils/productBom.ts`
- Create: `mes/frontend/apps/mes-new/src/utils/productBom.test.ts`

- [ ] **Step 1: 追加类型到 `types/technology.ts` 末尾**
```ts
// ===== 产品 BOM(周期 2e) =====

/** 产品 BOM 节点实体(对应后端 SpProductBom;/page 列表与写操作用) */
export interface SpProductBom {
  id: string
  bomCode?: string
  productCode?: string
  nodeName: string
  parentId?: string
  level?: number
  version?: string
  status?: 'draft' | 'locked'
  remark?: string
  sortOrder?: number
  lockedAt?: string
  lockedBy?: string
  createTime?: string
  createUsername?: string
  updateTime?: string
  updateUsername?: string
}

/** GET /tree 返回的 Map 树节点(11 键;无 parentId/审计,含 children + itemCount) */
export interface BomTreeNode {
  id: string
  bomCode?: string
  nodeName: string
  productCode?: string
  level?: number
  version?: string
  status?: 'draft' | 'locked'
  remark?: string
  sortOrder?: number
  children: BomTreeNode[]
  itemCount: number
}

/** 产品 BOM 物料行(对应后端 SpProductBomItem;注意 material 拼写,与物料表 materiel 不同) */
export interface SpProductBomItem {
  id?: string
  bomId: string
  itemType?: 'material' | 'bom_ref'
  materialCode: string
  materialDesc?: string
  quantity: number
  unit?: string
  sortOrder?: number
}
```

- [ ] **Step 2: 写工具函数 `utils/productBom.ts`**
```ts
import type { Materiel } from '@/types/basedata'
import type { BomTreeNode, SpProductBomItem } from '@/types/technology'

/** 把选中的产品物料映射成物料行字段(materiel→materialCode 拼写转换) */
export function materielToItem(
  m: Materiel,
): Pick<SpProductBomItem, 'materialCode' | 'materialDesc' | 'unit'> {
  return {
    materialCode: m.materiel,
    materialDesc: m.materielDesc,
    unit: m.unit ?? '个',
  }
}

/** 从 /tree 全量结果里按根 id 取出该根的子树节点(深度优先) */
export function pickRootSubtree(tree: BomTreeNode[], rootId: string): BomTreeNode | undefined {
  for (const node of tree) {
    if (node.id === rootId) return node
    const hit = pickRootSubtree(node.children ?? [], rootId)
    if (hit) return hit
  }
  return undefined
}
```

- [ ] **Step 3: 写单测 `utils/productBom.test.ts`**(对照已存在的 `utils/datetime.test.ts` 风格)
```ts
import { describe, it, expect } from 'vitest'
import { materielToItem, pickRootSubtree } from './productBom'
import type { BomTreeNode } from '@/types/technology'
import type { Materiel } from '@/types/basedata'

describe('materielToItem', () => {
  it('materiel 映射为 materialCode(拼写转换)并带出描述/单位', () => {
    const m = { id: '1', materiel: 'P001', materielDesc: '产品A', unit: '台', deleted: '0' } as Materiel
    expect(materielToItem(m)).toEqual({ materialCode: 'P001', materialDesc: '产品A', unit: '台' })
  })
  it('单位缺省回退为 个', () => {
    const m = { id: '1', materiel: 'P001', materielDesc: '产品A', deleted: '0' } as Materiel
    expect(materielToItem(m).unit).toBe('个')
  })
})

describe('pickRootSubtree', () => {
  const tree: BomTreeNode[] = [
    { id: 'r1', nodeName: '根1', children: [{ id: 'c1', nodeName: '子1', children: [], itemCount: 0 }], itemCount: 1 },
    { id: 'r2', nodeName: '根2', children: [], itemCount: 0 },
  ]
  it('命中顶层根', () => expect(pickRootSubtree(tree, 'r2')?.nodeName).toBe('根2'))
  it('深度命中子节点', () => expect(pickRootSubtree(tree, 'c1')?.nodeName).toBe('子1'))
  it('未命中返回 undefined', () => expect(pickRootSubtree(tree, 'x')).toBeUndefined())
})
```

- [ ] **Step 4: 验证**
Run: `cd mes/frontend && pnpm --filter mes-new exec tsc --noEmit && pnpm --filter mes-new test`
Expected: tsc 无输出(干净);vitest 新增 5 用例全绿,既有用例不回归。

- [ ] **Step 5: Commit**
```bash
git -C /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack add mes/frontend/apps/mes-new/src/types/technology.ts mes/frontend/apps/mes-new/src/utils/productBom.ts mes/frontend/apps/mes-new/src/utils/productBom.test.ts
git -C /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack commit --no-verify -m "✨ feat(mes-new): 产品BOM类型 + 物料行字段转换/取子树工具(含单测)"
```

---

## Task 3: API 层 `api/technology/product-bom.ts`

**Files:**
- Create: `mes/frontend/apps/mes-new/src/api/technology/product-bom.ts`

- [ ] **Step 1: 写 API 函数(照 `api/technology/flow.ts` 范式;注意 form vs JSON_HEADERS)**
```ts
import { http } from '@/http/client'
import type { PageParams, PageResult } from '@/types/api'
import type { Materiel } from '@/types/basedata'
import type { SpProductBom, BomTreeNode, SpProductBomItem } from '@/types/technology'

const JSON_HEADERS = { headers: { 'Content-Type': 'application/json' } }

export interface ProductBomPageParams extends PageParams {
  productCodeLike?: string
  nodeNameLike?: string
}

/** 根节点分页(form 编码;后端 /page 无 @RequestBody) */
export function productBomPage(params: ProductBomPageParams) {
  return http.post<PageResult<SpProductBom>>('/technology/product-bom/page', params)
}
/** 全量树(Map 树,含 children + itemCount) */
export function productBomTree() {
  return http.get<BomTreeNode[]>('/technology/product-bom/tree')
}
/** 新增/更新节点(@RequestBody JSON)→ 节点 id */
export function productBomSave(body: Partial<SpProductBom>) {
  return http.post<string>('/technology/product-bom/add-or-update', body, JSON_HEADERS)
}
/** 删除节点(级联;JSON {id}——@RequestBody Map,不能 form) */
export function productBomDelete(id: string) {
  return http.post<null>('/technology/product-bom/delete', { id }, JSON_HEADERS)
}
/** 锁定整树(JSON {id}) */
export function productBomLock(id: string) {
  return http.post<null>('/technology/product-bom/lock', { id }, JSON_HEADERS)
}
/** 创建新版本(JSON {id})→ 新根 id */
export function productBomNewVersion(id: string) {
  return http.post<string>('/technology/product-bom/new-version', { id }, JSON_HEADERS)
}
/** 查某 BOM 下物料行(sortOrder 升序) */
export function productBomItems(bomId: string) {
  return http.get<SpProductBomItem[]>(`/technology/product-bom/items/${encodeURIComponent(bomId)}`)
}
/** 新增/更新物料行(@RequestBody JSON)→ item id */
export function productBomItemSave(body: Partial<SpProductBomItem>) {
  return http.post<string>('/technology/product-bom/item/add-or-update', body, JSON_HEADERS)
}
/** 删除物料行(JSON {id}) */
export function productBomItemDelete(id: string) {
  return http.post<null>('/technology/product-bom/item/delete', { id }, JSON_HEADERS)
}
/** 产品物料下拉(后端已过滤 matType=产品 且未删) */
export function productBomProducts() {
  return http.get<Materiel[]>('/technology/product-bom/products')
}
```

- [ ] **Step 2: 验证 + Commit**
Run: `cd mes/frontend && pnpm --filter mes-new exec tsc --noEmit`(干净)。若 `PageParams/PageResult` 路径报错,核对 `@/types/api`(已确认存在)。
```bash
git -C /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack add mes/frontend/apps/mes-new/src/api/technology/product-bom.ts
git -C /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack commit --no-verify -m "✨ feat(mes-new): 产品BOM API(11接口;/page表单,其余JSON)"
```

---

## Task 4: 对话框表单 `BomItemForm` + `BomNodeForm`

> 实现者**先读** `src/pages/order/production/OrderForm.tsx` 学 FormDialog+RHF+zod+物料下拉+toast 的 house 写法,再据下面契约实现。两文件均 default export。

**Files:**
- Create: `mes/frontend/apps/mes-new/src/pages/technology/product-bom/BomItemForm.tsx`
- Create: `mes/frontend/apps/mes-new/src/pages/technology/product-bom/BomNodeForm.tsx`

- [ ] **Step 1: `BomItemForm.tsx`(物料行 新增/编辑)**

Props:
```ts
interface BomItemFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  bomId: string                 // 所属节点
  initial?: SpProductBomItem    // 有=编辑,无=新增
  onSaved: () => void           // 成功回调(父层 invalidate items)
}
```
字段与校验(zod):
- `itemType`: enum `['material','bom_ref']`,默认 `'material'`,Select。
- `materialCode`: string 必填。**物料下拉**:`useQuery$(['productBom','products'], () => productBomProducts(), { enabled: open })`;Select 选项 `value=m.materiel` label=`${m.materiel} ${m.materielDesc}`;选中后 `materielToItem(m)` 带出 `materialDesc`、`unit`(`setValue`)。
- `materialDesc`: string 可选(随物料带出,可只读展示或允许改)。
- `quantity`: number 必填,min 0.01,`z.coerce.number().min(0.01)`,`<Input type="number" step="0.01">`。
- `unit`: string,Select 选项 `['个','条','台','套','kg','m']`,默认 `'个'`。
- `sortOrder`: number 可选,默认 0,`<Input type="number">`。

提交:`productBomItemSave({ ...values, bomId, id: initial?.id })` → `toast.success('已保存物料行')` → `onSaved()` → `onOpenChange(false)`。用 `useMutation$`,`submitting` 绑 `FormDialog.submitting`。

骨架:
```tsx
export default function BomItemForm({ open, onOpenChange, bomId, initial, onSaved }: BomItemFormProps) {
  // const schema = z.object({...})
  // const { control, handleSubmit, reset, setValue, formState } = useForm({ resolver: zodResolver(schema), defaultValues })
  // useEffect: open 时 reset(initial ?? 默认值)
  // const { data: products } = useQuery$(['productBom','products'], () => productBomProducts(), { enabled: open })
  // const { mutate, loading } = useMutation$((b: Partial<SpProductBomItem>) => productBomItemSave(b))
  // const submit = handleSubmit(async (v) => { await mutate({ ...v, bomId, id: initial?.id }); toast.success('已保存物料行'); onSaved(); onOpenChange(false) })
  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title={initial ? '编辑物料行' : '新增物料行'} icon={Package} onSubmit={submit} submitting={loading}>
      {/* 用 FormField 包每个字段,Controller 接 Select/Input */}
    </FormDialog>
  )
}
```

- [ ] **Step 2: `BomNodeForm.tsx`(节点 建根/加子/编辑 三模式)**

Props:
```ts
type BomNodeMode = 'create-root' | 'add-child' | 'edit'
interface BomNodeFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: BomNodeMode
  parentId?: string          // add-child 时 = 当前选中节点 id
  initial?: SpProductBom     // edit 时回填
  onSaved: (newId: string) => void
}
```
字段与模式差异:
- `create-root`:**产品物料下拉**(`productBomProducts()`,`enabled: open`),选中后 `setValue('productCode', m.materiel)` 且 `setValue('nodeName', m.materielDesc)`(nodeName 可再改)。productCode 必填。提交体 `{ nodeName, productCode, remark, sortOrder }`(parentId 不传=根)。
- `add-child`:无 productCode/产品下拉(后端继承 parent);字段 `nodeName`(必填)、`remark`、`sortOrder`;提交体 `{ nodeName, parentId, remark, sortOrder }`。
- `edit`:回填 `nodeName`(必填)、`remark`、`sortOrder`;提交体 `{ id: initial.id, nodeName, remark, sortOrder }`。productCode/version/level/parentId 不传(后端不改这些或保持)。

提交:`productBomSave(body)` 返回新/原 id → `toast.success` → `onSaved(id)` → `onOpenChange(false)`。

标题:`create-root`→'新建根 BOM'、`add-child`→'添加子节点'、`edit`→'编辑节点'。icon 用 `lucide-react` 的 `FolderTree`/`Pencil`。

骨架同 BomItemForm(`useForm`+`zodResolver`+`useEffect reset`+`useMutation$`+`FormDialog`)。

- [ ] **Step 3: 验证 + Commit**
Run: `cd mes/frontend && pnpm --filter mes-new exec tsc --noEmit && pnpm --filter mes-new lint`(0 error,不新增 warning)。
```bash
git -C /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack add mes/frontend/apps/mes-new/src/pages/technology/product-bom/
git -C /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack commit --no-verify -m "✨ feat(mes-new): 产品BOM 节点表单(建根/加子/编辑)+ 物料行表单"
```

---

## Task 5: 主页面 `ProductBomList.tsx`(浏览态 + 编辑态)

> 实现者**先读** `src/pages/technology/flow/FlowList.tsx` 学列表页 house 写法(useQuery$/DataTable/SearchForm/AlertDialog/invalidate)。default export。

**Files:**
- Create: `mes/frontend/apps/mes-new/src/pages/technology/product-bom/ProductBomList.tsx`

- [ ] **Step 1: 页面状态与数据**
状态:`view: 'list' | 'tree'`(默认 list)、`search: { productCodeLike, nodeNameLike }`、`page`(列表分页 index)、`selectedRootId: string | null`(null=浏览态,有值=编辑态)、`selectedNodeId: string | null`(编辑态左树选中节点)、对话框开关、`deleting` 节点、`itemDeleting`。
数据:
- 列表态:`useQuery$(['productBom','page', { ...search, current: page+1, size: 10 }], () => productBomPage({...}))`。
- 树/编辑态:`useQuery$(['productBom','tree'], () => productBomTree())`(全量 Map 树)。
- 编辑态当前根子树:`const rootTree = useMemo(() => tree ? pickRootSubtree(tree, selectedRootId) : undefined, [tree, selectedRootId])`。
- 选中节点:在 `rootTree` 里按 `selectedNodeId` 深搜(复用 `pickRootSubtree([rootTree], selectedNodeId)`)。
- 选中节点物料行:`useQuery$(['productBom','items', selectedNodeId], () => productBomItems(selectedNodeId!), { enabled: !!selectedNodeId })`。

- [ ] **Step 2: 浏览态 UI**
`PageContainer title="产品BOM管理" actions={<Button onClick={openCreateRoot}><Plus/>新建根 BOM</Button>}`:
- 视图切换按钮组(列表/树)。
- `view==='list'`:`SearchForm`(productCodeLike + nodeNameLike 两个 Input)+ `DataTable` 服务端分页:
  - columns:nodeName、productCode、version、status(Badge:draft 次要/locked 红)、`itemCount?`(列表来自 /page 无 itemCount,可省或显 '-')、操作列(进入编辑、删除)。
  - `pagination={{ mode:'server', pageIndex: page, pageSize: 10, totalPages: data?.pages ?? 1, totalRows: data?.total, onPageChange: setPage }}`、`getRowId={r=>r.id}`、`onRowClick={r=>enterEdit(r.id)}`。
- `view==='tree'`:`TreeDataTable data={tree ?? []} getSubRows={r=>r.children} getRowId={r=>r.id} loading={treeLoading}`:
  - columns:nodeName(带 level 缩进感由 TreeDataTable 处理)、version、status Badge、itemCount、操作(仅根节点 level===0 显示"进入编辑")。点根行 `enterEdit(r.id)`。

`enterEdit(rootId)`:`setSelectedRootId(rootId); setSelectedNodeId(rootId)`。

- [ ] **Step 3: 编辑态 UI(`MasterDetailLayout`)**
顶部条:`Button 返回列表`(清空 selectedRootId/NodeId)+ 根 status/version Badge + lockedBy/lockedAt(locked 时)+
  - 根 `status==='draft'`:`Button 锁定整树`(点击 → AlertDialog 确认 → `productBomLock(rootId)` → invalidate tree/page + toast)。
  - 根 `status==='locked'`:`Button 创建新版本`(→ `productBomNewVersion(rootId)` 返回新根 id → invalidate tree/page → toast(`新版本已创建`)→ `enterEdit(newId)`)。
`locked = rootTree?.status === 'locked'`(整树只读开关)。

`MasterDetailLayout master={左树} detail={右详情}`:
- **master(左树)**:`TreeDataTable data={rootTree ? [rootTree] : []} getSubRows={r=>r.children} getRowId={r=>r.id}`,列 nodeName + status + itemCount;`onRowClick`/行内按钮设 `selectedNodeId`(TreeDataTable 无 onRowClick prop → 用列内"选择"按钮或在 nodeName 列渲染可点 button 设选中)。
- **detail(右详情)**:
  - 选中节点信息卡:nodeName、bomCode、level、version、status(只读)、remark。
  - 操作按钮(`disabled={locked}`):`加子节点`(BomNodeForm mode=add-child parentId=selectedNodeId)、`编辑节点`(mode=edit initial=选中节点对应的 SpProductBom——注意树节点缺 parentId,编辑只提交 nodeName/remark/sortOrder 故够用)、`删除节点`(仅非根 level>0;AlertDialog → productBomDelete → invalidate tree;若删的是当前选中,选回根)。
  - 物料行 `DataTable`(本地分页):列 materialCode、materialDesc、quantity、unit、itemType、操作(编辑/删除,`disabled={locked}`)。顶部 `Button 新增物料行`(`disabled={locked}`,BomItemForm bomId=selectedNodeId)。行删除 AlertDialog → `productBomItemDelete` → invalidate items。

- [ ] **Step 4: 刷新约定**
- 节点写操作成功:`invalidate('["productBom","tree"')` + `invalidate('["productBom","page"')`。
- 物料行写操作成功:`invalidate('["productBom","items"')`。
- 锁定/新版本成功:`invalidate('["productBom","tree"')` + `invalidate('["productBom","page"')`。

- [ ] **Step 5: 验证**
Run: `cd mes/frontend && pnpm --filter mes-new exec tsc --noEmit && pnpm --filter mes-new lint && pnpm --filter mes-new test`
Expected: tsc 干净;lint 0 error 且不新增 warning(基线 9;尤其避免 `react-hooks/set-state-in-effect`、`react-hooks/incompatible-library`——表单内监听值用 `useWatch` 而非 `watch()`);test 全绿。

- [ ] **Step 6: Commit**
```bash
git -C /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack add mes/frontend/apps/mes-new/src/pages/technology/product-bom/ProductBomList.tsx
git -C /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack commit --no-verify -m "✨ feat(mes-new): 产品BOM主页面(列表/树浏览 + 主从编辑器 + 物料行 + 锁定/版本)"
```

---

## Task 6: 路由注册

**Files:**
- Modify: `mes/frontend/apps/mes-new/src/router.tsx`
- Modify: `mes/frontend/apps/mes-new/src/layouts/routeMeta.ts`

- [ ] **Step 1: `router.tsx` 加路由**
顶部加 `import ProductBomList from '@/pages/technology/product-bom/ProductBomList'`;在 AdminLayout children 里、`{ path: 'technology/flow', element: <FlowList /> }` 之后加:
```tsx
{ path: 'technology/product-bom', element: <ProductBomList /> },
```

- [ ] **Step 2: `routeMeta.ts` 加标签**
在 `ROUTE_META` 的 `// 工艺` 区块(`'/technology/flow'` 之后)加:
```ts
  '/technology/product-bom': { title: '产品BOM管理', icon: 'apartment' },
```

- [ ] **Step 3: 验证 + Commit**
Run: `cd mes/frontend && pnpm --filter mes-new exec tsc --noEmit && pnpm --filter mes-new build`
Expected: tsc 干净;build 成功。
```bash
git -C /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack add mes/frontend/apps/mes-new/src/router.tsx mes/frontend/apps/mes-new/src/layouts/routeMeta.ts
git -C /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack commit --no-verify -m "✨ feat(mes-new): 注册产品BOM路由 + 标签元信息"
```

---

## 完成后(全部任务后)

1. 终验:`tsc --noEmit` 干净、`vitest` 全绿、`lint` 0 error/≤9 warning、`pnpm build` 成功、后端 `mvn -DskipTests compile` EXIT 0。
2. 派发最终多维 review(spec 合规 + 代码质量 + 后端审查),修复 Critical。
3. 更新路线图 memory(标记产品BOM周期2e完成,移除已修后端风险条目)。
4. 提示用户硬刷新 :4100,admin/123 在「工艺」组验证:产品BOM管理 → 新建根 BOM(选产品物料)→ 加子节点 → 物料行 CRUD → 锁定整树(变只读)→ 创建新版本(克隆,回 draft)。

## 自检(写完计划)
- **Spec 覆盖**:后端 3 bug→T1;类型/工具→T2;API→T3;表单→T4;主页面(树/列表/主从/锁定/版本/物料行)→T5;路由→T6。✓
- **占位符**:无 TBD/TODO;契约绑定文件给完整代码,表单/页面给精确 props+逐步逻辑+骨架(对照 OrderForm/FlowList)。
- **类型一致**:`SpProductBom`/`BomTreeNode`/`SpProductBomItem`/`Materiel` 命名在 T2/T3/T4/T5 一致;API 函数名 `productBom*` 一致;invalidate 前缀键 `["productBom","tree"|"page"|"items"]` 一致。
