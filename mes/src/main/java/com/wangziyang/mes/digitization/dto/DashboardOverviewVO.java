package com.wangziyang.mes.digitization.dto;

import java.util.List;

/** 大屏总览聚合返回 */
public class DashboardOverviewVO {

    private DashboardKpiVO kpi;
    private List<NameValueVO> orderStatus;
    private List<NameValueVO> deviceStatus;
    private List<NameValueVO> orderType;
    private List<MonthlyTrendVO> monthlyTrend;

    public DashboardKpiVO getKpi() {
        return kpi;
    }

    public void setKpi(DashboardKpiVO kpi) {
        this.kpi = kpi;
    }

    public List<NameValueVO> getOrderStatus() {
        return orderStatus;
    }

    public void setOrderStatus(List<NameValueVO> orderStatus) {
        this.orderStatus = orderStatus;
    }

    public List<NameValueVO> getDeviceStatus() {
        return deviceStatus;
    }

    public void setDeviceStatus(List<NameValueVO> deviceStatus) {
        this.deviceStatus = deviceStatus;
    }

    public List<NameValueVO> getOrderType() {
        return orderType;
    }

    public void setOrderType(List<NameValueVO> orderType) {
        this.orderType = orderType;
    }

    public List<MonthlyTrendVO> getMonthlyTrend() {
        return monthlyTrend;
    }

    public void setMonthlyTrend(List<MonthlyTrendVO> monthlyTrend) {
        this.monthlyTrend = monthlyTrend;
    }
}
