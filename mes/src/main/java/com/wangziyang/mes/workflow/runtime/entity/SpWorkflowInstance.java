package com.wangziyang.mes.workflow.runtime.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.wangziyang.mes.common.BaseEntity;

import java.time.LocalDateTime;

/**
 * 工作流实例
 */
@TableName("sp_workflow_instance")
public class SpWorkflowInstance extends BaseEntity {

    private static final long serialVersionUID = 1L;

    /**
     * 流程定义ID
     */
    private String definitionId;

    /**
     * 流程标识 key
     */
    private String processKey;

    /**
     * 业务类型
     */
    private String businessType;

    /**
     * 业务ID
     */
    private String businessId;

    /**
     * 业务编码
     */
    private String businessCode;

    /**
     * 标题
     */
    private String title;

    /**
     * 状态
     */
    private String status;

    /**
     * 发起人用户ID
     */
    private String starterUserId;

    /**
     * 发起人用户名
     */
    private String starterUsername;

    /**
     * 开始时间
     */
    private LocalDateTime startTime;

    /**
     * 结束时间
     */
    private LocalDateTime endTime;

    public String getDefinitionId() {
        return definitionId;
    }

    public void setDefinitionId(String definitionId) {
        this.definitionId = definitionId;
    }

    public String getProcessKey() {
        return processKey;
    }

    public void setProcessKey(String processKey) {
        this.processKey = processKey;
    }

    public String getBusinessType() {
        return businessType;
    }

    public void setBusinessType(String businessType) {
        this.businessType = businessType;
    }

    public String getBusinessId() {
        return businessId;
    }

    public void setBusinessId(String businessId) {
        this.businessId = businessId;
    }

    public String getBusinessCode() {
        return businessCode;
    }

    public void setBusinessCode(String businessCode) {
        this.businessCode = businessCode;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getStarterUserId() {
        return starterUserId;
    }

    public void setStarterUserId(String starterUserId) {
        this.starterUserId = starterUserId;
    }

    public String getStarterUsername() {
        return starterUsername;
    }

    public void setStarterUsername(String starterUsername) {
        this.starterUsername = starterUsername;
    }

    public LocalDateTime getStartTime() {
        return startTime;
    }

    public void setStartTime(LocalDateTime startTime) {
        this.startTime = startTime;
    }

    public LocalDateTime getEndTime() {
        return endTime;
    }

    public void setEndTime(LocalDateTime endTime) {
        this.endTime = endTime;
    }
}
