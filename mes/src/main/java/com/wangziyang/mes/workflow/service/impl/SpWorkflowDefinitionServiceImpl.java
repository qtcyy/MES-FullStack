package com.wangziyang.mes.workflow.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.wangziyang.mes.workflow.entity.SpWorkflowDefinition;
import com.wangziyang.mes.workflow.mapper.SpWorkflowDefinitionMapper;
import com.wangziyang.mes.workflow.service.ISpWorkflowDefinitionService;
import org.springframework.stereotype.Service;

@Service
public class SpWorkflowDefinitionServiceImpl
        extends ServiceImpl<SpWorkflowDefinitionMapper, SpWorkflowDefinition>
        implements ISpWorkflowDefinitionService {
}
