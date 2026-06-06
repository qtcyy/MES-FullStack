package com.wangziyang.mes.system.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.wangziyang.mes.common.BaseEntity;

@TableName("sp_team_user")
public class SpTeamUser extends BaseEntity {

    private static final long serialVersionUID = 1L;

    private String teamId;
    private String userId;

    public String getTeamId() { return teamId; }
    public void setTeamId(String teamId) { this.teamId = teamId; }
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
}
