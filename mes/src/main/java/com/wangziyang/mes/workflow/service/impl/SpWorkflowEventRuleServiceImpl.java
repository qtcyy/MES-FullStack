package com.wangziyang.mes.workflow.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.wangziyang.mes.workflow.entity.SpWorkflowEventRule;
import com.wangziyang.mes.workflow.mapper.SpWorkflowEventRuleMapper;
import com.wangziyang.mes.workflow.service.ISpWorkflowEventRuleService;
import org.springframework.stereotype.Service;

@Service
public class SpWorkflowEventRuleServiceImpl
        extends ServiceImpl<SpWorkflowEventRuleMapper, SpWorkflowEventRule>
        implements ISpWorkflowEventRuleService {
}
