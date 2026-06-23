package com.wangziyang.mes.system.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.wangziyang.mes.system.dto.NoticePublishReq;
import com.wangziyang.mes.system.entity.SysNotice;
import com.wangziyang.mes.system.vo.NoticeReadStatVO;

import java.util.List;

public interface ISysNoticeService extends IService<SysNotice> {
    List<String> resolveRecipientIds(String targetType, List<String> targetIds);
    String publish(NoticePublishReq req, String sender);
    boolean deleteNotice(String noticeId);
    NoticeReadStatVO readStat(String noticeId);
}
