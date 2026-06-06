package com.wangziyang.mes.basedata.dto;

import com.wangziyang.mes.basedata.entity.SpDevice;

/**
 * 设备DTO
 *
 * @author wangziyang
 */
public class SpDeviceDTO extends SpDevice {
    private String lineName;
    private Integer orderCount;

    public String getLineName() { return lineName; }
    public void setLineName(String lineName) { this.lineName = lineName; }
    public Integer getOrderCount() { return orderCount; }
    public void setOrderCount(Integer orderCount) { this.orderCount = orderCount; }
}
