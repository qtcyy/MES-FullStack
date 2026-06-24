package com.wangziyang.mes.system.entity;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import com.wangziyang.mes.common.BaseEntity;

import java.time.LocalDateTime;

@TableName("sp_sys_notice_user")
public class SysNoticeUser extends BaseEntity {
    private static final long serialVersionUID = 1L;

    private String noticeId;
    private String userId;
    private String isRead;          // 0未读/1已读
    private LocalDateTime readTime;
    @TableField(value = "is_deleted")
    private String deleted;

    public String getNoticeId() { return noticeId; }
    public void setNoticeId(String noticeId) { this.noticeId = noticeId; }
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public String getIsRead() { return isRead; }
    public void setIsRead(String isRead) { this.isRead = isRead; }
    public LocalDateTime getReadTime() { return readTime; }
    public void setReadTime(LocalDateTime readTime) { this.readTime = readTime; }
    public String getDeleted() { return deleted; }
    public void setDeleted(String deleted) { this.deleted = deleted; }
}
