package com.wangziyang.mes.technology.service;

import com.wangziyang.mes.technology.entity.SpOperStep;
import com.baomidou.mybatisplus.extension.service.IService;

public interface ISpOperStepService extends IService<SpOperStep> {

    /** 在同一工序内交换两条步骤的序号(事务保证原子) */
    void swapStepNo(SpOperStep a, SpOperStep b);
}
