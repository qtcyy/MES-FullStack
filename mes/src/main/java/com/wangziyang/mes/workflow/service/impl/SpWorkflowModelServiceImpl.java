package com.wangziyang.mes.workflow.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.wangziyang.mes.workflow.entity.SpWorkflowModel;
import com.wangziyang.mes.workflow.mapper.SpWorkflowModelMapper;
import com.wangziyang.mes.workflow.service.ISpWorkflowModelService;
import org.springframework.stereotype.Service;

@Service
public class SpWorkflowModelServiceImpl
        extends ServiceImpl<SpWorkflowModelMapper, SpWorkflowModel>
        implements ISpWorkflowModelService {
}
