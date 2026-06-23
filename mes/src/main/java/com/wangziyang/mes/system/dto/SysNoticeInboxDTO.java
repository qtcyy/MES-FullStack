package com.wangziyang.mes.system.dto;

import java.time.LocalDateTime;

public class SysNoticeInboxDTO {
    private String id;            // 收件箱行 id
    private String noticeId;
    private String userId;
    private String isRead;
    private LocalDateTime readTime;
    private String title;
    private String content;
    private String type;
    private String sender;
    private LocalDateTime noticeTime;   // notice.create_time

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getNoticeId() { return noticeId; }
    public void setNoticeId(String noticeId) { this.noticeId = noticeId; }
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public String getIsRead() { return isRead; }
    public void setIsRead(String isRead) { this.isRead = isRead; }
    public LocalDateTime getReadTime() { return readTime; }
    public void setReadTime(LocalDateTime readTime) { this.readTime = readTime; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public String getSender() { return sender; }
    public void setSender(String sender) { this.sender = sender; }
    public LocalDateTime getNoticeTime() { return noticeTime; }
    public void setNoticeTime(LocalDateTime noticeTime) { this.noticeTime = noticeTime; }
}
