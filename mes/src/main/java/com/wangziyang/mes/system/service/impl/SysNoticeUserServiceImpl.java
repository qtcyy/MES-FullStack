package com.wangziyang.mes.system.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.wangziyang.mes.system.dto.SysNoticeInboxDTO;
import com.wangziyang.mes.system.entity.SysNoticeUser;
import com.wangziyang.mes.system.mapper.SysNoticeUserMapper;
import com.wangziyang.mes.system.request.SysNoticeInboxPageReq;
import com.wangziyang.mes.system.service.ISysNoticeUserService;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
public class SysNoticeUserServiceImpl
        extends ServiceImpl<SysNoticeUserMapper, SysNoticeUser>
        implements ISysNoticeUserService {

    @Override
    public IPage<SysNoticeInboxDTO> inboxPage(SysNoticeInboxPageReq req, String userId) {
        Page<SysNoticeInboxDTO> page = new Page<>(req.getCurrent(), req.getSize());
        return baseMapper.selectInboxPage(page, req, userId);
    }

    @Override
    public long unreadCount(String userId) {
        QueryWrapper<SysNoticeUser> qw = new QueryWrapper<>();
        qw.eq("user_id", userId).eq("is_read", "0").ne("is_deleted", "1");
        return this.count(qw);
    }

    @Override
    public boolean markRead(String inboxId, String userId) {
        UpdateWrapper<SysNoticeUser> uw = new UpdateWrapper<>();
        uw.eq("id", inboxId).eq("user_id", userId).eq("is_read", "0")
          .set("is_read", "1").set("read_time", LocalDateTime.now());
        this.update(uw);
        return true;
    }

    @Override
    public boolean markAllRead(String userId) {
        UpdateWrapper<SysNoticeUser> uw = new UpdateWrapper<>();
        uw.eq("user_id", userId).eq("is_read", "0").ne("is_deleted", "1")
          .set("is_read", "1").set("read_time", LocalDateTime.now());
        this.update(uw);
        return true;
    }

    @Override
    public boolean removeForUser(String inboxId, String userId) {
        UpdateWrapper<SysNoticeUser> uw = new UpdateWrapper<>();
        uw.eq("id", inboxId).eq("user_id", userId).set("is_deleted", "1");
        return this.update(uw);
    }
}
