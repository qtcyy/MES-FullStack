package com.wangziyang.mes.order.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.wangziyang.mes.common.BaseEntity;

import java.math.BigDecimal;

/**
 * <p>
 * 工单派工记录表
 * </p>
 *
 * @author WangZiYang
 * @since 2020-07-01
 */
@TableName("sp_order_dispatch")
public class SpOrderDispatch extends BaseEntity {

    private static final long serialVersionUID = 1L;

    /**
     * 工单ID
     */
    private String orderId;

    /**
     * 班组ID
     */
    private String teamId;

    /**
     * 作业员ID
     */
    private String userId;

    /**
     * 工时（小时）
     */
    private BigDecimal laborHours;

    /**
     * 派工状态: 1=已派工 2=已开工 3=已完工
     */
    private Integer dispatchStatus;

    /**
     * 计划开始时间
     */
    private String planStartTime;

    /**
     * 计划结束时间
     */
    private String planEndTime;

    /**
     * 实际开始时间
     */
    private String actualStartTime;

    /**
     * 实际结束时间
     */
    private String actualEndTime;

    /**
     * 备注
     */
    private String remark;

    /** 工序ID(关联sp_oper);订单级派工时为空 */
    private String operId;

    /** 完工进度 0-100 */
    private Integer progress;

    public String getOrderId() {
        return orderId;
    }

    public void setOrderId(String orderId) {
        this.orderId = orderId;
    }

    public String getTeamId() {
        return teamId;
    }

    public void setTeamId(String teamId) {
        this.teamId = teamId;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public BigDecimal getLaborHours() {
        return laborHours;
    }

    public void setLaborHours(BigDecimal laborHours) {
        this.laborHours = laborHours;
    }

    public Integer getDispatchStatus() {
        return dispatchStatus;
    }

    public void setDispatchStatus(Integer dispatchStatus) {
        this.dispatchStatus = dispatchStatus;
    }

    public String getPlanStartTime() {
        return planStartTime;
    }

    public void setPlanStartTime(String planStartTime) {
        this.planStartTime = planStartTime;
    }

    public String getPlanEndTime() {
        return planEndTime;
    }

    public void setPlanEndTime(String planEndTime) {
        this.planEndTime = planEndTime;
    }

    public String getActualStartTime() {
        return actualStartTime;
    }

    public void setActualStartTime(String actualStartTime) {
        this.actualStartTime = actualStartTime;
    }

    public String getActualEndTime() {
        return actualEndTime;
    }

    public void setActualEndTime(String actualEndTime) {
        this.actualEndTime = actualEndTime;
    }

    public String getRemark() {
        return remark;
    }

    public void setRemark(String remark) {
        this.remark = remark;
    }

    public String getOperId() {
        return operId;
    }

    public void setOperId(String operId) {
        this.operId = operId;
    }

    public Integer getProgress() {
        return progress;
    }

    public void setProgress(Integer progress) {
        this.progress = progress;
    }

    @Override
    public String toString() {
        return "SpOrderDispatch{" +
                "orderId=" + orderId +
                ", teamId=" + teamId +
                ", userId=" + userId +
                ", laborHours=" + laborHours +
                ", dispatchStatus=" + dispatchStatus +
                ", planStartTime=" + planStartTime +
                ", planEndTime=" + planEndTime +
                ", actualStartTime=" + actualStartTime +
                ", actualEndTime=" + actualEndTime +
                ", remark=" + remark +
                "}";
    }
}
