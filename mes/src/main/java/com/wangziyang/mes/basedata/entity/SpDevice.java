package com.wangziyang.mes.basedata.entity;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import com.wangziyang.mes.common.BaseEntity;

/**
 * 设备实体
 *
 * @author wangziyang
 */
@TableName("sp_device")
public class SpDevice extends BaseEntity {
    private static final long serialVersionUID = 1L;
    private String code;
    private String name;
    private String type;
    private String model;
    private String specs;
    private String lineId;
    private String location;
    private String status;
    private String descr;
    @TableField(value = "is_deleted")
    private String deleted;

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public String getModel() { return model; }
    public void setModel(String model) { this.model = model; }
    public String getSpecs() { return specs; }
    public void setSpecs(String specs) { this.specs = specs; }
    public String getLineId() { return lineId; }
    public void setLineId(String lineId) { this.lineId = lineId; }
    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getDescr() { return descr; }
    public void setDescr(String descr) { this.descr = descr; }
    public String getDeleted() { return deleted; }
    public void setDeleted(String deleted) { this.deleted = deleted; }
}
