package com.wangziyang.mes.inventory.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.wangziyang.mes.common.BaseEntity;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 物料库存（库位级）
 */
@TableName("sp_inventory")
public class SpInventory extends BaseEntity {

    private String materialCode;
    private String materialDesc;
    private String unit;
    private String warehouseId;
    private String warehouseName;
    private String locationId;
    private String locationCode;
    private BigDecimal quantity;
    private String status;
    private LocalDateTime lastInboundTime;

    public String getMaterialCode() { return materialCode; }
    public void setMaterialCode(String materialCode) { this.materialCode = materialCode; }
    public String getMaterialDesc() { return materialDesc; }
    public void setMaterialDesc(String materialDesc) { this.materialDesc = materialDesc; }
    public String getUnit() { return unit; }
    public void setUnit(String unit) { this.unit = unit; }
    public String getWarehouseId() { return warehouseId; }
    public void setWarehouseId(String warehouseId) { this.warehouseId = warehouseId; }
    public String getWarehouseName() { return warehouseName; }
    public void setWarehouseName(String warehouseName) { this.warehouseName = warehouseName; }
    public String getLocationId() { return locationId; }
    public void setLocationId(String locationId) { this.locationId = locationId; }
    public String getLocationCode() { return locationCode; }
    public void setLocationCode(String locationCode) { this.locationCode = locationCode; }
    public BigDecimal getQuantity() { return quantity; }
    public void setQuantity(BigDecimal quantity) { this.quantity = quantity; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public LocalDateTime getLastInboundTime() { return lastInboundTime; }
    public void setLastInboundTime(LocalDateTime lastInboundTime) { this.lastInboundTime = lastInboundTime; }
}
