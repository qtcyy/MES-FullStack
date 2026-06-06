package com.wangziyang.mes.basedata.dto;

import com.wangziyang.mes.basedata.entity.SpProcessUnit;
import com.wangziyang.mes.system.entity.SpTeam;
import java.util.List;

public class SpProcessUnitDTO extends SpProcessUnit {
    private List<SpTeam> teamList;
    public List<SpTeam> getTeamList() { return teamList; }
    public void setTeamList(List<SpTeam> teamList) { this.teamList = teamList; }
}
