package com.wangziyang.mes.basedata.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.service.IService;
import com.wangziyang.mes.basedata.dto.SpDeviceDTO;
import com.wangziyang.mes.basedata.entity.SpDevice;
import com.wangziyang.mes.basedata.request.SpDevicePageReq;

public interface ISpDeviceService extends IService<SpDevice> {
    IPage<SpDeviceDTO> pageWithRelations(SpDevicePageReq req) throws Exception;
    boolean hasOrders(String deviceId);
}
