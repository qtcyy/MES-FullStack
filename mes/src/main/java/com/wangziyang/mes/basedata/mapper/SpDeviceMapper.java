package com.wangziyang.mes.basedata.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.wangziyang.mes.basedata.dto.SpDeviceDTO;
import com.wangziyang.mes.basedata.entity.SpDevice;
import org.apache.ibatis.annotations.Param;

public interface SpDeviceMapper extends BaseMapper<SpDevice> {
    IPage<SpDeviceDTO> pageWithRelations(Page<SpDevice> page, @Param("name") String name, @Param("code") String code, @Param("type") String type);
}
