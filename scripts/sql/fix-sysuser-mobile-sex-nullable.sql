-- ============================================================================
-- 修复:新建用户报 "Field 'mobile' doesn't have a default value"
-- ----------------------------------------------------------------------------
-- 根因:sp_sys_user.mobile / sex 业务上可选(新建用户表单只收集 用户名/姓名/密码),
--       却被建成 NOT NULL 且无默认值。MyBatis-Plus 对 null 字段不写入 INSERT,
--       MySQL 严格模式 (STRICT_TRANS_TABLES) 下直接拒绝插入。
-- 修法:两列改为可空(DEFAULT NULL)。
--       mobile 上有唯一索引 idx_sp_sys_user_mobile,故必须用 NULL 而非空串默认值,
--       否则第二个"无手机号"用户会撞唯一键(MySQL 唯一索引允许多个 NULL)。
-- 适用:对已存在的库执行一次即可;新库由 schema 文件直接建对。
-- 日期:2026-06-27
-- ============================================================================

ALTER TABLE `sp_sys_user`
  MODIFY COLUMN `mobile` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL COMMENT '手机号',
  MODIFY COLUMN `sex`    char(1)     CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL COMMENT '性别(0:女;1:男;2:其他)';
