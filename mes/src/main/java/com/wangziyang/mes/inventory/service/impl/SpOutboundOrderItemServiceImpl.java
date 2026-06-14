package com.wangziyang.mes.inventory.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.wangziyang.mes.inventory.entity.SpOutboundOrderItem;
import com.wangziyang.mes.inventory.mapper.SpOutboundOrderItemMapper;
import com.wangziyang.mes.inventory.service.ISpOutboundOrderItemService;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class SpOutboundOrderItemServiceImpl
        extends ServiceImpl<SpOutboundOrderItemMapper, SpOutboundOrderItem>
        implements ISpOutboundOrderItemService {

    @Override
    public List<SpOutboundOrderItem> listByOutboundId(String outboundId) {
        return baseMapper.selectList(new QueryWrapper<SpOutboundOrderItem>()
                .eq("outbound_id", outboundId)
                .orderByAsc("material_code"));
    }
}
