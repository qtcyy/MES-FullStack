package com.wangziyang.mes.order.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.service.IService;
import com.wangziyang.mes.order.dto.SpDispatchDTO;
import com.wangziyang.mes.order.entity.SpOrderDispatch;

import java.util.Map;

public interface ISpDispatchService extends IService<SpOrderDispatch> {

    /**
     * 分页查询待派工工单（statue=0）
     */
    IPage<Map<String, Object>> pageOrdersForDispatch(IPage<?> page, String orderCode);

    /**
     * 执行派工：创建 dispatch 记录 + 更新工单 statue=1
     * 返回创建的 dispatch 记录列表
     */
    void assignWorker(SpDispatchDTO dto);

    /**
     * 查询某工单的派工记录（含作业员姓名、班组名称）
     */
    Map<String, Object> getDispatchByOrderId(String orderId);
}
