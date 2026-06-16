package com.wangziyang.mes.technology.service;

import com.wangziyang.mes.technology.entity.SpBomFlow;
import com.baomidou.mybatisplus.extension.service.IService;

public interface ISpBomFlowService extends IService<SpBomFlow> {
    void lockProductBomFlows(String productBomRootId);

    /** 原子替换某 BOM 节点的工艺绑定(remove+save 同事务),返回新绑定 id */
    String replaceBinding(String bomId, String flowId, String remark);
}
