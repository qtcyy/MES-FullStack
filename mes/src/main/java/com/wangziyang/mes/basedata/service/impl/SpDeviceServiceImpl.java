package com.wangziyang.mes.basedata.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.wangziyang.mes.basedata.dto.SpDeviceDTO;
import com.wangziyang.mes.basedata.entity.SpDevice;
import com.wangziyang.mes.basedata.mapper.SpDeviceMapper;
import com.wangziyang.mes.basedata.request.SpDevicePageReq;
import com.wangziyang.mes.basedata.service.ISpDeviceService;
import com.wangziyang.mes.order.entity.SpOrder;
import com.wangziyang.mes.order.mapper.SpOrderMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class SpDeviceServiceImpl extends ServiceImpl<SpDeviceMapper, SpDevice> implements ISpDeviceService {

    @Autowired
    private SpDeviceMapper spDeviceMapper;

    @Autowired
    private SpOrderMapper spOrderMapper;

    @Override
    public IPage<SpDeviceDTO> pageWithRelations(SpDevicePageReq req) throws Exception {
        Page<SpDevice> page = new Page<>(req.getCurrent(), req.getSize());
        return spDeviceMapper.pageWithRelations(page, req.getName(), req.getCode(), req.getType());
    }

    @Override
    public boolean hasOrders(String deviceId) {
        QueryWrapper<SpOrder> qw = new QueryWrapper<>();
        qw.eq("device_id", deviceId);
        return spOrderMapper.selectCount(qw) > 0;
    }
}
