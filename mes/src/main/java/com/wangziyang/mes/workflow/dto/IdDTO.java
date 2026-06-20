package com.wangziyang.mes.workflow.dto;

/** 仅含 id 的 JSON 请求体(删除等) */
public class IdDTO {
    private String id;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
}
