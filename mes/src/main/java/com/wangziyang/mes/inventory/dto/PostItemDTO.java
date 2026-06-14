package com.wangziyang.mes.inventory.dto;

/**
 * 入库登账请求
 */
public class PostItemDTO {

    private String itemId;
    private String warehouseId;
    private String locationId;

    public String getItemId() { return itemId; }
    public void setItemId(String itemId) { this.itemId = itemId; }
    public String getWarehouseId() { return warehouseId; }
    public void setWarehouseId(String warehouseId) { this.warehouseId = warehouseId; }
    public String getLocationId() { return locationId; }
    public void setLocationId(String locationId) { this.locationId = locationId; }
}
