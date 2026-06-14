package com.wangziyang.mes.inventory.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.wangziyang.mes.inventory.dto.PostOutboundItemDTO;
import com.wangziyang.mes.inventory.entity.SpInventory;
import com.wangziyang.mes.inventory.entity.SpOutboundOrder;
import com.wangziyang.mes.inventory.entity.SpOutboundOrderItem;
import com.wangziyang.mes.inventory.mapper.SpInventoryMapper;
import com.wangziyang.mes.inventory.mapper.SpOutboundOrderItemMapper;
import com.wangziyang.mes.inventory.mapper.SpOutboundOrderMapper;
import com.wangziyang.mes.inventory.request.SpOutboundPageReq;
import com.wangziyang.mes.inventory.service.ISpOutboundOrderService;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
public class SpOutboundOrderServiceImpl
        extends ServiceImpl<SpOutboundOrderMapper, SpOutboundOrder>
        implements ISpOutboundOrderService {

    @Autowired
    private SpOutboundOrderItemMapper outboundItemMapper;

    @Autowired
    private SpInventoryMapper inventoryMapper;

    @Override
    public IPage<SpOutboundOrder> pageOutbounds(SpOutboundPageReq req) {
        QueryWrapper<SpOutboundOrder> qw = new QueryWrapper<>();
        if (StringUtils.isNotEmpty(req.getOutboundCode())) {
            qw.like("outbound_code", req.getOutboundCode());
        }
        if (StringUtils.isNotEmpty(req.getOutboundStatus())) {
            qw.eq("outbound_status", req.getOutboundStatus());
        }
        qw.orderByDesc("create_time");
        return baseMapper.selectPage(new Page<>(req.getCurrent(), req.getSize()), qw);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void postOutboundItem(PostOutboundItemDTO dto) {
        // 1. 查明细 + 状态校验
        SpOutboundOrderItem item = outboundItemMapper.selectById(dto.getItemId());
        if (item == null) {
            throw new RuntimeException("出库明细不存在");
        }
        if ("posted".equals(item.getPostStatus())) {
            throw new RuntimeException("该明细已登账，请勿重复操作");
        }

        BigDecimal required = item.getQuantity() != null ? item.getQuantity() : BigDecimal.ZERO;

        // 2. 查可用库存，按 FIFO（入库时间升序）
        List<SpInventory> invRows = inventoryMapper.selectList(
                new QueryWrapper<SpInventory>()
                        .eq("material_code", item.getMaterialCode())
                        .gt("quantity", 0)
                        .orderByAsc("last_inbound_time")
                        .orderByAsc("create_time"));

        // 3. 校验总量
        BigDecimal totalAvail = BigDecimal.ZERO;
        for (SpInventory inv : invRows) {
            BigDecimal q = inv.getQuantity() != null ? inv.getQuantity() : BigDecimal.ZERO;
            totalAvail = totalAvail.add(q);
        }
        if (totalAvail.compareTo(required) < 0) {
            throw new RuntimeException("库存不足:可用 " + totalAvail.stripTrailingZeros().toPlainString()
                    + "，需出库 " + required.stripTrailingZeros().toPlainString() + "，无法出库");
        }

        // 4. FIFO 逐行扣减
        BigDecimal remaining = required;
        LocalDateTime now = LocalDateTime.now();
        List<String> allocations = new ArrayList<>();
        for (SpInventory inv : invRows) {
            if (remaining.compareTo(BigDecimal.ZERO) <= 0) {
                break;
            }
            BigDecimal invQty = inv.getQuantity() != null ? inv.getQuantity() : BigDecimal.ZERO;
            BigDecimal take = invQty.min(remaining);
            BigDecimal left = invQty.subtract(take);
            allocations.add(inv.getLocationCode() + "×" + take.stripTrailingZeros().toPlainString());
            if (left.compareTo(BigDecimal.ZERO) == 0) {
                inventoryMapper.deleteById(inv.getId());
            } else {
                inv.setQuantity(left);
                inventoryMapper.updateById(inv);
            }
            remaining = remaining.subtract(take);
        }

        // 5. 更新明细
        item.setPostStatus("posted");
        item.setPostedAt(now);
        item.setAllocationDetail(String.join(", ", allocations));
        outboundItemMapper.updateById(item);

        // 6. 更新出库单头
        SpOutboundOrder order = baseMapper.selectById(item.getOutboundId());
        if (order != null) {
            Integer posted = outboundItemMapper.selectCount(
                    new QueryWrapper<SpOutboundOrderItem>()
                            .eq("outbound_id", order.getId())
                            .eq("post_status", "posted"));
            int total = order.getTotalItems() != null ? order.getTotalItems() : 0;
            order.setPostedItems(posted);
            order.setOutboundStatus(posted >= total ? "completed" : "partial");
            baseMapper.updateById(order);
        }
    }
}
