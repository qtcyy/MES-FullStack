package com.wangziyang.mes.inventory.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.wangziyang.mes.common.BaseEntity;

/**
 * 出库单主表
 */
@TableName("sp_outbound_order")
public class SpOutboundOrder extends BaseEntity {

    private String outboundCode;
    private String orderId;
    private String orderCode;
    private String productCode;
    private String productDesc;
    private String outboundStatus;
    private Integer totalItems;
    private Integer postedItems;

    public String getOutboundCode() { return outboundCode; }
    public void setOutboundCode(String outboundCode) { this.outboundCode = outboundCode; }
    public String getOrderId() { return orderId; }
    public void setOrderId(String orderId) { this.orderId = orderId; }
    public String getOrderCode() { return orderCode; }
    public void setOrderCode(String orderCode) { this.orderCode = orderCode; }
    public String getProductCode() { return productCode; }
    public void setProductCode(String productCode) { this.productCode = productCode; }
    public String getProductDesc() { return productDesc; }
    public void setProductDesc(String productDesc) { this.productDesc = productDesc; }
    public String getOutboundStatus() { return outboundStatus; }
    public void setOutboundStatus(String outboundStatus) { this.outboundStatus = outboundStatus; }
    public Integer getTotalItems() { return totalItems; }
    public void setTotalItems(Integer totalItems) { this.totalItems = totalItems; }
    public Integer getPostedItems() { return postedItems; }
    public void setPostedItems(Integer postedItems) { this.postedItems = postedItems; }
}
