package com.wangziyang.mes.digitization.controller;

import com.wangziyang.mes.common.BaseController;
import com.wangziyang.mes.common.Result;
import com.wangziyang.mes.digitization.service.IDashboardService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseBody;

/**
 * 数字化大屏聚合(只读)
 */
@Controller
@RequestMapping("/digitization/dashboard")
public class DashboardController extends BaseController {

    @Autowired
    private IDashboardService dashboardService;

    /** 大屏总览:KPI + 订单/设备状态分布 + 工单类型 + 近12月趋势 */
    @GetMapping("/overview")
    @ResponseBody
    public Result overview() {
        return Result.success(dashboardService.overview());
    }
}
