package com.wangziyang.mes.order.controller;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.wangziyang.mes.common.BaseController;
import com.wangziyang.mes.common.Result;
import com.wangziyang.mes.order.entity.SpOrder;
import com.wangziyang.mes.order.request.ProductionOrderReq;
import com.wangziyang.mes.order.service.ISpOrderService;
import com.wangziyang.mes.workflow.runtime.hook.OrderAuditCallback;
import com.wangziyang.mes.workflow.runtime.service.IWorkflowEngineService;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Controller
@RequestMapping("/plan/order")
public class ProductionOrderController extends BaseController {

    private static final String AUDIT_PROCESS_KEY = "orderAudit";

    @Autowired private ISpOrderService orderService;
    @Autowired private IWorkflowEngineService engine;

    @PostMapping("/page")
    @ResponseBody
    public Result page(ProductionOrderReq req) {
        QueryWrapper<SpOrder> qw = new QueryWrapper<>();
        qw.isNotNull("order_source");
        if (StringUtils.isNotEmpty(req.getOrderCodeLike())) qw.like("order_code", req.getOrderCodeLike());
        if (StringUtils.isNotEmpty(req.getOrderSource())) qw.eq("order_source", req.getOrderSource());
        if (StringUtils.isNotEmpty(req.getAuditStatus())) qw.eq("audit_status", req.getAuditStatus());
        qw.orderByDesc("create_time");
        IPage result = orderService.page(req, qw);
        return Result.success(result);
    }

    @GetMapping("/get-by-id")
    @ResponseBody
    public Result getById(String id) {
        return Result.success(orderService.getById(id));
    }

    @PostMapping("/add-or-update")
    @ResponseBody
    public Result addOrUpdate(SpOrder record) {
        boolean isCreate = StringUtils.isEmpty(record.getId());
        if ("DEMAND".equals(record.getOrderSource())) record.setScheduleMode("BACKWARD");
        else if ("FORECAST".equals(record.getOrderSource())) record.setScheduleMode("FORWARD");

        if (isCreate) {
            if (StringUtils.isEmpty(record.getOrderCode())) {
                record.setOrderCode("PO" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss")));
            }
            record.setAuditStatus("APPROVING");
            record.setPlanStatus("DRAFT");
            orderService.save(record);
            engine.start(AUDIT_PROCESS_KEY, OrderAuditCallback.TYPE, record.getId(),
                    record.getOrderCode(), "生产订单审批 - " + record.getOrderCode());
        } else {
            orderService.updateById(record);
        }
        return Result.success(record.getId());
    }

    @PostMapping("/delete")
    @ResponseBody
    public Result delete(SpOrder req) {
        SpOrder cur = orderService.getById(req.getId());
        if (cur != null && "APPROVING".equals(cur.getAuditStatus())) {
            return Result.failure("审核中的订单不可删除");
        }
        orderService.removeById(req.getId());
        return Result.success();
    }
}
