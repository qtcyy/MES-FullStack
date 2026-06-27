package com.wangziyang.mes.technology.service;

import com.wangziyang.mes.technology.entity.SpOperStep;
import com.baomidou.mybatisplus.extension.service.IService;

import java.util.List;

public interface ISpOperStepService extends IService<SpOperStep> {

    /** 按给定 id 顺序重排某工序的步骤序号(step_no=1..N,事务保证原子) */
    void reorder(String operId, List<String> ids);
}
