# Cycle 3c-1 — 工艺内容编制(Process Content Editor)设计

> 分支 `feature/process-content`(从 `develop` 切)。vue3 课程作业前端(`mes/vue3`,端口 4200)。
> 参考 mes-new 周期 2f(工艺文件编制 E),**功能/接口参考,绝不照抄其 UI**。3c 拆 3c-1 编制(本支)/ 3c-2 工艺查询只读页(菜单 116,下一支)。

## 1. 目标与范围

一支分支交付 **工艺内容编制页** `/technology/process-content`(菜单 115 已存在 dev DB,perm `process-content:list`),**零后端生产代码改动**。

**浏览 → 主从编辑**(沿用 1c-2/1c-3 范式):
- 顶部产品选择器(`GET /products` 取 BOM 根)
- 左 `TreeTable`:该产品 BOM 树(`GET /list/{rootId}` 扁平数组重建),列 = 节点名 / 层级 / 编制状态(草稿/已完成 Badge)
- 右 `MasterDetailLayout` detail:选中节点的工艺文件 **Tabs 编辑器**

**Tabs(镜像 mes-new 2f):**
- 顶部:状态 Badge + [保存](存主信息)+ [完成编制](二次确认 → 锁定只读)
- 主信息:mainInfo* / content*(textarea)+ 工序图片(MultiImageUpload)
- 工序要求:requirements(textarea)
- 检验:inspectionRequired(Switch,提交映射 `'1'/'0'`)+ 检验图片(MultiImageUpload)
- 注意事项:notes(textarea)
- 工装设备:`DataTable`(name/quantity/remark)+ 增/改/删
- 技术文档:`DataTable`(name/操作)+ PDF 上传 + 删
- 物料清单:只读 `DataTable`(`GET /bom-items/{bomId}`)

**状态机:** `draft` 全可编辑;`completed` 全只读(隐藏上传/删除、禁用表单,Tabs 仍可切换查看)。
**contentId 引导:** 节点初次无 content → 仅"主信息"可填,[保存]→ 后端返回 contentId → 其余子表 Tab(设备/文档,需 contentId)解锁;未保存前提示"请先保存主信息"。

非目标(YAGNI):3c-2 工艺查询只读页(menu 116,下一支);旧扁平工艺 BOM(`/technology/bom`,菜单 152)按 1c-2 既定不实现;mes1 的 5 步编制向导(改用主从+Tabs)。

## 2. 数据流与契约

### 读端点(GET)

| 端点 | 返回 |
|---|---|
| `/technology/process-content/products` | BOM 根列表(`SpProductBom[]`,parent_id IS NULL) |
| `/technology/process-content/list/{rootId}` | `[{bomNode: SpProductBom, content: SpProcessContent|null}]` |
| `/technology/process-content/get/{bomId}` | `{content, equipment[], documents[](含 fileUrl), contentImageUrls[], inspectionImageUrls[]}` |
| `/technology/process-content/bom-items/{bomId}` | 物料清单(`SpProductBomItem[]`,sort_order) |

### 写端点(全部 `@RequestBody` JSON → `http.post(url, data, true)`)

| 端点 | 入参 | 语义 |
|---|---|---|
| `/save` | `SpProcessContent` | 创建:后端置 `status=draft` + 生成 id;更新:**前端不发 status**(后端以 existing.status 为准,拒改 completed)。返回 contentId |
| `/complete/{id}` | path id | 置 status=completed(锁定) |
| `/equipment/save` | `SpProcessEquipment{contentId,name,quantity,remark}` | 需有效 contentId(validateEditableParent) |
| `/equipment/delete` | `{id}` | |
| `/document/save` | `SpProcessDocument{contentId,name,filePath}` | filePath 存对象 key |
| `/document/delete` | `{id}` | 同时清 MinIO 对象 |

### 上传端点(`http.upload`,multipart FormData)

| 端点 | 返回 |
|---|---|
| `/upload-image` | `{key, url}` |
| `/upload-document` | `{key, url, name}`(仅 PDF) |

### 关键契约坑(已知)

1. **图片字段存逗号连接的 key 列表**(`contentImages`/`inspectionImages`),读时后端把 key 重签为 url(`get` 返回 `contentImageUrls`/`inspectionImageUrls`)。新数据全存裸 key,无 mes-new 遗留双重签名问题。MultiImageUpload 内部维护 `string[]` key 列表,提交 `joinKeys` 序列化。
2. **`inspectionRequired` 后端 String `'0'/'1'`**:Switch boolean 提交映射字符串,不发 JSON boolean。
3. **设备/文档保存必带有效 `contentId`**(后端校验父文件存在且未完成)。
4. **更新不发 status**:`buildContentPayload` 创建/更新都不带 status(后端管理);id 有则更新、无则创建。
5. **编码**:所有写端点 JSON(`http.post(url,data,true)`);读 GET;上传 `http.upload(url, FormData)`。

## 3. 架构与沉淀

### 类型 / API
- `types/technology.ts` 扩展:`SpProcessContent{id?,bomId,flowId?,mainInfo,content,contentImages?,requirements?,inspectionRequired?,inspectionImages?,notes?,status?}`、`SpProcessEquipment{id?,contentId,name,quantity?,remark?}`、`SpProcessDocument{id?,contentId,name,filePath?}`、`ProcessContentDetail`(get 响应:content/equipment/documents(含 id/contentId/name/filePath/fileUrl)/contentImageUrls/inspectionImageUrls)、`ProcessContentListItem{bomNode,content}`。
- `api/technology/processContent.ts`:
  - 读:`pcProducts()` / `pcList(rootId)` / `pcGet(bomId)` / `pcBomItems(bomId)`
  - 写(JSON):`pcSave(content)` / `pcComplete(id)` / `pcEquipmentSave(eq)` / `pcEquipmentDelete(id)` / `pcDocumentSave(doc)` / `pcDocumentDelete(id)`
  - 上传:`pcUploadImage(file): Promise<{key,url}>` / `pcUploadDocument(file): Promise<{key,url,name}>`

### 纯函数 `utils/processContent.ts`(TDD)
- `parseCsvKeys(csv?): string[]` — `split(',').map(trim).filter(Boolean)`
- `joinKeys(keys: string[]): string` — `join(',')`
- `buildContentPayload(form, existingId?): SpProcessContent` — 不带 status;inspectionRequired→'1'/'0';图片 joinKeys;id 有则带
- `validateContent(form): string|null` — mainInfo/content 必填
- `buildTreeFromList(list: ProcessContentListItem[]): TreeNode[]` — 按 bomNode.parentId 重建树,节点附 `content`/`status`/层级
- `canEditContent(status?): boolean` — `status !== 'completed'`(含 null/draft 可编辑)
- `buildEquipmentPayload(form, contentId)` / `buildDocumentPayload(form, contentId)`
- `inspectionToBool(s?)` / `boolToInspection(b)`(Switch ↔ '1'/'0' 辅助)

### 视图组件
- `views/technology/process-content/ProcessContentPage.vue` — 产品选择 + 左 TreeTable + 右 detail 编排;取数 `pcList` 重建树、选节点 `pcGet`。
- `ProcessContentEditor.vue` — Tabs 编辑器(7 Tab),顶部状态/保存/完成;contentId 引导(无 content 时仅主信息可编辑,其余 Tab 占位提示);completed 只读门控。
- `EquipmentForm.vue` — 工装设备小弹窗(FormDialog,name/quantity/remark)。
- 技术文档 PDF 上传:Tab 内联 `el-upload` + `http.upload`(或抽 `ProcessDocumentUpload.vue`,实现阶段定;倾向内联以减组件数)。

### 新原语
- `components/MultiImageUpload.vue` — 多图上传:`modelValue: string[]`(key 列表)+ `uploadFn` 注入(返回 `{key,url}`)+ `disabled`;内部维护 key↔url 映射(读入时 url 列表来自后端 get 的 `contentImageUrls`,key 列表来自 content 字段解析),增图调 uploadFn 追加 key、删图移除;disabled 只读展示。区别于单图 `ImageUpload`。
  - **取舍**:url 与 key 一一对应——编辑回填时,父组件用 `parseCsvKeys(content.contentImages)` 得 key 列表 + get 返回的 `contentImageUrls` 得展示 url,二者同序(后端 resolveUrls 按非空 key 顺序生成);MultiImageUpload 同时接收 `keys`(v-model)+ `urls`(展示 prop),新上传项 key/url 都来自 uploadFn 返回。

## 4. 菜单 / urlMap / 路由

- 菜单 115 已存在 dev DB(`/technology/process-content`,perm `process-content:list`,父 15)。url 本就是干净 SPA 路径 → `toSpaRoute` 原样透传。**零菜单/SQL 改动**。
- router +1:`technology/process-content`(name `technology-process-content`,route-level 懒加载)。
- urlMap:可加显式映射 `'/technology/process-content': '/technology/process-content'`(自映射,与既有 `/order/dispatch` 风格一致)或依赖透传;实现阶段择一(倾向加显式,语义清晰)。

## 5. 测试与门禁

- vitest node 纯函数:`tests/processContent.spec.ts`(parseCsvKeys/joinKeys/buildContentPayload[含不发 status + inspectionRequired 映射]/validateContent/buildTreeFromList/canEditContent/buildEquipment|DocumentPayload,预计 ~15 例)。组件不做渲染测。
- 门禁:`cd mes/vue3 && pnpm typecheck && pnpm test && pnpm lint:check && pnpm build` 全绿。
- 后端按 [[backend-deepseek-review-each-cycle]] 独立审查:确认 `save` 状态机(创建 draft/更新保 status/拒改 completed)、`validateEditableParent`、图片 key 重签管线(`resolveUrls`/`resolveUrl`)在位;预期零改动(mes-new 2f 已修 12 bug + 2k curl 验证同份后端)。

## 6. backlog(非阻塞)

- `sp_process_content.content_images` 遗留两格式(完整预签名 URL / 相对路径)致 get 双重签名图坏 —— 属 mes-new 2f 遗留数据迁移问题,vue3 新建数据全存裸 key 不触发;不在本支范围。
- MultiImageUpload 的 key↔url 同序依赖后端 `resolveUrls` 按非空 key 顺序(已确认);若后端将来改顺序需同步。
- flowId 字段:工艺文件可关联 flowId,但本支编制以 BOM 节点为中心,flowId 非必填(沿用后端可空)。

见 [[vue3-homework-frontend]]、[[mes-rebuild-roadmap]]、[[vue3-env-gotchas]]。
