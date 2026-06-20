package com.wangziyang.mes.workflow.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.wangziyang.mes.workflow.entity.SpWorkflowForm;
import com.wangziyang.mes.workflow.mapper.SpWorkflowFormMapper;
import com.wangziyang.mes.workflow.service.ISpWorkflowFormService;
import org.springframework.stereotype.Service;

@Service
public class SpWorkflowFormServiceImpl
        extends ServiceImpl<SpWorkflowFormMapper, SpWorkflowForm>
        implements ISpWorkflowFormService {
}
