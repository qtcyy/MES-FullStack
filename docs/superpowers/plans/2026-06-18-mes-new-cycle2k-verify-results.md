# 周期 2k · 联调验证证据日志

> 配套计划:`2026-06-18-mes-new-cycle2k-integration-verify.md`。每节贴**真实 curl 输出 + SQL 结果**。

运行环境:后端 `mvn spring-boot:run`(JDK11,:9090,dev profile,ehcache);DB `localhost:3306/mes_data`;凭据 `admin/123`(dev `mes.captcha.enabled=false`)。

---

## Phase 0 · 验证基建 — ✅ PASS

后端启动(`/tmp/mes-backend.log`):
```
Tomcat started on port(s): 9090 (http) with context path ''
Started SparchetypeApplication in 4.249 seconds (JVM running for 13.973)
```

**登录冒烟**(`bash scripts/verify/login.sh`,故意发 `captcha=x`):
```
POST http://localhost:9090/login  -d 'username=admin&password=123&captcha=x'
{"msg":"操作成功","code":0,"data":null}
cookie: JSESSIONID=f848a029-064a-4e57-a225-99b647f63239
```
→ 证明 dev 验证码开关生效(任意 captcha 放行),真实 Shiro 认证通过。

**鉴权冒烟** `GET /admin/user/info`:
```
{"msg":"操作成功","code":0,"data":{"id":"1184019107907227649","name":"超级管理员","username":"admin",
  "sysRoleDTOs":[{"name":"超级管理员","code":"admin",...}]}}
```
→ session 生效,admin 全量信息 + 超管角色返回。

**后端审查记录(SysLoginController):** `main()` 死测试方法(`:126-129`,`new Md5Hash("123","admin",3)`)无害遗留,记 backlog 可删;`/verification/code` 未改;验证码校验已包进 `if(captchaEnabled)` 并顺修 `random==null` NPE。无其它阻断 bug。

---

## Phase 1 · 2j 动态表配置 — ✅ PASS

后端已用含 2j 事务修复(`removeWithItems @Transactional`)的代码重启(`Started ... 14:13:37`)。守卫单测 `Tests run: 4, Failures: 0`。

**新建**(`add-or-update` JSON,无 id):`{"code":0,"data":"2067491020311924737"}` → 返回生成 id 非 null(印证 2j 修复)。
SQL 佐证:`sp_table_manager` 1 行(verify2k_demo)+ `sp_table_manager_item` 2 行(f_code must_fill=1 / f_name=0,table_name_id 正确)。

**分页+服务端搜索**(`tableName=verify2k`):`{"code":0,...records:[verify2k_demo],total:1}` → LIKE 搜索生效。

**编辑**(带 id,2 字段→3 字段,f_name 改必填):`{"code":0,"data":"2067491020311924737"}`。
SQL 佐证:`table_desc=2k编辑后`;明细按 `sort_num` 为 f_code(1,1)/f_name(1,2)/f_extra(0,3),`item_count=3` → **旧 2 删尽、新 3 插入,无残留无丢失**。

**删除**(事务级联):`{"code":0}`。SQL 佐证:`header=0, orphan_items=0` → **级联删原子,无孤儿明细**。

**调查记录(非 bug):** `item/by/tableNameId` 响应中 `sortNum:null`/`tableNameId:null`,经查 `SpTableManagerItemMapper.xml#queryItemBytableNameId` 仅投影 id/field/field_desc/must_fill(未投影 sort_num/table_name_id),但**含 `ORDER BY sort_num`**;前端 `buildUpsertPayload` 保存时按行序重排 sortNum、不依赖回传值,编辑往返顺序已实证正确 → 投影遗漏无害,不修(记 backlog 可顺手补投影)。

---

## Phase 2 · 2h 库存 — ✅ PASS(零 bug)

preflight:`sp_warehouse` 有 5 个 `'零件库'` + 1 产品库 → 硬编码 `'零件库'` 校验(by-design)可正常工作。

**入库登账**(item-rcpt-03 PART-003 qty100 → wh-parts-001/loc-parts-03,同物料):`{"code":0}`;明细转 `posted`;`sp_inventory` loc-parts-03 PART-003 **100→200 累加**。
**幂等**:重复登账同明细 → `{"code":1,"msg":"该明细已登账，请勿重复操作"}`,库存仍 200(不翻倍)→ 生命周期去重正确。

**出库 FIFO**(验证已实现的 FIFO,构造多批次):
- 手工入库 PART-003 qty30 到新空库位(2063239974832054274/2064530419608580098,time 14:18:25,较新)`{"code":0}` → 同时验证**手工入库**通过。
- 出库前两批次:loc-parts-03(200,14:17:08 旧)+ 新库位(30,14:18:25 新)。
- 出库 obi-001-3(PART-003 qty50)`{"code":0}`:**旧批 loc-parts-03 200→150,新批 30 不动**;`allocation_detail=1-010201×50`,`posted` → **FIFO 先扣最早入库批次,正确**。

**库存台账查询**(`materialCode=PART-003`):`{"code":0}` 返回两批次(30+150),join 出 warehouseName/locationCode → 契约正确。

> 结论:FIFO(契约抽取已实证)+ 入库累加 + 幂等去重 + 手工入库 + 查询 全部正确,**无需修复后端**。backlog:台账 upsert 无行锁(并发)、`size=100000`、库房类型抽常量。

---

## Phase 3 · 2g3 生产甘特 — ✅ PASS(零 bug)

preflight:`sp_order_dispatch.dispatch_status` 分布 1→5/2→6/3→8。S1=MK-DSP-0103、S2=MK-DSP-0102、S3=MK-DSP-0101。

**tasks 查询**(空参):`{"code":0}`,返回 **19** 条派工任务(订单×工序×班组×作业员)→ form 空参不静默空。

**状态机守卫 — 非法转移全部被拒(状态未被篡改):**
| 用例 | 结果 |
|---|---|
| start on S3(已完工) | `{"code":1,"msg":"仅已派工任务可记录开工"}` ✓ |
| finish on S1(已派工) | `{"code":1,"msg":"仅已开工任务可记录完工"}` ✓ |
| reschedule on S3(已完工) | `{"code":1,"msg":"任务已完工,不可改期"}` ✓ |
| progress on S1(已派工) | `{"code":1,"msg":"仅已开工任务可更新进度"}` ✓ |

非法操作后 SQL 复查:S1 仍=1、S3 仍=3(未被篡改)。

**合法转移生效:**
- start on S1(MK-DSP-0103)→ `{"code":0}`,`dispatch_status=2`,`actual_start_time=2026-06-18 09:00:00`。
- reschedule on S2(MK-DSP-0102)带时分秒 → `{"code":0}`;DB `plan_start_time=2026-06-19 08:30:00`、`plan_end_time=2026-06-21 17:45:00` → **时分秒完整保留**(列为 varchar(255) 存 datetime 串)。
- actual on S2 仅传 start → `{"code":0}`;`actual_start_time` 2026-06-15→2026-06-18 10:00:00,`actual_end_time` 保持 NULL(**部分更新不清空另一字段**)。

> 结论:状态机 1→2→3 守卫完整、文案精确、改期保时分秒、actual 部分更新安全,**无需修复后端**。backlog:5 表 JOIN 无索引;时间列用 varchar 存(既有 schema,非本周期)。

---

## Phase 4 · 2i2 3D 仿真 — ✅ PASS(零 bug)

**数据完整性(决定 3D 是否空白/错位):**
| 检查 | 结果 |
|---|---|
| 库位 warehouse_id 悬空 | `dangling_loc=0` ✓ |
| 库存 location_id 悬空 | `dangling_inv=0` ✓ |
| 重复 location_id | 无;`idx_location` UNIQUE(Non_unique=0) ✓ |
| inventory.warehouse_id 与库位归属一致 | `mismatch=0` ✓ |

**只读端点取数 + 行数对账:**
- `warehouse/list`:API 3 vs DB 6 → **经查为正确软删除过滤**:DB 6 个中 3 个 `is_deleted=1`(三个 XZH),API 返回 3 个 `is_deleted=0`(电脑配件库/XZHHZX/仓库1)。**非 bug**。
- 关键:两个有库存的仓库(wh-parts-001、2063239974832054274)**都在 API 返回内** → 所有库存都能落到渲染库区,无孤立/错位。
- `warehouse/locations/wh-parts-001`:API 8 = DB 8 ✓。
- `inventory/page size=100000`:API 9 = DB 9 ✓。

> 结论:外键无悬空、一库位一行、仓库列表正确过滤软删除且覆盖全部有库存仓库,**3D 场景数据健康,无需修复**。backlog:warehouse 无分页(规模)。

---

## Phase 5 · 工艺查询只读页 process-query — ✅ 构建+脚本 PASS(人工待确认)

**前端构建:** 新建 `pages/technology/process-query/ProcessQueryPage.tsx`(纯只读:产品 Select → BOM 树 → 只读 Tabs[主信息/要求/检验/注意/设备/文档/物料]+图片,无任何写入口),复用 `MasterDetailLayout`/`TreeDataTable`/`DataTable`/`MultiImageUpload(disabled)`/`useQuery$`。注册路由三处:`router.tsx`(`technology/process-query`)+ `routeMeta.ts`(`产品工艺查询`)+ 菜单 116 已存在(零 SQL)。
验证:`check-types` 0 错、`lint` 0 error(21 既有警告)、`build` ✓。

**4 只读端点脚本验证:**
- `products`:`{"code":0}` 产品列表(台式电脑主机v2 等)。
- `list/{rootId}`:`{"code":0}` 节点数组(bomNode+content)。
- `get/{bomId}`:`{"code":0}` ProcessContentDetailVO(content+equipment+documents+imageUrls)。
- `bom-items/{bomId}`:`{"code":0}`(该节点 `[]`,数据相关非 bug)。

**⚠️ 跨周期发现(2f 图片数据,记 backlog,非 2k 范围、非 process-query bug):** `get` 返回的 `contentImageUrls` 对**遗留记录**双重签名 —— `sp_process_content.content_images` 存在两种历史格式:① 完整预签名 MinIO URL(如 bom 6c68d770,2f 改存 key 前的遗留)→ 重签二次包裹成 `http://…/mes/http%3A/…`;② `/technology/process-content/image/xxx.jpg` 相对路径。均非裸对象 key。**影响**:编制页 process-content 与查询页 process-query 同源显示这些遗留图会坏。**处置**:属 2f 图片管线/数据迁移,不在 2k 四周期范围且 process-query 零后端改动 → 记 2f-backlog,向用户 flag;新上传走 key 不受影响。

> 结论:process-query 页构建通过、端点契约正确、只读形态完整;遗留图片显示问题归 2f-backlog。**人工抽查(侧边栏进入 + 点选浏览)待用户确认。**

---
