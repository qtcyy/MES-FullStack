package com.wangziyang.mes.inventory.request;

import com.wangziyang.mes.common.BasePageReq;

/**
 * 库存明细分页查询参数
 */
public class SpInventoryPageReq extends BasePageReq {

    private String materialCode;
    private String startDate;
    private String endDate;

    public String getMaterialCode() { return materialCode; }
    public void setMaterialCode(String materialCode) { this.materialCode = materialCode; }
    public String getStartDate() { return startDate; }
    public void setStartDate(String startDate) { this.startDate = startDate; }
    public String getEndDate() { return endDate; }
    public void setEndDate(String endDate) { this.endDate = endDate; }
}
