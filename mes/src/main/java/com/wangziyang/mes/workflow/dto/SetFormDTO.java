package com.wangziyang.mes.workflow.dto;

/** 关联/清除流程表单请求体(formKey 为 null 表示清除) */
public class SetFormDTO {
    private String id;
    private String formKey;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getFormKey() { return formKey; }
    public void setFormKey(String formKey) { this.formKey = formKey; }
}
