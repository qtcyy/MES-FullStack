package com.wangziyang.mes.technology.service.impl;

import com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper;
import com.wangziyang.mes.technology.entity.SpOperStep;
import com.wangziyang.mes.technology.mapper.SpOperStepMapper;
import com.wangziyang.mes.technology.service.ISpOperStepService;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class SpOperStepServiceImpl extends ServiceImpl<SpOperStepMapper, SpOperStep> implements ISpOperStepService {

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void reorder(String operId, List<String> ids) {
        if (ids == null || ids.isEmpty()) {
            return;
        }
        int no = 1;
        for (String id : ids) {
            SpOperStep set = new SpOperStep();
            set.setStepNo(no++);
            // 仅更新 step_no,且限定 id 同时属于该工序,避免误改其它工序的步骤
            UpdateWrapper<SpOperStep> uw = new UpdateWrapper<>();
            uw.eq("id", id).eq("oper_id", operId);
            update(set, uw);
        }
    }
}
