package com.wangziyang.mes.common.util;

/**
 * 软删除辅助工具。
 *
 * <p>本项目多张表采用软删除（is_deleted 置 '1'）且在业务列上建有唯一索引。
 * 若软删除时不处理唯一列，旧行会继续占用唯一索引值，导致再次新增同值记录触发
 * 唯一键冲突。删除时调用 {@link #freeUniqueValue} 把唯一列改名为「原值前缀#id」，
 * 即可释放索引；id 为雪花串、全局唯一，保证改名后不与任何其它行冲突。</p>
 *
 * @author wangziyang
 */
public final class SoftDeleteUtil {

    private SoftDeleteUtil() {
    }

    /**
     * 生成软删除后用于释放唯一索引的列值：{@code 原值前缀 + "#" + id}。
     *
     * <p>结果长度不超过 {@code maxLen}（对应列的 varchar 长度）。完整 id 始终保留在末尾
     * 以保证唯一，仅在超长时截断原值前缀。</p>
     *
     * @param value  原唯一列值（可为 null）
     * @param id     记录主键（雪花串，保证唯一，不应为空）
     * @param maxLen 唯一列允许的最大字符数（如 varchar(32) 传 32）
     * @return 释放后的唯一列值
     */
    public static String freeUniqueValue(String value, String id, int maxLen) {
        String suffix = "#" + (id == null ? "" : id);
        if (suffix.length() >= maxLen) {
            // 极端情况下 id 本身已超长，直接截断整体
            return suffix.substring(0, maxLen);
        }
        String prefix = value == null ? "" : value;
        int maxPrefix = maxLen - suffix.length();
        if (prefix.length() > maxPrefix) {
            prefix = prefix.substring(0, maxPrefix);
        }
        return prefix + suffix;
    }
}
