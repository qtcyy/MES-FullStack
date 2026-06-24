# 通知中心设计文档（发布 / 接收 / 查看 一体）

- 日期：2026-06-23
- 分支：feat/system-funcs
- 前端：`mes/vue3`（Vue3 + Element Plus，课程作业前端，端口 4200）
- 后端：`mes`（Java8 / Spring Boot 2.1.7 / MyBatis-Plus / Shiro）
- 数据模型方案：**A（发布即扇出）**

## 1. 背景与目标

为 MES 系统补全「通知中心」系统功能，实现 **发布 → 接收 → 查看** 一体的闭环：

- 管理员（具 `notice:publish` 权限）可发布通知，目标支持 **全员 / 指定用户 / 指定角色 / 指定部门**。
- 普通用户登录后通过 **顶部铃铛（未读角标 + 下拉最近列表）** 和 **通知中心页面** 接收并查看通知。
- 每个用户独立维护自己的「已读 / 未读」状态；查看详情自动标记已读。

### 关键决策（已与用户确认）

| 决策点 | 结论 |
| --- | --- |
| 推送目标范围 | 全员 + 指定用户 / 角色 / 部门 |
| 接收入口 | 顶部铃铛（未读角标 + 下拉） + 通知中心页 |
| 发布权限 | 管理员发布（`notice:publish`），所有人接收 |
| 数据模型 | 方案 A：发布即扇出，通知主体表 + 每用户收件箱表 |

### 方案 A 取舍说明

发布时把目标规则解析成**具体 userId 列表**，批量写入收件箱表。接收 / 已读 / 未读数全部退化为收件箱单表的简单查询，与现有 MyBatis-Plus 单表 CRUD 约定一致。已知缺点：发给全员会生成 N 行；发布之后**新增**的用户看不到历史通知。对课程项目规模可接受。

## 2. 数据库设计

### 2.1 通知主体表 `sp_sys_notice`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | varchar(64) | 雪花 ID（BaseEntity） |
| title | varchar(255) | 标题 |
| content | text | 正文 |
| type | varchar(16) | info / success / warning / error |
| target_type | varchar(16) | all / user / role / dept |
| target_ids | varchar(1024) | 目标 id 列表（逗号分隔，target_type=all 时为空），审计 / 回显用 |
| target_desc | varchar(512) | 目标描述（如「全体用户」「角色：管理员,操作员」），列表展示用 |
| sender | varchar(64) | 发布人 username |
| status | varchar(8) | 状态，固定 `1`=已发布（预留撤回） |
| recipient_count | int | 收件人数（扇出行数） |
| is_deleted | varchar(1) | 软删 '0'/'1' |
| create_time / create_username / update_time / update_username | | BaseEntity 自动填充 |

### 2.2 收件箱表 `sp_sys_notice_user`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | varchar(64) | 雪花 ID |
| notice_id | varchar(64) | 关联 sp_sys_notice.id |
| user_id | varchar(64) | 收件人 |
| is_read | varchar(1) | '0' 未读 / '1' 已读 |
| read_time | datetime | 首次已读时间，可空 |
| is_deleted | varchar(1) | 用户删除自己收件箱行 '0'/'1' |
| create_time / create_username / update_time / update_username | | BaseEntity |

索引：`idx_notice_user_uid (user_id, is_read, is_deleted)` 加速未读数与收件箱分页；`idx_notice_user_nid (notice_id)` 加速已读统计。

### 2.3 收件人解析规则

- `all`：查 `sp_sys_user` 中 `is_deleted != '1'` 的全部用户。
- `user`：target_ids 即 userId 列表。
- `role`：查 `sp_sys_user_role` 中 `role_id in (target_ids)` 的 user_id，去重。
- `dept`：查 `sp_sys_user` 中 `dept_id in (target_ids)`（精确部门，不含子部门——YAGNI）的用户。
- 解析结果统一去重；为空则发布失败返回提示。

### 2.4 菜单 seed（`scripts/sql/notice-menu-seed.sql`）

父菜单为「系统管理」（parent_id 沿用现有系统管理目录 id，落地前用 SQL 核对实际 id）。

- 「通知中心」 url=`/admin/sys/notice/list-ui` type=1 —— 收件，登录用户可见。
- 「通知发布」 url=`/admin/sys/notice/admin-ui` permission=`notice:publish` type=1 —— 管理员。

> 注意（依据记忆）：侧边栏由 `sp_sys_menu` 驱动且不按角色过滤；前端路由 path 必须匹配菜单 url（去 `/admin` 前缀、去 `/list-ui` 后缀），否则点不进。落地时逐条核对。

## 3. 后端设计（`com.wangziyang.mes.system`）

### 3.1 分层文件

- 实体：`entity/SysNotice.java`、`entity/SysNoticeUser.java`（继承 `BaseEntity`）
- DTO/VO：`dto/SysNoticeInboxDTO.java`（收件箱行 + 展开的 notice 标题/内容/类型）、`vo/NoticeReadStatVO.java`（已读/未读人数）
- Request：`request/SysNoticePageReq.java`、`request/SysNoticeInboxPageReq.java`（继承 `BasePageReq`）、`dto/NoticePublishReq.java`（title/content/type/targetType/targetIds[]）
- Mapper：`SysNoticeMapper`、`SysNoticeUserMapper`（+ `mapper/system/SysNoticeUserMapper.xml` 联表查收件箱）
- Service：`ISysNoticeService` / `impl`、`ISysNoticeUserService` / `impl`
- Controller：`controller/admin/SysNoticeController`、`controller/admin/SysNoticeUserController`

### 3.2 发布端 `SysNoticeController`（`/admin/sys/notice`，需 `notice:publish`）

| 端点 | 方法 | 说明 |
| --- | --- | --- |
| `/publish` | POST | 收 NoticePublishReq → 校验 → service 解析收件人 → 事务内建 notice 主体 + 批量插收件箱 → 返回 noticeId。`sender` 取 `getSysUser().getUsername()`。 |
| `/page` | POST | 已发布通知分页（管理员视角，含 recipientCount、target_desc），按 update_time 倒序。 |
| `/get-by-id` | GET | 通知详情。 |
| `/read-stat` | GET | 某条通知已读/未读人数（NoticeReadStatVO）。 |
| `/delete` | POST | 软删 notice 主体 + 其全部收件箱行（事务）。 |

收件人解析放 service 层，注入 `ISysUserService` / 用户角色 mapper / 部门查询。批量插入用 MyBatis-Plus `saveBatch`。

### 3.3 接收端 `SysNoticeUserController`（`/admin/sys/notice/inbox`，登录即可）

| 端点 | 方法 | 说明 |
| --- | --- | --- |
| `/page` | POST | 我的通知分页（联 notice 表取标题/内容/类型/发布人/时间），`user_id=当前用户` 且未删，支持 titleLike / isRead 筛选。 |
| `/unread-count` | GET | 我的未读数（铃铛轮询）。 |
| `/recent` | GET | 最近 N 条（默认 10，铃铛下拉）。 |
| `/detail` | GET | 看详情：返回 notice 内容 + 收件箱行；**副作用**：若未读则置已读 + 记 read_time。 |
| `/mark-read` | POST | 标记单条已读（幂等）。 |
| `/mark-all-read` | POST | 我的全部未读置已读。 |
| `/delete` | POST | 删除我收件箱里某条（软删，不影响他人）。 |

所有接收端端点都以 `getSysUser()` 的 userId 为过滤条件，杜绝越权读他人通知。

## 4. 前端设计（`mes/vue3/src`）

### 4.1 类型（`types/system.ts`）

`SysNotice`、`SysNoticeUser`（含展开 title/content/type/sender）、`SysNoticePageReq`、`SysNoticeInboxPageReq`、`NoticePublishReq`、`NoticeReadStat`。

### 4.2 API（新建 `api/system/notice.ts`）

- 发布端：`noticePublish` / `noticePage` / `noticeGetById` / `noticeReadStat` / `noticeDelete`
- 接收端：`inboxPage` / `inboxUnreadCount` / `inboxRecent` / `inboxDetail` / `inboxMarkRead` / `inboxMarkAllRead` / `inboxDelete`

`noticePublish` 含数组 `targetIds`，沿用 `request.ts` 的 form-urlencoded（数组会 append 多值）。

### 4.3 页面

1. `views/system/notice/NoticeInbox.vue`（路由 `system/notice`）—— 通知中心。`SearchForm`（标题 / 已读状态）+ `DataTable`，列：标题、类型 tag、发布人、时间、已读状态。未读行视觉强调（加粗 + 小圆点）。行操作：查看详情、删除。顶部「全部已读」按钮。
2. `views/system/notice/NoticeDetail.vue` —— `FormDialog`/抽屉展示详情，打开即调 `inboxDetail`（自动已读 → 刷新列表 + 铃铛未读数）。
3. `views/system/notice/NoticePublish.vue`（路由 `system/notice/admin`，`v-permission="'notice:publish'"`）—— 发布管理页。`FormDialog` 发布表单：标题、正文（textarea）、类型（select）、目标类型（radio：all/user/role/dept）+ 联动目标选择器（用户多选 / 角色多选 / 部门 tree-select）。下方 `DataTable` 已发布列表，行可看已读统计、删除。

### 4.4 顶部铃铛 `components/NoticeBell.vue`（挂到 `AdminLayout` Header）

- `el-badge` 包 `el-icon`(Bell)，`@vueuse` `useIntervalFn` 每 30s 轮询 `inboxUnreadCount`（仅登录态；组件卸载停）。
- `el-popover` 下拉显示 `inboxRecent` 最近 10 条；点条目 → 跳详情并标记已读；底部「查看全部」→ 通知中心页。
- 轻量 `stores/notice.ts`(pinia) 持有 unreadCount；发布 / 标记已读后主动 `refresh()`，不必等轮询。

### 4.5 路由（`router/index.ts`）

```
{ path: 'system/notice',       component: NoticeInbox,   meta: { title: '通知中心' } }
{ path: 'system/notice/admin', component: NoticePublish, meta: { title: '通知发布', perm: 'notice:publish' } }
```

path 严格对齐 §2.4 菜单 url。

## 5. 测试与验证

- **后端** `mvn test`（系统 mvn + JDK11，`./mvnw` 已知损坏）：重点测收件人解析（all/role/dept 展开正确 + 去重）、发布事务、mark-read 幂等、unread-count 统计、越权过滤。
- **前端** `pnpm --filter vue3 exec vue-tsc --noEmit` + `pnpm build`。
- **端到端冒烟**（dev 已关验证码，admin/123）：发布全员通知 → 普通用户铃铛角标 +1 → 打开详情 → 角标归零 → 管理端查已读统计。

## 6. 不做（YAGNI）

- 不做撤回 / 编辑已发布通知（status 字段预留）。
- 不做实时 WebSocket 推送（轮询足够）。
- 不做部门子部门递归展开（精确部门匹配）。
- 不做用户互发（站内信），仅管理员发布。
- 不做发布给「发布之后新增用户」的追溯（方案 A 固有取舍）。

## 7. 落地顺序

1. SQL：建两张表 + 菜单 seed（核对系统管理父菜单 id）。
2. 后端：实体 → mapper(+xml) → service → controller，两套（发布 / 接收）。
3. 后端编译 + 单测。
4. 前端：types → api → 三个页面 → 铃铛 + store → 路由。
5. 前端类型检查 + build。
6. 端到端冒烟。
7. 提交（`/commit`，中文 message）。
