package com.wangziyang.mes.workflow.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.wangziyang.mes.common.BaseEntity;

/**
 * 流程模型(含 BPMN XML)
 *
 * @since 周期 2n 后端补齐
 */
@TableName("sp_workflow_model")
public class SpWorkflowModel extends BaseEntity {

    private static final long serialVersionUID = 1L;

    /** 模型key(字母开头,唯一) */
    private String modelKey;

    /** 模型名称 */
    private String name;

    /** 分类编码(发布后填入) */
    private String categoryCode;

    /** 分类名称(发布后填入) */
    private String categoryName;

    /** BPMN XML 内容 */
    private String bpmnXml;

    /** 状态:DRAFT/PUBLISHED */
    private String status;

    /** 版本号 */
    private Integer version;

    public String getModelKey() { return modelKey; }
    public void setModelKey(String modelKey) { this.modelKey = modelKey; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getCategoryCode() { return categoryCode; }
    public void setCategoryCode(String categoryCode) { this.categoryCode = categoryCode; }

    public String getCategoryName() { return categoryName; }
    public void setCategoryName(String categoryName) { this.categoryName = categoryName; }

    public String getBpmnXml() { return bpmnXml; }
    public void setBpmnXml(String bpmnXml) { this.bpmnXml = bpmnXml; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Integer getVersion() { return version; }
    public void setVersion(Integer version) { this.version = version; }
}
