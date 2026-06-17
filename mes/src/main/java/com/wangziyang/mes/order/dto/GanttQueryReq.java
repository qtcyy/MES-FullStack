package com.wangziyang.mes.order.dto;

/** 甘特图查询过滤(全部可选) */
public class GanttQueryReq {
    private String startTime;
    private String endTime;
    private String orderCode;
    private String teamId;

    public String getStartTime() { return startTime; }
    public void setStartTime(String startTime) { this.startTime = startTime; }
    public String getEndTime() { return endTime; }
    public void setEndTime(String endTime) { this.endTime = endTime; }
    public String getOrderCode() { return orderCode; }
    public void setOrderCode(String orderCode) { this.orderCode = orderCode; }
    public String getTeamId() { return teamId; }
    public void setTeamId(String teamId) { this.teamId = teamId; }
}
