package com.wangziyang.mes.workflow.runtime.hook;

import com.wangziyang.mes.order.entity.SpOrder;
import com.wangziyang.mes.order.service.ISpOrderService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Component
public class OrderAuditCallback implements AuditCallback {

    public static final String TYPE = "ORDER_AUDIT";

    @Autowired
    private ISpOrderService orderService;

    @Override
    public String businessType() { return TYPE; }

    @Override
    public void onApproved(String orderId) {
        SpOrder order = orderService.getById(orderId);
        if (order == null) return;
        order.setAuditStatus("APPROVED");
        order.setPlanStatus("UNCOMPUTED");
        orderService.updateById(order);
    }

    @Override
    public void onRejected(String orderId) {
        SpOrder order = orderService.getById(orderId);
        if (order == null) return;
        order.setAuditStatus("REJECTED");
        orderService.updateById(order);
    }
}
