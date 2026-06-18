# 周期 2k · 联调验证(让栈可被验证 + 逐周期修 bug)+ 工艺查询只读页 — 设计文档

- 日期：2026-06-18
- 方向（2026-06-18 用户决策 = B）：**联调验证(优先 / crux / 最高价值)** + **工艺查询只读页 `/technology/process-query`(轻量)**
- 前置：系统管理 / 基础数据 / 工艺技术线 / 生产订单+甘特 / 库存 / 数字化(KPI 大屏 + 3D 仿真)/ 动态表 Manager Layer 1(2j)均已"代码完成"
- 核心痛点：后端登录需**图形验证码**,无法脚本化鉴权 → **周期 2g3 / 2h / 2i2 / 2j 从未端到端联调验证**(只过了 check-types/lint/test/build + 代码评审,真实运行栈上一次没跑过)

---

## 1. 目标与范围

让"代码完成但从未真实联调"的 4 个周期能在**真实运行栈**(后端 :9090 + MySQL `mes_data` + 前端 :4100)上被验证,逐项联调并修复**暴露出来的正确性/契约 bug**;并补齐工艺技术线遗留的独立只读查询入口 `process-query`。

本周期 = 单周期全包,按序三块:**① 验证基建 → ② 4 周期逐项联调修 bug(2j → 2h → 2g3 → 2i2) → ③ process-query 收尾**。

### 1.1 明确不做(YAGNI / 记 backlog)

- **规模/并发隐患**:单用户 dev 验证不会触发的隐患——台账 upsert 无行锁(并发丢更新)、`size=100000` 拉全量(OOM/超时)、动态表无乐观锁、5 表 JOIN 无索引性能——**记 backlog,不在本周期修**(顺手能修则修)。详见 §5 分流表。
- **2j-2 Layer 2 动态数据维护**(`/basedata/common/*` 裸 SQL):本就独立后续周期,2k 不碰。动态表的"字段白名单/注入加固"属 Layer 2 范畴,不在本周期。
- **自动化前端 E2E(Playwright)**:本周期不搭浏览器测试基建(与"轻量收官"冲突);前端用人工抽查。
- **后端大规模加固**:不把勘察列出的全部 12 个风险点主动加固;只修真实暴露的正确性问题。

### 1.2 验证方式(用户决策)

**脚本化后端契约验证 + 人工浏览器抽查**:
- **我(后端契约层)**:起栈 → 脚本登录拿 session → `curl` 逐端点验证 `Result{code,data,msg}` 形态 / 状态机 / 数据一致性 → MySQL 直查佐证 → 暴出正确性 bug 则修 → 复验 → 证据贴文档。
- **用户(UI 层)**:每周期我列 2-3 个关键页面/交互点,你在 :4100 人工确认。

### 1.3 修复深度(用户决策)

**只修真实暴露的正确性/契约 bug**(契约不一致、状态机错、数据错位、缺事务、硬编码与真实数据对不上等);latent 规模/并发隐患记 backlog。符合"业务收官·轻量·最小必要改后端"+「每周期审查涉及后端」约定。

---

## 2. 验证基建(地基)

### 2.1 dev 验证码开关(后端,方案 A —— 配置开关跳过验证码校验)

**勘察实证的登录链路:**
- 验证码图片:`GET /verification/code`(anon)→ `SysLoginController.getVerify()`(`system/controller/client/SysLoginController.java:44`);值存 `HttpSession`,key=`RandomVerificationCodeUtil.RANDOM_CODE_KEY`(常量值 `RANDOMVALIDATECODEKEY`,生成于 `RandomVerificationCodeUtil.java:110`)。
- 登录:`POST /login`(`SysLoginController.login()` 起于 `:72`),先在 controller 里取 session 验证码与入参 `equals()` 比对(`:76-82`),**过了才触发 Shiro 认证**(`SpUsernamePasswordToken`)。
- Shiro 过滤链(`ShiroConfig.java:80-109`):`/login`、`/verification/code` 为 `anon`,`/**` 为 `authc`(自定义 `SpLoginFormFilter`)。retry-limit:`RetryLimitCredentialsMatcher` 5 次失败锁 60s(ehcache `loginRetryCache`),**正确凭据一次成功即清**,不影响脚本。

**改法(最小、默认安全):**

1. `application.yml`:加基线 `mes.captcha.enabled: true`(生产默认开;`application-pro.yml` 不覆盖即继承 true)。
2. `application-dev.yml`:覆盖 `mes.captcha.enabled: false`。
3. `SysLoginController`:注入 `@Value("${mes.captcha.enabled:true}") private boolean captchaEnabled;`,把现有验证码 `equals()` 比对(`:76-82`)包进 `if (captchaEnabled) { ... }`。`/verification/code` **不动**(继续生成,前端图照显,人工登录随便输任意值即可)。

**为何不选 B/C:**
- B(dev 读验证码值端点):+1 新端点 + 改 Shiro anon + 两步请求 + 暴露验证码值,比 A 复杂且无收益(A 已默认安全)。
- C(Shiro 层登录旁路 / 放行 `/api/**`):动 Shiro 核心、有绕过真实鉴权的风险(反而验不了权限行为)、最重。**否决**。
- A 保留真实 Shiro 认证链(只去掉验证码摩擦),既能脚本化,又能验证鉴权/权限行为。

**后端审查(约定):** 改 `SysLoginController` 时顺带通读 `login()` / `getVerify()` 有无其它 DeepSeek 遗留 bug,记录。

### 2.2 凭据(已验证,零 DB 改动)

`admin / 123`(用户提供并已复算确认)。实时库 `sp_sys_user` 中 `admin`(超级管理员)password hash = `9d7281eeaebded0b091340cfa658a7e8`,等于 `MD5(username_bytes + password_bytes)` 迭代 3 次(salt=用户名,即 `MD5("admin"+"123")` 再 MD5 两次)的结果,**与该 hash 完全一致**。superuser 全权限,无需新建账号/改密码。

> 注:`MySQL-init-all.sql` 里 admin/admin 的 seed hash(`038bdaf9...`)与实时库不一致 —— 实时库非用该 seed 初始化,**该 seed hash 无关紧要,以实时库为准**。

### 2.3 运行栈启动(沿用已知可用路径,见 [[backend-build-mvnw-broken]])

```bash
# 后端(:9090, dev profile, ehcache, localhost:3306/mes_data root/12345678)
export JAVA_HOME=/Library/Java/JavaVirtualMachines/amazon-corretto-11.jdk/Contents/Home
cd mes && mvn -q spring-boot:run
# 前端(:4100, /api → :9090),供人工抽查
cd mes/frontend && pnpm dev
# MinIO(:9000, minio-mes 容器):4 个联调周期不依赖;process-query 复用 process-content.get 会重签图片 URL,人工看图需其起着(已容错,挂了不阻断后端启动)
```

### 2.4 脚本化登录 + 验证 harness

- 登录:`curl -c cookies.txt -H 'X-Requested-With: XMLHttpRequest' -X POST http://localhost:9090/login -d 'username=admin&password=123&captcha=x'`,拿 `JSESSIONID` 进 cookie jar。
- 验证:`curl -b cookies.txt ...` 逐端点打。写端点(JSON)带 `Content-Type: application/json`;page 端点 form 编码。断言响应 `code===0` + data 形态/状态机;写操作后 `mysql` 直查表确认落库。
- 沉淀:一个可复用登录助手(脚本)+ 各周期验证命令清单;**实际 curl 输出 + SQL 结果作为证据**贴进实现计划文档(满足"声称通过必贴输出")。

---

## 3. 逐周期联调流程(顺序 2j → 2h → 2g3 → 2i2)

统一节奏:**脚本验证 → 暴出正确性/契约 bug 则改后端(并审查该文件)→ 复验 → 证据归档**。

### 3.1 周期 2j 动态表配置(4 端点)

- 端点:`/basedata/manager/page`(form)、`/manager/item/by/tableNameId`(form)、`/manager/add-or-update`(JSON)、`/manager/delete/by/tableNameId`(form)。
- **必验/必修(正确性):**
  - 完整 CRUD 往返落库(新建表头+明细 → 查 → 编辑 → 删),`sp_table_manager` / `sp_table_manager_item` 直查确认。
  - **`deleteByTableNameId` 无 `@Transactional`**(2j 已知遗留):删头成功、删明细失败 → 孤儿明细。属正确性,**顺手修**(下沉/加事务)。
  - 明细 id 强制重置(`saveOrUpdateWithItems` setId(null))往返不丢数据 —— 验证编辑后明细正确持久化。
  - 搜索特殊字符(tableName/tableDesc LIKE)form 编码正确。
- backlog:乐观锁;字段白名单(Layer 2)。

### 3.2 周期 2h 库存(8 端点,主体)

- 端点:`/inventory/receipt/page`、`/receipt/{id}/items`、`/receipt/item/post`(JSON)、`/outbound/page`、`/outbound/{id}/items`、`/outbound/item/post`(JSON)、`/inventory/page`、`/manual-inbound`(JSON)。
- **必验/必修(正确性):**
  - **库房类型 `'零件库'`(契约抽取确认 by-design,非 bug)**:`postItem`/`manualInbound` 要求 `wh.getType().equals('零件库')`,前端亦同;MySQL 直查真实库房 type **验证确有 `'零件库'`**(否则入库无法登账);抽常量记 backlog。
  - **出库 FIFO(契约抽取实证已正确实现,验证非修复)**:`SpOutboundOrderServiceImpl.postOutboundItem:51-122` 按 `last_inbound_time asc, create_time asc`(`:65-70`)排序逐行扣减 —— 跑一单确认 `allocation_detail` 体现最早批次先扣。
  - 入库登账 → `sp_inventory` 落库(数量累加正确)。
  - 库位混放校验脏数据边界(库位曾存 A(qty=0)删后再入 B)。
  - item 生命周期重试去重(inventory insert 失败但 item 已 posted 再重试不产生重复)。
- backlog:台账 upsert 无行锁(并发);`size=100000` 全量。

### 3.3 周期 2g3 生产订单甘特(tasks + 5 写端点)

- 端点:`/order/gantt/tasks`(form,空参返回全部)、`/reschedule`/`/start`/`/finish`/`/progress`/`/actual`(JSON)。
- **必验/必修(正确性):**
  - `tasks` 空参返回种子派工数据(`GanttQueryReq` form 绑定正确,不静默空)。
  - **状态机守卫**:`start` 仅 status=1→2;`finish` 仅 2→3;`reschedule`/`progress` 禁 status=3。**逐个发非法转移,期望被拒**(而非静默改坏)。
  - 改期保留时分秒(`shiftPlanByDays` 后端对应逻辑;时间字符串比较格式 `yyyy-MM-dd HH:mm:ss`)。
  - `actual` 空值处理(undefined/空串 → 统一 null/isBlank 约定)。
- backlog:5 表 JOIN 无索引性能。

### 3.4 周期 2i2 3D 仿真(3 只读端点)

- 端点:`/basedata/warehouse/list`(GET)、`/basedata/warehouse/locations/{warehouseId}`(GET)、`/inventory/page`(form size=100000)。后端纯读,主要风险在数据完整性 → 决定 3D 是否空白/错位。
- **必验(数据完整性 SQL 直查):**
  - 所有 `sp_warehouse_location.warehouseId` 是否都指向有效仓库(null/悬空 → `buildSceneModel` warehouse=null → zone 空白)。
  - 所有 `sp_inventory.locationId` 是否都指向有效库位;`sp_inventory` 是否真 `UNIQUE(location_id)`(一库位一行,匹配键假设)。
  - 脏数据则按"修数据 / 前端容错"二选一(优先前端容错跳过悬空项,不静默错位)。
- backlog:warehouse 无分页;热力聚合重复计数(前端,如真重复再修)。

### 3.5 人工抽查清单(示例,实施时细化)

- 2j:新建/编辑动态表大弹窗(字段增删/排序)、删除。
- 2h:计划入库登账弹窗(选库房→库位)、出库 FIFO 确认、手工入库、库存查询。
- 2g3:甘特拖拽改期(平移/缩放)、悬停快捷开工/完工、可编辑详情 Sheet。
- 2i2:3D 热力着色、hover 高亮、点库位详情 Sheet、一键全屏。

---

## 4. 工艺查询只读页 `/technology/process-query`

### 4.1 零后端/SQL 改动(菜单 116 已存在)

实时 `sp_sys_menu` 已有:`id=116, code=processQuery, name='产品工艺查询', url=/technology/process-query, permission=process-query:list, parent_id=15, sort_num=7`。**侧边栏可达,无需改菜单/seed**(印证 [[menu-driven-sidebar-route-mapping]];勘察 agent 误以为"SQL 脚本里没有"是只看了 `MySQL-20210225.sql` 文件,实时库有)。

前端三处对齐:`router.tsx` path `technology/process-query` + `routeMeta.ts` key + 菜单 url(经 `urlMap.toReactRoute`),权限串 `process-query:list`。

### 4.2 复用现有只读端点(零新增)

- `GET /technology/process-content/products`
- `GET /technology/process-content/list/{rootId}`(BOM 树)
- `GET /technology/process-content/get/{bomId}`(`ProcessContentDetailVO`,含图片 URL 重签)
- `GET /technology/process-content/bom-items/{bomId}`(物料行)

`ProcessContentDetailVO{ content: SpProcessContent|null, equipment[], documents[], contentImageUrls[], inspectionImageUrls[] }`。

### 4.3 形态(新建 `ProcessQueryPage.tsx`,纯只读)

- 产品下拉 → BOM 树浏览(`TreeDataTable`)→ 选节点 → 右侧只读详情(Tabs:主信息 / 要求 / 检验 / 工装设备 / 文档 / 物料清单 + 图片)。
- **纯只读**:无编辑/上传/状态变更入口(与 `process-content` 编制页的唯一区别)。
- **UI 全新设计**:`@workspace/ui`(shadcn/Radix)按 mes-new 设计系统画;**mes1 `ProcessQueryPage` 仅作"查什么字段/调什么接口"功能参考,绝不照抄 UI**(见 [[mes1-ui-not-a-reference]])。
- 复用:`types/technology.ts`、`api/technology/process-content.ts`、`MasterDetailLayout`/`TreeDataTable`/`PageContainer`/`DataTable`。
- 受控状态一律普通 `useState`(规避 [[rhf-field-name-dom-clobbering]])。

### 4.4 与 `ProcessContentList` 的关系(取舍)

**独立新建,复用同一套 api/types/布局组件;不重构 `ProcessContentList`**(它是编制页,2f 把查询合进了它的浏览态)。若发现其已有可干净抽取的"只读详情子组件"则复用,否则 process-query 自带精简只读渲染 —— 保持轻量、低风险。

### 4.5 后端审查

读这 4 个 GET 端点(`SpProcessContentController`)时顺带按约定扫一眼有无 bug(只读、已被 process-content 使用,风险低)。

---

## 5. 风险点分流表(勘察 12 项 → 必修 vs backlog)

| 周期 | 风险点 | 处置 |
|---|---|---|
| 2j | deleteByTableNameId 无 @Transactional(删头/删明细原子性) | **修**(正确性) |
| 2j | 明细 id 强制重置往返丢数据 | **验**(确认不丢) |
| 2j | 字段白名单/注入(Layer 2 范畴) | backlog(2j-2) |
| 2j | 无乐观锁 | backlog(并发) |
| 2h | 库房类型 '零件库'(by-design)vs 真实数据 | **验**(确有该值)+ 抽常量 backlog |
| 2h | 出库 FIFO(契约抽取实证已正确实现) | **验**(非修复) |
| 2h | 库位混放脏数据边界 | **验/修** |
| 2h | item 生命周期重试重复 | **验/修** |
| 2h | 台账 upsert 无行锁 | backlog(并发) |
| 2h | size=100000 全量 | backlog(规模) |
| 2g3 | 状态机守卫(1→2→3 非法转移) | **验/修**(正确性) |
| 2g3 | 改期时间格式/时分秒 + actual 空值 | **验/修** |
| 2g3 | GanttQueryReq form 绑定静默空 | **验** |
| 2g3 | 5 表 JOIN 无索引 | backlog(性能) |
| 2i2 | warehouseId/locationId 悬空致空白/错位 | **验/修**(数据完整性) |
| 2i2 | location_id 唯一性假设 | **验** |
| 2i2 | warehouse 无分页 / 热力重复计数 | backlog(规模) |

---

## 6. 完成定义(DoD)

1. dev 验证码开关合入,后端可脚本化登录(贴出 `curl` 登录拿到 `code===0` + 后续受保护端点 `code===0` 的实际输出)。
2. 4 个周期逐项脚本验证完成,每个周期在实现计划文档有证据小节(curl 输出 + SQL 佐证 + pass/fail);**暴露的正确性/契约 bug 已修并复验通过**,latent 隐患记 backlog。
3. 人工抽查清单由用户在 :4100 逐周期确认。
4. `process-query` 页可经侧边栏点到、产品→BOM 树→只读详情链路通,check-types/lint/build 全过,test 不回归。
5. 涉及的后端文件按约定审查、修正记录在案。
6. 前端验证命令(均在 `mes/frontend`):`pnpm --filter mes-new check-types`、`pnpm --filter mes-new lint`、`pnpm --filter mes-new build`;测试在 `cd mes/frontend/apps/mes-new && pnpm test`(见 [[active-frontend-app]])。后端 `mvn -q -DskipTests compile` + 改动模块 `mvn test`。

---

## 7. 决策记录(brainstorming)

1. **验证方式** = 脚本化后端契约验证 + 人工浏览器抽查(非纯人工、非 Playwright)。
2. **修复深度** = 只修真实暴露的正确性/契约 bug;规模/并发隐患 backlog。
3. **周期编排** = 单周期全包,基建 → 4 周期(2j→2h→2g3→2i2)→ process-query。
4. **dev 旁路** = 方案 A(配置开关 `mes.captcha.enabled` 跳过验证码,默认 true 仅 dev 关,保留真实 Shiro 认证)。
5. **凭据** = `admin / 123`(已复算验证,零 DB 改动)。
6. **process-query** = 独立新建、复用 api/组件、不重构 ProcessContentList、UI 全新设计不抄 mes1。

---

## 8. 依赖与前提

- 后端用 `mvn spring-boot:run`(corretto-11),非 `./mvnw`(坏);见 [[backend-build-mvnw-broken]]。
- dev DB:`localhost:3306/mes_data` root/12345678;CLI `/usr/local/mysql/bin/mysql -uroot -p12345678 mes_data`。
- MinIO `minio-mes`(:9000)供 process-query 图片重签人工查看(非阻断)。
- 前端只动 `apps/mes-new`,不碰 `apps/mes1`(见 [[active-frontend-app]])。

见 [[mes-rebuild-roadmap]]、[[backend-deepseek-review-each-cycle]]。
