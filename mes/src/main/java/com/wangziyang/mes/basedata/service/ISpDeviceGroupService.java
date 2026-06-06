package com.wangziyang.mes.basedata.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.service.IService;
import com.wangziyang.mes.basedata.dto.SpDeviceGroupDTO;
import com.wangziyang.mes.basedata.entity.SpDeviceGroup;
import com.wangziyang.mes.basedata.request.SpDeviceGroupPageReq;

public interface ISpDeviceGroupService extends IService<SpDeviceGroup> {
    IPage<SpDeviceGroupDTO> pageWithRelations(SpDeviceGroupPageReq req) throws Exception;
}
