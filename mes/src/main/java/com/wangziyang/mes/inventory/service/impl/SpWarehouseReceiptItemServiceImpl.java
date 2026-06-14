package com.wangziyang.mes.inventory.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.wangziyang.mes.inventory.entity.SpWarehouseReceiptItem;
import com.wangziyang.mes.inventory.mapper.SpWarehouseReceiptItemMapper;
import com.wangziyang.mes.inventory.service.ISpWarehouseReceiptItemService;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class SpWarehouseReceiptItemServiceImpl
        extends ServiceImpl<SpWarehouseReceiptItemMapper, SpWarehouseReceiptItem>
        implements ISpWarehouseReceiptItemService {

    @Override
    public List<SpWarehouseReceiptItem> listByReceiptId(String receiptId) {
        return baseMapper.selectList(new QueryWrapper<SpWarehouseReceiptItem>()
                .eq("receipt_id", receiptId)
                .orderByAsc("material_code"));
    }
}
