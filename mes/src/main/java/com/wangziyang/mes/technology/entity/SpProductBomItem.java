package com.wangziyang.mes.technology.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.wangziyang.mes.common.BaseEntity;
import java.math.BigDecimal;

@TableName(value = "sp_product_bom_item")
public class SpProductBomItem extends BaseEntity {

    private static final long serialVersionUID = 1L;

    private String bomId;
    private String itemType;
    private String materialCode;
    private String materialDesc;
    private BigDecimal quantity;
    private String unit;
    private Integer sortOrder;

    public String getBomId() { return bomId; }
    public void setBomId(String bomId) { this.bomId = bomId; }
    public String getItemType() { return itemType; }
    public void setItemType(String itemType) { this.itemType = itemType; }
    public String getMaterialCode() { return materialCode; }
    public void setMaterialCode(String materialCode) { this.materialCode = materialCode; }
    public String getMaterialDesc() { return materialDesc; }
    public void setMaterialDesc(String materialDesc) { this.materialDesc = materialDesc; }
    public BigDecimal getQuantity() { return quantity; }
    public void setQuantity(BigDecimal quantity) { this.quantity = quantity; }
    public String getUnit() { return unit; }
    public void setUnit(String unit) { this.unit = unit; }
    public Integer getSortOrder() { return sortOrder; }
    public void setSortOrder(Integer sortOrder) { this.sortOrder = sortOrder; }

    @Override
    public String toString() {
        return "SpProductBomItem{" +
                "bomId=" + bomId +
                ", materialCode=" + materialCode +
                ", quantity=" + quantity +
                "}";
    }
}
