# 工艺内容编制(Cycle 3c-1)Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** 在 vue3 课程作业前端交付工艺内容编制页 `/technology/process-content`(主从:产品→BOM 树→选节点→7 Tab 编辑器,含多图/PDF 上传、draft/completed 状态机、contentId 引导),对接已存在后端,零后端生产代码改动。

**Architecture:** 纯函数(`utils/processContent.ts`)承载 CSV-key 编解码/payload 构造/树重建/可编辑判定并 TDD;新原语 `MultiImageUpload.vue`(多图 key↔url);API 层封装读/写(JSON)/上传端点;视图沿用 `BomFlowPage`(1c-3)的"浏览→主从+TreeTable col-slot 选节点"范式,编辑器 `el-tabs` 7 Tab。

**Tech Stack:** Vue3 `<script setup>` + TS + Element Plus;`http.post(url,data,true)`(JSON)/`http.get`/`http.upload(url,FormData)`;`useRequest(fn,{immediate,initialData})` + `MasterDetailLayout`/`TreeTable`/`DataTable`/`FormDialog`;vitest node 纯函数测试。

---

## 文件结构

**新建:**
- `src/api/technology/processContent.ts` — 读 4 + 写 6(JSON)+ 上传 2 端点
- `src/utils/processContent.ts` — 纯函数(CSV-key/payload/树/状态)
- `tests/processContent.spec.ts` — 纯函数 TDD
- `src/components/MultiImageUpload.vue` — 多图上传原语
- `src/views/technology/process-content/ProcessContentPage.vue` — 浏览+主从编排
- `src/views/technology/process-content/ProcessContentEditor.vue` — 7 Tab 编辑器
- `src/views/technology/process-content/EquipmentForm.vue` — 工装设备小弹窗

**修改:**
- `src/types/technology.ts` — 追加 process-content 相关类型
- `src/utils/processContent.ts` 引用的图片上传函数加到 `src/api/technology/processContent.ts`
- `src/router/index.ts` — +1 路由
- `src/utils/urlMap.ts` — +1 自映射

---

## Task 1: 类型 + API

**Files:**
- Modify: `src/types/technology.ts`(文件末尾追加)
- Create: `src/api/technology/processContent.ts`

- [ ] **Step 1: 追加类型到 `src/types/technology.ts` 末尾**

```ts
// ============ 工艺内容编制(Cycle 3c-1)============
export interface SpProcessContent {
  id?: string
  bomId: string
  flowId?: string
  mainInfo?: string
  content?: string
  contentImages?: string // 逗号连接的对象 key 列表
  requirements?: string
  inspectionRequired?: string // '0' | '1'
  inspectionImages?: string // 逗号连接的对象 key 列表
  notes?: string
  status?: string // 'draft' | 'completed'
}

export interface SpProcessEquipment {
  id?: string
  contentId: string
  name: string
  quantity?: number
  remark?: string
}

export interface SpProcessDocumentVO {
  id: string
  contentId: string
  name: string
  filePath: string
  fileUrl?: string // 后端 get 重签
}

/** /get/{bomId} 响应 */
export interface ProcessContentDetail {
  content: SpProcessContent | null
  equipment: SpProcessEquipment[]
  documents: SpProcessDocumentVO[]
  contentImageUrls: string[]
  inspectionImageUrls: string[]
}

/** /list/{rootId} 行 */
export interface ProcessContentListItem {
  bomNode: SpProductBom
  content: SpProcessContent | null
}

/** 左树节点:BOM 节点字段 + 编制状态 + children */
export interface ProcessContentTreeNode extends SpProductBom {
  content: SpProcessContent | null
  contentStatus: string | null // null=未编制 / 'draft' / 'completed'
  children: ProcessContentTreeNode[]
}
```

> 注:`SpProductBom` 已在 `types/technology.ts` 定义(含 id/nodeName/parentId/level/sortOrder/productCode/version 等),直接复用。若字段名不符,以该文件真实定义为准。

- [ ] **Step 2: 写 `src/api/technology/processContent.ts`**

```ts
import { http } from '@/api/request'
import type {
  SpProcessContent,
  SpProcessEquipment,
  SpProcessDocumentVO,
  ProcessContentDetail,
  ProcessContentListItem,
  SpProductBom,
  SpProductBomItem,
} from '@/types/technology'

const BASE = '/technology/process-content'

// ---- 读 ----
export const pcProducts = () => http.get<SpProductBom[]>(`${BASE}/products`)
export const pcList = (rootId: string) =>
  http.get<ProcessContentListItem[]>(`${BASE}/list/${encodeURIComponent(rootId)}`)
export const pcGet = (bomId: string) =>
  http.get<ProcessContentDetail>(`${BASE}/get/${encodeURIComponent(bomId)}`)
export const pcBomItems = (bomId: string) =>
  http.get<SpProductBomItem[]>(`${BASE}/bom-items/${encodeURIComponent(bomId)}`)

// ---- 写(JSON)----
export const pcSave = (content: SpProcessContent) => http.post<string>(`${BASE}/save`, content, true)
export const pcComplete = (id: string) =>
  http.post<void>(`${BASE}/complete/${encodeURIComponent(id)}`, {}, true)
export const pcEquipmentSave = (eq: SpProcessEquipment) =>
  http.post<string>(`${BASE}/equipment/save`, eq, true)
export const pcEquipmentDelete = (id: string) =>
  http.post<void>(`${BASE}/equipment/delete`, { id }, true)
export const pcDocumentSave = (doc: Partial<SpProcessDocumentVO>) =>
  http.post<string>(`${BASE}/document/save`, doc, true)
export const pcDocumentDelete = (id: string) =>
  http.post<void>(`${BASE}/document/delete`, { id }, true)

// ---- 上传(multipart)----
export const pcUploadImage = (file: File) => {
  const form = new FormData()
  form.append('file', file)
  return http.upload<{ key: string; url: string }>(`${BASE}/upload-image`, form)
}
export const pcUploadDocument = (file: File) => {
  const form = new FormData()
  form.append('file', file)
  return http.upload<{ key: string; url: string; name: string }>(`${BASE}/upload-document`, form)
}
```

> 注:`SpProductBomItem` 已在 `types/technology.ts`(1c-2 定义)。确认其字段(materielCode/desc/qty/unit 等)以真实定义为准,Step 4 编辑器物料 Tab 列引用它。

- [ ] **Step 3: typecheck**

Run: `cd mes/vue3 && pnpm typecheck`
Expected: 0 报错(若 SpProductBom/SpProductBomItem 字段名不符,按真实定义微调类型/引用)

- [ ] **Step 4: Commit**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack-Vue
git add mes/vue3/src/types/technology.ts mes/vue3/src/api/technology/processContent.ts
git commit -m "✨ feat(vue3): 3c-1 工艺内容编制 类型 + API(读4/写6 JSON/上传2)"
```

---

## Task 2: 纯函数 `utils/processContent.ts`(TDD)

**Files:**
- Test: `tests/processContent.spec.ts`
- Create: `src/utils/processContent.ts`

- [ ] **Step 1: 写失败测试 `tests/processContent.spec.ts`**

```ts
import { describe, it, expect } from 'vitest'
import {
  parseCsvKeys,
  joinKeys,
  inspectionToBool,
  boolToInspection,
  canEditContent,
  validateContent,
  buildContentPayload,
  buildTreeFromList,
} from '@/utils/processContent'
import type { ProcessContentListItem, SpProcessContent } from '@/types/technology'

describe('parseCsvKeys / joinKeys', () => {
  it('parse 去空白滤空', () => {
    expect(parseCsvKeys('a, b ,,c')).toEqual(['a', 'b', 'c'])
    expect(parseCsvKeys('')).toEqual([])
    expect(parseCsvKeys(undefined)).toEqual([])
  })
  it('join 用逗号连接', () => {
    expect(joinKeys(['a', 'b'])).toBe('a,b')
    expect(joinKeys([])).toBe('')
  })
})

describe('inspectionToBool / boolToInspection', () => {
  it("'1'→true 其余→false", () => {
    expect(inspectionToBool('1')).toBe(true)
    expect(inspectionToBool('0')).toBe(false)
    expect(inspectionToBool(undefined)).toBe(false)
  })
  it("true→'1' false→'0'", () => {
    expect(boolToInspection(true)).toBe('1')
    expect(boolToInspection(false)).toBe('0')
  })
})

describe('canEditContent', () => {
  it('completed 不可编辑,其余可', () => {
    expect(canEditContent('completed')).toBe(false)
    expect(canEditContent('draft')).toBe(true)
    expect(canEditContent(undefined)).toBe(true)
  })
})

describe('validateContent', () => {
  it('mainInfo/content 必填', () => {
    expect(validateContent({ bomId: 'b', mainInfo: '', content: 'x' })).toContain('主信息')
    expect(validateContent({ bomId: 'b', mainInfo: 'm', content: '  ' })).toContain('内容')
  })
  it('齐全→null', () => {
    expect(validateContent({ bomId: 'b', mainInfo: 'm', content: 'c' })).toBeNull()
  })
})

describe('buildContentPayload', () => {
  it('不带 status;inspectionRequired 归一;图片 joinKeys;新增不带 id', () => {
    const out = buildContentPayload(
      {
        bomId: 'b1',
        mainInfo: ' m ',
        content: 'c',
        contentImageKeys: ['k1', 'k2'],
        inspectionImageKeys: ['k3'],
        inspectionRequiredBool: true,
        requirements: 'r',
        notes: 'n',
      },
    )
    expect(out.status).toBeUndefined()
    expect(out.id).toBeUndefined()
    expect(out.bomId).toBe('b1')
    expect(out.mainInfo).toBe('m')
    expect(out.contentImages).toBe('k1,k2')
    expect(out.inspectionImages).toBe('k3')
    expect(out.inspectionRequired).toBe('1')
  })
  it('编辑传 existingId→带 id,仍不带 status', () => {
    const out = buildContentPayload(
      { bomId: 'b1', mainInfo: 'm', content: 'c', contentImageKeys: [], inspectionImageKeys: [], inspectionRequiredBool: false },
      'C9',
    )
    expect(out.id).toBe('C9')
    expect(out.status).toBeUndefined()
    expect(out.inspectionRequired).toBe('0')
  })
})

describe('buildTreeFromList', () => {
  const list: ProcessContentListItem[] = [
    { bomNode: { id: '1', nodeName: '产品', parentId: null, sortOrder: 1 } as never, content: { bomId: '1', status: 'draft' } as SpProcessContent },
    { bomNode: { id: '2', nodeName: '半成品', parentId: '1', sortOrder: 1 } as never, content: null },
    { bomNode: { id: '3', nodeName: '组件', parentId: '1', sortOrder: 2 } as never, content: { bomId: '3', status: 'completed' } as SpProcessContent },
  ]
  it('按 parentId 重建,附 contentStatus', () => {
    const tree = buildTreeFromList(list)
    expect(tree).toHaveLength(1)
    expect(tree[0].id).toBe('1')
    expect(tree[0].contentStatus).toBe('draft')
    expect(tree[0].children.map((c) => c.id)).toEqual(['2', '3'])
    expect(tree[0].children[0].contentStatus).toBeNull()
    expect(tree[0].children[1].contentStatus).toBe('completed')
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `cd mes/vue3 && pnpm exec vitest run tests/processContent.spec.ts`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 写实现 `src/utils/processContent.ts`**

```ts
import type {
  SpProcessContent,
  SpProcessEquipment,
  ProcessContentListItem,
  ProcessContentTreeNode,
} from '@/types/technology'

/** 逗号连接 key 串 → 去空白滤空数组 */
export function parseCsvKeys(csv?: string): string[] {
  if (!csv) return []
  return csv.split(',').map((s) => s.trim()).filter(Boolean)
}

/** key 数组 → 逗号连接串 */
export function joinKeys(keys: string[]): string {
  return keys.join(',')
}

export function inspectionToBool(s?: string): boolean {
  return s === '1'
}
export function boolToInspection(b: boolean): string {
  return b ? '1' : '0'
}

/** completed 不可编辑;null/draft 可编辑 */
export function canEditContent(status?: string | null): boolean {
  return status !== 'completed'
}

/** 主信息 Tab 表单模型(视图侧,提交前转 payload) */
export interface ContentFormModel {
  bomId: string
  flowId?: string
  mainInfo?: string
  content?: string
  requirements?: string
  notes?: string
  contentImageKeys: string[]
  inspectionImageKeys: string[]
  inspectionRequiredBool: boolean
}

/** 校验:mainInfo/content 必填,返回首个错误文案,合法 null */
export function validateContent(form: { mainInfo?: string; content?: string }): string | null {
  if (!form.mainInfo?.trim()) return '主信息不能为空'
  if (!form.content?.trim()) return '工艺内容不能为空'
  return null
}

/** 构造保存 payload:不带 status(后端管理);inspectionRequired→'1'/'0';图片 joinKeys;有 existingId 则带 id */
export function buildContentPayload(form: ContentFormModel, existingId?: string): SpProcessContent {
  return {
    ...(existingId ? { id: existingId } : {}),
    bomId: form.bomId,
    ...(form.flowId ? { flowId: form.flowId } : {}),
    mainInfo: form.mainInfo?.trim() ?? '',
    content: form.content?.trim() ?? '',
    requirements: form.requirements?.trim() ?? '',
    notes: form.notes?.trim() ?? '',
    contentImages: joinKeys(form.contentImageKeys),
    inspectionImages: joinKeys(form.inspectionImageKeys),
    inspectionRequired: boolToInspection(form.inspectionRequiredBool),
  }
}

/** 设备 payload(挂 contentId) */
export function buildEquipmentPayload(
  form: { id?: string; name: string; quantity?: number; remark?: string },
  contentId: string,
): SpProcessEquipment {
  return {
    ...(form.id ? { id: form.id } : {}),
    contentId,
    name: form.name.trim(),
    quantity: form.quantity ?? 1,
    remark: form.remark?.trim() ?? '',
  }
}

/** 扁平 list → 树:按 bomNode.parentId 建父子,同级 sortOrder 升序,附 content/contentStatus */
export function buildTreeFromList(items: ProcessContentListItem[]): ProcessContentTreeNode[] {
  const map = new Map<string, ProcessContentTreeNode>()
  for (const it of items) {
    map.set(it.bomNode.id, {
      ...it.bomNode,
      content: it.content,
      contentStatus: it.content?.status ?? null,
      children: [],
    })
  }
  const roots: ProcessContentTreeNode[] = []
  for (const it of items) {
    const node = map.get(it.bomNode.id)!
    const pid = it.bomNode.parentId
    if (pid && map.has(pid)) map.get(pid)!.children.push(node)
    else roots.push(node)
  }
  const sortRec = (ns: ProcessContentTreeNode[]) => {
    ns.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    ns.forEach((n) => sortRec(n.children))
  }
  sortRec(roots)
  return roots
}
```

> 注:`buildEquipmentPayload` 无独立测试用例(行为同 buildContentPayload 模式),如需可补;`ContentFormModel.id` 字段不存在(payload 的 id 来自 existingId 参数),与 buildContentPayload 测试一致。

- [ ] **Step 4: 运行确认通过**

Run: `cd mes/vue3 && pnpm exec vitest run tests/processContent.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack-Vue
git add mes/vue3/src/utils/processContent.ts mes/vue3/tests/processContent.spec.ts
git commit -m "✨ feat(vue3): 3c-1 纯函数 utils/processContent + TDD(CSV-key/payload/树/状态)"
```

---

## Task 3: 多图上传原语 `MultiImageUpload.vue`

**Files:**
- Create: `src/components/MultiImageUpload.vue`

参照单图 `src/components/ImageUpload.vue`(`uploadFn` 注入返回 `{url}`、disabled、el-image 预览),扩展为多图:v-model 绑 key 列表 + 展示 url 列表 prop。

- [ ] **Step 1: 写 `src/components/MultiImageUpload.vue`**

```vue
<template>
  <div class="multi-image-upload">
    <div class="multi-image-upload__grid">
      <div v-for="(url, i) in urls" :key="modelValue[i] ?? i" class="multi-image-upload__item">
        <el-image :src="url" fit="cover" :preview-src-list="urls" :initial-index="i" class="multi-image-upload__img" />
        <el-icon v-if="!disabled" class="multi-image-upload__del" @click="removeAt(i)"><Close /></el-icon>
      </div>
      <el-upload
        v-if="!disabled"
        :show-file-list="false"
        :before-upload="handleUpload"
        accept="image/*"
        class="multi-image-upload__add"
      >
        <el-icon :class="{ 'is-loading': uploading }"><Plus /></el-icon>
      </el-upload>
    </div>
    <el-empty v-if="disabled && !urls.length" description="无图片" :image-size="60" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, Close } from '@element-plus/icons-vue'

const props = withDefaults(
  defineProps<{
    /** 对象 key 列表(v-model) */
    modelValue: string[]
    /** 展示 url 列表(与 modelValue 同序;新上传项追加) */
    urls: string[]
    disabled?: boolean
    /** 上传函数,返回 {key,url} */
    uploadFn: (file: File) => Promise<{ key: string; url: string }>
  }>(),
  { disabled: false },
)
const emit = defineEmits<{
  'update:modelValue': [string[]]
  'update:urls': [string[]]
}>()

const uploading = ref(false)

const handleUpload = async (file: File) => {
  uploading.value = true
  try {
    const { key, url } = await props.uploadFn(file)
    emit('update:modelValue', [...props.modelValue, key])
    emit('update:urls', [...props.urls, url])
  } catch {
    ElMessage.error('上传失败')
  } finally {
    uploading.value = false
  }
  return false // 阻止 el-upload 默认上传
}

const removeAt = (i: number) => {
  emit('update:modelValue', props.modelValue.filter((_, idx) => idx !== i))
  emit('update:urls', props.urls.filter((_, idx) => idx !== i))
}
</script>

<style scoped>
.multi-image-upload__grid { display: flex; flex-wrap: wrap; gap: var(--sp-2); }
.multi-image-upload__item { position: relative; width: 88px; height: 88px; }
.multi-image-upload__img { width: 88px; height: 88px; border-radius: var(--el-border-radius-base); border: 1px solid var(--el-border-color); }
.multi-image-upload__del { position: absolute; top: -8px; right: -8px; background: var(--el-color-danger); color: #fff; border-radius: 50%; cursor: pointer; font-size: 14px; }
.multi-image-upload__add { width: 88px; height: 88px; border: 1px dashed var(--el-border-color); border-radius: var(--el-border-radius-base); display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--el-text-color-secondary); }
.multi-image-upload__add:hover { border-color: var(--el-color-primary); color: var(--el-color-primary); }
</style>
```

> 注:`el-upload` 的 `before-upload` 返回 `false` 阻止默认上传,我们手动调 `uploadFn`。若项目 el-upload 版本对 `before-upload` 异步返回处理不同,以 `http-request` 自定义上传替代(实现时验证 :4200 控制台无报错)。`urls` 用双向 `update:urls` 是因展示 url 与 key 同序、删除/新增需同步;父组件用 `v-model` + `v-model:urls`。

- [ ] **Step 2: typecheck + lint**

Run: `cd mes/vue3 && pnpm typecheck && pnpm lint:check`
Expected: typecheck 0;lint 0 error

- [ ] **Step 3: Commit**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack-Vue
git add mes/vue3/src/components/MultiImageUpload.vue
git commit -m "✨ feat(vue3): 3c-1 新增多图上传原语 MultiImageUpload(key 列表↔url 展示)"
```

---

## Task 4: 编辑器 `ProcessContentEditor.vue` + `EquipmentForm.vue`

**Files:**
- Create: `src/views/technology/process-content/EquipmentForm.vue`
- Create: `src/views/technology/process-content/ProcessContentEditor.vue`

- [ ] **Step 1: 写 `EquipmentForm.vue`(工装设备小弹窗)**

参照 `src/views/basedata/device/DeviceForm.vue` 的受控 FormDialog 模式(`:model-value` + `@update:model-value`)。

```vue
<template>
  <FormDialog
    :model-value="modelValue"
    :title="model?.id ? '编辑设备' : '新增设备'"
    width="460px"
    :loading="loading"
    @update:model-value="(v: boolean) => emit('update:modelValue', v)"
    @submit="onSubmit"
  >
    <el-form :model="form" label-width="80px">
      <el-form-item label="设备名称" required>
        <el-input v-model="form.name" placeholder="设备名称" />
      </el-form-item>
      <el-form-item label="数量">
        <el-input-number v-model="form.quantity" :min="1" />
      </el-form-item>
      <el-form-item label="备注">
        <el-input v-model="form.remark" type="textarea" :rows="2" />
      </el-form-item>
    </el-form>
  </FormDialog>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue'
import { ElMessage } from 'element-plus'
import FormDialog from '@/components/FormDialog.vue'
import type { SpProcessEquipment } from '@/types/technology'

const props = defineProps<{ modelValue: boolean; model: SpProcessEquipment | null; loading?: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [boolean]; submit: [{ id?: string; name: string; quantity?: number; remark?: string }] }>()

const form = reactive<{ id?: string; name: string; quantity: number; remark: string }>({ name: '', quantity: 1, remark: '' })

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return
    form.id = props.model?.id
    form.name = props.model?.name ?? ''
    form.quantity = props.model?.quantity ?? 1
    form.remark = props.model?.remark ?? ''
  },
)

const onSubmit = () => {
  if (!form.name.trim()) {
    ElMessage.warning('设备名称不能为空')
    return
  }
  emit('submit', { id: form.id, name: form.name, quantity: form.quantity, remark: form.remark })
}
</script>
```

- [ ] **Step 2: 写 `ProcessContentEditor.vue`(7 Tab 编辑器)**

接收选中节点的 `detail`(ProcessContentDetail)+ `bomId`,内部维护表单模型;保存/完成/设备增删/文档上传删 通过 emit 让父页面调 API 后 reload。**completed 只读门控** + **contentId 引导**(无 content 时仅主信息 Tab 可编辑,其余 Tab 占位)。

```vue
<template>
  <div class="pc-editor">
    <!-- 顶部:状态 + 操作 -->
    <div class="pc-editor__head">
      <el-tag :type="statusTagType" size="small" disable-transitions>{{ statusLabel }}</el-tag>
      <div class="pc-editor__ops">
        <el-button type="primary" size="small" :disabled="!editable" :loading="saving" @click="onSave">保存主信息</el-button>
        <el-button type="warning" size="small" :disabled="!editable || !contentId" @click="onComplete">完成编制</el-button>
      </div>
    </div>

    <el-tabs v-model="activeTab">
      <!-- 主信息 -->
      <el-tab-pane label="主信息" name="main">
        <el-form :model="form" label-width="80px">
          <el-form-item label="主信息" required>
            <el-input v-model="form.mainInfo" :disabled="!editable" placeholder="工序主信息" />
          </el-form-item>
          <el-form-item label="工艺内容" required>
            <el-input v-model="form.content" type="textarea" :rows="4" :disabled="!editable" />
          </el-form-item>
          <el-form-item label="工序图片">
            <MultiImageUpload
              v-model="form.contentImageKeys"
              v-model:urls="contentImageUrls"
              :disabled="!editable"
              :upload-fn="pcUploadImage"
            />
          </el-form-item>
        </el-form>
      </el-tab-pane>

      <!-- 工序要求 -->
      <el-tab-pane label="工序要求" name="req">
        <el-input v-model="form.requirements" type="textarea" :rows="5" :disabled="!editable" placeholder="工序要求" />
      </el-tab-pane>

      <!-- 检验 -->
      <el-tab-pane label="检验" name="inspect">
        <el-form label-width="80px">
          <el-form-item label="需检验">
            <el-switch v-model="form.inspectionRequiredBool" :disabled="!editable" />
          </el-form-item>
          <el-form-item label="检验图片">
            <MultiImageUpload
              v-model="form.inspectionImageKeys"
              v-model:urls="inspectionImageUrls"
              :disabled="!editable"
              :upload-fn="pcUploadImage"
            />
          </el-form-item>
        </el-form>
      </el-tab-pane>

      <!-- 注意事项 -->
      <el-tab-pane label="注意事项" name="notes">
        <el-input v-model="form.notes" type="textarea" :rows="5" :disabled="!editable" placeholder="注意事项" />
      </el-tab-pane>

      <!-- 工装设备 -->
      <el-tab-pane label="工装设备" name="equip">
        <template v-if="contentId">
          <el-button v-if="editable" type="primary" size="small" :icon="Plus" @click="openEquip(null)">新增设备</el-button>
          <DataTable :data="detail.equipment" :columns="equipColumns" :pager="noPager" :action-width="140">
            <template #actions="{ row }">
              <el-button v-if="editable" type="primary" link size="small" @click="openEquip(row as SpProcessEquipment)">编辑</el-button>
              <el-button v-if="editable" type="danger" link size="small" @click="emit('equipment-delete', (row as SpProcessEquipment).id!)">删除</el-button>
              <span v-if="!editable" class="pc-muted">—</span>
            </template>
          </DataTable>
        </template>
        <el-empty v-else description="请先保存主信息后维护设备" :image-size="60" />
      </el-tab-pane>

      <!-- 技术文档 -->
      <el-tab-pane label="技术文档" name="doc">
        <template v-if="contentId">
          <el-upload
            v-if="editable"
            :show-file-list="false"
            :before-upload="handleDocUpload"
            accept="application/pdf"
          >
            <el-button type="primary" size="small" :icon="Upload" :loading="docUploading">上传 PDF</el-button>
          </el-upload>
          <DataTable :data="detail.documents" :columns="docColumns" :pager="noPager" :action-width="160">
            <template #col-name="{ row }">
              <el-link :href="(row as SpProcessDocumentVO).fileUrl" target="_blank" type="primary">{{ (row as SpProcessDocumentVO).name }}</el-link>
            </template>
            <template #actions="{ row }">
              <el-button v-if="editable" type="danger" link size="small" @click="emit('document-delete', (row as SpProcessDocumentVO).id)">删除</el-button>
              <span v-if="!editable" class="pc-muted">—</span>
            </template>
          </DataTable>
        </template>
        <el-empty v-else description="请先保存主信息后上传文档" :image-size="60" />
      </el-tab-pane>

      <!-- 物料清单(只读) -->
      <el-tab-pane label="物料清单" name="mat">
        <DataTable :data="bomItems" :columns="matColumns" :pager="noPager" :action-width="0" />
      </el-tab-pane>
    </el-tabs>

    <EquipmentForm v-model="equipDialog" :model="editingEquip" :loading="equipLoading" @submit="onEquipSubmit" />
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, Upload } from '@element-plus/icons-vue'
import DataTable, { type Column } from '@/components/DataTable.vue'
import MultiImageUpload from '@/components/MultiImageUpload.vue'
import EquipmentForm from './EquipmentForm.vue'
import { pcUploadImage, pcUploadDocument } from '@/api/technology/processContent'
import {
  parseCsvKeys,
  inspectionToBool,
  canEditContent,
  validateContent,
  buildContentPayload,
  buildEquipmentPayload,
  type ContentFormModel,
} from '@/utils/processContent'
import type { ProcessContentDetail, SpProcessContent, SpProcessEquipment, SpProcessDocumentVO, SpProductBomItem } from '@/types/technology'

const props = defineProps<{
  bomId: string
  detail: ProcessContentDetail
  bomItems: SpProductBomItem[]
  saving?: boolean
  equipLoading?: boolean
}>()
const emit = defineEmits<{
  save: [SpProcessContent]
  complete: [string]
  'equipment-save': [SpProcessEquipment]
  'equipment-delete': [string]
  'document-save': [{ contentId: string; name: string; filePath: string }]
  'document-delete': [string]
}>()

const activeTab = ref('main')
const noPager = { current: 1, size: 9999, total: 0 } // DataTable 复用,本表不分页

const contentId = computed(() => props.detail.content?.id)
const editable = computed(() => canEditContent(props.detail.content?.status))
const statusLabel = computed(() =>
  props.detail.content?.status === 'completed' ? '已完成' : props.detail.content?.id ? '草稿' : '未编制',
)
const statusTagType = computed(() => (props.detail.content?.status === 'completed' ? 'success' : 'info'))

// 表单模型 + 图片展示 url(与 key 同序)
const form = reactive<ContentFormModel>({
  bomId: props.bomId,
  contentImageKeys: [],
  inspectionImageKeys: [],
  inspectionRequiredBool: false,
})
const contentImageUrls = ref<string[]>([])
const inspectionImageUrls = ref<string[]>([])

// detail/bomId 变化时回填(切节点)
watch(
  () => [props.bomId, props.detail] as const,
  () => {
    const c = props.detail.content
    form.bomId = props.bomId
    form.mainInfo = c?.mainInfo ?? ''
    form.content = c?.content ?? ''
    form.requirements = c?.requirements ?? ''
    form.notes = c?.notes ?? ''
    form.flowId = c?.flowId
    form.contentImageKeys = parseCsvKeys(c?.contentImages)
    form.inspectionImageKeys = parseCsvKeys(c?.inspectionImages)
    form.inspectionRequiredBool = inspectionToBool(c?.inspectionRequired)
    contentImageUrls.value = [...props.detail.contentImageUrls]
    inspectionImageUrls.value = [...props.detail.inspectionImageUrls]
    activeTab.value = 'main'
  },
  { immediate: true, deep: true },
)

const onSave = () => {
  const err = validateContent(form)
  if (err) {
    ElMessage.warning(err)
    return
  }
  emit('save', buildContentPayload(form, contentId.value))
}
const onComplete = () => emit('complete', contentId.value!)

// 设备
const equipDialog = ref(false)
const editingEquip = ref<SpProcessEquipment | null>(null)
const openEquip = (row: SpProcessEquipment | null) => {
  editingEquip.value = row
  equipDialog.value = true
}
const onEquipSubmit = (f: { id?: string; name: string; quantity?: number; remark?: string }) => {
  emit('equipment-save', buildEquipmentPayload(f, contentId.value!))
  equipDialog.value = false
}

// 文档上传
const docUploading = ref(false)
const handleDocUpload = async (file: File) => {
  docUploading.value = true
  try {
    const { key, name } = await pcUploadDocument(file)
    emit('document-save', { contentId: contentId.value!, name, filePath: key })
  } catch {
    ElMessage.error('上传失败(仅支持 PDF)')
  } finally {
    docUploading.value = false
  }
  return false
}

const equipColumns: Column[] = [
  { prop: 'name', label: '设备名称' },
  { prop: 'quantity', label: '数量', width: 90 },
  { prop: 'remark', label: '备注' },
]
const docColumns: Column[] = [{ prop: 'name', label: '文档名称' }]
const matColumns: Column[] = [
  { prop: 'materielCode', label: '物料编码' },
  { prop: 'materielDesc', label: '描述' },
  { prop: 'quantity', label: '数量', width: 90 },
  { prop: 'unit', label: '单位', width: 90 },
]
</script>

<style scoped>
.pc-editor__head { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--sp-3); gap: var(--sp-2); }
.pc-muted { color: var(--el-text-color-secondary); }
</style>
```

> 注(实现时核对真实签名,以真为准):
> - `DataTable` 必填 `pager` prop —— 本编辑器子表不服务端分页,用 `noPager` 常量传入(若 DataTable 在 size=9999 下渲染分页条不美观,可考虑直接用 `el-table`;实现时择优,优先 DataTable 保持一致)。
> - `matColumns` 字段名(materielCode/materielDesc/quantity/unit)以 `SpProductBomItem` 真实定义为准。
> - `el-upload` `before-upload` 返回 false 阻止默认上传后手动处理;若版本不兼容改 `http-request`。
> - `editable` 为 false(completed)时隐藏所有上传/增删按钮、禁用表单输入,Tabs 仍可切换查看(满足只读语义)。

- [ ] **Step 3: typecheck + lint**

Run: `cd mes/vue3 && pnpm typecheck && pnpm lint:check`
Expected: typecheck 0;lint 0 error

- [ ] **Step 4: Commit**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack-Vue
git add mes/vue3/src/views/technology/process-content/
git commit -m "✨ feat(vue3): 3c-1 工艺文件编辑器(7 Tab + 状态机 + contentId 引导)+ 设备弹窗"
```

---

## Task 5: 主从页 `ProcessContentPage.vue` + 接线

**Files:**
- Create: `src/views/technology/process-content/ProcessContentPage.vue`
- Modify: `src/router/index.ts`、`src/utils/urlMap.ts`

- [ ] **Step 1: 写 `ProcessContentPage.vue`(浏览 + 主从 + 树选节点 + 节点取数 token 守卫)**

参照 `src/views/technology/bom-flow/BomFlowPage.vue` 的浏览→编辑+TreeTable col-slot 选节点范式。

```vue
<template>
  <PageContainer>
    <!-- 浏览态 -->
    <template v-if="!editingRootId">
      <div class="pc-toolbar">
        <el-select v-model="pickedRootId" placeholder="选择产品 BOM" filterable style="width: 280px">
          <el-option v-for="p in products ?? []" :key="p.id" :label="p.nodeName" :value="p.id" />
        </el-select>
        <el-button type="primary" :icon="Right" :disabled="!pickedRootId" @click="enterEdit">进入编制</el-button>
      </div>
      <el-empty description="选择一个产品 BOM,进入工艺内容编制" />
    </template>

    <!-- 编辑态 -->
    <template v-else>
      <div class="pc-edit-header">
        <el-button :icon="Back" size="small" @click="back">返回</el-button>
        <span class="pc-edit-header__name">{{ rootName }}</span>
      </div>

      <MasterDetailLayout :has-selection="!!selectedBomId">
        <template #master>
          <TreeTable :data="treeData" :loading="listLoading" :columns="treeColumns">
            <template #col-nodeName="{ row }">
              <span
                :class="selectedBomId === (row as ProcessContentTreeNode).id ? 'pc-node-selected' : 'pc-node'"
                @click="selectNode((row as ProcessContentTreeNode).id)"
              >{{ (row as ProcessContentTreeNode).nodeName }}</span>
            </template>
            <template #col-contentStatus="{ row }">
              <el-tag
                v-if="(row as ProcessContentTreeNode).contentStatus === 'completed'"
                type="success" size="small" disable-transitions
              >已完成</el-tag>
              <el-tag
                v-else-if="(row as ProcessContentTreeNode).contentStatus === 'draft'"
                type="info" size="small" disable-transitions
              >草稿</el-tag>
              <span v-else class="pc-muted">未编制</span>
            </template>
          </TreeTable>
        </template>

        <template #detail>
          <ProcessContentEditor
            v-if="selectedBomId && detail"
            :key="selectedBomId"
            :bom-id="selectedBomId"
            :detail="detail"
            :bom-items="bomItems"
            :saving="saving"
            :equip-loading="equipLoading"
            @save="onSave"
            @complete="onComplete"
            @equipment-save="onEquipmentSave"
            @equipment-delete="onEquipmentDelete"
            @document-save="onDocumentSave"
            @document-delete="onDocumentDelete"
          />
        </template>
        <template #detail-empty>
          <el-empty description="请点击左侧 BOM 节点编制工艺" />
        </template>
      </MasterDetailLayout>
    </template>
  </PageContainer>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Right, Back } from '@element-plus/icons-vue'
import PageContainer from '@/components/PageContainer.vue'
import MasterDetailLayout from '@/components/MasterDetailLayout.vue'
import TreeTable from '@/components/TreeTable.vue'
import { type Column } from '@/components/DataTable.vue'
import ProcessContentEditor from './ProcessContentEditor.vue'
import { useRequest } from '@/composables/useRequest'
import {
  pcProducts, pcList, pcGet, pcBomItems,
  pcSave, pcComplete, pcEquipmentSave, pcEquipmentDelete, pcDocumentSave, pcDocumentDelete,
} from '@/api/technology/processContent'
import { buildTreeFromList } from '@/utils/processContent'
import type {
  SpProductBom, SpProductBomItem, SpProcessContent, SpProcessEquipment,
  ProcessContentDetail, ProcessContentTreeNode,
} from '@/types/technology'

const { data: products } = useRequest(pcProducts, { immediate: true, initialData: [] as SpProductBom[] })

const pickedRootId = ref('')
const editingRootId = ref('')
const rootName = computed(() => products.value?.find((p) => p.id === editingRootId.value)?.nodeName ?? '')

// 左树
const treeData = ref<ProcessContentTreeNode[]>([])
const { loading: listLoading, run: loadTree } = useRequest(async () => {
  const list = await pcList(editingRootId.value)
  treeData.value = buildTreeFromList(list)
})
const treeColumns: Column[] = [
  { prop: 'nodeName', label: '节点名称' },
  { prop: 'level', label: '层级', width: 80 },
  { prop: 'contentStatus', label: '编制状态', width: 120 },
]

const enterEdit = () => {
  editingRootId.value = pickedRootId.value
  selectedBomId.value = ''
  detail.value = null
  loadTree()
}
const back = () => {
  editingRootId.value = ''
  selectedBomId.value = ''
  detail.value = null
}

// 选节点 → 取详情 + 物料(token 守卫防快速切节点乱序)
const selectedBomId = ref('')
const detail = ref<ProcessContentDetail | null>(null)
const bomItems = ref<SpProductBomItem[]>([])
let selToken = 0
const selectNode = async (bomId: string) => {
  selectedBomId.value = bomId
  detail.value = null
  const token = ++selToken
  try {
    const [d, items] = await Promise.all([pcGet(bomId), pcBomItems(bomId)])
    if (token !== selToken) return
    detail.value = d
    bomItems.value = items
  } catch {
    if (token === selToken) {
      detail.value = { content: null, equipment: [], documents: [], contentImageUrls: [], inspectionImageUrls: [] }
      bomItems.value = []
    }
  }
}

// 选中节点取数后重载(保存/完成/子表增删后)
const reloadNode = async () => {
  if (selectedBomId.value) await selectNode(selectedBomId.value)
  loadTree() // 同步左树编制状态徽标
}

const saving = ref(false)
const equipLoading = ref(false)

const onSave = async (payload: SpProcessContent) => {
  saving.value = true
  try {
    await pcSave(payload)
    ElMessage.success('保存成功')
    await reloadNode()
  } finally {
    saving.value = false
  }
}
const onComplete = async (id: string) => {
  await pcComplete(id)
  ElMessage.success('已完成编制')
  await reloadNode()
}
const onEquipmentSave = async (eq: SpProcessEquipment) => {
  equipLoading.value = true
  try {
    await pcEquipmentSave(eq)
    ElMessage.success('保存成功')
    await reloadNode()
  } finally {
    equipLoading.value = false
  }
}
const onEquipmentDelete = async (id: string) => {
  await pcEquipmentDelete(id)
  ElMessage.success('删除成功')
  await reloadNode()
}
const onDocumentSave = async (doc: { contentId: string; name: string; filePath: string }) => {
  await pcDocumentSave(doc)
  ElMessage.success('上传成功')
  await reloadNode()
}
const onDocumentDelete = async (id: string) => {
  await pcDocumentDelete(id)
  ElMessage.success('删除成功')
  await reloadNode()
}
</script>

<style scoped>
.pc-toolbar { display: flex; gap: var(--sp-2); margin-bottom: var(--sp-4); }
.pc-edit-header { display: flex; align-items: center; gap: var(--sp-2); margin-bottom: var(--sp-3); }
.pc-edit-header__name { font-weight: 600; }
.pc-node { cursor: pointer; }
.pc-node-selected { cursor: pointer; color: var(--el-color-primary); font-weight: 600; }
.pc-muted { color: var(--el-text-color-secondary); }
</style>
```

> 注:删除/完成的 confirm 由 EquipmentForm/编辑器内或此处补 ElMessageBox?为简洁,设备/文档删除直接执行(列表行操作,低风险);若要二次确认,在 onEquipmentDelete/onDocumentDelete 前加 `ElMessageBox.confirm` try/catch(参考 3b ManagerDataPage)。**实现时:文档/设备删除补 ElMessageBox.confirm 取消捕获**,与既有页一致。完成编制(onComplete 前)也应 confirm。

- [ ] **Step 2: 路由 + urlMap**

`src/router/index.ts`:在 `technology/bom-flow` 路由对象之后(同 children 层级)加:

```ts
      {
        path: 'technology/process-content',
        name: 'technology-process-content',
        component: () => import('@/views/technology/process-content/ProcessContentPage.vue'),
      },
```

`src/utils/urlMap.ts`:在 `'/technology/bom-flow/list-ui': '/technology/bom-flow',` 之后加自映射:

```ts
  '/technology/process-content': '/technology/process-content',
```

- [ ] **Step 3: typecheck + lint + build**

Run: `cd mes/vue3 && pnpm typecheck && pnpm lint:check && pnpm build`
Expected: 全 0 报错;build 成功,页面落独立 chunk

- [ ] **Step 4: Commit**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack-Vue
git add mes/vue3/src/views/technology/process-content/ProcessContentPage.vue mes/vue3/src/router/index.ts mes/vue3/src/utils/urlMap.ts
git commit -m "✨ feat(vue3): 3c-1 工艺内容编制主从页 + 路由/urlMap 接线(节点取数 token 守卫)"
```

---

## Task 6: 后端审查 + 全门禁 + 验证结果

**Files:**
- Create: `mes/vue3/docs/specs/2026-06-22-cycle3c1-verify-results.md`

- [ ] **Step 1: 后端独立审查(按 backend-deepseek-review-each-cycle,只读)**

读 `SpProcessContentController.java` + `SpProcessContentServiceImpl.java` + `MinioUtil`,确认并在 verify-results 记录:
- `save`:创建置 status=draft 生成 id;更新读 existing 保 status、拒改 completed、不信任客户端 status。
- `complete`:置 completed。
- `validateEditableParent`:equipment/document 保存前校验父存在且未完成。
- 图片 key 重签管线 `resolveUrls`/`resolveUrl`(presignedGetUrl)在位;document.filePath 存 key、get 返回 fileUrl。
- 预期:零暴露 bug、零改动(mes-new 2f 修过 12 bug + 2k curl 验证同份后端)。若发现前端会触发的真 bug,记录并评估是否需前端规避或最小后端修。

- [ ] **Step 2: 全门禁**

Run: `cd mes/vue3 && pnpm typecheck && pnpm test && pnpm lint:check && pnpm build`
Expected: typecheck 0;test 全绿(+processContent ~14 例);lint 0 error;build 成功。

- [ ] **Step 3: 写 verify-results + Commit**

写 `mes/vue3/docs/specs/2026-06-22-cycle3c1-verify-results.md`(门禁结果、后端审查结论、菜单 115 已存在结论、人工 :4200 冒烟清单:产品→树→选节点→主信息保存→其余 Tab 解锁→多图/PDF 上传→设备增删→完成编制只读→切节点不错配)。

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack-Vue
git add mes/vue3/docs/specs/2026-06-22-cycle3c1-verify-results.md
git commit -m "✅ chore(vue3): 3c-1 后端审查结论 + 验证结果"
```

---

## 自检清单(实现完成后)

- [ ] spec §2 全部端点都有 API 函数(Task 1)+ 消费(Task 4/5)。
- [ ] 写端点全 JSON(第三参 true)、上传走 http.upload(Task 1)。
- [ ] buildContentPayload 不发 status、inspectionRequired→'1'/'0'、图片 joinKeys(Task 2 测试断言)。
- [ ] 图片字段:回填用 parseCsvKeys(content.contentImages)得 key + get 的 contentImageUrls 得 url,同序喂 MultiImageUpload(Task 4)。
- [ ] contentId 引导:无 content 时设备/文档 Tab 占位"请先保存主信息"(Task 4)。
- [ ] 状态机:completed → editable=false,隐藏增删/上传、禁用输入(Task 4)。
- [ ] 节点取数 token 守卫(Task 5),保存/完成/子表操作后 reloadNode 同步左树徽标。
- [ ] 删除/完成补 ElMessageBox.confirm(Task 5 注)。
- [ ] 菜单 115 已存在 dev DB,零 SQL;路由 + urlMap 自映射(Task 5)。
- [ ] 类型名一致:ProcessContentDetail/ProcessContentListItem/ProcessContentTreeNode/ContentFormModel 跨 Task 一致。
