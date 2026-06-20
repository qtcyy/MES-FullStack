package com.wangziyang.mes.workflow.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.wangziyang.mes.common.BaseEntity;

/**
 * 流程定义(轻量;由模型发布动作落库)。
 * 复用已存在的运行时表 sp_workflow_definition,周期 2n 补 form_key / version 两列。
 *
 * @since 周期 2n 后端补齐
 */
@TableName("sp_workflow_definition")
public class SpWorkflowDefinition extends BaseEntity {

    private static final long serialVersionUID = 1L;

    /** 流程分类编码 */
    private String categoryCode;

    /** 流程分类名称 */
    private String categoryName;

    /** 流程key(= 模型 modelKey) */
    private String processKey;

    /** 流程名称(= 模型 name) */
    private String processName;

    /** 是否启用 */
    private Boolean enabled;

    /** 关联的流程表单key */
    private String formKey;

    /** 版本号(取自模型) */
    private Integer version;

    public String getCategoryCode() { return categoryCode; }
    public void setCategoryCode(String categoryCode) { this.categoryCode = categoryCode; }

    public String getCategoryName() { return categoryName; }
    public void setCategoryName(String categoryName) { this.categoryName = categoryName; }

    public String getProcessKey() { return processKey; }
    public void setProcessKey(String processKey) { this.processKey = processKey; }

    public String getProcessName() { return processName; }
    public void setProcessName(String processName) { this.processName = processName; }

    public Boolean getEnabled() { return enabled; }
    public void setEnabled(Boolean enabled) { this.enabled = enabled; }

    public String getFormKey() { return formKey; }
    public void setFormKey(String formKey) { this.formKey = formKey; }

    public Integer getVersion() { return version; }
    public void setVersion(Integer version) { this.version = version; }
}
