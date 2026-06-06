package com.wangziyang.mes.basedata.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.wangziyang.mes.basedata.entity.SpWarehouse;
import com.wangziyang.mes.basedata.mapper.SpWarehouseMapper;
import com.wangziyang.mes.basedata.service.ISpWarehouseService;
import org.springframework.stereotype.Service;

/**
 * 仓库服务实现
 *
 * @author wangziyang
 */
@Service
public class SpWarehouseServiceImpl extends ServiceImpl<SpWarehouseMapper, SpWarehouse> implements ISpWarehouseService {
}
