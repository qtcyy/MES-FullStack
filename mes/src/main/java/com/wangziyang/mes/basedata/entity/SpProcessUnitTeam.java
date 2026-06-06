package com.wangziyang.mes.basedata.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.wangziyang.mes.common.BaseEntity;

@TableName("sp_process_unit_team")
public class SpProcessUnitTeam extends BaseEntity {
    private static final long serialVersionUID = 1L;
    private String unitId;
    private String teamId;

    public String getUnitId() { return unitId; }
    public void setUnitId(String unitId) { this.unitId = unitId; }
    public String getTeamId() { return teamId; }
    public void setTeamId(String teamId) { this.teamId = teamId; }
}
