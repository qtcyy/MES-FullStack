package com.wangziyang.mes.inventory.request;

import com.wangziyang.mes.common.BasePageReq;

/**
 * 出库单分页查询参数
 */
public class SpOutboundPageReq extends BasePageReq {

    private String outboundCode;
    private String outboundStatus;

    public String getOutboundCode() { return outboundCode; }
    public void setOutboundCode(String outboundCode) { this.outboundCode = outboundCode; }
    public String getOutboundStatus() { return outboundStatus; }
    public void setOutboundStatus(String outboundStatus) { this.outboundStatus = outboundStatus; }
}
