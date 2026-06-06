package com.wangziyang.mes.system.request;

import com.wangziyang.mes.common.BasePageReq;

public class SpTeamPageReq extends BasePageReq {

    private String name;
    private String code;

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
}
