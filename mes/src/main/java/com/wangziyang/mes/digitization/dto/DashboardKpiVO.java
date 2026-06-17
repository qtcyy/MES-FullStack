package com.wangziyang.mes.digitization.dto;

/** 顶部 KPI 计数 */
public class DashboardKpiVO {

    private long orderCount;
    private long deviceCount;
    private long materielCount;
    private long flowCount;

    public long getOrderCount() {
        return orderCount;
    }

    public void setOrderCount(long orderCount) {
        this.orderCount = orderCount;
    }

    public long getDeviceCount() {
        return deviceCount;
    }

    public void setDeviceCount(long deviceCount) {
        this.deviceCount = deviceCount;
    }

    public long getMaterielCount() {
        return materielCount;
    }

    public void setMaterielCount(long materielCount) {
        this.materielCount = materielCount;
    }

    public long getFlowCount() {
        return flowCount;
    }

    public void setFlowCount(long flowCount) {
        this.flowCount = flowCount;
    }
}
