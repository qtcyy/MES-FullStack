package com.wangziyang.mes.basedata.dto;

import com.wangziyang.mes.basedata.entity.SpDevice;
import com.wangziyang.mes.basedata.entity.SpDeviceGroup;

import java.util.List;

/**
 * 设备组DTO
 *
 * @author wangziyang
 */
public class SpDeviceGroupDTO extends SpDeviceGroup {
    private Integer deviceCount;
    private List<SpDevice> deviceList;
    private String[] deviceIds;

    public Integer getDeviceCount() { return deviceCount; }
    public void setDeviceCount(Integer deviceCount) { this.deviceCount = deviceCount; }
    public List<SpDevice> getDeviceList() { return deviceList; }
    public void setDeviceList(List<SpDevice> deviceList) { this.deviceList = deviceList; }
    public String[] getDeviceIds() { return deviceIds; }
    public void setDeviceIds(String[] deviceIds) { this.deviceIds = deviceIds; }
}
