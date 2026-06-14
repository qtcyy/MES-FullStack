package com.wangziyang.mes.inventory.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.wangziyang.mes.inventory.entity.SpWarehouseReceiptItem;

import java.util.List;

/**
 * 入库单明细 Service
 */
public interface ISpWarehouseReceiptItemService extends IService<SpWarehouseReceiptItem> {

    List<SpWarehouseReceiptItem> listByReceiptId(String receiptId);
}
