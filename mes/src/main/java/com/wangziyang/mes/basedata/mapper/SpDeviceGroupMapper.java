package com.wangziyang.mes.basedata.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.wangziyang.mes.basedata.dto.SpDeviceGroupDTO;
import com.wangziyang.mes.basedata.entity.SpDeviceGroup;
import org.apache.ibatis.annotations.Param;

public interface SpDeviceGroupMapper extends BaseMapper<SpDeviceGroup> {
    IPage<SpDeviceGroupDTO> pageWithRelations(Page<SpDeviceGroup> page, @Param("name") String name, @Param("code") String code);
}
