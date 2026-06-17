package com.wangziyang.mes.order.controller;

import com.wangziyang.mes.common.BaseController;
import com.wangziyang.mes.common.Result;
import com.wangziyang.mes.order.dto.GanttQueryReq;
import com.wangziyang.mes.order.service.ISpGanttService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.PostMapping;
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
}
