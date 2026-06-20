package com.wangziyang.mes.workflow.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.wangziyang.mes.common.BaseEntity;

/**
 * 流程事件规则(配置层,区别于运行时事件日志)
 *
 * @since 周期 2n 后端补齐
 */
@TableName("sp_workflow_event_rule")
public class SpWorkflowEventRule extends BaseEntity {

    private static final long serialVersionUID = 1L;

    /** 所属流程定义ID */
    private String definitionId;

    /** 规则名称 */
    private String name;

    /**
     * 触发时机:START/TASK_COMPLETE/END/REJECT。
     * Java 字段名避开 SQL 保留字 trigger(否则 MyBatis-Plus 的 SELECT 别名 `AS trigger` 非法);
     * 列自动映射 trigger_type,JSON 仍用 trigger 与前端契约对齐。
     */
    @JsonProperty("trigger")
    private String triggerType;

    /** 业务类型(如 ORDER_APPROVAL) */
    private String businessType;

    /** 动作类型:SET_AUDIT_STATUS/SCRIPT */
    private String actionType;

    /** 目标审批状态(SET_AUDIT_STATUS 时有效) */
    private String targetStatus;

    /** 业务脚本(SCRIPT 时有效) */
    private String script;

    /** 是否启用 */
    private Boolean enabled;

    public String getDefinitionId() { return definitionId; }
    public void setDefinitionId(String definitionId) { this.definitionId = definitionId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getTriggerType() { return triggerType; }
    public void setTriggerType(String triggerType) { this.triggerType = triggerType; }

    public String getBusinessType() { return businessType; }
    public void setBusinessType(String businessType) { this.businessType = businessType; }

    public String getActionType() { return actionType; }
    public void setActionType(String actionType) { this.actionType = actionType; }

    public String getTargetStatus() { return targetStatus; }
    public void setTargetStatus(String targetStatus) { this.targetStatus = targetStatus; }

    public String getScript() { return script; }
    public void setScript(String script) { this.script = script; }

    public Boolean getEnabled() { return enabled; }
    public void setEnabled(Boolean enabled) { this.enabled = enabled; }
}
