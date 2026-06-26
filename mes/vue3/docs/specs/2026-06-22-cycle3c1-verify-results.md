# Cycle 3c-1 工艺内容编制 — 验证结果

> 分支 `feature/process-content`。subagent 驱动逐簇两阶段审查(spec + 质量)+ 独立后端审查。

## 门禁(全绿)

| 检查 | 结果 |
|---|---|
| `pnpm typecheck` | 0 报错 |
| `pnpm test` | 30 文件 / **331 例**全绿(较实现前 +12:processContent 纯函数) |
| `pnpm lint:check` | 0 error(5 既有 warning,均 `api/request.ts`/`tests/dashboard.spec.ts`) |
| `pnpm build` | 成功;ProcessContentPage 独立懒加载 chunk |

## 逐簇审查结论

- **Cluster A 基础层**(types + API + utils TDD + MultiImageUpload):spec ✅ / 质量 approve。修:MultiImageUpload `:key` 去 `?? i` 用稳定 key + 补 buildEquipmentPayload 测试。微调:SpProductBomItem 真实字段 `material*`(非 materiel*);MultiImageUpload 用 http-request 模式对齐 ImageUpload。
- **Cluster B 编辑器**(7 Tab + 状态机 + contentId 引导):spec ✅(无 issue)/ 质量 approve。子表用原生 el-table(避开 DataTable 无条件分页条),物料列 `material*`,PDF http-request 上传。
- **Cluster C 主从页 + 接线**:spec ✅ / 质量 approve。
  - **Important 修复**(B 审查发现):编辑器子资源(设备/文档)CRUD 下沉为编辑器内**直调 API + emit reload**(对齐已有 doc-upload 直调模式),`onEquipSubmit` 成功才关弹窗、失败保留输入;emit 精简为 save/complete/reload。
  - **Minor 修复**:EquipmentForm watch 改监听 modelValue 打开沿(防连续新增残留);PDF 补 20MB 上限;selectNode + reloadNode token 守卫防快速切节点乱序。
  - **C 审查跟进**:路由补 `meta:{title,perm}`;**reloadNode 改静默刷新**(不清空 detail → 编辑器不卸载、保存后保留当前 Tab),`activeTab` 重置移出 refill watch(切节点靠 `:key` 重挂自然回 main)。

## 后端独立审查(按 backend-deepseek-review-each-cycle)

结论:**ZERO EXPOSED BUGS,零后端改动**。逐项佐证(`SpProcessContentController` + ServiceImpl + MinioUtil):
- `save` 状态机:创建置 draft+生成 id、同 bomId 复用 id 防重复、更新读 existing 保 status、拒改 completed、不信任客户端 status。
- `complete` 置 completed 幂等;`validateEditableParent` 三态(缺失/不存在/已完成)全覆盖,父锁定后子表不可改。
- 图片/文档 key 重签管线 `resolveUrls`/`resolveUrl`(presignedGetUrl)正确;upload 返回裸 key,`get` 单次重签 → **新数据不双重签名**。
- `document/delete` 先取记录后删、清 MinIO 容错。
- `getOne(qw,false)` 防多条崩溃;content 为 null 不查子表无 NPE。

### 后端 backlog(latent/越界,本周期前端不触发,不修)

1. **遗留数据双签 latent**:`resolveUrl` 无条件 `presignedGetUrl`,若历史数据存的是完整 URL(非裸 key)会再签一次致 404;**vue3 新建数据全存裸 key 不受影响**(同 mes-new 2f/2k backlog;若库有遗留可加 `startsWith("http")` 短路)。
2. presigned URL 7 天过期:`get` 每次实时重签,前端只持久化 key、展示前重取 url(前端已遵守)。
3. upload-image 无 MIME/大小校验(upload-document 已校验 PDF):加固项,前端 MultiImageUpload 已做 2MB + 类型前置校验。

## 人工 :4200 冒烟待确认

前置:后端 9090(dev 免验证码,`admin/123`)+ dev DB 有产品 BOM 数据 + 菜单 115 已存在。
- 登录 → 工艺技术 →「工艺内容编制」→ 选产品 → 进入编制 → 左 BOM 树点节点
- 主信息填 mainInfo/content → 保存 → 设备/文档 Tab 解锁(contentId 引导)
- 工序图/检验图多图上传、检验 Switch、各 textarea
- 工装设备 增/改(成功才关弹窗)/删(确认);技术文档 PDF 上传/删
- 物料清单只读展示(material* 字段)
- 完成编制(确认)→ 全只读(按钮隐藏、输入禁用、Tab 仍可切)
- 快速切换不同节点验证 detail/物料不错配;保存后停留当前 Tab(不跳回主信息)
