package com.wangziyang.mes.workflow.dto;

/** 启用/停用流程定义请求体 */
public class SetEnabledDTO {
    private String id;
    private Boolean enabled;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public Boolean getEnabled() { return enabled; }
    public void setEnabled(Boolean enabled) { this.enabled = enabled; }
}
