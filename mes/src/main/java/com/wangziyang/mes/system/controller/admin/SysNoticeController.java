package com.wangziyang.mes.system.controller.admin;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.wangziyang.mes.common.BaseController;
import com.wangziyang.mes.common.Result;
import com.wangziyang.mes.system.dto.NoticePublishReq;
import com.wangziyang.mes.system.entity.SysNotice;
import com.wangziyang.mes.system.request.SysNoticePageReq;
import com.wangziyang.mes.system.service.ISysNoticeService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;

@Controller("adminSysNoticeController")
@RequestMapping("/admin/sys/notice")
public class SysNoticeController extends BaseController {

    @Autowired private ISysNoticeService noticeService;

    @PostMapping("/publish")
    @ResponseBody
    public Result publish(@RequestBody NoticePublishReq req) {
        String id = noticeService.publish(req, getSysUser().getUsername());
        return Result.success(id);
    }

    @PostMapping("/page")
    @ResponseBody
    public Result page(SysNoticePageReq req) {
        QueryWrapper<SysNotice> qw = new QueryWrapper<>();
        qw.ne("is_deleted", "1");
        if (req.getTitleLike() != null && !req.getTitleLike().isEmpty()) {
            qw.like("title", req.getTitleLike());
        }
        qw.orderByDesc("create_time");
        IPage result = noticeService.page(req, qw);
        return Result.success(result);
    }

    @GetMapping("/get-by-id")
    @ResponseBody
    public Result getById(String id) {
        return Result.success(noticeService.getById(id));
    }

    @GetMapping("/read-stat")
    @ResponseBody
    public Result readStat(String id) {
        return Result.success(noticeService.readStat(id));
    }

    @PostMapping("/delete")
    @ResponseBody
    public Result delete(@RequestParam String id) {
        noticeService.deleteNotice(id);
        return Result.success(id);
    }
}
