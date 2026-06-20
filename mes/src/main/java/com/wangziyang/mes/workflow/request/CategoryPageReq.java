package com.wangziyang.mes.workflow.request;

import com.wangziyang.mes.common.BasePageReq;

/** 流程分类分页请求 */
public class CategoryPageReq extends BasePageReq {

    private String code;
    private String name;

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
}
