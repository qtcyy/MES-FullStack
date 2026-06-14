package com.wangziyang.mes.inventory.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.wangziyang.mes.inventory.entity.SpInventory;
import com.wangziyang.mes.inventory.mapper.SpInventoryMapper;
import com.wangziyang.mes.inventory.request.SpInventoryPageReq;
import com.wangziyang.mes.inventory.service.ISpInventoryService;
import org.apache.commons.lang3.StringUtils;
import org.springframework.stereotype.Service;

@Service
public class SpInventoryServiceImpl
        extends ServiceImpl<SpInventoryMapper, SpInventory>
        implements ISpInventoryService {

    @Override
    public IPage<SpInventory> pageInventory(SpInventoryPageReq req) {
        QueryWrapper<SpInventory> qw = new QueryWrapper<>();
        if (StringUtils.isNotEmpty(req.getMaterialCode())) {
            qw.like("material_code", req.getMaterialCode());
        }
        if (StringUtils.isNotEmpty(req.getStartDate())) {
            qw.ge("last_inbound_time", req.getStartDate() + " 00:00:00");
        }
        if (StringUtils.isNotEmpty(req.getEndDate())) {
            qw.le("last_inbound_time", req.getEndDate() + " 23:59:59");
        }
        qw.orderByDesc("last_inbound_time");
        return baseMapper.selectPage(new Page<>(req.getCurrent(), req.getSize()), qw);
    }
}
