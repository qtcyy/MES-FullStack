-- ============================================================
-- 修复: 库位编码唯一约束
-- 问题: idx_loc_code 对 code 全局唯一，导致不同库房无法使用相同库位编码
--       (库位编码如 "1-010101" 仅含 组-排层列，不含库房标识)
-- 方案: 改为 (warehouse_id, code) 复合唯一 —— 库位编码在库房内唯一即可
-- 日期: 2026-06-10
-- ============================================================

ALTER TABLE `sp_warehouse_location` DROP INDEX `idx_loc_code`;
ALTER TABLE `sp_warehouse_location` ADD UNIQUE KEY `idx_loc_wh_code` (`warehouse_id`, `code`);
