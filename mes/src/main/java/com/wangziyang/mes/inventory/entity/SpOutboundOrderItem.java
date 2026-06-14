package com.wangziyang.mes.inventory.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.wangziyang.mes.common.BaseEntity;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 出库单明细
 */
@TableName("sp_outbound_order_item")
public class SpOutboundOrderItem extends BaseEntity {

    private String outboundId;
    private String materialCode;
    private String materialDesc;
    private String unit;
    private BigDecimal quantity;
    private String postStatus;
    private String allocationDetail;
    private LocalDateTime postedAt;

    public String getOutboundId() { return outboundId; }
    public void setOutboundId(String outboundId) { this.outboundId = outboundId; }
    public String getMaterialCode() { return materialCode; }
    public void setMaterialCode(String materialCode) { this.materialCode = materialCode; }
    public String getMaterialDesc() { return materialDesc; }
    public void setMaterialDesc(String materialDesc) { this.materialDesc = materialDesc; }
    public String getUnit() { return unit; }
    public void setUnit(String unit) { this.unit = unit; }
    public BigDecimal getQuantity() { return quantity; }
    public void setQuantity(BigDecimal quantity) { this.quantity = quantity; }
    public String getPostStatus() { return postStatus; }
    public void setPostStatus(String postStatus) { this.postStatus = postStatus; }
    public String getAllocationDetail() { return allocationDetail; }
    public void setAllocationDetail(String allocationDetail) { this.allocationDetail = allocationDetail; }
    public LocalDateTime getPostedAt() { return postedAt; }
    public void setPostedAt(LocalDateTime postedAt) { this.postedAt = postedAt; }
}
