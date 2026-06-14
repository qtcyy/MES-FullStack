package com.wangziyang.mes.inventory.request;

import com.wangziyang.mes.common.BasePageReq;

/**
 * 入库单分页查询参数
 */
public class SpReceiptPageReq extends BasePageReq {

    private String receiptCode;
    private String receiptStatus;

    public String getReceiptCode() { return receiptCode; }
    public void setReceiptCode(String receiptCode) { this.receiptCode = receiptCode; }
    public String getReceiptStatus() { return receiptStatus; }
    public void setReceiptStatus(String receiptStatus) { this.receiptStatus = receiptStatus; }
}
