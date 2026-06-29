package com.wangziyang.mes.basedata.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.service.IService;
import com.wangziyang.mes.basedata.dto.SpDeviceDTO;
import com.wangziyang.mes.basedata.entity.SpDevice;
import com.wangziyang.mes.basedata.request.SpDevicePageReq;

public interface ISpDeviceService extends IService<SpDevice> {
    IPage<SpDeviceDTO> pageWithRelations(SpDevicePageReq req) throws Exception;

    /** 设备是否被设备编组引用（被引用则禁止删除） */
    boolean isReferencedByGroup(String deviceId);
}
