# 周期 2k · 联调验证 + 工艺查询只读页 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让从未端到端验证的 4 个周期(2j/2h/2g3/2i2)在真实运行栈上被脚本化验证并修复暴露的正确性 bug,并补齐工艺查询只读页 `/technology/process-query`。

**Architecture:** ① 后端加 dev 验证码开关(`mes.captcha.enabled`,默认 true 仅 dev 关,保留真实 Shiro 认证)让栈可脚本化登录;② 用 `admin/123` 登录拿 session cookie,`curl` 逐端点验证 + `mysql` 直查佐证,暴出正确性 bug 即修;③ 前端新建纯只读 `ProcessQueryPage`,复用 4 个现有 GET 端点 + mes-new 组件,零后端改动。

**Tech Stack:** 后端 Spring Boot 2.1.7 + MyBatis-Plus + Shiro(JDK11 编译/运行);前端 React18 + Vite + `@workspace/ui`(shadcn) + `@ngify/http` + 自研 `useQuery$`;验证 `curl` + `mysql` CLI。

---

## 契约抽取已修正的 2 个假设(写入本计划据实)

1. **出库 FIFO 已正确实现(误报,非 bug):** `SpOutboundOrderServiceImpl.postOutboundItem`(`:51-122`,排序 `:65-70`)按 `last_inbound_time asc, create_time asc` 双重排序逐行扣减 —— 本计划只**验证 FIFO 行为**,不"修 FIFO"。
2. **库房类型硬编码 `'零件库'` 是 by-design(非 bug):** 前端(`ReceiptPostDialog.tsx:38`)与后端(`postItem`/`manualInbound`)都按设计校验零件库 —— 归 backlog(可选抽常量),本计划只**验证真实 `sp_warehouse.type` 含 `'零件库'`** 以确保入库可登账。

> 仍确认必修的正确性 bug:**2j `deleteByTableNameId` 无 `@Transactional`**(`SpTableManagerController.java:147-151`)。其余按"验证暴出再修"。

---

## 全局约定(每个 curl/SQL 任务通用)

- **运行栈(开两个后台终端):**
  - 后端:`export JAVA_HOME=/Library/Java/JavaVirtualMachines/amazon-corretto-11.jdk/Contents/Home && cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack/mes && mvn -q spring-boot:run`(:9090, dev, ehcache)
  - 前端(供人工抽查):`cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack/mes/frontend && pnpm dev`(:4100)
- **MySQL CLI:** `/usr/local/mysql/bin/mysql -uroot -p12345678 mes_data -N -e "<SQL>"`(`-N` 去表头便于脚本取值)
- **curl 直打后端(无 `/api` 前缀,那是前端代理才有):** base `http://localhost:9090`,cookie jar `/tmp/mes-cookies.txt`
- **证据归档:** 每个验证任务把**实际 curl 输出 + SQL 结果**追加到 `docs/superpowers/plans/2026-06-18-mes-new-cycle2k-verify-results.md`(执行首次创建)。声称"通过"必须贴真实输出。
- **后端验证命令:** 编译 `export JAVA_HOME=…corretto-11 && cd mes && mvn -q -DskipTests compile`;测试 `cd mes && mvn -q test -Dtest=<Class>`
- **前端验证命令(均在 `mes/frontend`):** `pnpm --filter mes-new check-types`、`pnpm --filter mes-new lint`、`pnpm --filter mes-new build`;测试 `cd mes/frontend/apps/mes-new && pnpm test`(勿用 `--filter mes-new test`)

---

# Phase 0 · 验证基建

## Task 0.1：后端 dev 验证码开关(方案 A)

**Files:**
- Modify: `mes/src/main/resources/application.yml`(加基线 `mes.captcha.enabled: true`)
- Modify: `mes/src/main/resources/application-dev.yml`(覆盖 `mes.captcha.enabled: false`)
- Modify: `mes/src/main/java/com/wangziyang/mes/system/controller/client/SysLoginController.java:72-113`

- [ ] **Step 1：application.yml 加基线开关(生产默认开)**

在 `application.yml` 顶层(与现有自定义键同级,如文件无自定义命名空间则新增)追加:

```yaml
# 业务自定义配置
mes:
  captcha:
    enabled: true   # 登录图形验证码校验开关;生产保持 true
```

- [ ] **Step 2：application-dev.yml 覆盖为关闭**

在 `application-dev.yml` 顶层追加(dev 关验证码以便脚本化登录):

```yaml
mes:
  captcha:
    enabled: false  # 仅 dev:关闭验证码校验,便于脚本化联调验证
```

- [ ] **Step 3：SysLoginController 注入开关 + 包裹校验**

加导入(文件顶部 import 区):

```java
import org.springframework.beans.factory.annotation.Value;
```

在类字段区(`logger` 之后)加字段:

```java
    @Value("${mes.captcha.enabled:true}")
    private boolean captchaEnabled;
```

把 `login()` 方法里现有的验证码块(当前 `:75-83`)整体替换为(顺带修掉 `random.equals` 在 random 为 null 时的潜在 NPE):

```java
        // dev 可关验证码(mes.captcha.enabled=false,仅 application-dev.yml 覆盖;生产默认 true)
        if (captchaEnabled) {
            // 从 session 中获取随机数
            String random = (String) request.getSession().getAttribute(RandomVerificationCodeUtil.RANDOM_CODE_KEY);
            if (StringUtils.isBlank(captcha)) {
                return Result.failure("请输入验证码");
            }
            if (random == null || !random.equals(captcha)) {
                return Result.failure("请输入正确的验证码");
            }
        }
```

- [ ] **Step 4：后端审查记录(约定)**

在 results 文档记录对 `SysLoginController` 的审查:`main()` 死测试方法(`:126-129`)为无害遗留(本周期不动,记 backlog 可删);`/verification/code` 不改。确认无其它阻断 bug。

- [ ] **Step 5：编译**

Run: `export JAVA_HOME=/Library/Java/JavaVirtualMachines/amazon-corretto-11.jdk/Contents/Home && cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack/mes && mvn -q -DskipTests compile`
Expected: `BUILD SUCCESS`

- [ ] **Step 6：提交**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack
git add mes/src/main/resources/application.yml mes/src/main/resources/application-dev.yml mes/src/main/java/com/wangziyang/mes/system/controller/client/SysLoginController.java
git commit -m "✨ feat(mes): 2k 后端加 dev 验证码开关 mes.captcha.enabled(默认 true 仅 dev 关, 修 random NPE)"
```

## Task 0.2：脚本化登录 harness + 冒烟

**Files:**
- Create: `scripts/verify/login.sh`(可复用登录助手)
- Create: `docs/superpowers/plans/2026-06-18-mes-new-cycle2k-verify-results.md`(证据日志)

- [ ] **Step 1：写登录助手脚本**

`scripts/verify/login.sh`:

```bash
#!/usr/bin/env bash
# 周期2k 验证助手:用 admin/123 登录后端,session cookie 存入 cookie jar。
# 用法: bash scripts/verify/login.sh   然后其它 curl 用 -b /tmp/mes-cookies.txt
set -euo pipefail
BASE="${MES_BASE:-http://localhost:9090}"
COOKIE="${MES_COOKIE:-/tmp/mes-cookies.txt}"
echo "[login] POST $BASE/login as admin"
curl -sS -c "$COOKIE" -H 'X-Requested-With: XMLHttpRequest' \
  -X POST "$BASE/login" \
  -d 'username=admin&password=123&captcha=x'
echo
echo "[login] cookie -> $COOKIE"
```

- [ ] **Step 2：启动后端(后台终端),等待就绪**

Run: `export JAVA_HOME=/Library/Java/JavaVirtualMachines/amazon-corretto-11.jdk/Contents/Home && cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack/mes && mvn -q spring-boot:run`(后台运行)
就绪判据:日志出现 `Tomcat started on port(s): 9090` / `Started SparchetypeApplication`。

- [ ] **Step 3：登录冒烟**

Run: `bash /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack/scripts/verify/login.sh`
Expected: 输出含 `"code":0`(`Result.success`),`/tmp/mes-cookies.txt` 生成且含 `JSESSIONID`。

- [ ] **Step 4：鉴权冒烟(证明 session 生效)**

Run: `curl -sS -b /tmp/mes-cookies.txt -H 'X-Requested-With: XMLHttpRequest' http://localhost:9090/admin/user/info`
Expected: `"code":0` + data 含当前用户(admin)。若返回 401/重定向则 session 未带上,排查 cookie。

- [ ] **Step 5：归档证据 + 提交**

把 Step 3/4 实际输出写入 results 文档「Phase 0」小节。

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack
git add scripts/verify/login.sh docs/superpowers/plans/2026-06-18-mes-new-cycle2k-verify-results.md
git commit -m "🧑‍💻 chore(mes): 2k 脚本化登录 harness(login.sh)+ 登录/鉴权冒烟证据"
```

---

# Phase 1 · 2j 动态表配置联调

## Task 1.1：修复 `deleteByTableNameId` 无事务(正确性必修)

**Files:**
- Modify: `mes/src/main/java/com/wangziyang/mes/basedata/service/ISpTableManagerService.java`
- Modify: `mes/src/main/java/com/wangziyang/mes/basedata/service/impl/SpTableManagerServiceImpl.java`
- Modify: `mes/src/main/java/com/wangziyang/mes/basedata/controller/SpTableManagerController.java:145-151`
- Test: `mes/src/test/java/com/wangziyang/mes/basedata/service/SpTableManagerServiceImplTest.java`

- [ ] **Step 1：写失败的守卫测试**

在 `SpTableManagerServiceImplTest.java` 加导入:

```java
import org.mockito.InOrder;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.inOrder;
```

加测试方法(放在类末 `}` 之前):

```java
    @Test
    public void removeWithItems_deletes_header_then_items_in_order() {
        doReturn(true).when(service).removeById("mgr-7");

        service.removeWithItems("mgr-7");

        InOrder order = inOrder(service, iSpTableManagerItemService);
        order.verify(service).removeById("mgr-7");
        order.verify(iSpTableManagerItemService).deleteItemBytableNameId("mgr-7");
    }
```

- [ ] **Step 2：运行测试,确认失败(方法不存在编译错)**

Run: `export JAVA_HOME=/Library/Java/JavaVirtualMachines/amazon-corretto-11.jdk/Contents/Home && cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack/mes && mvn -q test -Dtest=SpTableManagerServiceImplTest`
Expected: 编译失败 `cannot find symbol: method removeWithItems(String)`。

- [ ] **Step 3：接口加方法声明**

`ISpTableManagerService.java` 在 `saveOrUpdateWithItems` 声明之后加:

```java
    /**
     * 级联删除表头 + 字段明细(事务):保证两次删除原子性,
     * 避免删头成功、删明细失败产生孤儿明细。
     *
     * @param id 表头 id
     */
    void removeWithItems(String id);
```

- [ ] **Step 4：实现类加事务方法**

`SpTableManagerServiceImpl.java` 在 `saveOrUpdateWithItems` 方法之后加:

```java
    /**
     * 级联删除表头 + 字段明细(事务)。修复原 controller deleteByTableNameId 无事务缺陷:
     * removeById(header) 与 deleteItemBytableNameId(items) 两次写无原子性,中途异常致孤儿明细。
     */
    @Override
    @Transactional(rollbackFor = Exception.class)
    public void removeWithItems(String id) {
        this.removeById(id);
        iSpTableManagerItemService.deleteItemBytableNameId(id);
    }
```

- [ ] **Step 5：controller 委托 service(薄化 + 去掉直接依赖明细 service)**

`SpTableManagerController.java` 把 `deleteByTableNameId`(`:145-151`)改为:

```java
    @PostMapping("delete/by/tableNameId")
    @ResponseBody
    public Result deleteByTableNameId(SpTableManager req) {
        iSpTableManagerService.removeWithItems(req.getId());
        return Result.success();
    }
```

删除现已不再使用的字段与导入:字段 `iSpTableManagerItemService`(`:48-49`)+ 导入 `import com.wangziyang.mes.basedata.service.ISpTableManagerItemService;`(`:10`)。(`SpTableManagerItem` 导入保留 —— `by/tableName` 仍用。)

- [ ] **Step 6：运行守卫测试 + 全量 2j 测试,确认通过**

Run: `export JAVA_HOME=/Library/Java/JavaVirtualMachines/amazon-corretto-11.jdk/Contents/Home && cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack/mes && mvn -q test -Dtest=SpTableManagerServiceImplTest`
Expected: `Tests run: 4, Failures: 0`(原 3 + 新 1)。

- [ ] **Step 7：提交**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack
git add mes/src/main/java/com/wangziyang/mes/basedata/ mes/src/test/java/com/wangziyang/mes/basedata/service/SpTableManagerServiceImplTest.java
git commit -m "🐛 fix(mes): 2j deleteByTableNameId 下沉 service 加 @Transactional(级联删原子性)+ 守卫单测"
```

## Task 1.2：2j 端到端脚本验证

**Files:** 仅 results 文档(无代码改动)

- [ ] **Step 1：确保已登录**(若 cookie 过期重跑 `bash scripts/verify/login.sh`)

- [ ] **Step 2：新建动态表(add-or-update JSON,新建无 id)**

Run:
```bash
curl -sS -b /tmp/mes-cookies.txt -H 'Content-Type: application/json' -H 'X-Requested-With: XMLHttpRequest' \
  -X POST http://localhost:9090/basedata/manager/add-or-update \
  -d '{"tableName":"verify2k_demo","tableDesc":"2k联调验证表","permission":"","isDeleted":"0","spTableManagerItems":[{"field":"f_code","fieldDesc":"编码","mustFill":"1","sortNum":1},{"field":"f_name","fieldDesc":"名称","mustFill":"0","sortNum":2}]}'
```
Expected: `"code":0`,`data` = 新建表头 id(非 null 字符串)。记下该 id 为 `$HID`。

- [ ] **Step 3：SQL 佐证表头+明细落库**

Run:
```bash
/usr/local/mysql/bin/mysql -uroot -p12345678 mes_data -e "SELECT id,table_name,table_desc FROM sp_table_manager WHERE table_name='verify2k_demo'; SELECT field,field_desc,must_fill,sort_num,table_name_id FROM sp_table_manager_item WHERE table_name_id=(SELECT id FROM sp_table_manager WHERE table_name='verify2k_demo');"
```
Expected: 1 行表头 + 2 行明细(`must_fill` 为 `1`/`0`,`table_name_id` = 表头 id)。

- [ ] **Step 4：分页查询(服务端搜索)**

Run:
```bash
curl -sS -b /tmp/mes-cookies.txt -H 'X-Requested-With: XMLHttpRequest' \
  -X POST http://localhost:9090/basedata/manager/page -d 'current=1&size=10&tableName=verify2k'
```
Expected: `"code":0`,`data.records` 含 `verify2k_demo`,`data.total>=1`。

- [ ] **Step 5：查明细 + 编辑(带 id,改明细验证不丢失)**

取表头 id:
```bash
HID=$(/usr/local/mysql/bin/mysql -uroot -p12345678 mes_data -N -e "SELECT id FROM sp_table_manager WHERE table_name='verify2k_demo';")
curl -sS -b /tmp/mes-cookies.txt -H 'X-Requested-With: XMLHttpRequest' \
  -X POST http://localhost:9090/basedata/manager/item/by/tableNameId -d "tableNameId=$HID"
# 编辑:改成 3 个字段
curl -sS -b /tmp/mes-cookies.txt -H 'Content-Type: application/json' -H 'X-Requested-With: XMLHttpRequest' \
  -X POST http://localhost:9090/basedata/manager/add-or-update \
  -d "{\"id\":\"$HID\",\"tableName\":\"verify2k_demo\",\"tableDesc\":\"2k编辑后\",\"permission\":\"\",\"isDeleted\":\"0\",\"spTableManagerItems\":[{\"field\":\"f_code\",\"fieldDesc\":\"编码\",\"mustFill\":\"1\",\"sortNum\":1},{\"field\":\"f_name\",\"fieldDesc\":\"名称\",\"mustFill\":\"1\",\"sortNum\":2},{\"field\":\"f_extra\",\"fieldDesc\":\"附加\",\"mustFill\":\"0\",\"sortNum\":3}]}"
```
Expected: 两次都 `"code":0`。SQL 复查 `sp_table_manager_item WHERE table_name_id=$HID` 应为 **3 行**(旧明细被删、新明细全插,无残留/无丢失),表描述变 `2k编辑后`。

- [ ] **Step 6：删除(验证事务级联删)**

Run:
```bash
curl -sS -b /tmp/mes-cookies.txt -H 'X-Requested-With: XMLHttpRequest' \
  -X POST http://localhost:9090/basedata/manager/delete/by/tableNameId -d "id=$HID"
/usr/local/mysql/bin/mysql -uroot -p12345678 mes_data -e "SELECT COUNT(*) AS header FROM sp_table_manager WHERE id='$HID'; SELECT COUNT(*) AS items FROM sp_table_manager_item WHERE table_name_id='$HID';"
```
Expected: `"code":0`;header=0 且 items=0(表头与明细都删干净,无孤儿)。

- [ ] **Step 7：归档证据 + 提交**

把 Step 2-6 实际输出写入 results「Phase 1 / 2j」小节,标注 pass。

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack
git add docs/superpowers/plans/2026-06-18-mes-new-cycle2k-verify-results.md
git commit -m "✅ test(mes): 2k 周期2j 动态表端到端脚本验证通过(CRUD 往返 + 级联删原子性证据)"
```

## Task 1.3：2j 人工抽查(用户)

- [ ] **Step 1：列抽查点,请用户在 :4100 确认**

在 results 记录请用户确认:`/basedata/manager` 列表→新建大弹窗(字段增删/上下排序)→保存→编辑→删除,UI 与脚本结果一致。等待用户回执后标注。

---

# Phase 2 · 2h 库存联调

## Task 2.1：库存 preflight 数据核对

**Files:** 仅 results

- [ ] **Step 1：确认存在零件库 + 库位(否则入库登账必失败)**

Run:
```bash
/usr/local/mysql/bin/mysql -uroot -p12345678 mes_data -e "SELECT id,name,type FROM sp_warehouse WHERE type='零件库'; SELECT l.id,l.location_code,l.warehouse_id FROM sp_warehouse_location l JOIN sp_warehouse w ON l.warehouse_id=w.id WHERE w.type='零件库' LIMIT 5;"
```
Expected: ≥1 个 `type='零件库'` 库房 + ≥1 个其下库位。**若为空** → 记录"2h 入库登账无法验证(缺零件库种子数据)",在 results 标注阻塞,人工补种子或跳过登账类用例(查询类仍验)。

- [ ] **Step 2：找一条待登账入库明细 + 一张入库单**

Run:
```bash
/usr/local/mysql/bin/mysql -uroot -p12345678 mes_data -e "SELECT id,receipt_id,material_code,quantity,post_status FROM sp_warehouse_receipt_item WHERE post_status='pending' LIMIT 3; SELECT id,receipt_code,receipt_status FROM sp_warehouse_receipt LIMIT 3;"
```
记下一个 pending 明细 id、其库房/库位候选,供 Task 2.2。

## Task 2.2：入库登账脚本验证

**Files:** 仅 results

- [ ] **Step 1：分页查入库单(契约)**

Run:
```bash
curl -sS -b /tmp/mes-cookies.txt -H 'X-Requested-With: XMLHttpRequest' \
  -X POST http://localhost:9090/inventory/receipt/page -d 'current=1&size=10'
```
Expected: `"code":0`,`data.records[*]` 含 `receiptCode/receiptStatus/totalItems/postedItems`。

- [ ] **Step 2：查某入库单明细**

```bash
RID=$(/usr/local/mysql/bin/mysql -uroot -p12345678 mes_data -N -e "SELECT id FROM sp_warehouse_receipt LIMIT 1;")
curl -sS -b /tmp/mes-cookies.txt -H 'X-Requested-With: XMLHttpRequest' http://localhost:9090/inventory/receipt/$RID/items
```
Expected: `"code":0`,data 为明细数组(含 `postStatus`)。

- [ ] **Step 3：登账(JSON)→ 库存落库**

```bash
ITEM=$(/usr/local/mysql/bin/mysql -uroot -p12345678 mes_data -N -e "SELECT id FROM sp_warehouse_receipt_item WHERE post_status='pending' LIMIT 1;")
WH=$(/usr/local/mysql/bin/mysql -uroot -p12345678 mes_data -N -e "SELECT id FROM sp_warehouse WHERE type='零件库' LIMIT 1;")
LOC=$(/usr/local/mysql/bin/mysql -uroot -p12345678 mes_data -N -e "SELECT id FROM sp_warehouse_location WHERE warehouse_id='$WH' LIMIT 1;")
curl -sS -b /tmp/mes-cookies.txt -H 'Content-Type: application/json' -H 'X-Requested-With: XMLHttpRequest' \
  -X POST http://localhost:9090/inventory/receipt/item/post \
  -d "{\"itemId\":\"$ITEM\",\"warehouseId\":\"$WH\",\"locationId\":\"$LOC\"}"
/usr/local/mysql/bin/mysql -uroot -p12345678 mes_data -e "SELECT post_status FROM sp_warehouse_receipt_item WHERE id='$ITEM'; SELECT material_code,quantity,location_id,last_inbound_time FROM sp_inventory WHERE location_id='$LOC' ORDER BY last_inbound_time DESC LIMIT 3;"
```
Expected: `"code":0`;明细 `post_status` 变为 `posted`;`sp_inventory` 出现/累加该物料在该库位的数量。
**若报错**(如 `code!=0` 且 msg 提示类型/库位不一致):读 `SpWarehouseReceiptServiceImpl.postItem:59-140` 判断是契约/数据问题还是逻辑 bug;正确性 bug 则修,数据问题在 results 记原因。

- [ ] **Step 4：重复登账幂等性验证(生命周期去重)**

对同一已 posted 的 `$ITEM` 再次登账,Expected:被拒(`code!=0`,如"已登账")或无副作用 —— **不得产生重复 inventory 行**。SQL 复查该 location 该物料行数不应翻倍。若翻倍 → 正确性 bug,读 service 修。

## Task 2.3：出库 FIFO 脚本验证(验证已实现的 FIFO,不改实现)

**Files:** 仅 results

- [ ] **Step 1：分页查出库单 + 明细**

```bash
curl -sS -b /tmp/mes-cookies.txt -H 'X-Requested-With: XMLHttpRequest' -X POST http://localhost:9090/inventory/outbound/page -d 'current=1&size=10'
OID=$(/usr/local/mysql/bin/mysql -uroot -p12345678 mes_data -N -e "SELECT id FROM sp_outbound_order LIMIT 1;")
curl -sS -b /tmp/mes-cookies.txt -H 'X-Requested-With: XMLHttpRequest' http://localhost:9090/inventory/outbound/$OID/items
```
Expected: 均 `"code":0`。

- [ ] **Step 2：出库登账(FIFO)→ 校验按 last_inbound_time 先扣**

先记录该物料各库位/批次库存按 `last_inbound_time asc` 的顺序,再:
```bash
OITEM=$(/usr/local/mysql/bin/mysql -uroot -p12345678 mes_data -N -e "SELECT id FROM sp_outbound_order_item WHERE post_status='pending' LIMIT 1;")
curl -sS -b /tmp/mes-cookies.txt -H 'Content-Type: application/json' -H 'X-Requested-With: XMLHttpRequest' \
  -X POST http://localhost:9090/inventory/outbound/item/post -d "{\"itemId\":\"$OITEM\"}"
/usr/local/mysql/bin/mysql -uroot -p12345678 mes_data -e "SELECT post_status,allocation_detail FROM sp_outbound_order_item WHERE id='$OITEM';"
```
Expected: `"code":0`;`post_status=posted`;`allocation_detail` 体现**最早入库批次先被扣减**(FIFO)。把 `allocation_detail` 与扣减前库存批次顺序对照贴入 results,确认 FIFO 正确(预期通过 —— 这是验证非修复)。

## Task 2.4：手工入库 + 库存查询脚本验证

**Files:** 仅 results

- [ ] **Step 1：手工入库(JSON)**

```bash
WH=$(/usr/local/mysql/bin/mysql -uroot -p12345678 mes_data -N -e "SELECT id FROM sp_warehouse WHERE type='零件库' LIMIT 1;")
LOC=$(/usr/local/mysql/bin/mysql -uroot -p12345678 mes_data -N -e "SELECT id FROM sp_warehouse_location WHERE warehouse_id='$WH' LIMIT 1;")
curl -sS -b /tmp/mes-cookies.txt -H 'Content-Type: application/json' -H 'X-Requested-With: XMLHttpRequest' \
  -X POST http://localhost:9090/inventory/manual-inbound \
  -d "{\"materialCode\":\"VERIFY2K-001\",\"materialDesc\":\"2k手工入库\",\"unit\":\"个\",\"warehouseId\":\"$WH\",\"locationId\":\"$LOC\",\"quantity\":5}"
/usr/local/mysql/bin/mysql -uroot -p12345678 mes_data -e "SELECT material_code,quantity,location_id FROM sp_inventory WHERE material_code='VERIFY2K-001';"
```
Expected: `"code":0`;`sp_inventory` 新增/累加该物料 5 个在该库位。

- [ ] **Step 2：库存台账分页查询**

```bash
curl -sS -b /tmp/mes-cookies.txt -H 'X-Requested-With: XMLHttpRequest' \
  -X POST http://localhost:9090/inventory/page -d 'current=1&size=10&materialCode=VERIFY2K'
```
Expected: `"code":0`,`data.records` 含 `VERIFY2K-001`。

- [ ] **Step 3：归档 + 提交**

results 写「Phase 2 / 2h」小节(含登账/FIFO/手工入库/查询输出 + 暴出并修复的 bug 若有)。

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack
git add docs/superpowers/plans/2026-06-18-mes-new-cycle2k-verify-results.md
# 若 Task 2.x 修了后端,一并 add 对应 java 文件;commit 信息据实
git commit -m "✅ test(mes): 2k 周期2h 库存端到端脚本验证(入库登账/FIFO出库/手工入库/查询证据)"
```

## Task 2.5：2h 人工抽查(用户)

- [ ] **Step 1：** 请用户在 :4100 确认:计划入库登账弹窗(选库房→库位)、出库 FIFO 确认弹窗、手工入库表单、库存查询。results 记回执。

---

# Phase 3 · 2g3 生产甘特联调

## Task 3.1：甘特 preflight(确认状态字段 + 取各状态任务 id)

**Files:** 仅 results

- [ ] **Step 1：确认状态列名**

Run: `/usr/local/mysql/bin/mysql -uroot -p12345678 mes_data -e "DESCRIBE sp_order_dispatch;"`
Expected: 找到状态列(预期 `dispatch_status`)+ `plan_start_time/plan_end_time/actual_start_time/actual_end_time/progress/oper_id`。**以实际列名为准**替换下文 `dispatch_status`。

- [ ] **Step 2：取各状态一个任务 id**

```bash
/usr/local/mysql/bin/mysql -uroot -p12345678 mes_data -e "SELECT id,dispatch_status,plan_start_time,plan_end_time FROM sp_order_dispatch ORDER BY dispatch_status, id;"
```
记下:`S1`(dispatch_status=1 已派工)、`S2`(=2 已开工)、`S3`(=3 已完工)各一个 id。**若缺某状态**,用合法转移自造(如对 S1 调 start 得到 S2)。

## Task 3.2：甘特查询契约验证

- [ ] **Step 1：空参取全部任务**

```bash
curl -sS -b /tmp/mes-cookies.txt -H 'X-Requested-With: XMLHttpRequest' -X POST http://localhost:9090/order/gantt/tasks
```
Expected: `"code":0`,`data` 为任务数组(订单×工序×班组×作业员),非空(种子有派工)。验证 form 空参不静默返回空。

## Task 3.3：状态机守卫验证(合法通过 + 非法被拒)

> 守卫文案(`SpGanttServiceImpl`):start「仅已派工任务可记录开工」(1→2);finish「仅已开工任务可记录完工」(2→3,progress→100);reschedule「任务已完工,不可改期」(禁 3);progress「仅已开工任务可更新进度」(仅 2);actual「仅已开工/完工任务可修正实际时间」(2/3)。

- [ ] **Step 1：非法 — 对已完工(S3)开工 → 期望被拒**

```bash
curl -sS -b /tmp/mes-cookies.txt -H 'Content-Type: application/json' -H 'X-Requested-With: XMLHttpRequest' \
  -X POST http://localhost:9090/order/gantt/start -d "{\"id\":\"$S3\"}"
```
Expected: `code!=0`,msg 含「仅已派工任务可记录开工」。

- [ ] **Step 2：非法 — 对已派工(S1)直接完工 → 期望被拒**

```bash
curl -sS -b /tmp/mes-cookies.txt -H 'Content-Type: application/json' -H 'X-Requested-With: XMLHttpRequest' \
  -X POST http://localhost:9090/order/gantt/finish -d "{\"id\":\"$S1\"}"
```
Expected: `code!=0`,msg 含「仅已开工任务可记录完工」。

- [ ] **Step 3：非法 — 对已完工(S3)改期 → 期望被拒**

```bash
curl -sS -b /tmp/mes-cookies.txt -H 'Content-Type: application/json' -H 'X-Requested-With: XMLHttpRequest' \
  -X POST http://localhost:9090/order/gantt/reschedule -d "{\"id\":\"$S3\",\"planStartTime\":\"2026-06-20 08:00:00\",\"planEndTime\":\"2026-06-22 17:00:00\"}"
```
Expected: `code!=0`,msg 含「任务已完工,不可改期」。

- [ ] **Step 4：非法 — 对已派工(S1)更新进度 → 期望被拒**

```bash
curl -sS -b /tmp/mes-cookies.txt -H 'Content-Type: application/json' -H 'X-Requested-With: XMLHttpRequest' \
  -X POST http://localhost:9090/order/gantt/progress -d "{\"id\":\"$S1\",\"progress\":50}"
```
Expected: `code!=0`,msg 含「仅已开工任务可更新进度」。

- [ ] **Step 5:合法 — 对已派工(S1)开工 → 状态变 2**

```bash
curl -sS -b /tmp/mes-cookies.txt -H 'Content-Type: application/json' -H 'X-Requested-With: XMLHttpRequest' \
  -X POST http://localhost:9090/order/gantt/start -d "{\"id\":\"$S1\",\"actualStartTime\":\"2026-06-18 09:00:00\"}"
/usr/local/mysql/bin/mysql -uroot -p12345678 mes_data -e "SELECT dispatch_status,actual_start_time FROM sp_order_dispatch WHERE id='$S1';"
```
Expected: `"code":0`;`dispatch_status=2`,`actual_start_time` 已写。

> 任一"非法转移未被拒"或"合法转移未生效" = 正确性 bug,读 `SpGanttServiceImpl` 对应方法修复后复验。

## Task 3.4：改期保留时分秒 + actual 空值

- [ ] **Step 1：合法改期(对 S2)保留时分秒**

```bash
curl -sS -b /tmp/mes-cookies.txt -H 'Content-Type: application/json' -H 'X-Requested-With: XMLHttpRequest' \
  -X POST http://localhost:9090/order/gantt/reschedule -d "{\"id\":\"$S2\",\"planStartTime\":\"2026-06-19 08:30:00\",\"planEndTime\":\"2026-06-21 17:45:00\"}"
/usr/local/mysql/bin/mysql -uroot -p12345678 mes_data -e "SELECT plan_start_time,plan_end_time FROM sp_order_dispatch WHERE id='$S2';"
```
Expected: `"code":0`;DB 时分秒精确为 `08:30:00`/`17:45:00`(不被截断为 00:00:00)。

- [ ] **Step 2:actual 纠时(对 S2,仅传 start)**

```bash
curl -sS -b /tmp/mes-cookies.txt -H 'Content-Type: application/json' -H 'X-Requested-With: XMLHttpRequest' \
  -X POST http://localhost:9090/order/gantt/actual -d "{\"id\":\"$S2\",\"actualStartTime\":\"2026-06-18 10:00:00\"}"
```
Expected: `"code":0`;仅 actual_start 改、actual_end 不被清空。

- [ ] **Step 3：归档 + 提交**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack
git add docs/superpowers/plans/2026-06-18-mes-new-cycle2k-verify-results.md
git commit -m "✅ test(mes): 2k 周期2g3 甘特状态机守卫端到端验证(非法转移被拒/合法转移生效证据)"
```

## Task 3.5：2g3 人工抽查(用户)

- [ ] **Step 1：** 请用户在 :4100 `/order/gantt` 确认:拖拽改期(平移/两端缩放按天吸附)、悬停快捷开工/完工、可编辑详情 Sheet。results 记回执。

---

# Phase 4 · 2i2 3D 仿真联调(只读 + 数据完整性)

## Task 4.1：数据完整性 SQL(决定 3D 是否空白/错位)

**Files:** 仅 results

- [ ] **Step 1：库位 warehouse_id 悬空检查**

```bash
/usr/local/mysql/bin/mysql -uroot -p12345678 mes_data -e "SELECT COUNT(*) AS dangling_loc FROM sp_warehouse_location l LEFT JOIN sp_warehouse w ON l.warehouse_id=w.id WHERE w.id IS NULL OR l.warehouse_id IS NULL;"
```
Expected: `0`。>0 → 这些库位会致 3D zone 空白。

- [ ] **Step 2:库存 location_id 悬空检查**

```bash
/usr/local/mysql/bin/mysql -uroot -p12345678 mes_data -e "SELECT COUNT(*) AS dangling_inv FROM sp_inventory i LEFT JOIN sp_warehouse_location l ON i.location_id=l.id WHERE l.id IS NULL OR i.location_id IS NULL;"
```
Expected: `0`。>0 → 这些库存无法落到任何货架(热力丢失)。

- [ ] **Step 3:一库位一行(UNIQUE location_id)检查**

```bash
/usr/local/mysql/bin/mysql -uroot -p12345678 mes_data -e "SELECT location_id,COUNT(*) c FROM sp_inventory GROUP BY location_id HAVING c>1; SHOW INDEX FROM sp_inventory WHERE Column_name='location_id';"
```
Expected: 第一条无输出(无重复库位);第二条显示 location_id 上有 UNIQUE 索引。若有重复 → `inventoryByLoc` Map 会覆盖,记录并决定(修数据或前端聚合)。

- [ ] **Step 4:inventory.warehouse_id 与 location 归属一致性**

```bash
/usr/local/mysql/bin/mysql -uroot -p12345678 mes_data -e "SELECT COUNT(*) AS mismatch FROM sp_inventory i JOIN sp_warehouse_location l ON i.location_id=l.id WHERE i.warehouse_id<>l.warehouse_id;"
```
Expected: `0`(冗余 warehouse_id 与库位归属一致)。>0 仅影响显示,记录。

> 任一悬空/不一致:优先**前端容错**(`simulationModel.ts` 的 `buildSceneModel` 跳过悬空项,不静默错位)而非删数据;若是种子数据缺陷则 results 记原因。本步是否触发修复取决于结果。

## Task 4.2:仿真 3 只读端点契约验证

- [ ] **Step 1:仓库列表 + 库位 + 库存全量**

```bash
curl -sS -b /tmp/mes-cookies.txt -H 'X-Requested-With: XMLHttpRequest' http://localhost:9090/basedata/warehouse/list
WH=$(/usr/local/mysql/bin/mysql -uroot -p12345678 mes_data -N -e "SELECT id FROM sp_warehouse LIMIT 1;")
curl -sS -b /tmp/mes-cookies.txt -H 'X-Requested-With: XMLHttpRequest' http://localhost:9090/basedata/warehouse/locations/$WH
curl -sS -b /tmp/mes-cookies.txt -H 'X-Requested-With: XMLHttpRequest' -X POST http://localhost:9090/inventory/page -d 'current=1&size=100000'
```
Expected: 三个都 `"code":0`;list 是仓库数组、locations 是库位数组(含 `warehouseId`)、inventory `data.records` 是库存数组(含 `locationId`)。与 SQL `COUNT(*)` 行数对得上。

- [ ] **Step 2:归档 + 提交**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack
git add docs/superpowers/plans/2026-06-18-mes-new-cycle2k-verify-results.md
git commit -m "✅ test(mes): 2k 周期2i2 仿真取数 + 数据完整性 SQL 验证(外键无悬空/一库位一行证据)"
```

## Task 4.3:2i2 人工抽查(用户)

- [ ] **Step 1：** 请用户在 :4100 `/digitization/simulation` 确认:3D 场景渲染、热力着色、hover 高亮、点库位详情 Sheet、一键全屏(注意勿重开 StrictMode)。results 记回执。

---

# Phase 5 · 工艺查询只读页 `/technology/process-query`

## Task 5.1:路由注册(三处对齐,零后端改动)

**Files:**
- Modify: `mes/frontend/apps/mes-new/src/router.tsx:64`(在 process-content 之后加 child route)
- Modify: `mes/frontend/apps/mes-new/src/layouts/routeMeta.ts`(加路由元数据)

- [ ] **Step 1：router.tsx 加懒加载 import + child route**

在文件懒加载区(与 `ProcessContentList` 同处)加:

```tsx
const ProcessQueryPage = lazy(() => import('./pages/technology/process-query/ProcessQueryPage'))
```

在 `AdminLayout` children 中、`{ path: 'technology/process-content', element: <ProcessContentList /> }` 之后插入:

```tsx
            { path: 'technology/process-query', element: <ProcessQueryPage /> },
```

(若该处用 Suspense 包裹懒加载组件,按邻近 `ProcessContentList` 同样的写法包裹。)

- [ ] **Step 2：routeMeta.ts 加元数据**

在 process-flow 条目前(或工艺组内)加:

```ts
  '/technology/process-query': { title: '产品工艺查询', icon: 'search' },
```

(title 对齐 `sp_sys_menu` 菜单名「产品工艺查询」;icon 取既有图标键,无 `search` 则用工艺组同款。)

- [ ] **Step 3：占位组件 + check-types 通过(先让路由可解析)**

先创建最小占位 `mes/frontend/apps/mes-new/src/pages/technology/process-query/ProcessQueryPage.tsx`:

```tsx
export default function ProcessQueryPage() {
  return <div>工艺查询(building...)</div>
}
```

Run: `cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack/mes/frontend && pnpm --filter mes-new check-types`
Expected: 0 error。

- [ ] **Step 4：提交**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack
git add mes/frontend/apps/mes-new/src/router.tsx mes/frontend/apps/mes-new/src/layouts/routeMeta.ts mes/frontend/apps/mes-new/src/pages/technology/process-query/ProcessQueryPage.tsx
git commit -m "✨ feat(mes-new): 2k 注册工艺查询只读页路由(/technology/process-query, 菜单116, 占位)"
```

## Task 5.2:实现 `ProcessQueryPage`(纯只读)

**Files:**
- Modify: `mes/frontend/apps/mes-new/src/pages/technology/process-query/ProcessQueryPage.tsx`
- 复用(不改):`api/technology/process-content.ts`(`processContentProducts/processContentList/processContentGet/processContentBomItems`)、`types/technology.ts`、`components/{PageContainer,MasterDetailLayout,MultiImageUpload}`、`@workspace/ui` 的 `{TreeDataTable,DataTable,Tabs*,Textarea,Badge,Select*}`、`utils/{productBom.buildBomNodeTree, imageKeys.parseKeys}`、`http/hooks.useQuery$`

- [ ] **Step 1:先精读参考页**

读 `mes/frontend/apps/mes-new/src/pages/technology/process-content/ProcessContentList.tsx` 全文,重点:
- `ContentStatusBadge`(`:77-88`)、`levelLabel`(`:91-96`)→ 直接复制到本页(或抽到 shared,本周期就地复制保持低风险)
- 左侧 `TreeDataTable`(`:233-239`)列定义与 `buildBomNodeTree` 用法
- 右侧 Tabs(`:546-555` 7 个 trigger)与各 tab 渲染:工序图片(`:567-576`)、检验图片(`:601-610`)、物料清单表(`:494-510` `bomItemColumns`)、设备/文档 DataTable
确认 `useQuery$` 的精确签名与 `processContent*` 函数返回类型,本页**严格按 ProcessContentList 的用法**调用(避免签名臆测)。

- [ ] **Step 2:实现只读页(数据层 + 只读渲染)**

用如下结构实现(数据 hook 用 ProcessContentList 同款 `useQuery$`;**所有输入 disabled、无任何写按钮**):

```tsx
import { useState } from 'react'
import { useQuery$ } from '@/http/hooks'
import {
  processContentProducts, processContentList, processContentGet, processContentBomItems,
} from '@/api/technology/process-content'
import { buildBomNodeTree } from '@/utils/productBom'
import { parseKeys } from '@/utils/imageKeys'
import PageContainer from '@/components/PageContainer'
import MasterDetailLayout from '@/components/MasterDetailLayout'
import MultiImageUpload from '@/components/MultiImageUpload'
import { TreeDataTable, DataTable, Tabs, TabsList, TabsTrigger, TabsContent, Textarea, Select, SelectТrigger, SelectContent, SelectItem, Badge } from '@workspace/ui'
// ↑ 精确导入名以 ProcessContentList 实际 import 为准(本页 mirror 它)

export default function ProcessQueryPage() {
  const [rootId, setRootId] = useState<string>('')
  const [bomId, setBomId] = useState<string>('')

  const products = useQuery$(() => processContentProducts(), { /* 同 ProcessContentList */ })
  const nodes = useQuery$(() => processContentList(rootId), { enabled: !!rootId })
  const detail = useQuery$(() => processContentGet(bomId), { enabled: !!bomId })
  const bomItems = useQuery$(() => processContentBomItems(bomId), { enabled: !!bomId })

  const treeData = buildBomNodeTree(nodes.data ?? [])
  const content = detail.data?.content ?? null

  return (
    <PageContainer title="产品工艺查询">
      {/* 产品下拉:products.data → Select onValueChange={setRootId} */}
      <MasterDetailLayout
        master={
          <TreeDataTable
            data={treeData}
            /* 列: nodeName(onClick=setBomId(node.bomNode.id)) / levelLabel / ContentStatusBadge */
          />
        }
        detail={
          <Tabs defaultValue="main">
            <TabsList>
              <TabsTrigger value="main">主信息</TabsTrigger>
              <TabsTrigger value="req">工序要求</TabsTrigger>
              <TabsTrigger value="insp">检验</TabsTrigger>
              <TabsTrigger value="note">注意事项</TabsTrigger>
              <TabsTrigger value="equip">工装设备</TabsTrigger>
              <TabsTrigger value="doc">技术文档</TabsTrigger>
              <TabsTrigger value="bom">物料清单</TabsTrigger>
            </TabsList>
            <TabsContent value="main">{/* content 主信息字段, Textarea disabled */}</TabsContent>
            <TabsContent value="req">
              <Textarea value={content?.requirements ?? ''} disabled />
              <MultiImageUpload value={parseKeys(content?.contentImages)} disabled />
            </TabsContent>
            <TabsContent value="insp">
              <Textarea value={content?.inspectionRequired ?? ''} disabled />
              <MultiImageUpload value={parseKeys(content?.inspectionImages)} disabled />
            </TabsContent>
            <TabsContent value="note"><Textarea value={content?.notes ?? ''} disabled /></TabsContent>
            <TabsContent value="equip"><DataTable data={detail.data?.equipment ?? []} /* 设备列, 无操作列 */ /></TabsContent>
            <TabsContent value="doc"><DataTable data={detail.data?.documents ?? []} /* 文档列, 无删除列 */ /></TabsContent>
            <TabsContent value="bom"><DataTable data={bomItems.data ?? []} /* materialCode/materialDesc/quantity/unit */ /></TabsContent>
          </Tabs>
        }
      />
    </PageContainer>
  )
}
```

实现细则(对齐 ProcessContentList,但删除所有写交互):
- 字段名以 `types/technology.ts` 的 `SpProcessContent`/`ProcessContentDetailVO` 为准(`content.mainInfo/requirements/inspectionRequired/notes/contentImages/inspectionImages/status`)。
- 图片用 `MultiImageUpload ... disabled`(disabled 自动隐藏删除/上传,见 `MultiImageUpload.tsx:54-69`)。
- 设备/文档/物料表用 `DataTable`,**不带**新增/编辑/删除/上传列。
- 主信息含 `ContentStatusBadge`(草稿/已完成/未编制)。
- 无 `useState` 表单受控写入,无 mutation。规避 RHF 字段名坑(本就无 RHF)。

- [ ] **Step 3:check-types + lint + build**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack/mes/frontend
pnpm --filter mes-new check-types && pnpm --filter mes-new lint && pnpm --filter mes-new build
```
Expected: 0 error;build 成功(process-query 进入懒加载独立 chunk)。tsc 会捕获任何 api/组件签名不匹配 —— 据报错对照 ProcessContentList 修正。

- [ ] **Step 4:提交**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack
git add mes/frontend/apps/mes-new/src/pages/technology/process-query/ProcessQueryPage.tsx
git commit -m "✨ feat(mes-new): 2k 工艺查询只读页(产品→BOM树→只读详情Tabs, 复用4只读端点, 全新UI)"
```

## Task 5.3:process-query 端到端验证(脚本 + 人工)

- [ ] **Step 1:脚本验 4 个 GET 端点**

```bash
curl -sS -b /tmp/mes-cookies.txt -H 'X-Requested-With: XMLHttpRequest' http://localhost:9090/technology/process-content/products
ROOT=$(/usr/local/mysql/bin/mysql -uroot -p12345678 mes_data -N -e "SELECT id FROM sp_product_bom WHERE level=0 LIMIT 1;")
curl -sS -b /tmp/mes-cookies.txt -H 'X-Requested-With: XMLHttpRequest' http://localhost:9090/technology/process-content/list/$ROOT
BOM=$(/usr/local/mysql/bin/mysql -uroot -p12345678 mes_data -N -e "SELECT id FROM sp_product_bom WHERE id IN (SELECT bom_id FROM sp_process_content LIMIT 1);")
curl -sS -b /tmp/mes-cookies.txt -H 'X-Requested-With: XMLHttpRequest' http://localhost:9090/technology/process-content/get/$BOM
curl -sS -b /tmp/mes-cookies.txt -H 'X-Requested-With: XMLHttpRequest' http://localhost:9090/technology/process-content/bom-items/$BOM
```
Expected: 四个都 `"code":0`;products 为产品数组、list 为节点数组(bomNode+content)、get 为 `ProcessContentDetailVO`(含 imageUrls 重签)、bom-items 为物料数组。

- [ ] **Step 2:人工抽查(用户)**

请用户在 :4100 经侧边栏「产品工艺查询」进入 `/technology/process-query`:选产品→点 BOM 树节点→右侧只读 Tabs(主信息/要求/检验/设备/文档/物料 + 图片)展示正确、**无任何编辑入口**。MinIO 起着以便图片重签可见。results 记回执。

- [ ] **Step 3:归档 + 提交**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack
git add docs/superpowers/plans/2026-06-18-mes-new-cycle2k-verify-results.md
git commit -m "✅ test(mes-new): 2k 工艺查询只读页端到端验证(4只读端点 + 人工抽查证据)"
```

---

# Phase 6 · 收尾

## Task 6.1:全量回归验证

- [ ] **Step 1:前端四件套**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack/mes/frontend
pnpm --filter mes-new check-types && pnpm --filter mes-new lint && pnpm --filter mes-new build
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack/mes/frontend/apps/mes-new && pnpm test
```
Expected: check-types/lint 0 err;build 成功;test 全绿(不回归)。

- [ ] **Step 2:后端编译 + 改动模块测试**

```bash
export JAVA_HOME=/Library/Java/JavaVirtualMachines/amazon-corretto-11.jdk/Contents/Home
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack/mes
mvn -q -DskipTests compile && mvn -q test -Dtest=SpTableManagerServiceImplTest
```
Expected: `BUILD SUCCESS`;`Tests run: 4, Failures: 0`。

## Task 6.2:更新 roadmap memory + backlog

- [ ] **Step 1:更新 `mes-rebuild-roadmap.md`**

追加「周期 2k 已完成」段:验证基建(mes.captcha.enabled 开关 + login.sh + admin/123)、4 周期联调结论(2j 删除事务已修;2h 入库/FIFO/手工入库已验,库房类型 by-design;2g3 状态机守卫全过;2i2 数据完整性 + 取数已验)、process-query 上线。把 results 文档路径与本计划路径写入。

- [ ] **Step 2:记 backlog(2k-backlog)**

在 roadmap 记:库存台账 upsert 无行锁(并发)、`size=100000` 全量、动态表无乐观锁、甘特 5 表 JOIN 无索引、库房类型抽常量、`SysLoginController.main()` 死代码可删、2j 字段白名单(Layer2)。

- [ ] **Step 3:提交 memory(memory 在 `~/.claude/...` 非本仓库,直接写文件无需 git)**

更新 `MEMORY.md` 指针行(若新增 backlog 记忆文件)。

## Task 6.3:分支收尾

- [ ] **Step 1:** 调用 superpowers:finishing-a-development-branch,按其指引决定合并/PR/清理(当前分支 `feat/frontend-rebuild`)。

---

## Self-Review(写计划后自检)

- **Spec 覆盖:** §2 验证基建→Phase 0;§3.1 2j→Phase 1;§3.2 2h→Phase 2;§3.3 2g3→Phase 3;§3.4 2i2→Phase 4;§4 process-query→Phase 5;§6 DoD→Phase 6。全覆盖。
- **契约修正:** FIFO/库房类型已据契约抽取改为"验证非修复",与 spec §3.2/§5 的假设差异已在「契约抽取已修正」段显式说明(spec 同步小修见配套提交)。
- **类型/签名一致:** `removeWithItems(String)` 接口/实现/controller/测试四处一致;`deleteItemBytableNameId` 返回 void(测试不 stub 返回值);curl 字段名与契约抽取一致(itemId/warehouseId/locationId/planStartTime 等);表名以实时库 `SHOW TABLES` 为准。
- **占位扫描:** 状态列名 `dispatch_status` 在 Task 3.1 用 DESCRIBE 实证后再用;process-query 组件精确 import 名要求实现时 mirror ParentList(tsc 兜底)。无 TBD/TODO。
