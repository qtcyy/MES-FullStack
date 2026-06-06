package com.wangziyang.mes.basedata.request;

import com.wangziyang.mes.common.BasePageReq;

/**
 * 仓库分页查询请求
 *
 * @author wangziyang
 */
public class SpWarehousePageReq extends BasePageReq {
    private String name;
    private String code;

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
}
