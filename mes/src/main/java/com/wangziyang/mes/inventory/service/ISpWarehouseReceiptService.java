package com.wangziyang.mes.inventory.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.service.IService;
import com.wangziyang.mes.inventory.dto.PostItemDTO;
import com.wangziyang.mes.inventory.entity.SpWarehouseReceipt;
import com.wangziyang.mes.inventory.request.SpReceiptPageReq;

/**
 * 入库单 Service
 */
public interface ISpWarehouseReceiptService extends IService<SpWarehouseReceipt> {

    IPage<SpWarehouseReceipt> pageReceipts(SpReceiptPageReq req);

    void postItem(PostItemDTO dto);
}
