package com.wangziyang.mes.system.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.service.IService;
import com.wangziyang.mes.system.dto.SysNoticeInboxDTO;
import com.wangziyang.mes.system.entity.SysNoticeUser;
import com.wangziyang.mes.system.request.SysNoticeInboxPageReq;

public interface ISysNoticeUserService extends IService<SysNoticeUser> {
    IPage<SysNoticeInboxDTO> inboxPage(SysNoticeInboxPageReq req, String userId);
    long unreadCount(String userId);
    boolean markRead(String inboxId, String userId);
    boolean markAllRead(String userId);
    boolean removeForUser(String inboxId, String userId);
    boolean softDeleteByNoticeId(String noticeId);
}
