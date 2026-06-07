package com.wangziyang.mes.technology.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.wangziyang.mes.technology.entity.SpBomFlow;
import com.wangziyang.mes.technology.entity.SpProductBom;
import com.wangziyang.mes.technology.mapper.SpBomFlowMapper;
import com.wangziyang.mes.technology.service.ISpBomFlowService;
import com.wangziyang.mes.technology.service.ISpProductBomService;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class SpBomFlowServiceImpl extends ServiceImpl<SpBomFlowMapper, SpBomFlow> implements ISpBomFlowService {

    @Autowired
    private ISpProductBomService spProductBomService;

    @Override
    @Transactional
    public void lockProductBomFlows(String productBomRootId) {
        List<SpProductBom> allNodes = spProductBomService.getTreeByRootId(productBomRootId);
        for (SpProductBom node : allNodes) {
            QueryWrapper<SpBomFlow> qw = new QueryWrapper<>();
            qw.eq("bom_id", node.getId());
            List<SpBomFlow> bomFlows = list(qw);
            for (SpBomFlow bf : bomFlows) {
                bf.setStatus("locked");
                updateById(bf);
            }
        }
    }
}
