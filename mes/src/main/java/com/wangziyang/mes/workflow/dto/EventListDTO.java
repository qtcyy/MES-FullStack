package com.wangziyang.mes.workflow.dto;

/** 按流程定义查询事件规则请求体 */
public class EventListDTO {
    private String definitionId;

    public String getDefinitionId() { return definitionId; }
    public void setDefinitionId(String definitionId) { this.definitionId = definitionId; }
}
