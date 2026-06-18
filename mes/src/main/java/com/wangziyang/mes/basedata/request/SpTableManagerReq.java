package com.wangziyang.mes.basedata.request;

import com.wangziyang.mes.common.BasePageReq;

/**
 * 通用主数据分页对象
 * @author wangziyang
 * @since 2020/03/15
 */
public class SpTableManagerReq extends BasePageReq {

    /** 表名(模糊查询) */
    private String tableName;

    /** 表描述(模糊查询) */
    private String tableDesc;

    public String getTableName() {
        return tableName;
    }

    public void setTableName(String tableName) {
        this.tableName = tableName;
    }

    public String getTableDesc() {
        return tableDesc;
    }

    public void setTableDesc(String tableDesc) {
        this.tableDesc = tableDesc;
    }
}
