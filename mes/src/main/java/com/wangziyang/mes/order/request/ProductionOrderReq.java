package com.wangziyang.mes.order.request;

import com.wangziyang.mes.common.BasePageReq;

public class ProductionOrderReq extends BasePageReq {
    private String orderCodeLike;
    private String orderSource;
    private String auditStatus;

    public String getOrderCodeLike() { return orderCodeLike; }
    public void setOrderCodeLike(String v) { this.orderCodeLike = v; }
    public String getOrderSource() { return orderSource; }
    public void setOrderSource(String v) { this.orderSource = v; }
    public String getAuditStatus() { return auditStatus; }
    public void setAuditStatus(String v) { this.auditStatus = v; }
}
