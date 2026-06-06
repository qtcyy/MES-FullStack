package com.wangziyang.mes.basedata.entity;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import com.wangziyang.mes.common.BaseEntity;

/**
 * 设备组实体
 *
 * @author wangziyang
 */
@TableName("sp_device_group")
public class SpDeviceGroup extends BaseEntity {
    private static final long serialVersionUID = 1L;
    private String code;
    private String name;
    private String descr;
    @TableField(value = "is_deleted")
    private String deleted;

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getDescr() { return descr; }
    public void setDescr(String descr) { this.descr = descr; }
    public String getDeleted() { return deleted; }
    public void setDeleted(String deleted) { this.deleted = deleted; }
}
