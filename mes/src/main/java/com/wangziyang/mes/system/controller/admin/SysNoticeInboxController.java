package com.wangziyang.mes.system.controller.admin;

import com.wangziyang.mes.common.BaseController;
import com.wangziyang.mes.common.Result;
import com.wangziyang.mes.system.dto.SysNoticeInboxDTO;
import com.wangziyang.mes.system.entity.SysNotice;
import com.wangziyang.mes.system.entity.SysNoticeUser;
import com.wangziyang.mes.system.request.SysNoticeInboxPageReq;
import com.wangziyang.mes.system.service.ISysNoticeService;
import com.wangziyang.mes.system.service.ISysNoticeUserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;

@Controller("adminSysNoticeInboxController")
@RequestMapping("/admin/sys/notice/inbox")
public class SysNoticeInboxController extends BaseController {

    @Autowired private ISysNoticeUserService inboxService;
    @Autowired private ISysNoticeService noticeService;

    @PostMapping("/page")
    @ResponseBody
    public Result page(SysNoticeInboxPageReq req) {
        String uid = getSysUser().getId();
        return Result.success(inboxService.inboxPage(req, uid));
    }

    @GetMapping("/unread-count")
    @ResponseBody
    public Result unreadCount() {
        return Result.success(inboxService.unreadCount(getSysUser().getId()));
    }

    @GetMapping("/recent")
    @ResponseBody
    public Result recent(@RequestParam(defaultValue = "10") Integer size) {
        SysNoticeInboxPageReq req = new SysNoticeInboxPageReq();
        req.setCurrent(1);
        req.setSize(size);
        return Result.success(inboxService.inboxPage(req, getSysUser().getId()).getRecords());
    }

    @GetMapping("/detail")
    @ResponseBody
    public Result detail(@RequestParam String inboxId) {
        String uid = getSysUser().getId();
        SysNoticeUser nu = inboxService.getById(inboxId);
        if (nu == null || !uid.equals(nu.getUserId()) || "1".equals(nu.getDeleted())) {
            return Result.failure("通知不存在或无权访问");
        }
        inboxService.markRead(inboxId, uid);
        SysNoticeUser fresh = inboxService.getById(inboxId);
        SysNotice notice = noticeService.getById(nu.getNoticeId());
        SysNoticeInboxDTO dto = new SysNoticeInboxDTO();
        dto.setId(nu.getId());
        dto.setNoticeId(nu.getNoticeId());
        dto.setUserId(uid);
        dto.setIsRead("1");
        dto.setReadTime(fresh != null ? fresh.getReadTime() : nu.getReadTime());
        if (notice != null) {
            dto.setTitle(notice.getTitle());
            dto.setContent(notice.getContent());
            dto.setType(notice.getType());
            dto.setSender(notice.getSender());
            dto.setNoticeTime(notice.getCreateTime());
        }
        return Result.success(dto);
    }

    @PostMapping("/mark-read")
    @ResponseBody
    public Result markRead(@RequestParam String inboxId) {
        inboxService.markRead(inboxId, getSysUser().getId());
        return Result.success(inboxId);
    }

    @PostMapping("/mark-all-read")
    @ResponseBody
    public Result markAllRead() {
        inboxService.markAllRead(getSysUser().getId());
        return Result.success();
    }

    @PostMapping("/delete")
    @ResponseBody
    public Result delete(@RequestParam String inboxId) {
        inboxService.removeForUser(inboxId, getSysUser().getId());
        return Result.success(inboxId);
    }
}
