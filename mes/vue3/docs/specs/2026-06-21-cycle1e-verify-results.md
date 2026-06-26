# 子周期 1e 数字化大屏 — 验证记录

- 日期:2026-06-21
- 分支:`feature/digitization-dashboard`

## 后端端点审查(按 backend-deepseek-review-each-cycle)

审查范围:`digitization` 模块 `GET /digitization/dashboard/overview`(DashboardController / DashboardServiceImpl / DashboardMapper(.xml) / dto / DashboardServiceImplTest)。逐组核对 5 组聚合语义。

### 逐组结论

| 组 | 结论 | 说明 |
|---|---|---|
| KPI.orderCount | OK | `sp_order` 无 is_deleted 列(物理删除),`selectCount(null)` 正确 |
| KPI.flowCount | OK | `sp_flow` 无 is_deleted 列,正确 |
| KPI.materielCount | **REAL BUG → 已修** | `sp_materile` 有 is_deleted,原 `selectCount(null)` 未过滤软删(其它列表端点均 `ne("is_deleted","1")`) |
| KPI.deviceCount | **REAL BUG → 已修** | `sp_device` 有 is_deleted,原 `selectCount(null)` 未过滤软删 |
| orderStatus | OK | 状态码 0~4 映射完整,NULL/未知码兜底"未知"不丢行 |
| deviceStatus | **REAL BUG → 已修** | `selectList(null)` 未过滤软删设备;状态码映射(空闲/运行中/维修中/报废)本身正确 |
| orderType | OK | P/A/F → 批量/验证/返工 映射完整,空值跳过 |
| monthlyTrend | LATENT(未改) | SQL 不限时间范围(全表扫描后 Java 取近12月),数据量大有性能隐患;补缺月+升序正确,数据正确。记 backlog。 |

### 修复(最小修正)

`DashboardServiceImpl.java` 三处把 `null` 改为 `new QueryWrapper<>().ne("is_deleted","1")`:
- `materielCount` = `spMaterileMapper.selectCount(ne is_deleted)`
- `deviceCount` = `spDeviceMapper.selectCount(ne is_deleted)`
- `deviceStatus` 数据源 = `spDeviceMapper.selectList(ne is_deleted)`

`sp_order` / `sp_flow` 聚合不动(无 is_deleted 列)。

守卫单测(JUnit4 + Mockito,`DashboardServiceImplTest`):更新原断言为 `any()` 匹配 + 新增 3 例 `ArgumentCaptor` 断言 `getSqlSegment()` 含 `is_deleted`。

`mvn test -Dtest=DashboardServiceImplTest`(JDK11 corretto):**Tests run: 10, Failures: 0, Errors: 0 — BUILD SUCCESS**。提交 `9f172b1`。

### 实机/数据验证

后端当时未在 :9090 运行,curl 跳过;改直连 MySQL `mes_data`(localhost:3306)佐证:
- `sp_order` 7 行(无软删列)、`sp_device` 2 行(均 is_deleted='0')、`sp_materile` 10 行(均 '0')、`sp_flow` 13 行(无软删列)。
- monthlyTrend SQL 实跑:`2026-06: orderCount=7, totalQty=760, completedCount=1` 正确。
- 当前测试库软删数据恰为 0,故 3 个 bug 此前未暴露;修复后对未来软删数据安全。

## 前端验证

门禁(`mes/vue3`):见 Task 10 收尾记录(typecheck / test / lint:check / build)。

## Backlog

- monthlyTrend SQL 全表扫描(无时间范围 WHERE),数据量大时优化为 `create_time >= DATE_SUB(now, 12 month)`。
- 浏览器 :4200 端到端冒烟待用户确认(需后端 :9090 + DB)。
</content>
