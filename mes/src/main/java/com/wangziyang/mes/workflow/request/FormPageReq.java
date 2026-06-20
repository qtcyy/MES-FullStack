package com.wangziyang.mes.workflow.request;

import com.wangziyang.mes.common.BasePageReq;

/** 流程表单分页请求 */
public class FormPageReq extends BasePageReq {

    private String name;
    private String formKey;

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getFormKey() { return formKey; }
    public void setFormKey(String formKey) { this.formKey = formKey; }
}
