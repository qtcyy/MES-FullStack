package com.wangziyang.mes.order.controller;

import com.wangziyang.mes.common.BaseController;
import com.wangziyang.mes.common.Result;
import com.wangziyang.mes.order.dto.GanttQueryReq;
import com.wangziyang.mes.order.dto.GanttWriteReq;
import com.wangziyang.mes.order.service.ISpGanttService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseBody;

@Controller
@RequestMapping("/order/gantt")
public class SpGanttController extends BaseController {

    @Autowired
    private ISpGanttService spGanttService;

    /** 甘特图任务聚合(只读);入参 form-encoded GanttQueryReq */
    @PostMapping("/tasks")
    @ResponseBody
    public Result tasks(GanttQueryReq req) {
        return Result.success(spGanttService.listGanttTasks(req));
    }

    /** 拖拽改期(JSON) */
    @PostMapping("/reschedule")
    @ResponseBody
    public Result reschedule(@RequestBody GanttWriteReq req) {
        spGanttService.reschedule(req.getId(), req.getPlanStartTime(), req.getPlanEndTime());
        return Result.success();
    }

    /** 记录开工(JSON) */
    @PostMapping("/start")
    @ResponseBody
    public Result start(@RequestBody GanttWriteReq req) {
        spGanttService.recordStart(req.getId(), req.getActualStartTime());
        return Result.success();
    }

    /** 记录完工(JSON) */
    @PostMapping("/finish")
    @ResponseBody
    public Result finish(@RequestBody GanttWriteReq req) {
        spGanttService.recordFinish(req.getId(), req.getActualEndTime());
        return Result.success();
    }

    /** 更新进度(JSON) */
    @PostMapping("/progress")
    @ResponseBody
    public Result progress(@RequestBody GanttWriteReq req) {
        spGanttService.updateProgress(req.getId(), req.getProgress());
        return Result.success();
    }

    /** 手动修正实际时间(JSON) */
    @PostMapping("/actual")
    @ResponseBody
    public Result actual(@RequestBody GanttWriteReq req) {
        spGanttService.adjustActual(req.getId(), req.getActualStartTime(), req.getActualEndTime());
        return Result.success();
    }
}
