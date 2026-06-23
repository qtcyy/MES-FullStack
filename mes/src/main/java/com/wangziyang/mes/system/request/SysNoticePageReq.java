package com.wangziyang.mes.system.request;

import com.wangziyang.mes.common.BasePageReq;

public class SysNoticePageReq extends BasePageReq {
    private String titleLike;
    public String getTitleLike() { return titleLike; }
    public void setTitleLike(String titleLike) { this.titleLike = titleLike; }
}
