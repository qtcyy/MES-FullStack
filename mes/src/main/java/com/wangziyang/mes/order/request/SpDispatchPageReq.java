package com.wangziyang.mes.order.request;

import com.wangziyang.mes.common.BasePageReq;

public class SpDispatchPageReq extends BasePageReq {
    private String orderCode;

    public String getOrderCode() { return orderCode; }
    public void setOrderCode(String orderCode) { this.orderCode = orderCode; }
}
