package com.wangziyang.mes.basedata.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.wangziyang.mes.common.BaseEntity;

/**
 * 设备组-设备关联实体
 *
 * @author wangziyang
 */
@TableName("sp_device_group_item")
public class SpDeviceGroupItem extends BaseEntity {
    private static final long serialVersionUID = 1L;
    private String groupId;
    private String deviceId;

    public String getGroupId() { return groupId; }
    public void setGroupId(String groupId) { this.groupId = groupId; }
    public String getDeviceId() { return deviceId; }
    public void setDeviceId(String deviceId) { this.deviceId = deviceId; }
}
