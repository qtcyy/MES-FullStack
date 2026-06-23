package com.wangziyang.mes.system.request;

import com.wangziyang.mes.common.BasePageReq;

public class SysNoticeInboxPageReq extends BasePageReq {
    private String titleLike;
    private String isRead;   // 0/1，空=全部
    public String getTitleLike() { return titleLike; }
    public void setTitleLike(String titleLike) { this.titleLike = titleLike; }
    public String getIsRead() { return isRead; }
    public void setIsRead(String isRead) { this.isRead = isRead; }
}
