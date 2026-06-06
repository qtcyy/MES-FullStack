package com.wangziyang.mes.system.entity;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import com.wangziyang.mes.common.BaseEntity;

@TableName("sp_team")
public class SpTeam extends BaseEntity {

    private static final long serialVersionUID = 1L;

    private String code;
    private String name;
    private String descr;
    private String lineId;
    private String workshopId;
    private String startTime;
    private String endTime;
    private String workdays;

    @TableField(value = "is_deleted")
    private String deleted;

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getDescr() { return descr; }
    public void setDescr(String descr) { this.descr = descr; }
    public String getLineId() { return lineId; }
    public void setLineId(String lineId) { this.lineId = lineId; }
    public String getWorkshopId() { return workshopId; }
    public void setWorkshopId(String workshopId) { this.workshopId = workshopId; }
    public String getStartTime() { return startTime; }
    public void setStartTime(String startTime) { this.startTime = startTime; }
    public String getEndTime() { return endTime; }
    public void setEndTime(String endTime) { this.endTime = endTime; }
    public String getWorkdays() { return workdays; }
    public void setWorkdays(String workdays) { this.workdays = workdays; }
    public String getDeleted() { return deleted; }
    public void setDeleted(String deleted) { this.deleted = deleted; }
}
