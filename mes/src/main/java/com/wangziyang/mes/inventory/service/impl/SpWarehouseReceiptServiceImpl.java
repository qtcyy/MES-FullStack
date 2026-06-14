package com.wangziyang.mes.inventory.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.wangziyang.mes.basedata.entity.SpWarehouse;
import com.wangziyang.mes.basedata.entity.SpWarehouseLocation;
import com.wangziyang.mes.basedata.service.ISpWarehouseLocationService;
import com.wangziyang.mes.basedata.service.ISpWarehouseService;
import com.wangziyang.mes.inventory.dto.PostItemDTO;
import com.wangziyang.mes.inventory.entity.SpInventory;
import com.wangziyang.mes.inventory.entity.SpWarehouseReceipt;
import com.wangziyang.mes.inventory.entity.SpWarehouseReceiptItem;
import com.wangziyang.mes.inventory.mapper.SpInventoryMapper;
import com.wangziyang.mes.inventory.mapper.SpWarehouseReceiptItemMapper;
import com.wangziyang.mes.inventory.mapper.SpWarehouseReceiptMapper;
import com.wangziyang.mes.inventory.request.SpReceiptPageReq;
import com.wangziyang.mes.inventory.service.ISpWarehouseReceiptService;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Service
public class SpWarehouseReceiptServiceImpl
        extends ServiceImpl<SpWarehouseReceiptMapper, SpWarehouseReceipt>
        implements ISpWarehouseReceiptService {

    @Autowired
    private SpWarehouseReceiptItemMapper receiptItemMapper;

    @Autowired
    private SpInventoryMapper inventoryMapper;

    @Autowired
    private ISpWarehouseService spWarehouseService;

    @Autowired
    private ISpWarehouseLocationService spWarehouseLocationService;

    @Override
    public IPage<SpWarehouseReceipt> pageReceipts(SpReceiptPageReq req) {
        QueryWrapper<SpWarehouseReceipt> qw = new QueryWrapper<>();
        if (StringUtils.isNotEmpty(req.getReceiptCode())) {
            qw.like("receipt_code", req.getReceiptCode());
        }
        if (StringUtils.isNotEmpty(req.getReceiptStatus())) {
            qw.eq("receipt_status", req.getReceiptStatus());
        }
        qw.orderByDesc("create_time");
        return baseMapper.selectPage(new Page<>(req.getCurrent(), req.getSize()), qw);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void postItem(PostItemDTO dto) {
        // 1. 查明细 + 状态校验
        SpWarehouseReceiptItem item = receiptItemMapper.selectById(dto.getItemId());
        if (item == null) {
            throw new RuntimeException("入库明细不存在");
        }
        if ("posted".equals(item.getPostStatus())) {
            throw new RuntimeException("该明细已登账，请勿重复操作");
        }

        // 2. 库房校验：存在 + 未删除 + 零件库
        SpWarehouse wh = spWarehouseService.getById(dto.getWarehouseId());
        if (wh == null || "1".equals(wh.getDeleted())) {
            throw new RuntimeException("库房不存在或已停用");
        }
        if (!"零件库".equals(wh.getType())) {
            throw new RuntimeException("请选择零件库类型的库房(如电脑配件库)");
        }

        // 3. 库位校验：存在 + 未删除 + 属于该库房
        SpWarehouseLocation loc = spWarehouseLocationService.getById(dto.getLocationId());
        if (loc == null || "1".equals(loc.getDeleted())) {
            throw new RuntimeException("库位不存在或已停用");
        }
        if (!dto.getWarehouseId().equals(loc.getWarehouseId())) {
            throw new RuntimeException("所选库位不属于该库房");
        }

        // 4. 混放校验：一个库位只能存一种物料
        SpInventory inv = inventoryMapper.selectOne(
                new QueryWrapper<SpInventory>().eq("location_id", dto.getLocationId()));
        if (inv != null && !inv.getMaterialCode().equals(item.getMaterialCode())) {
            throw new RuntimeException("该库位已存放物料 " + inv.getMaterialCode() + "，只能存放相同物料");
        }

        LocalDateTime now = LocalDateTime.now();

        // 5. 更新明细
        item.setWarehouseId(wh.getId());
        item.setWarehouseName(wh.getName());
        item.setLocationId(loc.getId());
        item.setLocationCode(loc.getCode());
        item.setPostStatus("posted");
        item.setPostedAt(now);
        receiptItemMapper.updateById(item);

        // 6. 库存台账 upsert
        if (inv != null) {
            BigDecimal existingQty = inv.getQuantity() != null ? inv.getQuantity() : BigDecimal.ZERO;
            BigDecimal inboundQty = item.getQuantity() != null ? item.getQuantity() : BigDecimal.ZERO;
            inv.setQuantity(existingQty.add(inboundQty));
            inv.setLastInboundTime(now);
            inventoryMapper.updateById(inv);
        } else {
            SpInventory ninv = new SpInventory();
            ninv.setMaterialCode(item.getMaterialCode());
            ninv.setMaterialDesc(item.getMaterialDesc());
            ninv.setUnit(item.getUnit());
            ninv.setWarehouseId(wh.getId());
            ninv.setWarehouseName(wh.getName());
            ninv.setLocationId(loc.getId());
            ninv.setLocationCode(loc.getCode());
            ninv.setQuantity(item.getQuantity());
            ninv.setStatus("available");
            ninv.setLastInboundTime(now);
            inventoryMapper.insert(ninv);
        }

        // 7. 更新入库单头状态
        SpWarehouseReceipt receipt = baseMapper.selectById(item.getReceiptId());
        if (receipt != null) {
            Integer posted = receiptItemMapper.selectCount(
                    new QueryWrapper<SpWarehouseReceiptItem>()
                            .eq("receipt_id", receipt.getId())
                            .eq("post_status", "posted"));
            int total = receipt.getTotalItems() != null ? receipt.getTotalItems() : 0;
            receipt.setPostedItems(posted);
            receipt.setReceiptStatus(posted >= total ? "completed" : "partial");
            baseMapper.updateById(receipt);
        }
    }
}
