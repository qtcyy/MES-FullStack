package com.wangziyang.mes.inventory.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.wangziyang.mes.inventory.entity.SpOutboundOrderItem;

import java.util.List;

/**
 * 出库单明细 Service
 */
public interface ISpOutboundOrderItemService extends IService<SpOutboundOrderItem> {

    List<SpOutboundOrderItem> listByOutboundId(String outboundId);
}
