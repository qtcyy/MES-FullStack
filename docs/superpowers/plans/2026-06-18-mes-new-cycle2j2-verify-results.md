# 周期 2j-2 动态表数据维护 — 集成验证结果

- 日期: 2026-06-18
- 范围: Task 7 集成验证(前端四项全检 + 后端单测 + 端到端 curl 实测)
- 结论: **全部通过。** spec §10 的"分页是否生效"待核实项已确认(生效,无需补救)。

## 1. 前端四项全检(`apps/mes-new`)

| 项 | 命令 | 结果 |
|---|---|---|
| 类型检查 | `pnpm check-types` | EXIT 0,0 错 |
| Lint | `pnpm lint` | 0 errors,23 warnings(全为既有 set-state-in-effect / exhaustive-deps / refs 模式,DeptList/RoleForm/http hooks 等既有文件) |
| 单测 | `pnpm test` | **170 passed (20 files)**,含本周期 `managerItem.test.ts` 9 例 |
| 构建 | `pnpm build` | `✓ built in 532ms`(chunk-size 警告为既有 3D/大屏大包,非错误) |

## 2. 后端单测(JDK11)

```
Running com.wangziyang.mes.basedata.common.service.TableNameDataServiceImplTest
Tests run: 8, Failures: 0, Errors: 0, Skipped: 0
BUILD SUCCESS
```

## 3. 端到端 curl 实测

环境:本地 MySQL `localhost:3306/mes_data`(dev 配置已从旧 `192.168.52.76` 改为本地)、`mes.captcha.enabled=false`(dev)、`scripts/verify/login.sh`(admin/123)。后端 `Started SparchetypeApplication in 2.971 seconds`,端口 9090。

> 注:后端在**根路径**提供服务,curl 直连 `http://localhost:9090/basedata/...`(`/api` 仅前端 dev 代理前缀)。

| 步骤 | 验证点 | 证据 |
|---|---|---|
| 登录 | login.sh | `{"msg":"操作成功","code":0}` + cookie |
| 取表 | managerPage | sp_bom `id=1283020801696837633`,`isDeleted="0"` |
| **★分页** | common/page size=2 | `records` 长度=**2**(非全部 13)、`total`=13、`pages`=7、`size`=2、`col="materiel_desc"` |
| **★注入防护** | add-or-update 值=`注入测试'); DROP TABLE sp_bom;--` | `code:0`;sp_bom **未被删**(total 13→14);注入串作为**普通文本**原样入库;新行雪花 id=`1751302916800544` |
| **★is_deleted 缺省** | (同上新增) | 新增未因 `sp_bom.is_deleted` NOT NULL 失败 → 探测到列并自动补 `'0'` 生效 |
| 编辑 | add-or-update id=该行 | `code:0`;该行 `materiel_desc` → `已编辑` |
| 删除 | delete(带 tableNameId) | `code:0`;total 14→13;行消失 |
| **★白名单** | page/add-or-update 伪造 tableName=sys_user(tableNameId 指向 sp_bom)、伪造不存在 tableNameId | 三请求全部触发 `java.lang.RuntimeException: 非法的表标识`(ExceptionAdvice 日志),被拒绝;sys_user 未被读取/写入/污染 |

## 4. 关键结论

1. **分页经 MyBatis-Plus `PaginationInterceptor` 自动生效**(参数是 IPage、返回 List<Map> → 拦截器自动 COUNT + LIMIT)。spec §10「待核实」项消除:**无需补救代码**(探查 agent 担忧的"total 不会被正确计算"是多虑)。
2. **SQL 注入彻底消除**:含 `'); DROP TABLE` 的字段值作为参数化普通文本入库,表结构无损。
3. **表名白名单生效**:伪造/不匹配的 tableName/tableNameId 一律被 `非法的表标识` 拒绝,无法越权读写任意表。
4. **is_deleted 缺省修复生效**:新增不再因 NOT NULL 失败。
5. CRUD 闭环(增/查/改/删)端到端正确。

## 5. 已知非阻塞项(记 2j-2 backlog)

- **basedata/common 端点异常返回 HTML 500 而非 JSON `{code:1,msg}`**:这是全局 `MyErrorViewResolver` 既有风格(非本任务引入)。前端 `ManagerItemPage` 用 `enabled:!!selected` 守卫、只传 managerPage 返回的合法已登记表,**正常路径不触发**;仅"绕过前端伪造参数"时遇到(此时安全拒绝即达目的)。若要前端友好 toast,需改全局异常处理统一返回 JSON Result,属跨模块改动,留 backlog。
- **`ValidationResult` 在 `managerFormUtils` 与 `managerItemUtils` 各定义一次**(2 字段接口轻微重复):提取到 `@/types` 需改 Layer1 既有文件,属跨模块重构,留 backlog。
- **`packages/utils` 有 4 个预存 TS 错误**:与本周期无关(用 `pnpm --filter mes-new exec tsc --noEmit` 可单独验证 mes-new 0 错)。

## 6. 待人工(用户)确认

- **浏览器抽查 :4100**:菜单「基础数据维护」→ 选 sp_bom → 右侧 `materiel_desc` 列数据 → 新增/编辑/删除一行闭环 + 翻页(脚本/后端层已全验,仅 UI 交互层待人工点一遍)。
