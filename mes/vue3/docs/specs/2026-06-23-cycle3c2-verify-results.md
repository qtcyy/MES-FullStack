# Cycle 3c-2 工艺查询只读页 — 验证结果

- 日期：2026-06-23
- 分支：`feature/process-query`（从 `develop` 切）
- 结论：**READY TO MERGE**（subagent 驱动逐任务两阶段审查 + 后端只读审查 + opus 整体终审）

## 交付物

- `/technology/process-query`（菜单 116「产品工艺查询」，perm `process-query:list`），按产品浏览 BOM 结构、纯只读查看各节点工艺文件（7 Tab）。**Cycle 3 收官、整条业务线完结。**
- **零后端生产代码改动**。
- 新文件：
  - `src/views/technology/process-query/ProcessQueryDetail.vue`（只读 7 Tab 查看器）
  - `src/views/technology/process-query/ProcessQueryPage.vue`（编排：选产品即展开主从 + 自动选根 + selToken 守卫）
- 改动文件：
  - `src/utils/processContent.ts`（+`levelLabel`）
  - `tests/processContent.spec.ts`（+levelLabel 2 例）
  - `src/router/index.ts`（+process-query 路由）
  - `src/utils/urlMap.ts`（+自映射）

## 关键事实（实证）

- 菜单 116 **已存在 dev DB**（`SELECT` 实查：id=116、name=产品工艺查询、url=`/technology/process-query`、permission=`process-query:list`、parent_id=15）→ **零 menu seed SQL**。
- 复用 3c-1 的 4 个只读 GET（pcProducts/pcList/pcGet/pcBomItems）+ TreeTable/MasterDetailLayout/PageContainer/MultiImageUpload(disabled) + buildTreeFromList/parseCsvKeys/inspectionToBool。
- 唯一新增逻辑 `levelLabel`（TDD：0→产品/1→半成品/≥2→组件/undefined→产品）。

## 门禁（全绿）

| 门禁 | 结果 |
|---|---|
| `pnpm typecheck` | 0 错误 |
| `pnpm test` | 30 文件 / **333** 用例全绿（+levelLabel 2） |
| `pnpm lint:check` | 0 error（5 既有 warn，dashboard.spec.ts 的 any） |
| `pnpm build` | ✓，`ProcessQueryPage` 独立懒加载 chunk（6.66 kB / gz 2.60 kB） |

## 审查

- **逐任务两阶段审查**：Task1（levelLabel）spec✅；Task2（查看器）spec✅ + 质量 Approved（修了 el-link fileUrl 缺失禁用）；Task3（编排页）spec✅ + 质量 Approved（修了 onPickProduct try/catch 消除未捕获 rejection）；Task4（路由）build 验证放置正确。
- **后端只读审查（按 backend-deepseek-review-each-cycle）**：4 个 GET 端点（`/products`、`/list/{rootId}`、`/get/{bomId}`、`/bom-items/{bomId}`）逐个读码核验 → **ZERO EXPOSED BUGS**。`/list` 含根节点（`result.add(root)` 在首行）、图片 key 单次重签不双签、物料/产品物理删无软删问题。
- **opus 整体终审**：READY TO MERGE，无 Critical/Important，仅风格 Minor；两处偏离 plan（try/catch + 文档链接 disabled）判定为防御性改进。

## backlog（非阻塞）

1. **遗留数据双签 latent**（同 3c-1-backlog）：`sp_process_content` 历史图片若存完整 URL 而非裸 key，`get` 重签会静默返回空串/图坏；新数据存裸 key 不触发。属 2f 图片管线 + 数据迁移。
2. BOM 树 `getTreeByRootId` N+1 递归查询（层级 ≤5，无实际影响）。
3. `/products` 不按状态过滤（返回全部根节点含 draft/locked，当前业务合理）。
4. `statusLabel` 草稿判定看 `content.id`、列表徽标看 `contentStatus==='draft'`，口径不同但结果一致（镜像自 3c-1 编辑器）。

## 待用户确认

人工 :4200 冒烟（需后端 9090 + dev DB 有产品 BOM + 菜单 116）：`admin/123` → 工艺管理 → 产品工艺查询 → 选产品 → 左树自动选中产品根 → 右侧 7 Tab 只读浏览 → 切其它节点验证不错配。
