package com.wangziyang.mes.order.entity;

import com.wangziyang.mes.common.BaseEntity;

/**
 * <p>
 * 
 * </p>
 *
 * @author WangZiYang
 * @since 2020-07-01
 */
public class SpOrder extends BaseEntity {

    private static final long serialVersionUID = 1L;

    /**
     * 工单编号
     */
    private String orderCode;

    /**
     * 工单描述
     */
    private String orderDescription;

    /**
     * 工单数量
     */
    private Integer qty;

    /**
     * 订单类型 P 量产 A验证 F返工 
     */
    private String orderType;

    /**
     * 流程ID
     */
    private String flowId;

    /**
     * 物料编码
     */
    private String materiel;

    /**
     * 物料描述
     */
    private String materielDesc;

    /**
     * 计划开始时间
     */
    private String planStartTime;

    /**
     * 计划结束时间
     */
    private String planEndTime;

    /**
     * 订单状态:0 已下发(待派工),1 已派工,2 进行中,3 订单结束,4 订单终结
     */
    private Integer statue;

    /** 订单来源 DEMAND需求订单 FORECAST预测订单 */
    private String orderSource;
    /** 排产方式 FORWARD正向 BACKWARD逆向 */
    private String scheduleMode;
    /** 产品BOM ID */
    private String bomId;
    /** 产品BOM编码 */
    private String bomCode;
    /** BOM版本 */
    private String bomVersion;
    /** 客户名称 */
    private String customerName;
    /** 销售合同号 */
    private String contractNo;
    /** 订单优先级，数字越小优先级越高 */
    private Integer priority;
    /** 审批状态 DRAFT/APPROVING/APPROVED/REJECTED */
    private String auditStatus;
    /** 计划状态 UNCOMPUTED/COMPUTED/RELEASED/CANCELLED/DONE */
    private String planStatus;

    public String getOrderCode() {
        return orderCode;
    }

    public void setOrderCode(String orderCode) {
        this.orderCode = orderCode;
    }
    public String getOrderDescription() {
        return orderDescription;
    }

    public void setOrderDescription(String orderDescription) {
        this.orderDescription = orderDescription;
    }
    public Integer getQty() {
        return qty;
    }

    public void setQty(Integer qty) {
        this.qty = qty;
    }
    public String getOrderType() {
        return orderType;
    }

    public void setOrderType(String orderType) {
        this.orderType = orderType;
    }
    public String getFlowId() {
        return flowId;
    }

    public void setFlowId(String flowId) {
        this.flowId = flowId;
    }
    public String getMateriel() {
        return materiel;
    }

    public void setMateriel(String materiel) {
        this.materiel = materiel;
    }
    public String getMaterielDesc() {
        return materielDesc;
    }

    public void setMaterielDesc(String materielDesc) {
        this.materielDesc = materielDesc;
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
    public Integer getStatue() {
        return statue;
    }

    public void setStatue(Integer statue) {
        this.statue = statue;
    }
    public String getOrderSource() {
        return orderSource;
    }

    public void setOrderSource(String orderSource) {
        this.orderSource = orderSource;
    }
    public String getScheduleMode() {
        return scheduleMode;
    }

    public void setScheduleMode(String scheduleMode) {
        this.scheduleMode = scheduleMode;
    }
    public String getBomId() {
        return bomId;
    }

    public void setBomId(String bomId) {
        this.bomId = bomId;
    }
    public String getBomCode() {
        return bomCode;
    }

    public void setBomCode(String bomCode) {
        this.bomCode = bomCode;
    }
    public String getBomVersion() {
        return bomVersion;
    }

    public void setBomVersion(String bomVersion) {
        this.bomVersion = bomVersion;
    }
    public String getCustomerName() {
        return customerName;
    }

    public void setCustomerName(String customerName) {
        this.customerName = customerName;
    }
    public String getContractNo() {
        return contractNo;
    }

    public void setContractNo(String contractNo) {
        this.contractNo = contractNo;
    }
    public Integer getPriority() {
        return priority;
    }

    public void setPriority(Integer priority) {
        this.priority = priority;
    }
    public String getAuditStatus() {
        return auditStatus;
    }

    public void setAuditStatus(String auditStatus) {
        this.auditStatus = auditStatus;
    }
    public String getPlanStatus() {
        return planStatus;
    }

    public void setPlanStatus(String planStatus) {
        this.planStatus = planStatus;
    }

    @Override
    public String toString() {
        return "SpOrder{" +
            "orderCode=" + orderCode +
            ", orderDescription=" + orderDescription +
            ", qty=" + qty +
            ", orderType=" + orderType +
            ", flowId=" + flowId +
            ", materiel=" + materiel +
            ", materielDesc=" + materielDesc +
            ", planStartTime=" + planStartTime +
            ", planEndTime=" + planEndTime +
            ", statue=" + statue +
        "}";
    }
}
