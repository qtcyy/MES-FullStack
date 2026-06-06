package com.wangziyang.mes.basedata.service.impl;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.wangziyang.mes.basedata.dto.SpDeviceGroupDTO;
import com.wangziyang.mes.basedata.entity.SpDeviceGroup;
import com.wangziyang.mes.basedata.mapper.SpDeviceGroupMapper;
import com.wangziyang.mes.basedata.request.SpDeviceGroupPageReq;
import com.wangziyang.mes.basedata.service.ISpDeviceGroupService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class SpDeviceGroupServiceImpl extends ServiceImpl<SpDeviceGroupMapper, SpDeviceGroup> implements ISpDeviceGroupService {

    @Autowired
    private SpDeviceGroupMapper spDeviceGroupMapper;

    @Override
    public IPage<SpDeviceGroupDTO> pageWithRelations(SpDeviceGroupPageReq req) throws Exception {
        Page<SpDeviceGroup> page = new Page<>(req.getCurrent(), req.getSize());
        return spDeviceGroupMapper.pageWithRelations(page, req.getName(), req.getCode());
    }
}
