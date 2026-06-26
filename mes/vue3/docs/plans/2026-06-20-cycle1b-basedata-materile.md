# 子周期 1b 基础数据·物料 维护 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `mes/vue3` 交付物料维护单页(列表+搜索+分页、新增/编辑弹窗含动态字典下拉与图片上传、软删),并修正涉及的 DeepSeek 后端。

**Architecture:** 复用 1a 沉淀的通用组件(`DataTable`/`SearchForm`/`FormDialog`/`PageContainer`)与 `useRequest`/`usePagination` 范式;新增可复用 `useDict` composable + `ImageUpload.vue` 组件;纯函数下沉 `utils/materile.ts` 做 TDD。后端就地最小修正 `SpMaterileController`(page 软删过滤 + delete 改软删 + 自动编码字典前缀映射)。

**Tech Stack:** Vue 3.5 `<script setup>` + TS、Element Plus、Axios(`@/api/request` 已封装表单编码/Result 解包)、Vitest(node 环境,`tests/**/*.spec.ts`)、后端 Spring Boot + MyBatis-Plus(JDK11 系统 `mvn` 编译)。

**参考 spec:** `mes/vue3/docs/specs/2026-06-20-cycle1b-basedata-materile-design.md`

---

## 文件结构(决定任务拆分)

**后端(修正,就地):**
- Modify: `mes/src/main/java/com/wangziyang/mes/basedata/controller/SpMaterileController.java`

**前端(`mes/vue3/src/` 下):**
- Create: `types/basedata.ts` — SpMaterile / MaterilePageReq / SpSysDict 类型
- Create: `api/basedata/dict.ts` — dictList
- Create: `api/basedata/materile.ts` — page/getById/addOrUpdate/delete/uploadImage
- Create: `utils/materile.ts` — buildMaterilePayload / resolveDictLabel / toDictOptions(纯函数)
- Create: `tests/materile.spec.ts` — 纯函数单测
- Create: `composables/useDict.ts` — 字典取数 + 模块级缓存
- Create: `components/ImageUpload.vue` — 通用图片上传
- Create: `views/basedata/materile/MaterileForm.vue` — 新增/编辑弹窗
- Create: `views/basedata/materile/MaterileList.vue` — 列表页
- Modify: `utils/urlMap.ts` — 加 materile 映射
- Modify: `tests/urlMap.spec.ts` — 补 materile 断言
- Modify: `router/index.ts` — 注册 `/basedata/materile` 路由

> 所有前端命令在 `mes/vue3` 目录下执行。后端命令在 `mes` 目录下执行(`JAVA_HOME` 指向 corretto-11)。

---

### Task 1: 后端审查修正 SpMaterileController

**Files:**
- Modify: `mes/src/main/java/com/wangziyang/mes/basedata/controller/SpMaterileController.java`

- [ ] **Step 1: page 查询加 is_deleted 过滤**

在 `page` 方法构造 `QueryWrapper` 后、`iSpMaterileService.page(...)` 之前,追加软删过滤(对齐 1a 列表约定)。把:

```java
QueryWrapper queryWrapper =new QueryWrapper();
if (StringUtils.isNotEmpty(req.getMaterielLike()))
{
    queryWrapper.like("materiel",req.getMaterielLike());
}
if (StringUtils.isNotEmpty(req.getMaterielDescLike()))
{
    queryWrapper.like("materiel_desc",req.getMaterielDescLike());
}
IPage result = iSpMaterileService.page(req,queryWrapper);
```

改为(新增 `ne` 过滤 + 稳定排序):

```java
QueryWrapper queryWrapper = new QueryWrapper();
queryWrapper.ne("is_deleted", "1"); // 过滤软删记录
if (StringUtils.isNotEmpty(req.getMaterielLike())) {
    queryWrapper.like("materiel", req.getMaterielLike());
}
if (StringUtils.isNotEmpty(req.getMaterielDescLike())) {
    queryWrapper.like("materiel_desc", req.getMaterielDescLike());
}
queryWrapper.orderByDesc("create_time");
IPage result = iSpMaterileService.page(req, queryWrapper);
```

- [ ] **Step 2: delete 改为软删**

把物理删的 `deleteByTableNameId` 方法体改为 `UpdateWrapper` 软删。把:

```java
@PostMapping("/delete")
@ResponseBody
public Result deleteByTableNameId(SpMaterile req) throws Exception {
    iSpMaterileService.removeById(req.getId());
    return Result.success();
}
```

改为:

```java
@PostMapping("/delete")
@ResponseBody
public Result deleteByTableNameId(SpMaterile req) throws Exception {
    com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper<SpMaterile> uw =
            new com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper<>();
    uw.eq("id", req.getId()).set("is_deleted", "1");
    iSpMaterileService.update(uw);
    return Result.success();
}
```

- [ ] **Step 3: 自动编码前缀补字典 value 映射**

`getCodePrefix` 当前只认中文(`产品/零件/标准件`)。改用动态字典后 `matType` 存字典 value(`FG/PG`),需补映射。把:

```java
private String getCodePrefix(String matType) {
    switch (matType) {
        case "产品": return "PROD-";
        case "零件": return "PART-";
        case "标准件": return "STD-";
        default: return "OTHR-";
    }
}
```

改为(同时兼容字典 value 与历史中文值):

```java
private String getCodePrefix(String matType) {
    if (matType == null) return "OTHR-";
    switch (matType) {
        // 字典 material_type 的 value
        case "FG": return "FG-";   // 成品
        case "PG": return "PG-";   // 半成品
        // 兼容历史中文脏值
        case "产品": return "PROD-";
        case "零件": return "PART-";
        case "标准件": return "STD-";
        default: return "OTHR-";
    }
}
```

- [ ] **Step 4: 编译验证后端**

Run(在 `mes` 目录):
```bash
JAVA_HOME=$(/usr/libexec/java_home -v 11 2>/dev/null || echo "$HOME/.sdkman/candidates/java/11.0.21-amzn") mvn -q -pl . compile -DskipTests
```
Expected: `BUILD SUCCESS`(若 `java_home` 不可用,用项目约定的 corretto-11 路径;不要用损坏的 `./mvnw`)。

- [ ] **Step 5: Commit**

```bash
git add mes/src/main/java/com/wangziyang/mes/basedata/controller/SpMaterileController.java
git commit -m "🐛 fix(backend): 物料 page 加软删过滤 + delete 改软删 + 自动编码兼容字典 value"
```

---

### Task 2: 前端类型 + API

**Files:**
- Create: `mes/vue3/src/types/basedata.ts`
- Create: `mes/vue3/src/api/basedata/dict.ts`
- Create: `mes/vue3/src/api/basedata/materile.ts`

- [ ] **Step 1: 写类型 `types/basedata.ts`**

```ts
import type { PageReq, IPage } from '@/types/system'

export type { IPage }

/** 物料实体(对应 sp_materile) */
export interface SpMaterile {
  id: string
  materiel?: string          // 物料编码(新建留空,后端按 matType 生成)
  materielDesc: string       // 物料描述(必填)
  unit?: string              // 基本单位(字典 ORDER_UNIT 的 value)
  productGroup?: string      // 产品组
  matType?: string           // 物料类型(字典 material_type 的 value)
  size?: string              // 规格
  model?: string             // 型号
  source?: string            // 来源(自制/外购)
  leadTime?: number          // 需求提前期(天)
  safetyStock?: number       // 安全库存
  imageUrl?: string          // 物料图片 URL
  flowId?: string            // 工艺路线(本周期不用)
  flowDesc?: string
  deleted?: string           // is_deleted:'0' 正常 / '1' 删除
  createTime?: string
  createUsername?: string
  updateTime?: string
  updateUsername?: string
}

/** 物料分页请求 */
export interface MaterilePageReq extends PageReq {
  materielLike?: string
  materielDescLike?: string
}

/** 字典项(对应 sp_sys_dict) */
export interface SpSysDict {
  id: string
  name: string   // 显示名(如「成品」)
  value: string  // 业务值(如「FG」)
  type: string   // 字典类型(如「material_type」)
  descr?: string
  sortNum?: number
}
```

> 注:`PageReq` 与 `IPage` 已在 `types/system.ts` 导出(1a 使用)。若 `PageReq` 不存在,改用 `types/api.ts` 的 `PageParams`——执行时先 `grep -n "export.*PageReq\|export.*PageParams" src/types/system.ts src/types/api.ts` 确认实际名称并对齐。

- [ ] **Step 2: 写 `api/basedata/dict.ts`**

```ts
import { http } from '@/api/request'
import type { SpSysDict } from '@/types/basedata'

/** 按字典类型取字典项列表 */
export const dictList = (type: string) =>
  http.get<SpSysDict[]>(`/basedata/dict/list/${type}`)
```

- [ ] **Step 3: 写 `api/basedata/materile.ts`**

```ts
import { http } from '@/api/request'
import type { SpMaterile, MaterilePageReq, IPage } from '@/types/basedata'

export const materilePage = (req: MaterilePageReq) =>
  http.post<IPage<SpMaterile>>('/basedata/materile/page', req)

export const materileGetById = (id: string) =>
  http.get<SpMaterile>('/basedata/materile/get-by-id', { id })

export const materileAddOrUpdate = (dto: Partial<SpMaterile>) =>
  http.post<string>('/basedata/materile/add-or-update', dto)

export const materileDelete = (id: string) =>
  http.post<string>('/basedata/materile/delete', { id })

/** 上传物料图片,返回 { url } */
export const materileUploadImage = (file: File) => {
  const form = new FormData()
  form.append('file', file)
  return http.upload<{ url: string }>('/basedata/materile/upload-image', form)
}
```

- [ ] **Step 4: 类型检查**

Run(在 `mes/vue3`):
```bash
pnpm typecheck
```
Expected: 0 错误(若 `PageReq` 名称不符,按 Step 1 注释修正后再跑)。

- [ ] **Step 5: Commit**

```bash
git add mes/vue3/src/types/basedata.ts mes/vue3/src/api/basedata/dict.ts mes/vue3/src/api/basedata/materile.ts
git commit -m "✨ feat(vue3): 物料模块类型与 API(materile/dict)"
```

---

### Task 3: 纯函数 `utils/materile.ts` + TDD

**Files:**
- Create: `mes/vue3/tests/materile.spec.ts`
- Create: `mes/vue3/src/utils/materile.ts`

- [ ] **Step 1: 写失败测试 `tests/materile.spec.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { buildMaterilePayload, resolveDictLabel, toDictOptions } from '@/utils/materile'
import type { SpSysDict } from '@/types/basedata'

const dicts: SpSysDict[] = [
  { id: '1', name: '成品', value: 'FG', type: 'material_type' },
  { id: '2', name: '半成品', value: 'PG', type: 'material_type' },
]

describe('buildMaterilePayload', () => {
  it('剥除 undefined/空串噪声', () => {
    const p = buildMaterilePayload({ materielDesc: '描述', model: '', size: undefined, matType: 'FG' })
    expect(p).toEqual({ materielDesc: '描述', matType: 'FG', deleted: '0' })
  })
  it('保留 id 与已填字段,默认 deleted=0', () => {
    const p = buildMaterilePayload({ id: 'x1', materielDesc: 'd', matType: 'PG' })
    expect(p.id).toBe('x1')
    expect(p.deleted).toBe('0')
  })
  it('已有 deleted 不覆盖', () => {
    const p = buildMaterilePayload({ materielDesc: 'd', deleted: '1' })
    expect(p.deleted).toBe('1')
  })
  it('leadTime/safetyStock 数值化(字符串→数字)', () => {
    const p = buildMaterilePayload({ materielDesc: 'd', leadTime: '3' as unknown as number, safetyStock: 0 })
    expect(p.leadTime).toBe(3)
    expect(p.safetyStock).toBe(0)
  })
})

describe('resolveDictLabel', () => {
  it('命中字典返回 name', () => {
    expect(resolveDictLabel('FG', dicts)).toBe('成品')
  })
  it('未命中兜底返回原值', () => {
    expect(resolveDictLabel('零件', dicts)).toBe('零件')
  })
  it('空值返回空串', () => {
    expect(resolveDictLabel(undefined, dicts)).toBe('')
    expect(resolveDictLabel('', dicts)).toBe('')
  })
  it('空字典兜底返回原值', () => {
    expect(resolveDictLabel('FG', [])).toBe('FG')
  })
})

describe('toDictOptions', () => {
  it('字典数组转下拉选项', () => {
    expect(toDictOptions(dicts)).toEqual([
      { label: '成品', value: 'FG' },
      { label: '半成品', value: 'PG' },
    ])
  })
  it('空数组返回空', () => {
    expect(toDictOptions([])).toEqual([])
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run:
```bash
pnpm test -- materile
```
Expected: FAIL(`@/utils/materile` 模块不存在)。

- [ ] **Step 3: 写实现 `src/utils/materile.ts`**

```ts
import type { SpMaterile, SpSysDict } from '@/types/basedata'

/** 下拉选项 */
export interface DictOption {
  label: string
  value: string
}

/**
 * 构造 add-or-update 提交体:
 * - 剥除 undefined 与空字符串(避免无意义字段污染表单编码)
 * - 数值字段(leadTime/safetyStock)统一转 number
 * - deleted 缺省补 '0'(正常)
 */
export function buildMaterilePayload(form: Partial<SpMaterile>): Partial<SpMaterile> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(form)) {
    if (v === undefined || v === '') continue
    out[k] = v
  }
  if (out.leadTime !== undefined) out.leadTime = Number(out.leadTime)
  if (out.safetyStock !== undefined) out.safetyStock = Number(out.safetyStock)
  if (out.deleted === undefined) out.deleted = '0'
  return out as Partial<SpMaterile>
}

/** 字典 value → 显示 name;未命中或空字典兜底返回原值;空值返回空串 */
export function resolveDictLabel(value: string | undefined, dicts: SpSysDict[]): string {
  if (!value) return ''
  const hit = dicts.find((d) => d.value === value)
  return hit ? hit.name : value
}

/** 字典数组 → el-select 选项 */
export function toDictOptions(dicts: SpSysDict[]): DictOption[] {
  return dicts.map((d) => ({ label: d.name, value: d.value }))
}
```

- [ ] **Step 4: 运行测试确认通过**

Run:
```bash
pnpm test -- materile
```
Expected: PASS(10 个用例全绿)。

- [ ] **Step 5: Commit**

```bash
git add mes/vue3/src/utils/materile.ts mes/vue3/tests/materile.spec.ts
git commit -m "✅ test(vue3): 物料纯函数 buildMaterilePayload/resolveDictLabel/toDictOptions(TDD)"
```

---

### Task 4: `useDict` composable

**Files:**
- Create: `mes/vue3/src/composables/useDict.ts`

- [ ] **Step 1: 写 `composables/useDict.ts`**

```ts
import { ref, type Ref } from 'vue'
import { dictList } from '@/api/basedata/dict'
import { toDictOptions, resolveDictLabel, type DictOption } from '@/utils/materile'
import type { SpSysDict } from '@/types/basedata'

/** 模块级缓存:同一 type 只请求一次(多个下拉共享) */
const cache = new Map<string, Promise<SpSysDict[]>>()

function loadDict(type: string): Promise<SpSysDict[]> {
  if (!cache.has(type)) {
    cache.set(
      type,
      dictList(type).catch((e) => {
        cache.delete(type) // 失败不缓存,允许重试
        throw e
      }),
    )
  }
  return cache.get(type)!
}

/**
 * 按字典 type 取数,暴露下拉 options 与 value→label 解析。
 * 取数失败降级为空选项 + 一次 warning,不阻断页面。
 */
export function useDict(type: string): {
  dicts: Ref<SpSysDict[]>
  options: Ref<DictOption[]>
  loading: Ref<boolean>
  labelOf: (value?: string) => string
} {
  const dicts = ref<SpSysDict[]>([])
  const options = ref<DictOption[]>([])
  const loading = ref(true)

  loadDict(type)
    .then((list) => {
      dicts.value = list ?? []
      options.value = toDictOptions(dicts.value)
    })
    .catch(() => {
      ElMessage.warning(`字典「${type}」加载失败`)
    })
    .finally(() => {
      loading.value = false
    })

  const labelOf = (value?: string) => resolveDictLabel(value, dicts.value)

  return { dicts, options, loading, labelOf }
}
```

> `ElMessage` 由 unplugin-auto-import 自动注入(工程已配置,无需手动 import,参考既有页面)。若执行时报 `ElMessage is not defined`,在文件顶部加 `import { ElMessage } from 'element-plus'`。

- [ ] **Step 2: 类型检查**

Run:
```bash
pnpm typecheck
```
Expected: 0 错误。

- [ ] **Step 3: Commit**

```bash
git add mes/vue3/src/composables/useDict.ts
git commit -m "✨ feat(vue3): useDict composable(按 type 取字典 + 模块级缓存 + 降级)"
```

---

### Task 5: 通用组件 `ImageUpload.vue`

**Files:**
- Create: `mes/vue3/src/components/ImageUpload.vue`

- [ ] **Step 1: 写 `components/ImageUpload.vue`**

```vue
<template>
  <div class="image-upload">
    <div v-if="modelValue" class="image-upload__preview">
      <el-image :src="modelValue" fit="cover" class="image-upload__img" :preview-src-list="[modelValue]" />
      <el-button
        v-if="!disabled"
        class="image-upload__remove"
        :icon="Close"
        circle
        size="small"
        @click="emit('update:modelValue', '')"
      />
    </div>

    <el-upload
      v-if="!disabled"
      class="image-upload__trigger"
      :show-file-list="false"
      :before-upload="beforeUpload"
      :http-request="doUpload"
      accept="image/*"
    >
      <el-button :loading="uploading" :icon="UploadFilled">
        {{ modelValue ? '重新上传' : '上传图片' }}
      </el-button>
    </el-upload>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Close, UploadFilled } from '@element-plus/icons-vue'
import type { UploadRequestOptions } from 'element-plus'
import { materileUploadImage } from '@/api/basedata/materile'

// 通用图片上传:props 入 / emit 出,零业务耦合
const props = withDefaults(
  defineProps<{ modelValue?: string; disabled?: boolean }>(),
  { modelValue: '', disabled: false },
)
const emit = defineEmits<{ 'update:modelValue': [string] }>()

const uploading = ref(false)

/** 上传前校验:仅图片 + ≤2MB */
function beforeUpload(file: File): boolean {
  if (!file.type.startsWith('image/')) {
    ElMessage.warning('只能上传图片文件')
    return false
  }
  if (file.size > 2 * 1024 * 1024) {
    ElMessage.warning('图片大小不能超过 2MB')
    return false
  }
  return true
}

/** 自定义上传:调 materile/upload-image,取回 url 回填 */
async function doUpload(opt: UploadRequestOptions): Promise<void> {
  uploading.value = true
  try {
    const res = await materileUploadImage(opt.file as File)
    emit('update:modelValue', res.url)
    ElMessage.success('上传成功')
  } catch {
    /* 响应拦截器已提示,吞掉防未捕获 rejection */
  } finally {
    uploading.value = false
  }
}

// 显式引用 props 防 lint 未使用告警(modelValue 已在模板用,disabled 同理)
void props
</script>

<style scoped>
.image-upload {
  display: flex;
  align-items: flex-end;
  gap: var(--sp-3);
}
.image-upload__preview {
  position: relative;
  width: 80px;
  height: 80px;
}
.image-upload__img {
  width: 80px;
  height: 80px;
  border-radius: var(--radius-md, 6px);
  border: 1px solid var(--el-border-color);
}
.image-upload__remove {
  position: absolute;
  top: -8px;
  right: -8px;
}
</style>
```

- [ ] **Step 2: 类型检查**

Run:
```bash
pnpm typecheck
```
Expected: 0 错误(若 `void props` 触发 lint,可删该行——`modelValue`/`disabled` 已在模板使用)。

- [ ] **Step 3: Commit**

```bash
git add mes/vue3/src/components/ImageUpload.vue
git commit -m "✨ feat(vue3): 通用 ImageUpload 组件(image-only+2MB 校验/预览/移除)"
```

---

### Task 6: `MaterileForm.vue` 新增/编辑弹窗

**Files:**
- Create: `mes/vue3/src/views/basedata/materile/MaterileForm.vue`

- [ ] **Step 1: 写 `views/basedata/materile/MaterileForm.vue`**

```vue
<template>
  <FormDialog
    :model-value="modelValue"
    :title="isEdit ? '编辑物料' : '新增物料'"
    width="640px"
    :loading="loading"
    @update:model-value="(v) => emit('update:modelValue', v)"
    @submit="handleSubmit"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="92px">
      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="物料类型" prop="matType">
            <el-select v-model="form.matType" placeholder="请选择物料类型" clearable style="width: 100%">
              <el-option v-for="o in matTypeOptions" :key="o.value" :label="o.label" :value="o.value" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item v-if="isEdit" label="物料编码">
            <el-input :model-value="form.materiel" disabled placeholder="保存后自动生成" />
          </el-form-item>
        </el-col>
      </el-row>

      <el-form-item label="物料描述" prop="materielDesc">
        <el-input v-model="form.materielDesc" placeholder="请输入物料描述" clearable />
      </el-form-item>

      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="基本单位" prop="unit">
            <el-select v-model="form.unit" placeholder="请选择单位" clearable style="width: 100%">
              <el-option v-for="o in unitOptions" :key="o.value" :label="o.label" :value="o.value" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="型号" prop="model">
            <el-input v-model="form.model" placeholder="请输入型号" clearable />
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="物料来源" prop="source">
            <el-select v-model="form.source" placeholder="请选择来源" clearable style="width: 100%">
              <el-option label="自制" value="自制" />
              <el-option label="外购" value="外购" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="规格" prop="size">
            <el-input v-model="form.size" placeholder="请输入规格" clearable />
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="提前期(天)" prop="leadTime">
            <el-input-number v-model="form.leadTime" :min="1" controls-position="right" style="width: 100%" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="安全库存" prop="safetyStock">
            <el-input-number v-model="form.safetyStock" :min="0" controls-position="right" style="width: 100%" />
          </el-form-item>
        </el-col>
      </el-row>

      <el-form-item label="产品组" prop="productGroup">
        <el-input v-model="form.productGroup" placeholder="请输入产品组" clearable />
      </el-form-item>

      <el-form-item label="物料图片">
        <ImageUpload v-model="form.imageUrl" />
      </el-form-item>
    </el-form>
  </FormDialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import FormDialog from '@/components/FormDialog.vue'
import ImageUpload from '@/components/ImageUpload.vue'
import { useDict } from '@/composables/useDict'
import { buildMaterilePayload } from '@/utils/materile'
import type { SpMaterile } from '@/types/basedata'

const props = defineProps<{
  modelValue: boolean
  /** null = 新增;Partial(有 id) = 编辑 */
  model: Partial<SpMaterile> | null
  loading?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [boolean]
  submit: [Partial<SpMaterile>]
}>()

const formRef = ref<FormInstance>()
const isEdit = computed(() => !!props.model?.id)

// 动态字典下拉(模块级缓存,列表页与表单共享同一请求)
const { options: matTypeOptions } = useDict('material_type')
const { options: unitOptions } = useDict('ORDER_UNIT')

const form = reactive<Partial<SpMaterile>>({
  id: undefined,
  materiel: undefined,
  materielDesc: '',
  unit: undefined,
  matType: undefined,
  model: undefined,
  source: undefined,
  size: undefined,
  leadTime: 1,
  safetyStock: 0,
  productGroup: undefined,
  imageUrl: '',
})

function resetForm() {
  form.id = undefined
  form.materiel = undefined
  form.materielDesc = ''
  form.unit = undefined
  form.matType = undefined
  form.model = undefined
  form.source = undefined
  form.size = undefined
  form.leadTime = 1
  form.safetyStock = 0
  form.productGroup = undefined
  form.imageUrl = ''
}

watch(
  () => props.model,
  (val) => {
    if (val) Object.assign(form, { leadTime: 1, safetyStock: 0, imageUrl: '', ...val })
    else resetForm()
  },
  { immediate: true },
)

const rules: FormRules = {
  matType: [{ required: true, message: '请选择物料类型', trigger: 'change' }],
  materielDesc: [{ required: true, message: '请输入物料描述', trigger: 'blur' }],
}

async function handleSubmit() {
  await formRef.value?.validate()
  emit('submit', buildMaterilePayload({ ...form }))
}
</script>
```

- [ ] **Step 2: 类型检查**

Run:
```bash
pnpm typecheck
```
Expected: 0 错误。

- [ ] **Step 3: Commit**

```bash
git add mes/vue3/src/views/basedata/materile/MaterileForm.vue
git commit -m "✨ feat(vue3): 物料新增/编辑弹窗(动态字典下拉+校验+图片上传)"
```

---

### Task 7: `MaterileList.vue` 列表页

**Files:**
- Create: `mes/vue3/src/views/basedata/materile/MaterileList.vue`

- [ ] **Step 1: 写 `views/basedata/materile/MaterileList.vue`**

```vue
<template>
  <PageContainer>
    <SearchForm :model="search" @search="handleSearch" @reset="handleReset">
      <el-form-item label="物料编码">
        <el-input v-model="search.materielLike" placeholder="请输入物料编码" clearable />
      </el-form-item>
      <el-form-item label="物料描述">
        <el-input v-model="search.materielDescLike" placeholder="请输入物料描述" clearable />
      </el-form-item>
    </SearchForm>

    <DataTable
      :data="tableData"
      :loading="loading"
      :columns="columns"
      :pager="pager"
      @page-change="handlePageChange"
      @size-change="handleSizeChange"
    >
      <template #toolbar>
        <el-button v-permission="'materile:add'" type="primary" :icon="Plus" @click="openCreate">
          新增
        </el-button>
      </template>

      <template #col-imageUrl="{ row }">
        <el-image
          v-if="row.imageUrl"
          :src="row.imageUrl"
          fit="cover"
          style="width: 44px; height: 44px; border-radius: 4px"
          :preview-src-list="[row.imageUrl]"
          preview-teleported
        />
        <el-tag v-else size="small" type="info">无图</el-tag>
      </template>

      <template #col-matType="{ row }">{{ matTypeLabel(row.matType) }}</template>
      <template #col-unit="{ row }">{{ unitLabel(row.unit) }}</template>

      <template #actions="{ row }">
        <el-button type="primary" link size="small" @click="openEdit(row as SpMaterile)">编辑</el-button>
        <el-button type="danger" link size="small" @click="handleDelete(row as SpMaterile)">删除</el-button>
      </template>
    </DataTable>

    <MaterileForm
      v-model="dialogVisible"
      :model="editingModel"
      :loading="submitLoading"
      @submit="handleFormSubmit"
    />
  </PageContainer>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import PageContainer from '@/components/PageContainer.vue'
import SearchForm from '@/components/SearchForm.vue'
import DataTable from '@/components/DataTable.vue'
import type { Column } from '@/components/DataTable.vue'
import MaterileForm from './MaterileForm.vue'
import { useRequest } from '@/composables/useRequest'
import { usePagination } from '@/composables/usePagination'
import { useDict } from '@/composables/useDict'
import { materilePage, materileAddOrUpdate, materileDelete } from '@/api/basedata/materile'
import type { SpMaterile } from '@/types/basedata'

const { pager, setTotal, reset } = usePagination()
const search = reactive({ materielLike: '', materielDescLike: '' })

const { data: pageData, loading, run } = useRequest(
  () => materilePage({ current: pager.current, size: pager.size, ...search }),
  { immediate: true },
)

const tableData = computed<SpMaterile[]>(() => {
  const result = pageData.value
  if (result) setTotal(result.total)
  return result?.records ?? []
})

// 字典:列展示中文 label(与表单共享缓存)
const { labelOf: matTypeLabel } = useDict('material_type')
const { labelOf: unitLabel } = useDict('ORDER_UNIT')

const columns: Column[] = [
  { prop: 'imageUrl', label: '图片', width: 80 },
  { prop: 'materiel', label: '物料编码', width: 130 },
  { prop: 'materielDesc', label: '物料描述', minWidth: 160 },
  { prop: 'matType', label: '类型', width: 100 },
  { prop: 'unit', label: '单位', width: 90 },
  { prop: 'model', label: '型号', width: 120 },
  { prop: 'createTime', label: '创建时间', minWidth: 160 },
]

const dialogVisible = ref(false)
const editingModel = ref<Partial<SpMaterile> | null>(null)
const submitLoading = ref(false)

function openCreate() {
  editingModel.value = null
  dialogVisible.value = true
}
function openEdit(row: SpMaterile) {
  editingModel.value = { ...row }
  dialogVisible.value = true
}

function handlePageChange(page: number) {
  pager.current = page
  run()
}
function handleSizeChange(size: number) {
  pager.size = size
  reset()
  run()
}
function handleSearch() {
  reset()
  run()
}
function handleReset() {
  search.materielLike = ''
  search.materielDescLike = ''
  reset()
  run()
}

async function handleFormSubmit(dto: Partial<SpMaterile>) {
  submitLoading.value = true
  try {
    await materileAddOrUpdate(dto)
    ElMessage.success('保存成功')
    dialogVisible.value = false
    run()
  } finally {
    submitLoading.value = false
  }
}

async function handleDelete(row: SpMaterile) {
  try {
    await ElMessageBox.confirm(`确认删除物料「${row.materielDesc}」?`, '提示', {
      type: 'warning',
      confirmButtonText: '确认删除',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }
  try {
    await materileDelete(row.id)
    ElMessage.success('删除成功')
    run()
  } catch { /* 响应拦截器已提示 */ }
}
</script>
```

- [ ] **Step 2: 类型检查**

Run:
```bash
pnpm typecheck
```
Expected: 0 错误。

- [ ] **Step 3: Commit**

```bash
git add mes/vue3/src/views/basedata/materile/MaterileList.vue
git commit -m "✨ feat(vue3): 物料维护列表页(搜索/分页/图片列/字典 label/软删)"
```

---

### Task 8: 路由接入(urlMap + router)

**Files:**
- Modify: `mes/vue3/src/utils/urlMap.ts`
- Modify: `mes/vue3/tests/urlMap.spec.ts`
- Modify: `mes/vue3/src/router/index.ts`

- [ ] **Step 1: urlMap 加映射**

在 `URL_MAP` 对象中,`'/admin/sys/department/list-ui'` 行之后追加:

```ts
  '/basedata/materile/list-ui': '/basedata/materile',
```

- [ ] **Step 2: 补 urlMap 测试**

在 `tests/urlMap.spec.ts` 的「已知后端 url 翻译为干净路由」用例中,追加一行断言:

```ts
    expect(toSpaRoute('/basedata/materile/list-ui')).toBe('/basedata/materile')
```

- [ ] **Step 3: 运行测试确认通过**

Run:
```bash
pnpm test -- urlMap
```
Expected: PASS。

- [ ] **Step 4: router 注册路由**

在 `router/index.ts` 的 AdminLayout `children` 数组里,`system/dict` 路由之后追加:

```ts
      {
        path: 'basedata/materile',
        name: 'basedata-materile',
        component: () => import('@/views/basedata/materile/MaterileList.vue'),
        meta: { title: '物料维护', perm: 'materile:add' },
      },
```

- [ ] **Step 5: 类型检查**

Run:
```bash
pnpm typecheck
```
Expected: 0 错误。

- [ ] **Step 6: Commit**

```bash
git add mes/vue3/src/utils/urlMap.ts mes/vue3/tests/urlMap.spec.ts mes/vue3/src/router/index.ts
git commit -m "✨ feat(vue3): 物料维护路由接入(urlMap 映射 + router 注册)"
```

---

### Task 9: 全量门禁验证

**Files:** 无(仅验证)

- [ ] **Step 1: 全量门禁**

Run(在 `mes/vue3`):
```bash
pnpm typecheck && pnpm test && pnpm lint:check && pnpm build
```
Expected: typecheck 0 错误;test 全绿(含 materile 10 例 + urlMap 增补);lint:check 0 error;build 成功。

> 若 lint 报 `ImageUpload.vue` 的 `void props` 未使用之类告警,删除该行(`modelValue`/`disabled` 已在模板引用,无需占位)。

- [ ] **Step 2: 后端编译复核**

Run(在 `mes`):
```bash
JAVA_HOME=$(/usr/libexec/java_home -v 11 2>/dev/null) mvn -q -pl . compile -DskipTests
```
Expected: `BUILD SUCCESS`。

- [ ] **Step 3: 若门禁有修复,提交**

```bash
git add -A && git commit -m "🔧 chore(vue3): 子周期 1b 门禁修复"
```
(无修复则跳过)

---

## 后续(计划外,执行完成后由编排者处理)
- 更新 `mes/vue3/docs/ROADMAP.md` §9.2 物料行状态 → ✅、§11 进度快照、模块矩阵。
- 更新记忆(vue3-homework-frontend 进度;若有新坑补 vue3-env-gotchas)。
- `--no-ff` 合入 `develop`。
- 人工浏览器冒烟(:4200 + 后端 :9090):登录 → 物料维护 → 搜索/分页 → 新增(字典下拉+图片上传+自动编码)→ 编辑 → 软删消失。
- 联调 backlog(见 spec §9):图片管线 object-key 重签、自动编码并发、source 字典化、历史脏值清洗。

---

## Self-Review 记录
- **Spec 覆盖:** §2.4 后端 4 修正 → Task 1(前 3 项;第 4 项「遗留只读容忍」由 `resolveDictLabel` 兜底 = Task 3 + Task 7 列渲染实现,无需迁移);§3.1 类型 → Task 2;§3.2 API → Task 2;§3.3 useDict → Task 4;§3.4 ImageUpload → Task 5;§3.5 页面 → Task 6/7;§3.6 纯函数 → Task 3;§3.7 路由 → Task 8;§6 测试/门禁 → Task 3 + Task 9。全覆盖。
- **占位符扫描:** 无 TBD/TODO;每个代码步骤含完整代码。
- **类型一致:** `SpMaterile`/`MaterilePageReq`/`SpSysDict`(Task 2 定义)在 Task 3/4/6/7 一致引用;`DictOption` 在 Task 3 定义、Task 4 复用;`buildMaterilePayload`/`resolveDictLabel`/`toDictOptions` 跨 Task 3/4/6 签名一致。
