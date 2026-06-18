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
