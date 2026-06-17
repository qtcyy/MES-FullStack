package com.wangziyang.mes.order.dto;

/** 甘特图派工任务(订单×工序×班组×作业员) */
public class GanttTaskVO {
    private String id;
    private String orderId;
    private String orderCode;
    private String materiel;
    private String materielDesc;
    private Integer qty;
    private String orderType;
    private Integer orderStatue;
    private String operId;
    private String operName;
    private String teamId;
    private String teamName;
    private String userId;
    private String userName;
    private String planStartTime;
    private String planEndTime;
    private String actualStartTime;
    private String actualEndTime;
    private Integer dispatchStatus;
    private Integer progress;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getOrderId() { return orderId; }
    public void setOrderId(String orderId) { this.orderId = orderId; }
    public String getOrderCode() { return orderCode; }
    public void setOrderCode(String orderCode) { this.orderCode = orderCode; }
    public String getMateriel() { return materiel; }
    public void setMateriel(String materiel) { this.materiel = materiel; }
    public String getMaterielDesc() { return materielDesc; }
    public void setMaterielDesc(String materielDesc) { this.materielDesc = materielDesc; }
    public Integer getQty() { return qty; }
    public void setQty(Integer qty) { this.qty = qty; }
    public String getOrderType() { return orderType; }
    public void setOrderType(String orderType) { this.orderType = orderType; }
    public Integer getOrderStatue() { return orderStatue; }
    public void setOrderStatue(Integer orderStatue) { this.orderStatue = orderStatue; }
    public String getOperId() { return operId; }
    public void setOperId(String operId) { this.operId = operId; }
    public String getOperName() { return operName; }
    public void setOperName(String operName) { this.operName = operName; }
    public String getTeamId() { return teamId; }
    public void setTeamId(String teamId) { this.teamId = teamId; }
    public String getTeamName() { return teamName; }
    public void setTeamName(String teamName) { this.teamName = teamName; }
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public String getUserName() { return userName; }
    public void setUserName(String userName) { this.userName = userName; }
    public String getPlanStartTime() { return planStartTime; }
    public void setPlanStartTime(String planStartTime) { this.planStartTime = planStartTime; }
    public String getPlanEndTime() { return planEndTime; }
    public void setPlanEndTime(String planEndTime) { this.planEndTime = planEndTime; }
    public String getActualStartTime() { return actualStartTime; }
    public void setActualStartTime(String actualStartTime) { this.actualStartTime = actualStartTime; }
    public String getActualEndTime() { return actualEndTime; }
    public void setActualEndTime(String actualEndTime) { this.actualEndTime = actualEndTime; }
    public Integer getDispatchStatus() { return dispatchStatus; }
    public void setDispatchStatus(Integer dispatchStatus) { this.dispatchStatus = dispatchStatus; }
    public Integer getProgress() { return progress; }
    public void setProgress(Integer progress) { this.progress = progress; }
}
