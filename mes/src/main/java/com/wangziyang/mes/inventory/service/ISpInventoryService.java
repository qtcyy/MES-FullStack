package com.wangziyang.mes.inventory.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.service.IService;
import com.wangziyang.mes.inventory.dto.ManualInboundDTO;
import com.wangziyang.mes.inventory.entity.SpInventory;
import com.wangziyang.mes.inventory.request.SpInventoryPageReq;

/**
 * 库存 Service
 */
public interface ISpInventoryService extends IService<SpInventory> {

    IPage<SpInventory> pageInventory(SpInventoryPageReq req);

    void manualInbound(ManualInboundDTO dto);
}
