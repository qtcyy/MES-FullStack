package com.wangziyang.mes.system.dto;

import java.util.List;

public class NoticePublishReq {
    private String title;
    private String content;
    private String type;          // info/success/warning/error
    private String targetType;    // all/user/role/dept
    private List<String> targetIds;

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public String getTargetType() { return targetType; }
    public void setTargetType(String targetType) { this.targetType = targetType; }
    public List<String> getTargetIds() { return targetIds; }
    public void setTargetIds(List<String> targetIds) { this.targetIds = targetIds; }
}
