# Cycle 3b 动态主数据 — 验证结果

> 分支 `feature/dynamic-master-data`。subagent 驱动逐簇两阶段审查(spec 符合度 + 代码质量)+ 独立后端审查。

## 门禁(全绿)

| 检查 | 结果 |
|---|---|
| `pnpm typecheck` | 0 报错 |
| `pnpm test` | 29 文件 / **319 例**全绿(较实现前 +18:manager 11 + managerData 7) |
| `pnpm lint:check` | 0 error(5 既有 warning,均 `api/request.ts`/`tests/dashboard.spec.ts`,非本周期引入) |
| `pnpm build` | 成功;Layer1/Layer2 各落独立懒加载 chunk(`ManagerList`≈5.7KB / `ManagerDataPage`≈5.4KB / 共享 `manager`≈1KB) |

## 逐簇审查结论

- **Cluster A 基础层**(types + utils TDD + API):spec ✅ / 质量 **approve**(仅 4 个 cosmetic minor)。reviewer 实连后端控制器核对契约,JSON-vs-form 编码、`jsTableName` 平铺键、值参数化全部吻合。
- **Cluster B Layer1 配置页**:spec ✅ / 质量初判 needs work →修:弹窗异步拉取竞态(token 守卫)+ 错误兜底 + rows 陈旧窗口清空 + 删除取消捕获 + v-model 对齐 `DeviceForm` 受控模式。commit `35e2539`。
- **Cluster C Layer2 数据维护页**:spec ✅ / 质量初判 needs work →修:右侧 `loadRows` 加 token 守卫(快速切表乱序返回防列/数据错配,与 selectTable 对等)。commit `423841e`。
- **Cluster D 接线 + 门禁**:urlMap +2 + router +2,菜单 105/106 **已存在于 dev DB**(零 seed SQL)。commit `267a851`。

## 后端独立审查(按 backend-deepseek-review-each-cycle)

结论:**ZERO EXPOSED BUGS,零后端改动**。逐项佐证:
- Layer1 `saveOrUpdateWithItems`:`@Transactional` 在位、更新先删旧明细、明细统一 `setId(null)`+`setTableNameId(header.id)`、返回 header.id;级联删 `removeWithItems` 亦有事务。
- Layer2 注入加固:表名白名单(`assertTableWhitelisted`,校验 tableName 匹配 + is_deleted='0'、返回 DB 登记名)、列名正则(`^[A-Za-z0-9_]+$`)、值 `#{}` 参数化、is_deleted 缺省 putIfAbsent '0';page/save/update/delete 四路径全过白名单。
- `List<Map>` 分页经 PaginationInterceptor 真分页,返回结构与前端约定一致。

### 后端审查发现的前端契约缺口(已在前端修复)

**`sp_table_manager.is_deleted` 为 `NOT NULL` 无默认值**,且 `BaseEntity`/`SpMetaObjectHandler` 不自动填充。dev DB 列定义实证:`is_deleted varchar(1) NO`(无 Default),`permission varchar(255) NO Default ""`。
- 我方原 `buildUpsertPayload` **未提交 `isDeleted`** → Layer1 新建表配置会触发 NOT NULL 约束失败(MyBatis-Plus 默认 NOT_NULL 策略会把 null 字段从 INSERT 省略),且非 "0" 值会让 Layer2 白名单拒绝该表数据维护。
- **修复**:`buildUpsertPayload` 返回体固定 `isDeleted: '0'`(对齐 mes-new 参考实现 `managerFormUtils.ts:66`),并补测试断言。`permission` 有 DB 默认 `""` 故可省略。

## 后端 backlog(latent/越界,非本周期前端触发,不修)

- 全局错误返回依赖 `x-requested-with: XMLHttpRequest` 头(`ExceptionAdvice`/`HttpUtil.isAjax`):无该头时业务异常返回 HTML error/500 而非 JSON Result。前端 axios 已带该头(既有全局行为,所有模块同此)。

## 前端 backlog(非阻塞)

- `ValidationResult` 等类型若与既有 utils 重复可提 `@/types`(未做)。
- 字段类型感知 = 全文本框(YAGNI)。
- Layer2 软删过滤不做(通用动态表不保证有 is_deleted 列)。

## 人工 :4200 冒烟待确认

前置:后端 9090(dev 免验证码,`admin/123`)+ dev DB 已有菜单 105/106(已实证存在)。
- 登录 → 基础数据 →「基础数据配置平台」(动态表配置):新建动态表(填表名/描述 + 增删字段行/上下移/必填开关)→保存→列表出现→编辑回填明细→删除。
- →「基础数据维护」(动态数据维护):左选一张已配置表→右按字段元数据动态出列→新增/编辑动态行(必填校验)→翻页→删除;快速切换不同表验证列与数据不错配。
