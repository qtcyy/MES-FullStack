package com.wangziyang.mes.inventory.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.service.IService;
import com.wangziyang.mes.inventory.dto.PostOutboundItemDTO;
import com.wangziyang.mes.inventory.entity.SpOutboundOrder;
import com.wangziyang.mes.inventory.request.SpOutboundPageReq;

/**
 * 出库单 Service
 */
public interface ISpOutboundOrderService extends IService<SpOutboundOrder> {

    IPage<SpOutboundOrder> pageOutbounds(SpOutboundPageReq req);

    void postOutboundItem(PostOutboundItemDTO dto);
}
