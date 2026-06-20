# 子周期 1c-2:产品 BOM(树 / 物料行 / 锁定 / 版本派生)— 设计文档

- 日期:2026-06-20
- 分支:`feature/product-bom`(从 `develop` 切,完成后 `--no-ff` 合回)
- 对标:mes-new 周期 2e「产品 BOM 树/版本/锁定」(仅参考功能/接口契约,**全新 UI,不抄样式**)
- 前序:1a 系统管理 ✅ / 1b 物料 ✅ / 1c-1 工艺路线 ✅
- 后续:1c-3 BOM↔工艺路线绑定(本周期**不做**)

---

## 1. 目标与范围

用 Vue3 重建**产品 BOM** 模块,适配后端**已存在**的 `/technology/product-bom/*` 一套端点(`SpProductBomController` + `SpProductBomServiceImpl`,表 `sp_product_bom` / `sp_product_bom_item`,见 `scripts/sql/product-bom.sql`)。

### 做
- 产品 BOM **树**:根节点(对应"产品"物料)→ 半成品 → 组件,多级父子结构的增删改查。
- 节点**物料行**(`sp_product_bom_item`)CRUD。
- **锁定整树**:`lock` 把根及全部子孙节点 `status` draft→locked,写审计 `locked_at`/`locked_by`。
- **版本派生**:仅锁定的 BOM 可 `new-version`,版本号自增(V1.0→V2.0)+ 深拷贝整棵树(节点+行项目,新 UUID),回到新草稿。

### 不做(明确边界)
- BOM↔工艺路线绑定 `/technology/bom-flow/*` → 留 **1c-3**。
- 旧扁平 `sp_bom` / `/technology/bom/*`(菜单 152「工艺BOM管理」)→ vue3 不实现,保持遗留死链,超出本周期。

---

## 2. 后端接口契约(已存在,本周期审查 + 最小修正)

基路径 `/technology/product-bom`。

| 端点 | 方法 | 编码 | 入参 | 出参 |
|---|---|---|---|---|
| `/page` | POST | form | `SpProductBomPageReq`(BasePageReq + productCodeLike + nodeNameLike) | `IPage<SpProductBom>`(根节点,parent_id 为空) |
| `/tree` | GET | — | 无 | `List<Map>`(全量森林,含 children + itemCount) |
| `/tree/{id}` | GET | — | id | `List<SpProductBom>`(指定根的平铺列表) |
| `/add-or-update` | POST | **JSON** | `SpProductBom` | `String`(节点 id) |
| `/delete` | POST | **JSON** | `{ id }` | `null`(级联删子节点+行项目) |
| `/lock` | POST | **JSON** | `{ id }` | `null`(递归锁全树) |
| `/new-version` | POST | **JSON** | `{ id }` | `String`(新根 id) |
| `/items/{bomId}` | GET | — | bomId | `List<SpProductBomItem>` |
| `/item/add-or-update` | POST | **JSON** | `SpProductBomItem` | `String`(item id) |
| `/item/delete` | POST | **JSON** | `{ id }` | `null` |
| `/products` | GET | — | 无 | `List<SpMaterile>`(产品类型物料,根节点下拉) |

### 实体字段

**SpProductBom**(`sp_product_bom`):`id` / `bomCode`(PBOM-%03d) / `productCode` / `nodeName` / `parentId`(空=根) / `level`(0 产品 /1 半成品 /2 组件) / `version`(默认 V1.0) / `status`(draft|locked) / `remark` / `sortOrder` / `lockedAt` / `lockedBy` + 审计四列。

**SpProductBomItem**(`sp_product_bom_item`):`id` / `bomId` / `itemType`(material|bom_ref) / `materialCode` / `materialDesc` / `quantity`(decimal,默认 1.00) / `unit`(默认 个) / `sortOrder` + 审计四列。

---

## 3. 前端文件清单

| 类型 | 文件 | 说明 |
|---|---|---|
| 类型 | `src/types/technology.ts`(追加) | `SpProductBom` / `BomTreeNode`(树形,带 children + itemCount,无审计) / `SpProductBomItem` / `ProductBomPageReq` |
| API | `src/api/technology/productBom.ts`(新建) | 11 端点封装,编码见 §5 |
| 纯函数 | `src/utils/productBom.ts`(新建) | 见 §6 |
| 视图 | `src/views/technology/product-bom/ProductBomList.vue`(新建) | 编排:浏览态(列表/树切换)↔ 编辑态(主从布局) |
| 视图 | `src/views/technology/product-bom/BomNodeDetail.vue`(新建) | 编辑态右栏:节点信息卡 + 物料行表(拆出,避免主文件过大) |
| 视图 | `src/views/technology/product-bom/BomNodeForm.vue`(新建) | 节点弹窗:create-root / add-child / edit |
| 视图 | `src/views/technology/product-bom/BomItemForm.vue`(新建) | 物料行弹窗(物料下拉自动回填描述/单位) |
| 路由 | `src/router/index.ts`(追加) | `technology/product-bom`,`meta.perm='product-bom:add'` |
| 映射 | `src/utils/urlMap.ts`(追加) | `/technology/product-bom/list-ui` → `/technology/product-bom` |
| 菜单 | `scripts/sql/product-bom-menu-seed.sql`(新建) | 菜单 **154「产品BOM管理」**,父 15,grade '3',sort 4,url `/technology/product-bom/list-ui`,perm `product-bom:add`,**需手动跑** |
| 测试 | `tests/productBom.spec.ts`(新建) | 纯函数 TDD |

> 复用原语:`PageContainer` / `SearchForm` / `DataTable` / `TreeTable` / `MasterDetailLayout` / `FormDialog` + `useRequest` / `usePagination`。物料下拉用既有 `materilePage`/字典(1b)。

---

## 4. 交互结构(单页双态,镜像 2e,UI 全新)

```
/technology/product-bom
├─ 浏览态(selectedRootId === null)
│   ├─ 列表/树视图切换
│   ├─ 列表视图:SearchForm(产品编码/节点名) + DataTable(根节点分页) — 行操作:进入编辑 / 删除(级联,locked 禁用)
│   ├─ 树视图:TreeTable(全量森林,显示版本/状态/物料数)
│   └─ [+ 新建根 BOM] → BomNodeForm(create-root)
└─ 编辑态(selectedRootId !== null)
    ├─ 顶部:状态徽章(草稿/已锁定) + 版本号 + [锁定整树](draft 时) / [创建新版本](locked 时)
    └─ MasterDetailLayout
        ├─ 左:结构树(ProductBomList 内直接用 TreeTable,数据=pickBomSubtree 提取的子树),选中节点
        └─ 右:BomNodeDetail
            ├─ 节点信息卡:[加子节点] / [编辑] / [删除](仅非根 + locked 禁用)
            └─ 物料行表(productBomItems):[+ 新增物料] / 编辑 / 删除(locked 禁用)
```

**写权限闸**:`canWriteBom(subtreeRoot.status)` = `status !== 'locked'`。locked → 加子/编辑/删除节点、物料行全部写操作禁用;仅「创建新版本」可用。根节点不可在编辑态删除(级联删根从浏览列表入口)。

---

## 5. 编码约定(沿用 1c-1)

- **form 编码**:`/page`。
- **GET**:`/tree`、`/tree/{id}`、`/items/{bomId}`、`/products`。
- **JSON**(`http.post(url, data, true)`):`add-or-update`、`delete`、`lock`、`new-version`、`item/add-or-update`、`item/delete`。
- Vue `el-form` + reactive 对象:**不存在 React RHF 的 DOM clobbering 坑**,字段名直接用 `nodeName` / `unit`,无需别名。

---

## 6. 纯函数(TDD,`src/utils/productBom.ts`)

| 函数 | 签名 | 职责 |
|---|---|---|
| `pickBomSubtree` | `(forest: BomTreeNode[], rootId: string) => BomTreeNode \| undefined` | 从全量森林按 id 深搜出某根子树 |
| `buildBomNodePayload` | `(form, ctx:{mode,parentId?}) => Partial<SpProductBom>` | 剥空串、sortOrder 数值化;add-child 带 parentId;edit 带 id |
| `validateBomNode` | `(form, mode) => string \| null` | nodeName 必填;create-root 额外要求 productCode |
| `buildBomItemPayload` | `(form) => Partial<SpProductBomItem>` | materialCode 必填、quantity 数值化、unit 兜底 '个'、itemType 兜底 'material' |
| `validateBomItem` | `(form) => string \| null` | materialCode 必填、quantity ≥ 0.01 |
| `materielToItem` | `(m: SpMaterile) => Pick<...>` | 物料 → 行项目映射(materiel→materialCode、materielDesc→materialDesc、unit 兜底) |
| `canWriteBom` | `(status?: string) => boolean` | `status !== 'locked'` |

---

## 7. 后端审查重点(DeepSeek 生成,bug 高发,逐条核 — 见 backend-deepseek-review-each-cycle)

1. **产品类型校验 ⚠️**:`/products` 与根节点创建校验若硬编码中文 `"产品"`,与 1b 字典 `material_type`(value `FG`=成品/`PG`=半成品)**不匹配** → 拉不到产品下拉 / 根节点被拒。**重点对齐**(改为按字典 value 或放宽校验)。
2. **lock 递归**:覆盖全部子孙节点 + 正确写 `locked_at`/`locked_by`(取当前 Shiro 用户)。
3. **new-version**:版本号解析 V1.0→V2.0、深拷贝节点 + 行项目、生成新 UUID、`parentId` 正确重映射到新节点、新树 status=draft、新 bomCode。
4. **级联删除**:`@Transactional` + 先删行项目再递归删子节点再删自身。
5. **子节点继承**:productCode/version 复制、level=parent.level+1、parent locked 守卫。
6. **BOM 编码生成**:`PBOM-%03d` 格式 + 取最大序号 +1(并发为已知 backlog,非本周期阻塞)。

> 仅修**实测确认的真 bug**,改动处补 Mockito 守卫单测(JUnit4 `@RunWith(MockitoJUnitRunner)`,`Result extends HashMap` 取 `get("code")`,MyBatis-Plus 3.1.2 `count()` 返回 `int` — 见 1c-1 后端坑)。

---

## 8. 验收门禁

- 前端:`pnpm typecheck && test && lint:check && build` 全绿。
- 后端:`mvn compile`(JDK11 系统 mvn,`./mvnw` 已坏 — 见 backend-build-mvnw-broken)+ 守卫单测(若改后端)。
- subagent 驱动逐任务两阶段审查 + opus 终审 Ready to merge。
- `feature/product-bom` `--no-ff` 合回 `develop`。

---

## 9. 已知项 / backlog

- 菜单 154 需**手动跑** `product-bom-menu-seed.sql` 才在侧栏出现(沿用 1c-1 工序菜单约定)。
- 旧扁平 BOM(菜单 152)vue3 不实现,保持死链。
- BOM 编码并发竞态、版本号解析极端格式 → 非本周期阻塞,记 backlog。
- 物料下拉数据源:复用 1b 物料列表;`/products` 后端过滤逻辑以审查结论为准(若中文校验有 bug 一并修)。
- 后端 `/tree` 返回 `List<Map>`,前端需定义 `BomTreeNode` 结构化映射(children + itemCount)。
