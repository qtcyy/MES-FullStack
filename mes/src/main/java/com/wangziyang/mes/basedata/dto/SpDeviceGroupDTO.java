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

    /** 成员设备按状态计数(pageWithRelations 聚合):0空闲/1运行中/2维修中/3报废 */
    private Integer idleCount;
    private Integer runningCount;
    private Integer repairCount;
    private Integer scrapCount;

    public Integer getDeviceCount() { return deviceCount; }
    public void setDeviceCount(Integer deviceCount) { this.deviceCount = deviceCount; }
    public List<SpDevice> getDeviceList() { return deviceList; }
    public void setDeviceList(List<SpDevice> deviceList) { this.deviceList = deviceList; }
    public String[] getDeviceIds() { return deviceIds; }
    public void setDeviceIds(String[] deviceIds) { this.deviceIds = deviceIds; }

    public Integer getIdleCount() { return idleCount; }
    public void setIdleCount(Integer idleCount) { this.idleCount = idleCount; }
    public Integer getRunningCount() { return runningCount; }
    public void setRunningCount(Integer runningCount) { this.runningCount = runningCount; }
    public Integer getRepairCount() { return repairCount; }
    public void setRepairCount(Integer repairCount) { this.repairCount = repairCount; }
    public Integer getScrapCount() { return scrapCount; }
    public void setScrapCount(Integer scrapCount) { this.scrapCount = scrapCount; }
}
