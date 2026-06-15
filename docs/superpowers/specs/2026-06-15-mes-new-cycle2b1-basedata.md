# MES-New 周期2b-1 设计文档:基础数据(物料 / 元器件)

- 日期:2026-06-15
- 目标目录:`mes/frontend/apps/mes-new`
- 状态:已通过 brainstorming 评审,待进入实现计划
- 上游设计:`docs/superpowers/specs/2026-06-15-mes-new-frontend-design.md`(总体设计)
- 同级前序:`docs/superpowers/specs/2026-06-15-mes-new-cycle2a-system.md`(系统管理,已交付)

## 1. 背景与范围裁剪

总体设计将"周期 2"定义为 系统管理其余 + 基础数据 + 工艺。系统管理已在周期 2a 交付。本文档处理**基础数据(basedata)**。

经对 mes1 `apps/mes1` 的 basedata 模块逐一核对(含后端 Controller 签名),basedata 经侧栏菜单(`utils/urlMap.ts`)可达的页面为:物料(materile)、元器件(component)、动态表配置(manager)、动态表数据(manager-item)、设备组(device-group)、工艺单元(process-unit)、仓库(warehouse)。其中:

- **设备(Device)不是独立页**:mes1 将其放入"设备组页"的 Tabs(设备 Tab + 设备组 Tab),且设备组 Tab 含穿梭框,二者耦合于同一页。
- **工序(Oper)无 basedata 菜单入口**:属工艺域,不在基础数据周期。

basedata 约 7 页,过半为特殊交互(Tabs + 穿梭框、主从面板、动态字段、动态列)。一个实现计划无法可靠覆盖,故拆分交付:

| 批次 | 页面 | 沉淀的新可复用积木 |
|---|---|---|
| **2b-1(本批次)** | 物料 Materile(含图片上传)、元器件 Component | 图片上传组件 + basedata form/JSON 混合 API 模板 |
| 2b-2 | 设备组(Tabs:设备+设备组+穿梭框)、工艺单元(主从+团队分配)、仓库(主从+库位预览) | 穿梭框 Transfer、主从面板 |
| 2b-3 | 动态表配置 Manager(动态字段)、动态表数据 ManagerItem(动态列) | 动态字段编辑、动态列表格 |

**决策(已与用户确认):本批次(2b-1)只做 物料 + 元器件两页。** 选其先行的理由:确立后续多页都要复用的"图片上传"积木,并锁定 basedata 端点 form/JSON 编码差异的处理范式;且这两页是 basedata 中仅有的纯标准 CRUD 页,直接套用周期 1/2a 标杆,投入产出高、易验收。

## 2. 后端契约(以 mes1 源码 + 后端 Controller 为准)

沿用总体设计约定:`Result{code,data,msg}`(`code===0` 取 data);分页 `current`+`size` → `{records,total,size,current,pages}`;401 跳登录;开发期 Vite 代理 `/api → :9090`。

**编码差异是本批次头号风险**:mes-new 的 `formEncodingInterceptor` 默认把 POST 普通对象体表单化,除非显式设 `Content-Type: application/json`(`shouldFormEncode` 见到 json 头即跳过)。basedata 端点 form/JSON 不一,**每个 API 函数必须按 Controller 签名显式声明**。

本批次端点(已交叉验证 Controller 签名,字段名等细节写计划时再逐字核对):

| 模块 | 端点 | 方法/编码 | Controller 佐证 | 说明 |
|---|---|---|---|---|
| 物料 | `/basedata/materile/page` | POST form | — | 分页,`{current,size,materiel?,materielDesc?}` |
| 物料 | `/basedata/materile/add-or-update` | POST **form** | `addOrUpdate(SpMaterile record)` 无 `@RequestBody` | 含 `imageUrl` 字段(图片先单独上传得 url) |
| 物料 | `/basedata/materile/upload-image` | POST **multipart/form-data** | — | 单图上传,响应含 `url` |
| 物料 | 删除 | 待核对(疑似软删 `deleted:'1'` 经 add-or-update) | — | mes1 "删除即更新标记",写计划核对是否有独立 delete 端点 |
| 元器件 | `/basedata/component/page` | POST form | — | 分页,`{current,size,name?,code?}` |
| 元器件 | `/basedata/component/add-or-update` | POST **form** | `addOrUpdate(SpComponent record)` 无 `@RequestBody` | code 自动生成(COMP-001 格式)归属待核对(前端 or 后端) |
| 元器件 | `/basedata/component/delete` | POST **JSON** | `delete(@RequestBody Map params)` | `{id}`,与 add-or-update 编码不同 |

> **核对纪律**:上表每行的方法/编码/字段在对应 API 函数实现前必须回 mes1 `apps/mes1/src/api/` + 后端 Controller 双向确认;`add-or-update`/`delete` 的 form/JSON 归属是关键分叉。物料删除机制、元器件 code 生成归属须查清。

## 3. 新可复用积木:`ImageUpload`

**位置**:mes-new `src/components/ImageUpload.tsx`(消费 `@workspace/utils` 的 `createHttpUpload`,且上传端点为 MES 业务专属 → 不进 ui 包,与周期 2a 的 TreeView 决策同理)。

**职责与接口(草案,具体以 `createHttpUpload` 实际签名为准,写计划时核对)**:
- props:`value?: string`(当前图片 url)、`onChange: (url: string) => void`、`uploadUrl?`(默认 `/basedata/materile/upload-image`)。
- 行为:选择文件 → `multipart/form-data` 上传 → 从响应取 `url` → `onChange(url)` → 预览缩略图;支持清除(置空 url)。
- 上传中显示进度/禁用;失败 toast(复用拦截器或本地处理)。
- 表单(react-hook-form)用 `Controller` 接管 `imageUrl` 字段,值即图片 url。

**核对项**:`createHttpUpload` 的入参与返回(是否返回 Observable/Promise、进度回调形态)、上传响应包是否经 `Result` 包装(若是,url 在 `data` 内)。写计划前确认。

## 4. 逐页设计

### 4.1 物料 Materile —— 标准 CRUD + 图片上传

- List:`SearchForm`(materiel / materielDesc)+ `PageTable`(服务端分页)+ 新建/编辑/删除;表格含图片缩略图列(无图占位)。
- Form(`ModalForm` + react-hook-form + zod):`materiel`(编码,必填)、`materielDesc`(描述,必填)、`unit`(单位)、`matType`(类型)、`model`、`size`、`source`、`leadTime`(数字)、`safetyStock`(数字)、`imageUrl`(经 `ImageUpload`)。字段集以 mes1 `MaterileForm` 为准,写计划时对齐。
- `add-or-update` 为 **form** 编码(走默认表单拦截器即可,不设 json 头)。
- 删除:按 mes1 行为(疑似软删 `deleted:'1'`),写计划核对后定。

### 4.2 元器件 Component —— 标准 CRUD

- List:`SearchForm`(name / code)+ `PageTable` + 增删改。
- Form:`code`(自动生成则只读/由后端给)、`name`(必填)、`descr`。code 生成归属写计划核对。
- `add-or-update` **form**;`delete` **JSON**(该 API 函数显式设 `Content-Type: application/json`)。

## 5. 路由与导航

- `utils/urlMap.ts` 已含 `/basedata/materile/list-ui → /basedata/materile`、`/basedata/component/list-ui → /basedata/component`,侧栏导航无需改 urlMap。
- 在 `router.tsx` 注册:`basedata/materile`、`basedata/component`(置于 system 路由之后,统一在集成阶段注册)。

## 6. 权限门禁

- 种子 SQL 中 basedata 菜单 `permission` 串多为占位/粗粒度(如 `materile:add`、`component:add`,无 update/delete 粒度)——**写计划时 grep 确认实际串**。
- 策略沿用 2a:"新建"按钮用确实存在的 `<模块>:add` 门禁;编辑/删除按钮不门禁;若某模块无任何串则该页不门禁。

## 7. 测试策略

- 纯函数较少。如出现可抽取的小工具(如从上传响应中提取 url、图片 url 拼接/兜底),抽到 `utils/` 并 TDD 单测。
- `ImageUpload`、页面属集成件:靠 `tsc --noEmit` / `lint` / `build` 静态门禁 + 运行时验收(admin/123:物料增改删、图片上传/预览/清除、元器件增删改查、D/B 主题)。
- 复用周期 1/2a 已验证的数据层(`useQuery$`/`useMutation$`/`invalidate`)、标杆范式(PageContainer/SearchForm/DataTable/ModalForm/AlertDialog)。

## 8. 风险与对策

- **form/JSON 编码混用**(头号):逐 API 函数按 Controller 签名定;JSON 端点显式设 json 头。已在 §2 标注核对项。
- **图片上传与 `@ngify/http`/`createHttpUpload` 适配**:上传是 multipart,不能走默认表单拦截器逻辑;须确认 `createHttpUpload` 用法与响应解包路径。写计划前核对其签名,必要时在 ImageUpload 内绕过 `Result` 解包直接取 url。
- **物料删除语义 / 元器件 code 生成**:以 mes1 源码为准,核对后定,不臆断。

## 9. 不在本批次范围(YAGNI)

- 设备组 / 工艺单元 / 仓库(归 2b-2);动态表配置 / 动态表数据(归 2b-3)。
- 多图/拖拽上传、图片裁剪(本批次单图 + 预览 + 清除即可)。
- 不改后端;不改 mes1。
