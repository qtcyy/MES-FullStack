package com.wangziyang.mes.workflow.request;

import com.wangziyang.mes.common.BasePageReq;

/** 流程模型分页请求 */
public class ModelPageReq extends BasePageReq {

    private String name;
    private String modelKey;

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getModelKey() { return modelKey; }
    public void setModelKey(String modelKey) { this.modelKey = modelKey; }
}
