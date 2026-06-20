package com.wangziyang.mes.workflow.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.wangziyang.mes.workflow.entity.SpWorkflowCategory;
import com.wangziyang.mes.workflow.mapper.SpWorkflowCategoryMapper;
import com.wangziyang.mes.workflow.service.ISpWorkflowCategoryService;
import org.springframework.stereotype.Service;

@Service
public class SpWorkflowCategoryServiceImpl
        extends ServiceImpl<SpWorkflowCategoryMapper, SpWorkflowCategory>
        implements ISpWorkflowCategoryService {
}
