# 子周期 1b — 基础数据·物料 维护(设计文档 / Spec)

> 所属:章鱼师兄 MES · Vue3 前端 · Cycle 1 · 子周期 1b
> 分支:`feature/basedata-materile`(从 `develop` 切)
> 创建:2026-06-20
> 参考契约:React 版 `mes/frontend/apps/mes-new` 的 materile 模块(**仅参考接口/功能,绝不照抄 UI**)

---

## 1. 目标与范围

用 Vue3 实现**物料维护**单页:列表(搜索 + 服务端分页)、新增/编辑弹窗(表单校验 + **动态字典下拉** + **图片上传**)、删除(软删)。这是 Cycle 1 基础数据线的第一块。

### 1.1 明确不在本周期(YAGNI)
- 设备 / 设备编组 / 加工单元 / 仓库(库位)/ 零部件 → Cycle 2
- 动态主数据配置 + 维护(`sp_table_manager`)→ Cycle 3
- **工艺路线 `flowId/flowDesc` 绑定** → 依赖 1c 的 Flow 管理,本周期表单不实现这两个字段(mes-new 同样未实现,为预留字段)。

### 1.2 范围对齐路线图
路线图 §9.2 把「物料维护(+图片上传)」「字典下拉助手」标为 C1;本周期一次性交付这两项。

---

## 2. 后端勘察结论与最小修正(强制审查 DeepSeek 后端)

> 依据项目规范:`mes/src/main/java` 多为 AI 生成,凡涉及模块必须审查 + 修正。已精读 `SpMaterileController` / `SpMaterileServiceImpl` / `SpMaterile` / `spMaterileReq` / `SpSysDictController`。

### 2.1 现有端点(契约)
| 端点 | 方法 | 编码 | 说明 |
|---|---|---|---|
| `/basedata/materile/page` | POST | form | 分页查询;入参 `current/size/materielLike/materielDescLike` |
| `/basedata/materile/get-by-id` | GET | query | `id` → 单条 |
| `/basedata/materile/add-or-update` | POST | form | 新增/编辑(`SpMaterile` 表单绑定;空 `materiel` 时后端按 `matType` 自动生成编码) |
| `/basedata/materile/delete` | POST | form | 删除(现状:物理删 `removeById`) |
| `/basedata/materile/upload-image` | POST | multipart | 字段名 `file`,返回 `{ url }`(MinIO 预签名 URL) |
| `/basedata/dict/list/{type}` | GET | path | 按 `type` 取字典项 `SpSysDict[]` |

### 2.2 实体关键字段(`sp_materile`)
`materiel`(编码)、`materielDesc`(描述)、`unit`(单位)、`productGroup`(产品组)、`matType`(物料类型)、`size`(规格)、`model`(型号)、`source`(来源)、`leadTime`(提前期/天 Integer)、`safetyStock`(安全库存 Integer)、`imageUrl`(图片)、`flowId/flowDesc`(工艺路线,本周期不用)、`deleted`(`@TableField("is_deleted")`,**非** `@TableLogic`)。

### 2.3 字典真实数据(决定下拉数据源)
- `material_type`:`成品`(value=FG)、`半成品`(value=PG)
- `ORDER_UNIT`:`个`(value=PCS)、`箱`(value=BOX)
- **无** `source` 字典 type。

### 2.4 待修正的后端问题(本周期正式任务)
1. **`/page` 无 `is_deleted` 过滤** —— 软删记录会照常返回。修:`queryWrapper.ne("is_deleted", "1")`(对齐 1a 列表过滤约定)。
2. **`/delete` 是物理删 `removeById`** —— 与 1a 全模块软删语义、与 mes-new 不一致。修:改为软删,`UpdateWrapper.set("is_deleted","1")`(保留专用 `/delete` 端点;前端仍调它)。
3. **自动编码 `getCodePrefix` 按中文 matType 判前缀**(`产品/零件/标准件`)。改用动态字典后 `matType` 存的是字典 **value**(`FG/PG`),全部落到 `OTHR-` 兜底。修:补字典 value → 前缀映射(`FG`→`FG-`、`PG`→`PG-`,其余保留 `OTHR-`),保持自动编码语义合理。
4. **遗留数据兼容(只读容忍,不迁移):** `sp_materile.mat_type` 历史值混杂(`FG` / `零件` / `产品`),`image_url` 混有过期预签名 URL 与相对路径。本周期**不做数据迁移**:列表用 `resolveDictLabel` 兜底显示原值;图片过期问题记 backlog(决策 2 = 保持现有上传方案)。

### 2.5 后端改动尺度
仅改 `SpMaterileController`(page 过滤 + delete 软删 + getCodePrefix 字典映射),**最小、就地**。`/upload-image` 与 service/mapper/entity **不动**。改后用 JDK11 系统 `mvn -q compile` 验证编译通过。

> 注:`/upload-image` 用 `uploadAndGetUrl`(7 天预签名 URL),演示期可用,7 天后旧链接失效——属图片管线 backlog,本周期按决策 2「保持现有端点」不处理。

---

## 3. 前端架构(复用 1a 沉淀)

### 3.1 类型 `src/types/basedata.ts`(新建)
```ts
export interface SpMaterile {
  id: string
  materiel?: string          // 物料编码(新建留空,后端生成)
  materielDesc: string       // 物料描述(必填)
  unit?: string              // 基本单位(字典 ORDER_UNIT 的 value)
  productGroup?: string      // 产品组
  matType?: string           // 物料类型(字典 material_type 的 value)
  size?: string              // 规格
  model?: string             // 型号
  source?: string            // 来源(自制/外购,硬编码下拉)
  leadTime?: number          // 提前期(天)
  safetyStock?: number       // 安全库存
  imageUrl?: string          // 图片 URL
  flowId?: string            // 工艺路线(本周期不用)
  flowDesc?: string
  deleted?: string           // is_deleted:'0' 正常 / '1' 删除
  createTime?: string; createUsername?: string
  updateTime?: string; updateUsername?: string
}

export interface MaterilePageReq {
  current: number; size: number
  materielLike?: string
  materielDescLike?: string
}

export interface SpSysDict {
  id: string; name: string; value: string; type: string
  descr?: string; sortNum?: number
}
```

### 3.2 API
- `src/api/basedata/materile.ts`:`materilePage` / `materileGetById` / `materileAddOrUpdate`(form)/ `materileDelete`(form,传 `{id}`)/ `materileUploadImage`(FormData,走 `http.upload`)。
- `src/api/basedata/dict.ts`:`dictList(type)` → `GET /basedata/dict/list/{type}`。

### 3.3 新增 composable `src/composables/useDict.ts`
- 职责:按 `type` 拉取字典并**模块级缓存**(`Map<type, Promise<SpSysDict[]>>`),避免多个下拉重复请求同一 type。
- 暴露:响应式 `options`(`{label:name, value}[]`)+ `labelOf(value)`(value→name,兜底原值)+ `loading`。
- 纯映射逻辑下沉到 `utils/materile.ts` 的 `resolveDictLabel` / `toDictOptions` 便于 TDD;composable 只管取数与缓存。

### 3.4 新增通用组件 `src/components/ImageUpload.vue`
- props:`modelValue?: string`(当前图片 URL)、`uploadUrl?: string`(默认 `/basedata/materile/upload-image`)、`disabled?`。
- emits:`update:modelValue`。
- 行为:`el-upload` 自定义 `http-request`(或手动 FormData + `http.upload`)→ 取回 `{url}` 回填;**校验 image/\* + ≤2MB**(超限 `ElMessage.warning`);预览缩略图 + 移除按钮 + 上传中 loading。
- 纯 props 入 / emit 出,零业务耦合,后续设备/零部件等页可复用。

### 3.5 页面 `src/views/basedata/materile/`
- `MaterileList.vue`:`PageContainer` + `SearchForm`(物料编码 `materielLike`、物料描述 `materielDescLike`)+ `DataTable`。
  - 列:图片(`col-imageUrl` 插槽渲染缩略图/占位)、物料编码、物料描述、类型(`col-matType` 用 `labelOf` 显示中文)、单位(`col-unit` 同理)、型号、创建时间、操作(编辑/删除,`v-permission="'materile:add'"`)。
  - 工具栏:新增按钮。删除走 `ElMessageBox.confirm` → `materileDelete`。
  - 取数/分页:`useRequest` + `usePagination`(完全沿用 `UserList.vue` 范式)。
- `MaterileForm.vue`:`FormDialog` + `el-form`(`ref` + rules)。
  - 字段:物料类型(`el-select` 字典 material_type,**必选**)、物料编码(编辑时只读展示,新建隐藏/留空)、物料描述(**必填**)、单位(`el-select` 字典 ORDER_UNIT)、型号、来源(`el-select` 硬编码 自制/外购)、规格、提前期(`el-input-number` ≥1)、安全库存(`el-input-number` ≥0)、产品组、图片(`ImageUpload`)。
  - 校验:`materielDesc` 必填、`matType` 必选;`leadTime/safetyStock` 数值边界。
  - 提交:`buildMaterilePayload(form)` → emit `submit`;父页 `materileAddOrUpdate`。
  - **避免 DOM 属性同名字段名**(参考既有约定);表单用普通 `reactive`/`ref` 受控。

### 3.6 纯函数 `src/utils/materile.ts`(TDD)
- `buildMaterilePayload(form): Partial<SpMaterile>` —— 剥除 `undefined/''` 噪声、保证 `deleted` 默认 `'0'`、`leadTime/safetyStock` 数值化。
- `resolveDictLabel(value, dicts): string` —— value→name,未命中兜底返回原 value。
- `toDictOptions(dicts): {label,value}[]` —— 字典数组 → 下拉选项。

### 3.7 路由接入
- `utils/urlMap.ts` 增 `'/basedata/materile/list-ui': '/basedata/materile'`。
- `router/index.ts` 注册 `/basedata/materile` → `MaterileList.vue`(懒加载),`meta.perm='materile:add'`、`meta.title='物料维护'`。
- **菜单 131(`/basedata/materile/list-ui`,权限 `materile:add`)DB 已存在,无需种子 SQL**(与 1a 字典菜单不同)。

---

## 4. 数据流与交互

1. 进入页面 → `useRequest` 触发 `materilePage` → `DataTable` 渲染;两个 `useDict('material_type')`/`useDict('ORDER_UNIT')` 并行拉字典(缓存),列与表单共享。
2. 新增 → 弹窗空表单(matType 必选);保存 → `add-or-update`(materiel 留空 → 后端按 matType 字典 value 生成编码)→ 成功 toast + 列表 `run()`。
3. 编辑 → `{...row}` 填表(materiel 只读)→ 保存同上。
4. 图片 → `ImageUpload` 即时上传取回 URL 存入表单 `imageUrl`,随表单一起提交。
5. 删除 → 确认 → `materileDelete({id})`(后端软删 is_deleted='1')→ 列表刷新(page 已过滤,删除项消失)。

---

## 5. 错误处理与边界
- 请求失败:`request.ts` 响应拦截统一 `ElMessage.error` + reject;页面 `catch` 吞掉防未捕获 rejection(沿用 `UserList`)。
- 字典拉取失败:`useDict` 降级为空选项 + 一次 warning,不阻断页面。
- 图片超限/非图片:组件内 warning,不发请求。
- 遗留 `matType` 非字典值:`resolveDictLabel` 兜底显示原值,不报错。
- 空态:`DataTable` 内置 `el-empty`。

---

## 6. 测试策略
- **Vitest 单测(node 环境,`tests/**/*.spec.ts`)**:`buildMaterilePayload`、`resolveDictLabel`、`toDictOptions` 全分支覆盖(空值剥除、数值化、默认 deleted、命中/未命中字典、空字典)。
- 组件不做渲染测(沿用工程约定)。
- 门禁:`pnpm typecheck && test && lint:check && build` 全绿;后端 `mvn -q compile` BUILD SUCCESS(JDK11)。

---

## 7. 工程流程
- 分支 `feature/basedata-materile`(已切)。
- spec → plan(writing-plans)→ subagent 驱动逐任务实现 + 两阶段审查 → opus 终审 → 门禁全绿 → `--no-ff` 合 `develop`。
- emoji conventional 中文提交(`/commit` 风格),按文件/功能粒度增量提交。
- 收尾更新 `ROADMAP.md` §9.2 状态 + §11 进度快照 + 记忆。

---

## 8. 验收清单(Definition of Done)
- [ ] 后端 4 处审查修正落地(page 过滤 / delete 软删 / getCodePrefix 字典映射 / 遗留容忍),`mvn compile` 通过。
- [ ] 物料列表:搜索 + 分页 + 图片列 + 类型/单位中文字典 label。
- [ ] 新增/编辑:动态字典下拉(material_type / ORDER_UNIT)+ 校验 + 图片上传回填 + 自动编码。
- [ ] 删除:软删 + 列表即时消失。
- [ ] `ImageUpload.vue` / `useDict.ts` 通用可复用。
- [ ] 纯函数 TDD 全绿;前端四门禁全绿。
- [ ] urlMap + 路由接入,侧栏「物料维护」可点达。
- [ ] `--no-ff` 合入 develop;ROADMAP/记忆更新。

---

## 9. Backlog(本周期不做,记录备查)
- 图片管线:`/upload-image` 改 object-key + 读时重签;遗留 image_url(过期预签名 / 相对路径)数据迁移。
- 物料自动编码并发竞态(`getOne(last)+1` 无锁)。
- `source` 若将来需字典化,新增 `material_source` dict type。
- 历史 `mat_type` 脏值(中文)清洗为字典 value。
