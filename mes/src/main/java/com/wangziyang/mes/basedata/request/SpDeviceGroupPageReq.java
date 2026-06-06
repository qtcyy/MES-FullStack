package com.wangziyang.mes.basedata.request;

import com.wangziyang.mes.common.BasePageReq;

/**
 * 设备组分页查询请求
 *
 * @author wangziyang
 */
public class SpDeviceGroupPageReq extends BasePageReq {
    private String name;
    private String code;

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
}
