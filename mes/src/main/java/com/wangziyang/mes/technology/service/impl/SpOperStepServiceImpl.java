package com.wangziyang.mes.technology.service.impl;

import com.wangziyang.mes.technology.entity.SpOperStep;
import com.wangziyang.mes.technology.mapper.SpOperStepMapper;
import com.wangziyang.mes.technology.service.ISpOperStepService;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SpOperStepServiceImpl extends ServiceImpl<SpOperStepMapper, SpOperStep> implements ISpOperStepService {

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void swapStepNo(SpOperStep a, SpOperStep b) {
        Integer tmp = a.getStepNo();
        a.setStepNo(b.getStepNo());
        b.setStepNo(tmp);
        updateById(a);
        updateById(b);
    }
}
