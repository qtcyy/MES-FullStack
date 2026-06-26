package com.wangziyang.mes.system.entity;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import com.wangziyang.mes.common.BaseEntity;

@TableName("sp_sys_notice")
public class SysNotice extends BaseEntity {
    private static final long serialVersionUID = 1L;

    private String title;
    private String content;
    private String type;          // info/success/warning/error
    private String targetType;    // all/user/role/dept
    private String targetIds;     // 逗号分隔
    private String targetDesc;
    private String sender;
    private String status;        // 1=已发布
    private Integer recipientCount;
    @TableField(value = "is_deleted")
    private String deleted;

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public String getTargetType() { return targetType; }
    public void setTargetType(String targetType) { this.targetType = targetType; }
    public String getTargetIds() { return targetIds; }
    public void setTargetIds(String targetIds) { this.targetIds = targetIds; }
    public String getTargetDesc() { return targetDesc; }
    public void setTargetDesc(String targetDesc) { this.targetDesc = targetDesc; }
    public String getSender() { return sender; }
    public void setSender(String sender) { this.sender = sender; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public Integer getRecipientCount() { return recipientCount; }
    public void setRecipientCount(Integer recipientCount) { this.recipientCount = recipientCount; }
    public String getDeleted() { return deleted; }
    public void setDeleted(String deleted) { this.deleted = deleted; }
}
