package com.wangziyang.mes.workflow.dto;

/** 模型保存请求体(XML 体大,走 JSON) */
public class ModelSaveDTO {
    private String id;
    private String modelKey;
    private String name;
    private String bpmnXml;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getModelKey() { return modelKey; }
    public void setModelKey(String modelKey) { this.modelKey = modelKey; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getBpmnXml() { return bpmnXml; }
    public void setBpmnXml(String bpmnXml) { this.bpmnXml = bpmnXml; }
}
