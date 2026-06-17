package com.wangziyang.mes.digitization.dto;

/** 月度订单趋势项;month 格式 yyyy-MM */
public class MonthlyTrendVO {

    private String month;
    private long orderCount;
    private long totalQty;
    private long completedCount;

    public String getMonth() {
        return month;
    }

    public void setMonth(String month) {
        this.month = month;
    }

    public long getOrderCount() {
        return orderCount;
    }

    public void setOrderCount(long orderCount) {
        this.orderCount = orderCount;
    }

    public long getTotalQty() {
        return totalQty;
    }

    public void setTotalQty(long totalQty) {
        this.totalQty = totalQty;
    }

    public long getCompletedCount() {
        return completedCount;
    }

    public void setCompletedCount(long completedCount) {
        this.completedCount = completedCount;
    }
}
