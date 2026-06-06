package com.wangziyang.mes.basedata.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.wangziyang.mes.basedata.entity.SpWarehouseLocation;
import com.wangziyang.mes.basedata.mapper.SpWarehouseLocationMapper;
import com.wangziyang.mes.basedata.service.ISpWarehouseLocationService;
import org.springframework.stereotype.Service;

/**
 * 仓库库位服务实现
 *
 * @author wangziyang
 */
@Service
public class SpWarehouseLocationServiceImpl extends ServiceImpl<SpWarehouseLocationMapper, SpWarehouseLocation> implements ISpWarehouseLocationService {
}
