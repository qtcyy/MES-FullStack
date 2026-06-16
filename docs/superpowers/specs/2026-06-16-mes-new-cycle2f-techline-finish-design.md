# 工艺技术线收尾(D BOM-Flow 绑定 + E 工艺文件编制/上传)设计

> 周期 2f。承接周期 2e(产品 BOM 树/版本/锁定)。活跃前端 = `mes/frontend/apps/mes-new`(React 19 + TS + Vite + shadcn `@workspace/ui` + react-hook-form + zod + `@ngify/http`/rxjs 数据层)。`apps/mes1`(Ant Design)仅作功能/契约参考,**绝不照抄其 UI**。

**日期:** 2026-06-16
**前置依赖:** 产品 BOM(2e,已交付)、工艺路线 Flow + 工序 Oper(2c-1,已交付)。
**后端:** 全部 controller/service/entity/table 已存在(DeepSeek 生成),本周期按"每周期审查修正后端"规则纳入修复。**无需新增业务端点**,仅修 bug + MinIO 存储方案。

---

## 1. 目标

一个周期内完成工艺技术线最后两块:

- **D — 工艺路线绑定**:把已锁定/草稿的产品 BOM 树的每个节点绑定一条工艺路线(Flow),预览该路线的工序链;支持换绑/解绑;在 BOM 结构锁定后可"锁定工艺"。
- **E — 工艺文件编制**:为每个 BOM 节点编写工艺文件(主信息/内容/工序要求/检验要求/注意事项),挂载工序图片、检验图片(多图)、工装设备清单、技术文档(PDF);可"完成编制"使其只读。

并修正本周期涉及的后端真实 bug(对抗复核确认 12 个),其中 MinIO 上传从"存 7 天预签名 URL"改为"存对象 key、读时重新签发 URL"。

---

## 2. 架构与页面结构

两个新页面,均沿用 2e `ProductBomList` 的"浏览 → 主从编辑"范式,左 BOM 树(`TreeDataTable`)、右节点详情(`MasterDetailLayout`)。

### 2.1 页面 D:`/technology/bom-flow`(工艺路线绑定)

```
PageContainer
└─ 浏览态:产品根选择(Select /bom-flow/products) → "进入绑定"
└─ 绑定态:MasterDetailLayout
   ├─ master: TreeDataTable(由 /bom-flow/list/{rootId} 扁平数组按 parentId 重建树)
   │          列:节点名 / 层级 / 已绑工艺(Badge:flow.flow + flowDesc 或"未绑定")/ 状态
   └─ detail: 选中节点面板
      ├─ 节点信息(只读:nodeName/level/productCode)
      ├─ 已绑工艺:flow 编码+描述+备注;无则"未绑定"空态
      ├─ 工序预览:该 flow 的工序链(/bom-flow/opers/{flowId} 或 list 里的 opers),
      │            只读表 + 首/末工序标记(operType firstOper/lastOper)
      ├─ 操作:[绑定/换绑](FormDialog:Select flow + 备注 textarea)/ [解绑](AlertDialog 确认)
      └─ 顶部工具条:[锁定工艺](仅当 BOM 根 status==='locked' 时可点;否则禁用 + 提示"请先锁定产品 BOM 结构")
```

绑定语义:**每节点至多 1 条工艺路线**(后端 bind 为 remove-then-insert,前端按 0/1 处理)。

### 2.2 页面 E:`/technology/process-content`(工艺文件编制)

```
PageContainer
└─ 浏览态:产品根选择(Select /process-content/products) → "进入编制"
└─ 编制态:MasterDetailLayout
   ├─ master: TreeDataTable(由 /process-content/list/{rootId} 重建树)
   │          列:节点名 / 层级 / 编制状态(草稿/已完成 Badge,已完成节点显示 ✓)
   └─ detail: 选中节点的工艺文件编辑器(Tabs)
      ├─ 顶部:状态 Badge + [保存](保存主信息内容)+ [完成编制](complete,二次确认)
      ├─ Tab 主信息: mainInfo* / content*(Textarea)/ 工序图片(MultiImageUpload)
      ├─ Tab 工序要求: requirements(Textarea)
      ├─ Tab 检验: inspectionRequired(Switch,映射 '1'/'0')/ 检验图片(MultiImageUpload)
      ├─ Tab 注意事项: notes(Textarea)
      ├─ Tab 工装设备: DataTable(name/quantity/remark)+ 增/改(行内或小 FormDialog)/删(确认)
      ├─ Tab 技术文档: DataTable(name/操作)+ PDF 上传(ProcessDocumentUpload)/删(确认)
      └─ Tab 物料清单: 只读 DataTable(/process-content/bom-items/{bomId}:materialCode/desc/qty/unit)
```

**编辑状态机:** `status==='draft'` 全可编辑;`status==='completed'` 全只读(隐藏上传/删除按钮、禁用表单、Tabs 仍可切换查看)。与 mes1 行为一致。**合并** mes1 的"编制向导 + 独立查询页"为单一主从页(草稿编辑/完成查看同屏)。

**contentId 引导:** 节点初次进入若无 content,先在"主信息"Tab 填写并[保存]→ 后端 `save` 返回 contentId → 其余 Tab(设备/文档/图片)解锁(需 contentId)。未保存前,这些 Tab 显示"请先保存主信息"。

### 2.3 设计取舍(已决,自主模式)

- **不照抄 mes1 的 5 步向导**:mes-new 用主从 + Tabs 更贴合既有范式(ProductBomList),且作者/查看者同屏,省去独立查询页。保留 mes1 的"完成即只读但可浏览"生命周期。
- **图片字段**:`contentImages`/`inspectionImages` 后端为单 varchar,前端按**逗号连接的 key 列表**编解码(配合 §4 的 key 存储方案)。`split(',').map(trim).filter(Boolean)` 解析,`join(',')` 序列化。
- **inspectionRequired**:保持后端 String `'0'/'1'`;前端 Switch 的 boolean 在提交时映射为 `'1'/'0'` 字符串(切勿发 JSON boolean)。

---

## 3. 数据契约(以"审查并修正后的后端"为准)

所有响应为 `Result{code,data,msg}`,`code===0` 由拦截器解包返回 `data`。POST `@RequestBody` 端点**必须**显式 `JSON_HEADERS`(否则被 `formEncoding` 改成表单编码,@RequestBody 绑定为空)。multipart 端点直接 `http.post(url, FormData)`,字段名必须为 `file`,不要手设 Content-Type。

### 3.1 D `/technology/bom-flow`
| 方法 | 路径 | 入参 | 出参 |
|---|---|---|---|
| GET | `/products` | — | `SpProductBom[]`(parent_id IS NULL 的根) |
| GET | `/list/{rootId}` | path | `Array<{bomNode, bomFlow?, flow?, opers?}>`(扁平,未绑定节点仅 bomNode) |
| GET | `/flows` | — | `SpFlow[]` |
| GET | `/opers/{flowId}` | path | `Array<{relation:SpFlowOperRelation, oper:SpOper}>`(按 sort_num) |
| POST | `/bind` | JSON `{bomId, flowId, remark}` | 新绑定 id(String) |
| POST | `/unbind` | JSON `{bomId}` | null |
| POST | `/update-remark` | JSON `{id, remark}`(id 为绑定行 id) | null |
| POST | `/lock/{rootId}` | path | null;BOM 根未锁定则 failure |

前端契约要点:list 返回扁平数组需按 `bomNode.parentId` 重建树;`flow` 可能为 null(悬挂 flowId),`opers[].oper` 可能为 null,均需空值保护。

### 3.2 E `/technology/process-content`
| 方法 | 路径 | 入参 | 出参 |
|---|---|---|---|
| GET | `/products` | — | `SpProductBom[]`(根) |
| GET | `/list/{rootId}` | path | `Array<{bomNode, content:SpProcessContent\|null}>` |
| GET | `/get/{bomId}` | path | `{content:SpProcessContent\|null, equipment:SpProcessEquipment[], documents:SpProcessDocument[]}`(**修复后** equipment/documents 恒为数组) |
| GET | `/bom-items/{bomId}` | path | `SpProductBomItem[]`(按 sort_order) |
| POST | `/save` | JSON `SpProcessContent` | content id(String) |
| POST | `/complete/{id}` | path | null(**修复后** 不存在则 failure) |
| POST | `/equipment/save` | JSON `SpProcessEquipment{id?,contentId,name,quantity,remark}` | id |
| POST | `/equipment/delete` | JSON `{id}` | null(**修复后** 校验 id + 返回值) |
| POST | `/document/save` | JSON `SpProcessDocument{id?,contentId,name,filePath}` | id |
| POST | `/document/delete` | JSON `{id}` | null(**修复后** 同上 + 清理 MinIO 对象) |
| POST | `/upload-image` | FormData `file` | `{key, url}`(**修复后**:key=对象键,url=即时预览用) |
| POST | `/upload-document` | FormData `file`(仅 PDF) | `{key, url, name}`(**修复后**) |

前端契约要点:`save` 创建时后端置 `status='draft'` 并生成 id;**更新时前端不要发 status**(后端修复后会以 existing.status 为准并拒改已完成)。设备/文档保存必须带有效 `contentId`。document.filePath 存的是**对象 key**(由 upload 返回的 key 映射);图片字段存**逗号连接的 key 列表**;读时后端把 key 重新签发为可访问 url(见 §4)。

---

## 4. MinIO 上传:从"存预签名 URL"改为"存对象 key、读时重签"

**问题(D-BUG-7/8 for E,已复核):** `uploadAndGetUrl` 返回 7 天有效的预签名 URL,直接入库 → 7 天后图片/PDF 链接全失效;且预签名 URL 约 330+ 字符,`content_images varchar(2000)` 只能放 5~6 张就溢出;删除时无 key 无法清理 MinIO 对象。

**方案(仅作用于 process-content,零破坏 materile):**
1. `MinioUtil`:`upload(file, prefix)` 已返回对象 key;新增/暴露 `getPresignedUrl(key)`(把现有私有 `presignedGetUrl` 提升为可调用)。**不改** `uploadAndGetUrl`(materile 继续用)。
2. `SpProcessContentController.uploadImage`:返回 `{key: upload(...), url: getPresignedUrl(key)}`。`uploadDocument`:返回 `{key, url, name}`。
3. **入库存 key**:图片字段存逗号连接的 key 列表;`SpProcessDocument.filePath` 存 key。
4. **读时重签**:仅 `get/{bomId}` 把存的 key 重新签发为新鲜 url 返回给前端展示(`list/{rootId}` 只用于树+编制状态,不展示图片,无需重签)。`get` 返回的 Map 里**追加**解析字段(不污染实体):
   - 附加 `contentImageUrls: string[]`、`inspectionImageUrls: string[]`(由 content 的 key 列表逐个重签);原始 `content.contentImages`/`inspectionImages`(逗号连接的 key 列表)保留供前端编辑回写。
   - `documents[]` 每项附加 `fileUrl`(由 `filePath` key 重签);`filePath`(key)保留。前端展示用 `*Urls`/`fileUrl`,回写用 keys。
5. **删除清理**:`document/delete` 先查行取 key → 删 DB 行 → `minioUtil.delete(key)`(try/catch,失败仅日志)。
6. **启动解耦**:`MinioUtil.ensureBucket()` 由 `@PostConstruct` 抛 `RuntimeException`(MinIO 挂则整个后端起不来)改为**容错**(catch+log,首次上传时惰性确保 bucket),使 MinIO 缺失不阻断后端启动。

前端:`MultiImageUpload` 维护 `key[]`(用于回写)与 `url[]`(用于显示);新增上传后 push key 与 url;保存 content 时发 `contentImages: keys.join(',')`。`ProcessDocumentUpload` 上传后得 `{key,url,name}`,保存 document 时发 `filePath: key`、`name`。

> 范围说明:docker-compose 复现化 MinIO 列为**文档后续项**(容器现成可用,属基础设施,不在前端重建范围)。

---

## 5. 后端修复清单(本周期纳入,均为对抗复核确认的真实 bug)

### D `SpBomFlowController` / `SpBomFlowServiceImpl`
- **D-1**(major)`bind` 提取为 `ISpBomFlowService.rebind(bomId,flowId,remark)` 并 `@Transactional`,remove+save 原子化;入参校验(bomId/flowId 非空 + 节点存在 + flow 存在),节点不存在/已锁定/flow 不存在均 failure(消除 D-BUG-1 + D-BUG-2)。
- **D-2**(major)`sp_bom_flow.bom_id` 加唯一约束(去重后 `ALTER TABLE ... ADD UNIQUE KEY uk_bom_flow_bom (bom_id)`);`list`/`unbind` 的 `getOne(qw)` 改 `getOne(qw,false)` 容错(消除 D-BUG-3 的 500)。
- **D-3**(minor)锁状态一致:`unbind`/`updateRemark` 同时检查"节点锁定 OR 绑定行锁定";`bind` 对已存在的锁定绑定拒绝替换、不把锁定绑定重置为 draft(消除 D-BUG-7)。
- **D-4**(minor)`unbind`/`updateRemark` 对不存在记录返回 failure 而非假成功;`updateRemark` 用 `UpdateWrapper` 仅改 remark 列(消除 D-BUG-9)。

### E `SpProcessContentController`
- **E-1**(major)`save` 更新路径:加载 existing,`null`→failure,`completed`→failure"已完成锁定不可修改";更新时以 existing.status 为准,不信任客户端 status(消除 D-BUG-1)。
- **E-2**(minor)`get/{bomId}` 恒返回 `equipment:[]`、`documents:[]`(content 为 null 时也带空数组键)(消除 D-BUG-2)。
- **E-3**(major)`equipment/save`、`document/save`:校验 `contentId` 非空 + 父 content 存在 + 父 content 非 completed,否则 failure(消除 D-BUG-3)。
- **E-4**(minor)`equipment/delete`、`document/delete`:校验 id 非空 + 检查 removeById 返回值;document 删除追加 `minioUtil.delete(key)`(消除 D-BUG-4)。
- **E-5**(major)上传 key 化 + 读时重签 + filePath/图片字段存 key(§4,消除 D-BUG-7/8)。
- **E-6**(minor)`sp_process_content.bom_id` 加唯一约束;`save` 创建路径先按 bomId 查已存在 content,有则复用其 id 改为更新;`getOne` 改 `getOne(qw,false)` 容错(消除 D-BUG-9)。
- **E-7**(minor)`complete/{id}`:不存在 → failure;成功后按 updateById 返回值返回(消除 D-BUG-10)。

### 共用 `MinioUtil`
- **M-1** `ensureBucket` 启动容错(§4.6);新增公开 `getPresignedUrl(key)`。

> DDL 变更(唯一约束)同步写入 `scripts/sql/MySQL-init-all.sql`,并对 dev DB 执行去重 + ALTER(幂等)。

---

## 6. 前端新增/改动文件

**新增组件:**
- `components/MultiImageUpload.tsx` — 多图上传(基于 ImageUpload 的 FormData 逻辑,维护 key[]+url[],缩略图网格 + 删除 + 添加块;props 接受 uploadUrl)。

**新增 API:**
- `api/technology/bom-flow.ts` — 8 个函数(/page 类无;/products /list /flows /opers GET;/bind /unbind /update-remark JSON;/lock POST)。
- `api/technology/process-content.ts` — products/list/get/bom-items GET;save/complete/equipment*/document* JSON;upload-image/upload-document FormData。

**新增页面:**
- `pages/technology/bom-flow/BomFlowList.tsx`(主从绑定页)+ `FlowBindForm.tsx`(绑定弹窗)。
- `pages/technology/process-content/ProcessContentList.tsx`(主从编制页)+ 子表单:`EquipmentForm.tsx`(设备增改)、`ProcessDocumentUpload.tsx`(PDF 上传)。

**改动:**
- `types/technology.ts` — 追加 `SpBomFlow`、`BomFlowVO`(list 节点项)、`SpProcessContent`、`SpProcessEquipment`、`SpProcessDocument`、`ProcessContentDetailVO`(get 返回)、`ProcessContentNodeVO`(list 节点项)。
- `router.tsx` — 注册两路由。
- `layouts/routeMeta.ts` — 两标签元信息。

**复用(不改):** `MasterDetailLayout`、`TreeDataTable`、`DataTable`、`FormDialog`/`FormSection`、`FormField`、`PageContainer`、`SearchForm`、`ImageUpload`、`@workspace/ui`(Tabs/Card/Textarea/Switch/Badge/AlertDialog/Select 等)、`useQuery$`/`useMutation$`/`invalidate`、`productBom` 工具(树重建可借鉴)。

---

## 7. 错误处理

- 业务失败由拦截器 `toast.error(msg)` + 抛 `BusinessError`;mutation 的 `onSubmit` 用空 `catch` 兜底(已是范式)。
- list 扁平数组重建树:对 `flow=null`、`opers[].oper=null`、`content=null`、`equipment/documents` 缺键统一空值/空数组保护(前端不得假设键存在)。
- 上传:`http.post(url, FormData)`;失败(空文件/非 PDF/MinIO 异常)后端返回 `code=1`,前端 toast。即时预览用返回的 `url`;持久化用 `key`。
- 锁定/完成:草稿可编辑,锁定/完成后前端隐藏写操作并禁用表单;**后端同时强制**(E-1/E-3/D-3),前端只读仅为体验。

---

## 8. 测试策略

- **前端单测(vitest):** `MultiImageUpload` 的 key/url 解析与序列化(`split/join/filter(Boolean)`,空串不产生 `['']`);`inspectionRequired` boolean↔'1'/'0' 映射;list 扁平数组→树重建(借鉴 productBom 工具,若新增 util 则配测)。
- **后端:** `mvn -DskipTests compile` 必须通过;对修复的 controller 逻辑做手工/接口验证(无既有测试框架则以编译 + 运行时 curl 为准,贴输出)。
- **类型/构建:** `pnpm --filter mes-new exec tsc --noEmit` 干净;`pnpm lint`(基线 0 error / 9 warning,不得新增 error);`pnpm build` 成功。
- **运行时:** 后端 :9090 起,前端 :4100;走通 D 绑定/换绑/解绑/锁定,E 主信息保存→图片上传→设备/文档→完成编制→只读;核对 DB 与 MinIO `process/` 对象。

---

## 9. 验收标准

1. D:选产品根 → 节点绑定/换绑/解绑工艺路线、预览工序链;BOM 锁定后可锁定工艺;锁定后只读。
2. E:节点工艺文件主信息保存(创建 content)、多图上传(工序/检验)、工装设备 CRUD、PDF 文档上传/删除、物料清单只读核对、完成编制后只读。
3. 上传图片/PDF 入库存 key,读时返回可访问 url;删除文档同时清理 MinIO 对象;**重启后/超 7 天链接仍有效**(读时重签验证)。
4. 后端 12 个真实 bug 全部修复;`save` 拒改已完成、`get` 恒带空数组、绑定原子化 + 唯一约束、上传 key 化。
5. tsc/lint/build/`mvn compile` 全绿并贴输出;运行时走通主流程。
