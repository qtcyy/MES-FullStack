package com.wangziyang.mes.system.dto;

import com.wangziyang.mes.system.entity.SpTeam;
import com.wangziyang.mes.system.entity.SysUser;
import java.util.List;

public class SpTeamDTO extends SpTeam {

    private String lineName;
    private String workshopName;
    private Integer userCount;
    private List<SysUser> userList;
    private String[] userIds;

    public String getLineName() { return lineName; }
    public void setLineName(String lineName) { this.lineName = lineName; }
    public String getWorkshopName() { return workshopName; }
    public void setWorkshopName(String workshopName) { this.workshopName = workshopName; }
    public Integer getUserCount() { return userCount; }
    public void setUserCount(Integer userCount) { this.userCount = userCount; }
    public List<SysUser> getUserList() { return userList; }
    public void setUserList(List<SysUser> userList) { this.userList = userList; }
    public String[] getUserIds() { return userIds; }
    public void setUserIds(String[] userIds) { this.userIds = userIds; }
}
