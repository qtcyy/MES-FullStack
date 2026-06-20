package com.wangziyang.mes.workflow.request;

import com.wangziyang.mes.common.BasePageReq;

/** 流程定义分页请求 */
public class DefinitionPageReq extends BasePageReq {

    private String name;

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
}
