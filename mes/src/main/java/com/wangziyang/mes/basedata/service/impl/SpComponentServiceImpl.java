package com.wangziyang.mes.basedata.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.wangziyang.mes.basedata.entity.SpComponent;
import com.wangziyang.mes.basedata.mapper.SpComponentMapper;
import com.wangziyang.mes.basedata.service.ISpComponentService;
import org.springframework.stereotype.Service;

/**
 * 组件定义 服务实现
 *
 * @author wangziyang
 */
@Service
public class SpComponentServiceImpl extends ServiceImpl<SpComponentMapper, SpComponent> implements ISpComponentService {
}
