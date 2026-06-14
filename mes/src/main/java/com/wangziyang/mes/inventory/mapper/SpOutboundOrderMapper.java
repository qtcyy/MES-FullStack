package com.wangziyang.mes.inventory.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.wangziyang.mes.inventory.entity.SpOutboundOrder;
import org.apache.ibatis.annotations.Mapper;

/**
 * 出库单主表 Mapper
 */
@Mapper
public interface SpOutboundOrderMapper extends BaseMapper<SpOutboundOrder> {
}
