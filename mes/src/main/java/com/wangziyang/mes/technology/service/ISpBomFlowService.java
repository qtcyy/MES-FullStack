package com.wangziyang.mes.technology.service;

import com.wangziyang.mes.technology.entity.SpBomFlow;
import com.baomidou.mybatisplus.extension.service.IService;

public interface ISpBomFlowService extends IService<SpBomFlow> {
    void lockProductBomFlows(String productBomRootId);
}
