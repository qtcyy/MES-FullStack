# 周期 2e:产品 BOM(树 + 物料行 + 锁定 + 版本)设计

> 活跃前端 = `mes/frontend/apps/mes-new`(dev :4100)。数据层为 rxjs/@ngify/http(`http.post/get` 返回 `Observable<T>`,经拦截器解包为 `Result<T>` 的 `data`),用 `useQuery$/useMutation$`(`@/http/hooks`)+ `invalidate`(`@/http/queryCache`)。UI 用 shadcn/`@workspace/ui`,**绝不照抄 mes1 的 UI 风格**(mes1 仅作功能契约参考)。

**日期:** 2026-06-16 · **分支:** `feat/frontend-rebuild` · **前序:** 周期 2c-1(Oper+Flow)、2d(订单+派工)已交付。

---

## 1. 目标

在 mes-new 落地**完整的产品 BOM 维护**:自关联树(产品→半成品→组件)的浏览与增删改、节点物料清单(物料行)CRUD、**锁定整树**(置只读)与**创建新版本**(克隆整树)。同时按"后端每周期审查修复"铁律,修复后端 `SpProductBom` 相关的 3 个已确认 DeepSeek 缺陷。

本周期对应路线图拆分的 **子周期 B + C 合并**。明确**不做**:工艺 BOM 主表(SpBom)、BOM-Flow 绑定、工艺文件编制(留作后续子周期 D/E)。

## 2. 后端契约(已逐项核验源码,`@RequestMapping("/technology/product-bom")`)

| 用途 | method + path | body 模式 | 返回 T |
|---|---|---|---|
| 根节点分页 | POST `/page` | **form**(`SpProductBomPageReq` 无 @RequestBody) | `IPage<SpProductBom>` = `{records,total,size,current,pages}` |
| 全量树 | GET `/tree` | — | `List<Map>`(节点键见下) |
| 新增/更新节点 | POST `/add-or-update` | **JSON @RequestBody** `SpProductBom` | `String`(节点 id) |
| 删除节点(级联) | POST `/delete` | **JSON** `{id}` | `null` |
| 锁定整树 | POST `/lock` | **JSON** `{id}` | `null` |
| 创建新版本 | POST `/new-version` | **JSON** `{id}` | `String`(新根 id) |
| 查节点物料行 | GET `/items/{bomId}` | pathvar | `List<SpProductBomItem>`(sortOrder 升序) |
| 新增/更新物料行 | POST `/item/add-or-update` | **JSON @RequestBody** `SpProductBomItem` | `String`(item id) |
| 删除物料行 | POST `/item/delete` | **JSON** `{id}` | `null` |
| 产品物料下拉 | GET `/products` | — | `List<SpMaterile>`(`matType='产品'` 且未删) |

**关键约束:**
- `/page` 走**默认 form 编码**(同 flowPage);其余 POST 全部 `@RequestBody`,**必须** `Content-Type: application/json`。`delete/lock/new-version/item/delete` 虽只传 `{id}`,因是 `@RequestBody Map`,**不能** form 编码(否则后端解析不到 id)。
- `/tree` 的 Map 节点键(硬编码于 `buildTreeNode`):`id,bomCode,nodeName,productCode,level,version,status,remark,sortOrder,children[],itemCount`——**无** parentId/审计字段,**多** children+itemCount。前端 `BomTreeNode` 按这 11 键定义,不照搬实体。
- 新增节点:`parentId` 空=根(校验 `productCode` 物料 `matType='产品'`,level=0,version 默认 `V1.0`,status `draft`);`parentId` 非空=子(校验 parent 存在且未 locked,level=parent+1,继承 parent 的 productCode/version)。`bomCode` 后端 `generateBomCode()` 生成。
- 物料行字段是 **material 拼写**:`materialCode/materialDesc`(与物料表 `SpMaterile.materiel` 拼写不同);填充时做 `materiel→materialCode`、`materielDesc→materialDesc`、`unit→unit` 转换。`quantity` 为 `BigDecimal(10,2)`,前端按 number 传。

## 3. 后端审查修复(本周期必做,DeepSeek 缺陷)

1. **🔴 `add-or-update` 更新分支漏 locked 校验**(`SpProductBomController.java:114-139`):更新分支(id 非空)直接 `saveOrUpdate`,可绕过锁定改已锁节点。修:更新前用 **DB 中的** `existing.status` 判 locked(不可信任入参 status,防伪造)。
2. **🟡 `createNewVersion` 版本号解析脆弱**(`SpProductBomServiceImpl.java:49-50`):`replace("V","").replace(".0","")` 对 `V1.2`/`V10.0` 会算错。修:按 `.` 拆分取 major、+1、minor 归 0,加 `NumberFormatException` 兜底。
3. **🟡 `lockBom` N+1 逐条 update**(`SpProductBomServiceImpl.java:27-40`):改 `updateBatchById`。

修复后 `cd mes && mvn -DskipTests compile` 必须 EXIT 0。

## 4. 前端架构

**路由:** `/technology/product-bom`(菜单行 #112 已存在,`permission=product-bom:list`,后端自动下发,无需改菜单)。`router.tsx` 加路由、`routeMeta.ts` 加标签(`产品BOM管理`,icon `apartment`)。urlMap 命中失败原样返回,无需新增映射。

**权限:** 页面用 `<PermissionGuard perm="product-bom:list">` 包裹。DB 仅 `product-bom:list` 一条权限串,**本周期写操作(新建/编辑/删除/锁定/新版本)不单独 gate**(共用 list 权限,不补后端按钮权限行——YAGNI)。

**类型(追加到 `@/types/technology.ts`,不覆盖现有):** `SpProductBom`、`BomTreeNode`(11 键)、`SpProductBomItem`。物料类型复用 `@/types/basedata` 的 `Materiel`。

**API(`@/api/technology/product-bom.ts`,照 `flow.ts` 范式):** 11 个函数,`/page` form、其余 JSON_HEADERS。

**页面交互(两态单页 + MasterDetailLayout 为中心):**
- **浏览态**(未选根):`PageContainer`(标题 + 「新建根 BOM」)+ 视图切换 **列表/树**。
  - 列表视图:`DataTable` 服务端分页(`/page`)+ `SearchForm`(productCodeLike/nodeNameLike);列含 nodeName、productCode、version、status 徽标、itemCount;行操作=进入编辑、删除。
  - 树视图:`TreeDataTable`(`/tree` 全量,`getSubRows=r=>r.children`,`getRowId=r=>r.id`,层级图标 + status 徽标 + itemCount);点根行进入编辑。
- **编辑态**(选中某根):`MasterDetailLayout`。
  - 左 `master`:该根**子树**(从 `/tree` 全量结果中取该根)`TreeDataTable`,点节点选中。顶部「返回列表」+ 若根 `draft` 显示「锁定整树」、若根 `locked` 显示「创建新版本」+ status/version 徽标 + lockedBy/lockedAt。
  - 右 `detail`:选中节点信息(nodeName/bomCode/level/version/status 只读 + remark 可编辑入口)+「加子节点」「编辑节点」「删除节点」(非根)按钮 + 下方**物料行** `DataTable`(本地分页)+「新增物料行」+ 行内 编辑/删除。
  - **锁定联动:** 选中节点所属树 `status==='locked'` 时,所有写操作按钮 disabled(只读)。

**对话框(`FormDialog` + react-hook-form + zod):**
- `BomNodeForm`:三模式——建根(产品物料下拉 `productBomProducts()` 选 → productCode/nodeName)、加子(parentId=当前选中)、编辑(回填 nodeName/remark/sortOrder)。根模式 productCode 必填;子/编辑模式不需 productCode(后端继承/忽略)。
- `BomItemForm`:itemType(material/bom_ref,默认 material)、materialCode(物料下拉,选中带出 materialDesc/unit)、quantity(min 0.01)、unit、sortOrder。

**防循环引用:** 加子节点/选父用 `ParentSelect` + `excludeId`(排除自身及子孙,`@/utils/tree` 的 `flattenTreeForSelect`)。本期"加子节点"父节点即当前选中节点,无需父下拉;`excludeId` 主要在未来"移动节点"时用——本期暂不做移动,故 ParentSelect 仅在确需选父时引入(实现时若无选父交互可不引入)。

**数据刷新(invalidate 前缀):** 节点写操作后 `invalidate('["productBom","tree"')` + `invalidate('["productBom","page"')`;物料行写操作后 `invalidate('["productBom","items"')`。

## 5. 复用积木

`MasterDetailLayout{master,detail}`、`TreeDataTable{columns,data,getSubRows,getRowId,loading,defaultCollapsed,showExpandAll}`、`DataTable{...,pagination:{mode:'server',...},onRowClick,getRowId}`、`FormDialog{open,onOpenChange,title,icon,onSubmit,submitting,contentClassName,children}`、`FormField{label,required,error,help,className}`、`FormSection`(`FormDialog` 命名导出)、`SearchForm{children,onSearch,onReset}`、`PageContainer{title,description,actions,children}`、`PermissionGuard`、`useQuery$/useMutation$/invalidate`、`@/utils/tree`。范式对照:`pages/technology/flow/FlowList.tsx`、`pages/order/production/OrderForm.tsx`(物料下拉)。

## 6. 错误处理 / 边界

- 删除节点(级联删子树+物料行)→ `AlertDialog` 二次确认。
- 锁定不可逆 → 「锁定整树」前 `AlertDialog` 确认。
- 新版本成功 → `toast` 提示新版本号 + 自动选中新根进入编辑。
- 写操作失败由 `useMutation$.error` + `toast.error` 呈现(后端 `Result.failure` msg 已被拦截器透出)。
- 锁定态下后端会拒绝写操作;前端先行 disabled,双重保险。

## 7. 测试策略

- 纯函数单测(vitest):物料字段转换 `materielToItem(Materiel)→Partial<SpProductBomItem>`、从 `/tree` 全量结果按 rootId 取子树的 `pickRootSubtree(tree, rootId)`(若引入)。这两个抽到 `@/utils` 并加测试。
- 组件/页面不做单测(项目无组件测试基线);靠 tsc + lint + build + 人工浏览器验证。
- 质量门槛:`tsc --noEmit` 干净、`vitest` 全绿(含新增)、`lint` 0 error 且**不新增 warning**(基线 9)、`pnpm build` 成功、后端 `mvn -DskipTests compile` EXIT 0。

## 8. YAGNI 明确排除

工艺 BOM 主表(SpBom)、BOM-Flow 绑定、工艺文件编制/上传、BOM 导入导出、模板/复制节点、节点拖拽移动、工艺变更历史、两套 BOM 同步、按钮级细粒度权限。

## 9. 待实现时二次确认的契约点

- `/tree` 节点键以 `buildTreeNode` 为准(11 键,无 parentId/审计)。
- 物料行 material 拼写字段转换不可漏。
- 4 个 `{id}` 端点必须 JSON_HEADERS。
- `Materiel` 类型来自 `@/types/basedata`;产品下拉用 `/products` 专用端点(已后端过滤 matType/删除)。
