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
